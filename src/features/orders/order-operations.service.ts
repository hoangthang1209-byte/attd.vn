import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeOrderFinancials } from "@/features/orders/order-finance";
import type {
  DeliveryBoardOrder,
  DeliveryBoardSummary,
  DeliveryReadiness,
  OrderOperationalSummary,
  ProductionBoardItemVariant,
  ProductionBoardOrder,
  ProductionBoardSummary,
  ProductionDueFilter,
  ProductionUrgency,
} from "@/features/orders/order-operations.types";

const PRODUCTION_BOARD_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
];

const DELIVERY_BOARD_DEFAULT_STATUSES: OrderStatus[] = ["READY_TO_SHIP", "SHIPPED"];

const ACTIVE_STATUSES: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
];

type OrderRowWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: { variants: true };
    };
    payments: true;
    deliveryOwner: { select: { fullName: true } };
  };
}>;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getProductionUrgency(
  productionDueDate: Date | null | undefined,
  now = new Date(),
): ProductionUrgency {
  if (!productionDueDate) return "NO_DUE_DATE";
  const due = startOfDay(productionDueDate);
  const today = startOfDay(now);
  if (due < today) return "OVERDUE";
  if (due.getTime() === today.getTime()) return "TODAY";
  const inThreeDays = endOfDay(addDays(today, 3));
  if (productionDueDate <= inThreeDays) return "UPCOMING";
  return "ON_TRACK";
}

export function productionUrgencyLabel(urgency: ProductionUrgency): string {
  switch (urgency) {
    case "OVERDUE":
      return "Quá hạn";
    case "TODAY":
      return "Đến hạn hôm nay";
    case "UPCOMING":
      return "Sắp đến hạn";
    case "NO_DUE_DATE":
      return "Chưa có hạn";
    case "ON_TRACK":
      return "Đúng tiến độ";
  }
}

export function productionUrgencyClass(urgency: ProductionUrgency): string {
  switch (urgency) {
    case "OVERDUE":
      return "ops-urgency--overdue";
    case "TODAY":
      return "ops-urgency--today";
    case "UPCOMING":
      return "ops-urgency--upcoming";
    case "NO_DUE_DATE":
      return "ops-urgency--muted";
    case "ON_TRACK":
      return "ops-urgency--ok";
  }
}

type DeliveryInfoInput = {
  status: OrderStatus;
  deliveryRecipientName?: string | null;
  deliveryRecipientPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryMethodId?: string | null;
  deliveryMethodName?: string | null;
  deliveryMethod?: string | null;
  deliveryExpectedAt?: Date | null;
  deliveredAt?: Date | null;
};

export function getMissingDeliveryFields(order: DeliveryInfoInput): string[] {
  const missing: string[] = [];
  if (!order.deliveryRecipientName?.trim()) missing.push("Người nhận");
  if (!order.deliveryRecipientPhone?.trim()) missing.push("Số điện thoại");
  if (!order.deliveryAddress?.trim()) missing.push("Địa chỉ giao hàng");
  if (
    !order.deliveryMethodId &&
    !order.deliveryMethodName?.trim() &&
    !order.deliveryMethod?.trim()
  ) {
    missing.push("Hình thức giao hàng");
  }
  return missing;
}

export function getDeliveryReadiness(
  order: DeliveryInfoInput,
  now = new Date(),
): DeliveryReadiness {
  if (order.status === "COMPLETED") return "COMPLETED";
  const missing = getMissingDeliveryFields(order);
  if (order.status === "READY_TO_SHIP") {
    return missing.length > 0 ? "MISSING_INFO" : "READY";
  }
  if (order.status === "SHIPPED") {
    if (order.deliveredAt) return "COMPLETED";
    if (
      order.deliveryExpectedAt &&
      order.deliveryExpectedAt < now &&
      !order.deliveredAt
    ) {
      return "LATE";
    }
    return missing.length > 0 ? "MISSING_INFO" : "IN_TRANSIT";
  }
  return missing.length > 0 ? "MISSING_INFO" : "READY";
}

export function deliveryReadinessLabel(readiness: DeliveryReadiness): string {
  switch (readiness) {
    case "READY":
      return "Sẵn sàng giao";
    case "MISSING_INFO":
      return "Thiếu thông tin";
    case "LATE":
      return "Giao trễ dự kiến";
    case "IN_TRANSIT":
      return "Đang giao";
    case "COMPLETED":
      return "Đã hoàn tất";
  }
}

