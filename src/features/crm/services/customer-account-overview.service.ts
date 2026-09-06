import type { Prisma } from "@prisma/client";
import {
  ACTIVE_ITEM_PRODUCTION_STATUSES,
  ACTIVE_ORDER_STATUSES,
  CUSTOMER_360_OPEN_QUOTE_LIMIT,
  CUSTOMER_360_ORDER_LIST_LIMIT,
  CUSTOMER_360_PRODUCTION_LIMIT,
  CUSTOMER_360_PURCHASED_PRODUCT_LIMIT,
  OPEN_QUOTE_STATUSES,
  type CustomerAccountKpis,
  type CustomerAccountOverview,
  type CustomerAccountOverviewCapabilities,
  type CustomerActiveProductionRow,
  type CustomerOpenQuoteRow,
  type CustomerOrderRow,
  type CustomerPurchasedProductRow,
} from "@/features/crm/customer-account-overview.types";
import { resolveQuoteDisplayAmount } from "@/features/quotes/quote-amount";
import { prisma } from "@/lib/prisma";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** Group key for purchased-product history. Prefer productId, else snapshot identity. */
export function purchasedProductGroupKey(input: {
  productId: string | null;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
}): string {
  if (input.productId) return `product:${input.productId}`;
  const name = (input.productNameSnapshot ?? "").trim().toLowerCase() || "unknown";
  const variant = (input.variantNameSnapshot ?? "").trim().toLowerCase();
  const sku = (input.skuSnapshot ?? "").trim().toLowerCase();
  return `snap:${name}|${variant}|${sku}`;
}

export type PurchasedProductSourceItem = {
  id: string;
  productId: string | null;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  quantity: number;
  unit: string;
  unitPrice: Prisma.Decimal | number;
  quotedUnitCost: Prisma.Decimal | number | null;
  quotedMarginRate: Prisma.Decimal | number | null;
  order: {
    id: string;
    orderNo: string;
    orderDate: Date;
  };
  supplierName: string | null;
};

/** Pure aggregation used by the service and unit tests. */
export function aggregatePurchasedProducts(
  items: PurchasedProductSourceItem[],
  options: { includeFinancials: boolean; limit?: number },
): CustomerPurchasedProductRow[] {
  const limit = options.limit ?? CUSTOMER_360_PURCHASED_PRODUCT_LIMIT;
  type Acc = {
    groupKey: string;
    productId: string | null;
    productName: string;
    variantName: string | null;
    sku: string | null;
    orderIds: Set<string>;
    latest: PurchasedProductSourceItem;
  };

  const map = new Map<string, Acc>();

  for (const item of items) {
    const groupKey = purchasedProductGroupKey(item);
    const existing = map.get(groupKey);
    if (!existing) {
      map.set(groupKey, {
        groupKey,
        productId: item.productId,
        productName: item.productNameSnapshot?.trim() || "Sản phẩm không tên",
        variantName: item.variantNameSnapshot,
        sku: item.skuSnapshot,
        orderIds: new Set([item.order.id]),
        latest: item,
      });
      continue;
    }
    existing.orderIds.add(item.order.id);
    if (item.order.orderDate.getTime() > existing.latest.order.orderDate.getTime()) {
      existing.latest = item;
      existing.productId = item.productId ?? existing.productId;
      existing.productName = item.productNameSnapshot?.trim() || existing.productName;
      existing.variantName = item.variantNameSnapshot ?? existing.variantName;
      existing.sku = item.skuSnapshot ?? existing.sku;
    }
  }

  const rows: CustomerPurchasedProductRow[] = [...map.values()].map((acc) => ({
    groupKey: acc.groupKey,
    productId: acc.productId,
    productName: acc.productName,
    variantName: acc.variantName,
    sku: acc.sku,
    lastOrderId: acc.latest.order.id,
    lastOrderNo: acc.latest.order.orderNo,
    lastOrderDate: acc.latest.order.orderDate.toISOString(),
    lastQuantity: acc.latest.quantity,
    lastUnit: acc.latest.unit,
    lastUnitPrice: options.includeFinancials
      ? decimalToNumber(acc.latest.unitPrice)
      : null,
    lastQuotedUnitCost: options.includeFinancials
      ? decimalToNumber(acc.latest.quotedUnitCost)
      : null,
    lastQuotedMarginRate: options.includeFinancials
      ? decimalToNumber(acc.latest.quotedMarginRate)
      : null,
    orderCount: acc.orderIds.size,
    lastSupplierName: acc.latest.supplierName,
  }));

  rows.sort((a, b) => {
    const dateDiff =
      new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.orderCount - a.orderCount;
  });

  return rows.slice(0, limit);
}