export function deliveryReadinessClass(readiness: DeliveryReadiness): string {
  switch (readiness) {
    case "READY":
      return "ops-readiness--ready";
    case "MISSING_INFO":
      return "ops-readiness--missing";
    case "LATE":
      return "ops-readiness--late";
    case "IN_TRANSIT":
      return "ops-readiness--transit";
    case "COMPLETED":
      return "ops-readiness--completed";
  }
}

function matchesProductionDueFilter(
  urgency: ProductionUrgency,
  due: ProductionDueFilter,
  productionDueDate: Date | null,
  now: Date,
): boolean {
  switch (due) {
    case "overdue":
      return urgency === "OVERDUE";
    case "today":
      return urgency === "TODAY";
    case "upcoming3":
      return urgency === "UPCOMING" || urgency === "TODAY";
    case "upcoming7": {
      if (!productionDueDate) return false;
      const today = startOfDay(now);
      const limit = endOfDay(addDays(today, 7));
      return productionDueDate >= today && productionDueDate <= limit;
    }
    case "none":
      return urgency === "NO_DUE_DATE";
    default:
      return true;
  }
}

function productionSortRank(
  urgency: ProductionUrgency,
  productionDueDate: Date | null,
  orderDate: Date,
): number {
  const urgencyRank: Record<ProductionUrgency, number> = {
    OVERDUE: 0,
    TODAY: 1,
    UPCOMING: 2,
    NO_DUE_DATE: 3,
    ON_TRACK: 4,
  };
  const base = urgencyRank[urgency] * 1_000_000_000_000;
  const dueTs = productionDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const orderTs = orderDate.getTime();
  return base + dueTs + orderTs / 1_000_000;
}

function deliverySortRank(order: OrderRowWithItems, now: Date): number {
  if (order.status === "READY_TO_SHIP") return 0;
  const readiness = getDeliveryReadiness(order, now);
  if (readiness === "LATE") return 1;
  if (order.deliveryExpectedAt) {
    const today = startOfDay(now);
    const expected = startOfDay(order.deliveryExpectedAt);
    if (expected.getTime() === today.getTime()) return 2;
  }
  const shippedTs = order.shippedAt?.getTime() ?? order.orderDate.getTime();
  return 3_000_000_000_000 + shippedTs;
}

function buildItemVariants(row: OrderRowWithItems): ProductionBoardItemVariant[] {
  const variants: ProductionBoardItemVariant[] = [];
  for (const item of row.items) {
    if (item.variants.length > 0) {
      for (const v of item.variants) {
        variants.push({
          productName: item.productNameSnapshot,
          colorName: v.colorNameSnapshot,
          sizeValue: v.sizeValue,
          quantity: v.quantity,
          unit: v.unit,
          sku: v.skuSnapshot,
        });
      }
    } else {
      variants.push({
        productName: item.productNameSnapshot,
        colorName: item.colorSnapshot,
        sizeValue: item.variantNameSnapshot,
        quantity: item.quantity,
        unit: item.unit,
        sku: item.skuSnapshot,
      });
    }
  }
  return variants;
}

function mapProductionBoardOrder(row: OrderRowWithItems, now: Date): ProductionBoardOrder {
  const urgency = getProductionUrgency(row.productionDueDate, now);
  const sortedItems = [...row.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sortedItems[0];
  const totalQuantity = row.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: row.id,
    orderNo: row.orderNo,
    sourceQuoteNo: row.sourceQuoteNo,
    customerCompanyName: row.customerCompanyName,
    contactName: row.contactName,
    salesName: row.salesName,
    status: row.status,
    productionOwnerId: row.productionOwnerId,
    productionOwnerName: row.productionOwnerName,
    productionDueDate: row.productionDueDate?.toISOString() ?? null,
    productionStartedAt: row.productionStartedAt?.toISOString() ?? null,
    productionNote: row.productionNote,
    orderDate: row.orderDate.toISOString(),
    readyToShipAt: row.readyToShipAt?.toISOString() ?? null,
    primaryProductName: primary?.productNameSnapshot ?? null,
    extraProductCount: Math.max(0, sortedItems.length - 1),
    totalQuantity,
    primaryUnit: primary?.unit ?? null,
    productionUrgency: urgency,
    itemVariants: buildItemVariants(row),
  };
}

function mapDeliveryBoardOrder(row: OrderRowWithItems, now: Date): DeliveryBoardOrder {
  const missingDeliveryFields = getMissingDeliveryFields(row);
  return {
    id: row.id,
    orderNo: row.orderNo,
    customerCompanyName: row.customerCompanyName,
    deliveryRecipientName: row.deliveryRecipientName,
    deliveryRecipientPhone: row.deliveryRecipientPhone,
    deliveryAddress: row.deliveryAddress,
    deliveryMethodName: row.deliveryMethodName ?? row.deliveryMethod,
    deliveryCarrier: row.deliveryCarrier,
    deliveryTrackingCode: row.deliveryTrackingCode,
    deliveryExpectedAt: row.deliveryExpectedAt?.toISOString() ?? null,
    deliveryOwnerName: row.deliveryOwner?.fullName ?? null,
    deliveryNote: row.deliveryNote,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    status: row.status,
    deliveryReadiness: getDeliveryReadiness(row, now),
    missingDeliveryFields,
  };
}

function buildProductionSearchWhere(search: string): Prisma.OrderWhereInput {
  const term = search.trim();
  if (!term) return {};
  return {
    OR: [
      { orderNo: { contains: term, mode: "insensitive" } },
      { sourceQuoteNo: { contains: term, mode: "insensitive" } },
      { customerCompanyName: { contains: term, mode: "insensitive" } },
      { contactName: { contains: term, mode: "insensitive" } },
      { salesName: { contains: term, mode: "insensitive" } },
      {
        items: {
          some: {
            OR: [
              { productNameSnapshot: { contains: term, mode: "insensitive" } },
              { skuSnapshot: { contains: term, mode: "insensitive" } },
              {
                variants: {
                  some: { skuSnapshot: { contains: term, mode: "insensitive" } },
                },
              },
            ],
          },
        },
      },
    ],
  };
}

const orderInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { variants: { orderBy: { sortOrder: "asc" as const } } },
  },
  payments: true,
  deliveryOwner: { select: { fullName: true } },
};

function emptyProductionSummary(): ProductionBoardSummary {
  return {
    confirmedCount: 0,
    inProductionCount: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    readyToShipCount: 0,
  };
}

function computeProductionSummary(orders: ProductionBoardOrder[]): ProductionBoardSummary {
  return {
    confirmedCount: orders.filter((o) => o.status === "CONFIRMED").length,
    inProductionCount: orders.filter((o) => o.status === "IN_PRODUCTION").length,
    dueSoonCount: orders.filter(
      (o) => o.productionUrgency === "UPCOMING" || o.productionUrgency === "TODAY",
    ).length,
    overdueCount: orders.filter((o) => o.productionUrgency === "OVERDUE").length,
    readyToShipCount: orders.filter((o) => o.status === "READY_TO_SHIP").length,
  };
}

export async function getProductionBoardOrders(params?: {
  status?: OrderStatus;
  ownerId?: string;
  due?: ProductionDueFilter;
  customerId?: string;
  salesEmployeeId?: string;
  search?: string;
}) {
  const now = new Date();

  if (params?.status && !PRODUCTION_BOARD_STATUSES.includes(params.status)) {
    return { orders: [] as ProductionBoardOrder[], total: 0, summary: emptyProductionSummary() };
  }

  const where: Prisma.OrderWhereInput = {
    status: params?.status ? params.status : { in: PRODUCTION_BOARD_STATUSES },
    ...(params?.ownerId ? { productionOwnerId: params.ownerId } : {}),
    ...(params?.customerId ? { customerId: params.customerId } : {}),
    ...(params?.salesEmployeeId ? { salesEmployeeId: params.salesEmployeeId } : {}),
    ...buildProductionSearchWhere(params?.search ?? ""),
  };

  const rows = await prisma.order.findMany({ where, include: orderInclude });

  let orders = rows.map((row) => mapProductionBoardOrder(row, now));

  if (params?.due) {
    orders = orders.filter((o) =>
      matchesProductionDueFilter(
        o.productionUrgency,
        params.due!,
        o.productionDueDate ? new Date(o.productionDueDate) : null,
        now,
      ),
    );
  }

  orders.sort((a, b) => {
    const rankA = productionSortRank(
      a.productionUrgency,
      a.productionDueDate ? new Date(a.productionDueDate) : null,
      new Date(a.orderDate),
    );
    const rankB = productionSortRank(
      b.productionUrgency,
      b.productionDueDate ? new Date(b.productionDueDate) : null,
      new Date(b.orderDate),
    );
    return rankA - rankB;
  });

  const allMapped = rows.map((row) => mapProductionBoardOrder(row, now));
  const summary = computeProductionSummary(allMapped);

  return { orders, total: orders.length, summary };
}