function formatProductionHint(input: {
  progressPercent: number | null;
  riskLabel: string | null;
  supplierName: string | null;
}): string | null {
  const parts: string[] = [];
  if (input.progressPercent != null && Number.isFinite(input.progressPercent)) {
    parts.push(`${Math.round(input.progressPercent)}%`);
  }
  if (input.riskLabel) parts.push(input.riskLabel);
  if (input.supplierName) parts.push(input.supplierName);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export async function getCustomerAccountOverview(
  customerId: string,
  capabilities: CustomerAccountOverviewCapabilities,
): Promise<CustomerAccountOverview | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, code: true },
  });
  if (!customer) return null;

  const nonCancelledOrderWhere: Prisma.OrderWhereInput = {
    customerId,
    status: { not: "CANCELLED" },
  };

  const emptyKpis: CustomerAccountKpis = {
    totalOrders: 0,
    totalOrderValue: capabilities.includeFinancials ? 0 : null,
    openQuotations: 0,
    activeOrders: 0,
    lastOrderDate: null,
  };

  if (!capabilities.includeOrders && !capabilities.includeQuotes) {
    return {
      customerId,
      customerName: customer.name,
      customerCode: customer.code,
      capabilities,
      kpis: emptyKpis,
      openQuotes: [],
      orders: [],
      ordersTotalCount: 0,
      activeProduction: [],
      purchasedProducts: [],
    };
  }

  const [
    totalOrders,
    orderValueAgg,
    openQuotations,
    activeOrders,
    lastOrder,
    openQuoteRows,
    orderRows,
    ordersTotalCount,
    productionTrackings,
    purchasedItemRows,
  ] = await Promise.all([
    capabilities.includeOrders
      ? prisma.order.count({ where: nonCancelledOrderWhere })
      : Promise.resolve(0),
    capabilities.includeOrders && capabilities.includeFinancials
      ? prisma.order.aggregate({
          where: nonCancelledOrderWhere,
          _sum: { totalAmount: true },
        })
      : Promise.resolve(null),
    capabilities.includeQuotes
      ? prisma.quote.count({
          where: {
            customerId,
            status: { in: [...OPEN_QUOTE_STATUSES] },
          },
        })
      : Promise.resolve(0),
    capabilities.includeOrders
      ? prisma.order.count({
          where: {
            customerId,
            status: { in: [...ACTIVE_ORDER_STATUSES] },
          },
        })
      : Promise.resolve(0),
    capabilities.includeOrders
      ? prisma.order.findFirst({
          where: nonCancelledOrderWhere,
          orderBy: { orderDate: "desc" },
          select: { orderDate: true },
        })
      : Promise.resolve(null),
    capabilities.includeQuotes
      ? prisma.quote.findMany({
          where: {
            customerId,
            status: { in: [...OPEN_QUOTE_STATUSES] },
          },
          orderBy: [{ quoteDate: "desc" }, { createdAt: "desc" }],
          take: CUSTOMER_360_OPEN_QUOTE_LIMIT,
          select: {
            id: true,
            quoteNo: true,
            quoteDate: true,
            status: true,
            totalAmount: true,
            manualOverride: true,
            manualTotalAmount: true,
            validUntil: true,
            contact: { select: { fullName: true } },
            customerContactNameSnapshot: true,
          },
        })
      : Promise.resolve([]),
    capabilities.includeOrders
      ? prisma.order.findMany({
          where: { customerId },
          orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
          take: CUSTOMER_360_ORDER_LIST_LIMIT,
          select: {
            id: true,
            orderNo: true,
            sourceQuoteNo: true,
            orderDate: true,
            status: true,
            totalAmount: true,
            items: {
              select: {
                itemProductionTracking: {
                  select: {
                    progressPercent: true,
                    riskStatus: true,
                    supplier: { select: { name: true } },
                    productionStatus: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    capabilities.includeOrders
      ? prisma.order.count({ where: { customerId } })
      : Promise.resolve(0),
    capabilities.includeOrders && capabilities.includeProduction
      ? prisma.itemProductionTracking.findMany({
          where: {
            productionStatus: { in: [...ACTIVE_ITEM_PRODUCTION_STATUSES] },
            orderItem: {
              order: {
                customerId,
                status: { notIn: ["CANCELLED", "COMPLETED"] },
              },
            },
          },
          orderBy: [{ nextActionDueDate: "asc" }, { updatedAt: "desc" }],
          take: CUSTOMER_360_PRODUCTION_LIMIT,
          select: {
            progressPercent: true,
            riskStatus: true,
            nextAction: true,
            nextActionDueDate: true,
            productionStatus: true,
            orderedQuantity: true,
            supplier: { select: { name: true } },
            orderItem: {
              select: {
                id: true,
                quantity: true,
                unit: true,
                productNameSnapshot: true,
                order: {
                  select: { id: true, orderNo: true },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    capabilities.includeOrders
      ? prisma.orderItem.findMany({
          where: {
            order: nonCancelledOrderWhere,
          },
          select: {
            id: true,
            productId: true,
            productNameSnapshot: true,
            variantNameSnapshot: true,
            skuSnapshot: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            quotedUnitCost: true,
            quotedMarginRate: true,
            order: {
              select: {
                id: true,
                orderNo: true,
                orderDate: true,
              },
            },
            itemProductionTracking: {
              select: {
                supplier: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const kpis: CustomerAccountKpis = {
    totalOrders,
    totalOrderValue: capabilities.includeFinancials
      ? decimalToNumber(orderValueAgg?._sum.totalAmount) ?? 0
      : null,
    openQuotations,
    activeOrders,
    lastOrderDate: toIso(lastOrder?.orderDate ?? null),
  };

  const openQuotes: CustomerOpenQuoteRow[] = openQuoteRows.map((q) => ({
    id: q.id,
    quoteNo: q.quoteNo,
    quoteDate: toIso(q.quoteDate),
    contactName: q.contact?.fullName ?? q.customerContactNameSnapshot ?? null,
    status: q.status,
    totalAmount: capabilities.includeFinancials ? resolveQuoteDisplayAmount(q) : null,
    validUntil: toIso(q.validUntil),
  }));

  const RISK_HINT: Record<string, string> = {
    ON_TRACK: "Đúng tiến độ",
    NEEDS_ATTENTION: "Cần chú ý",
    AT_RISK: "Nguy cơ trễ",
    DELAYED: "Đã trễ",
    BLOCKED: "Bị chặn",
  };

  const orders: CustomerOrderRow[] = orderRows.map((order) => {
    const activeTrackings = order.items
      .map((item) => item.itemProductionTracking)
      .filter(
        (t): t is NonNullable<(typeof order.items)[number]["itemProductionTracking"]> =>
          Boolean(t) &&
          (ACTIVE_ITEM_PRODUCTION_STATUSES as readonly string[]).includes(t!.productionStatus),
      );

    const best = activeTrackings[0] ?? null;
    return {
      id: order.id,
      orderNo: order.orderNo,
      sourceQuoteNo: order.sourceQuoteNo,
      orderDate: order.orderDate.toISOString(),
      status: order.status,
      totalAmount: capabilities.includeFinancials
        ? decimalToNumber(order.totalAmount)
        : null,
      productionSummary:
        capabilities.includeProduction && best
          ? formatProductionHint({
              progressPercent: decimalToNumber(best.progressPercent),
              riskLabel: RISK_HINT[best.riskStatus] ?? best.riskStatus,
              supplierName: best.supplier?.name ?? null,
            })
          : null,
    };
  });

  const activeProduction: CustomerActiveProductionRow[] = productionTrackings.map((row) => ({
    orderId: row.orderItem.order.id,
    orderNo: row.orderItem.order.orderNo,
    orderItemId: row.orderItem.id,
    productName: row.orderItem.productNameSnapshot?.trim() || "Sản phẩm",
    quantity: row.orderItem.quantity || row.orderedQuantity,
    unit: row.orderItem.unit || "cái",
    progressPercent: decimalToNumber(row.progressPercent) ?? 0,
    supplierName: row.supplier?.name ?? null,
    riskStatus: row.riskStatus,
    nextAction: row.nextAction,
    nextActionDueDate: toIso(row.nextActionDueDate),
    productionStatus: row.productionStatus,
  }));

  const purchasedProducts = aggregatePurchasedProducts(
    purchasedItemRows.map((item) => ({
      id: item.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      skuSnapshot: item.skuSnapshot,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      quotedUnitCost: item.quotedUnitCost,
      quotedMarginRate: item.quotedMarginRate,
      order: item.order,
      supplierName: item.itemProductionTracking?.supplier?.name ?? null,
    })),
    { includeFinancials: capabilities.includeFinancials },
  );

  return {
    customerId,
    customerName: customer.name,
    customerCode: customer.code,
    capabilities,
    kpis,
    openQuotes,
    orders,
    ordersTotalCount,
    activeProduction,
    purchasedProducts,
  };
}