function emptyDeliverySummary(): DeliveryBoardSummary {
  return {
    readyToShipCount: 0,
    shippedCount: 0,
    lateCount: 0,
    missingInfoCount: 0,
    completedTodayCount: 0,
  };
}

function computeDeliverySummary(
  orders: DeliveryBoardOrder[],
  now: Date,
): DeliveryBoardSummary {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  return {
    readyToShipCount: orders.filter((o) => o.status === "READY_TO_SHIP").length,
    shippedCount: orders.filter((o) => o.status === "SHIPPED").length,
    lateCount: orders.filter((o) => o.deliveryReadiness === "LATE").length,
    missingInfoCount: orders.filter((o) => o.deliveryReadiness === "MISSING_INFO").length,
    completedTodayCount: orders.filter((o) => {
      if (!o.deliveredAt) return false;
      const d = new Date(o.deliveredAt);
      return d >= todayStart && d <= todayEnd;
    }).length,
  };
}

export async function getDeliveryBoardOrders(params?: {
  status?: OrderStatus;
  readiness?: DeliveryReadiness;
  includeCompleted?: boolean;
  completedToday?: boolean;
  search?: string;
}) {
  const now = new Date();
  const defaultStatuses = params?.includeCompleted
    ? [...DELIVERY_BOARD_DEFAULT_STATUSES, "COMPLETED" as OrderStatus]
    : DELIVERY_BOARD_DEFAULT_STATUSES;

  if (
    params?.status &&
    !defaultStatuses.includes(params.status) &&
    params.status !== "COMPLETED"
  ) {
    return { orders: [] as DeliveryBoardOrder[], total: 0, summary: emptyDeliverySummary() };
  }

  const where: Prisma.OrderWhereInput = {
    status: params?.status ? params.status : { in: defaultStatuses },
    ...buildProductionSearchWhere(params?.search ?? ""),
  };

  const rows = await prisma.order.findMany({ where, include: orderInclude });

  let orders = rows.map((row) => mapDeliveryBoardOrder(row, now));

  if (params?.readiness) {
    orders = orders.filter((o) => o.deliveryReadiness === params.readiness);
  }

  if (params?.completedToday) {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    orders = orders.filter((o) => {
      if (!o.deliveredAt) return false;
      const d = new Date(o.deliveredAt);
      return d >= todayStart && d <= todayEnd;
    });
  }

  orders.sort((a, b) => {
    const rowA = rows.find((r) => r.id === a.id)!;
    const rowB = rows.find((r) => r.id === b.id)!;
    return deliverySortRank(rowA, now) - deliverySortRank(rowB, now);
  });

  const allMapped = rows.map((row) => mapDeliveryBoardOrder(row, now));
  const summary = computeDeliverySummary(allMapped, now);

  return { orders, total: orders.length, summary };
}

export async function getOrderOperationalSummary(): Promise<OrderOperationalSummary> {
  const now = new Date();
  const rows = await prisma.order.findMany({
    where: { status: { in: ACTIVE_STATUSES } },
    include: { payments: true },
  });

  const productionRows = rows.filter((r) =>
    PRODUCTION_BOARD_STATUSES.includes(r.status),
  );

  let totalOutstandingActive = 0;
  for (const row of rows) {
    const payments = row.payments.map((p) => ({
      type: p.type,
      status: p.status,
      amount: p.amount.toNumber(),
    }));
    const financials = computeOrderFinancials(row.totalAmount.toNumber(), payments);
    totalOutstandingActive += financials.outstandingAmount;
  }

  const productionMapped = productionRows.map((r) =>
    getProductionUrgency(r.productionDueDate, now),
  );

  const deliveryCandidates = rows.filter((r) =>
    ["READY_TO_SHIP", "SHIPPED"].includes(r.status),
  );

  return {
    newOrders: rows.filter((r) => r.status === "NEW").length,
    awaitingConfirmation: rows.filter((r) => r.status === "NEW").length,
    inProduction: rows.filter((r) => r.status === "IN_PRODUCTION").length,
    productionDueSoon: productionMapped.filter(
      (u) => u === "UPCOMING" || u === "TODAY",
    ).length,
    productionOverdue: productionMapped.filter((u) => u === "OVERDUE").length,
    readyToShip: rows.filter((r) => r.status === "READY_TO_SHIP").length,
    inTransit: rows.filter((r) => r.status === "SHIPPED").length,
    missingDeliveryInfo: deliveryCandidates.filter(
      (r) => getDeliveryReadiness(r, now) === "MISSING_INFO",
    ).length,
    totalOutstandingActive: Math.round(totalOutstandingActive * 100) / 100,
  };
}
