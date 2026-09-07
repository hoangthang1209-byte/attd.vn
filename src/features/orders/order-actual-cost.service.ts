import type { OrderActualCostCategory } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildFrozenEstimatedBaseline,
  computeActualCostMetrics,
  computeEstimatedCostFromQuotedItems,
  computeOrderCommercialValue,
  sumActualCostAmounts,
} from "@/features/orders/order-actual-cost-math";
import type {
  OrderActualCostEntryRecord,
  OrderActualCostItemRollup,
  OrderActualCostSummary,
  UpsertOrderActualCostEntryInput,
} from "@/features/orders/order-actual-cost.types";

export class OrderActualCostValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderActualCostValidationError";
  }
}

function decimalToNumber(value: PrismaNamespace.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  return value.toNumber();
}

function mapEntry(row: {
  id: string;
  orderId: string;
  orderItemId: string | null;
  category: OrderActualCostCategory;
  label: string | null;
  description: string | null;
  amount: PrismaNamespace.Decimal;
  currency: string;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): OrderActualCostEntryRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    category: row.category,
    label: row.label,
    description: row.description,
    amount: row.amount.toNumber(),
    currency: row.currency,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new OrderActualCostValidationError("Số tiền chi phí phải lớn hơn hoặc bằng 0.");
  }
}

async function loadOrderFinancialContext(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      currency: true,
      subtotal: true,
      discountAmount: true,
      shippingFee: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          productNameSnapshot: true,
          quantity: true,
          unit: true,
          quotedTotalCost: true,
        },
      },
      actualCostClose: true,
      actualCostEntries: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) {
    throw new OrderActualCostValidationError("Không tìm thấy đơn hàng.");
  }
  return order;
}

function buildItemRollups(
  items: Array<{
    id: string;
    productNameSnapshot: string | null;
    quantity: number;
    unit: string;
    quotedTotalCost: PrismaNamespace.Decimal | null;
  }>,
  entries: OrderActualCostEntryRecord[],
): { itemRollups: OrderActualCostItemRollup[]; sharedActualCostTotal: number } {
  const byItem = new Map<string, number>();
  let sharedActualCostTotal = 0;
  for (const entry of entries) {
    if (entry.orderItemId == null) {
      sharedActualCostTotal += entry.amount;
      continue;
    }
    byItem.set(entry.orderItemId, (byItem.get(entry.orderItemId) ?? 0) + entry.amount);
  }
  sharedActualCostTotal = sumActualCostAmounts([sharedActualCostTotal]);

  const itemRollups = items.map((item) => {
    const estimatedCost = decimalToNumber(item.quotedTotalCost);
    const actualAttributedCost = sumActualCostAmounts([byItem.get(item.id) ?? 0]);
    return {
      orderItemId: item.id,
      productName: item.productNameSnapshot?.trim() || "Sản phẩm",
      quantity: item.quantity,
      unit: item.unit,
      estimatedCost,
      actualAttributedCost,
      costVariance:
        estimatedCost == null ? null : sumActualCostAmounts([actualAttributedCost - estimatedCost]),
    };
  });

  return { itemRollups, sharedActualCostTotal };
}

function assembleSummary(order: Awaited<ReturnType<typeof loadOrderFinancialContext>>): OrderActualCostSummary {
  const commercialValue = computeOrderCommercialValue({
    subtotal: order.subtotal.toNumber(),
    discountAmount: order.discountAmount.toNumber(),
    shippingFee: order.shippingFee.toNumber(),
  });
  const liveEstimatedCost = computeEstimatedCostFromQuotedItems(
    order.items.map((item) => ({
      quotedTotalCost: decimalToNumber(item.quotedTotalCost),
    })),
  );
  const entries = order.actualCostEntries.map(mapEntry);
  const hasActualEntries = entries.length > 0;
  const liveActualCostTotal = sumActualCostAmounts(entries.map((entry) => entry.amount));
  const close = order.actualCostClose;
  const { itemRollups, sharedActualCostTotal } = buildItemRollups(order.items, entries);

  const needsCloseWarning =
    order.status !== "CANCELLED" &&
    (order.status === "SHIPPED" || order.status === "COMPLETED") &&
    (!close || close.status !== "CLOSED");

  if (!close) {
    const liveMetrics = computeActualCostMetrics({
      commercialValue,
      estimatedCost: liveEstimatedCost,
      actualCostTotal: liveActualCostTotal,
    });
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      orderStatus: order.status,
      currency: order.currency,
      commercialValue,
      hasCloseRecord: false,
      status: null,
      estimatedCommercialValue: commercialValue,
      estimatedCost: liveEstimatedCost,
      estimatedGrossMargin: liveMetrics.estimatedGrossMargin,
      estimatedGrossMarginRate: liveMetrics.estimatedGrossMarginRate,
      hasEstimatedCost: liveEstimatedCost != null,
      actualCostTotal: hasActualEntries ? liveActualCostTotal : null,
      actualGrossMargin: hasActualEntries ? liveMetrics.actualGrossMargin : null,
      actualGrossMarginRate: hasActualEntries ? liveMetrics.actualGrossMarginRate : null,
      costVariance: hasActualEntries ? liveMetrics.costVariance : null,
      hasActualEntries,
      closedAt: null,
      closedByUserId: null,
      reopenedAt: null,
      reopenedByUserId: null,
      note: null,
      needsCloseWarning,
      entries,
      itemRollups,
      sharedActualCostTotal,
    };
  }

  const frozenEstimatedCost = decimalToNumber(close.estimatedCost);
  if (close.status === "CLOSED") {
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      orderStatus: order.status,
      currency: order.currency,
      commercialValue,
      hasCloseRecord: true,
      status: close.status,
      estimatedCommercialValue: close.estimatedCommercialValue.toNumber(),
      estimatedCost: frozenEstimatedCost,
      estimatedGrossMargin: decimalToNumber(close.estimatedGrossMargin),
      estimatedGrossMarginRate: decimalToNumber(close.estimatedGrossMarginRate),
      hasEstimatedCost: frozenEstimatedCost != null,
      actualCostTotal: close.actualCostTotal.toNumber(),
      actualGrossMargin: close.actualGrossMargin.toNumber(),
      actualGrossMarginRate: decimalToNumber(close.actualGrossMarginRate),
      costVariance: decimalToNumber(close.costVariance),
      hasActualEntries,
      closedAt: close.closedAt?.toISOString() ?? null,
      closedByUserId: close.closedByUserId,
      reopenedAt: close.reopenedAt?.toISOString() ?? null,
      reopenedByUserId: close.reopenedByUserId,
      note: close.note,
      needsCloseWarning: false,
      entries,
      itemRollups,
      sharedActualCostTotal,
    };
  }

  // DRAFT with close record: frozen estimate + live commercial/actuals
  const draftMetrics = computeActualCostMetrics({
    commercialValue,
    estimatedCost: frozenEstimatedCost,
    actualCostTotal: liveActualCostTotal,
  });
  // Estimated margin uses frozen commercial value from snapshot basis
  const estimatedFromFrozen = computeActualCostMetrics({
    commercialValue: close.estimatedCommercialValue.toNumber(),
    estimatedCost: frozenEstimatedCost,
    actualCostTotal: 0,
  });

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    orderStatus: order.status,
    currency: order.currency,
    commercialValue,
    hasCloseRecord: true,
    status: close.status,
    estimatedCommercialValue: close.estimatedCommercialValue.toNumber(),
    estimatedCost: frozenEstimatedCost,
    estimatedGrossMargin: estimatedFromFrozen.estimatedGrossMargin,
    estimatedGrossMarginRate: estimatedFromFrozen.estimatedGrossMarginRate,
    hasEstimatedCost: frozenEstimatedCost != null,
    actualCostTotal: hasActualEntries ? draftMetrics.actualCostTotal : null,
    actualGrossMargin: hasActualEntries ? draftMetrics.actualGrossMargin : null,
    actualGrossMarginRate: hasActualEntries ? draftMetrics.actualGrossMarginRate : null,
    costVariance: hasActualEntries ? draftMetrics.costVariance : null,
    hasActualEntries,
    closedAt: close.closedAt?.toISOString() ?? null,
    closedByUserId: close.closedByUserId,
    reopenedAt: close.reopenedAt?.toISOString() ?? null,
    reopenedByUserId: close.reopenedByUserId,
    note: close.note,
    needsCloseWarning,
    entries,
    itemRollups,
    sharedActualCostTotal,
  };
}

/** Read-only: never creates a close row. */
export async function getOrderActualCostSummary(orderId: string): Promise<OrderActualCostSummary> {
  const order = await loadOrderFinancialContext(orderId);
  return assembleSummary(order);
}

export async function orderHasActualCostData(orderId: string): Promise<boolean> {
  const [close, entryCount] = await Promise.all([
    prisma.orderActualCostClose.findUnique({ where: { orderId }, select: { id: true } }),
    prisma.orderActualCostEntry.count({ where: { orderId } }),
  ]);
  return Boolean(close) || entryCount > 0;
}

/**
 * Blocks destructive OrderItem replace once Actual Cost data exists.
 * Order edit currently deleteMany + recreate items, which would orphan or
 * cascade-wipe item-linked entries; Restrict FK + this guard make it explicit.
 */
export async function assertOrderItemsMutableForActualCost(orderId: string): Promise<void> {
  if (await orderHasActualCostData(orderId)) {
    throw new OrderActualCostValidationError(
      "Đơn đã có chi phí thực tế. Xóa các dòng chi phí thực tế trước khi thay thế danh sách sản phẩm trên đơn.",
    );
  }
}

async function ensureDraftCloseRecord(
  orderId: string,
  actorUserId: string | null,
): Promise<void> {
  const order = await loadOrderFinancialContext(orderId);
  if (order.actualCostClose) {
    if (order.actualCostClose.status === "CLOSED") {
      throw new OrderActualCostValidationError(
        "Chi phí thực tế đã chốt. Hãy mở lại trước khi chỉnh sửa.",
      );
    }
    return;
  }

  const commercialValue = computeOrderCommercialValue({
    subtotal: order.subtotal.toNumber(),
    discountAmount: order.discountAmount.toNumber(),
    shippingFee: order.shippingFee.toNumber(),
  });
  const estimatedCost = computeEstimatedCostFromQuotedItems(
    order.items.map((item) => ({
      quotedTotalCost: decimalToNumber(item.quotedTotalCost),
    })),
  );
  const baseline = buildFrozenEstimatedBaseline({ commercialValue, estimatedCost });

  await prisma.orderActualCostClose.create({
    data: {
      orderId,
      status: "DRAFT",
      estimatedCommercialValue: new PrismaNamespace.Decimal(baseline.estimatedCommercialValue),
      estimatedCost:
        baseline.estimatedCost == null ? null : new PrismaNamespace.Decimal(baseline.estimatedCost),
      estimatedGrossMargin:
        baseline.estimatedGrossMargin == null
          ? null
          : new PrismaNamespace.Decimal(baseline.estimatedGrossMargin),
      estimatedGrossMarginRate:
        baseline.estimatedGrossMarginRate == null
          ? null
          : new PrismaNamespace.Decimal(baseline.estimatedGrossMarginRate),
      actualCostTotal: 0,
      actualGrossMargin: 0,
      actualGrossMarginRate: null,
      costVariance: null,
      note: null,
      // actor reserved for close/reopen; creation may be anonymous owner session
      closedByUserId: null,
      reopenedByUserId: null,
    },
  });
  void actorUserId;
}

async function assertEntryMutable(orderId: string) {
  const close = await prisma.orderActualCostClose.findUnique({ where: { orderId } });
  if (close?.status === "CLOSED") {
    throw new OrderActualCostValidationError(
      "Chi phí thực tế đã chốt. Hãy mở lại trước khi chỉnh sửa.",
    );
  }
}

export async function createOrderActualCostEntry(
  orderId: string,
  input: UpsertOrderActualCostEntryInput,
  actorUserId: string | null,
): Promise<OrderActualCostSummary> {
  validateAmount(input.amount);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, currency: true, status: true },
  });
  if (!order) throw new OrderActualCostValidationError("Không tìm thấy đơn hàng.");

  if (input.orderItemId) {
    const item = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId, orderId },
      select: { id: true },
    });
    if (!item) {
      throw new OrderActualCostValidationError("Sản phẩm không thuộc đơn hàng này.");
    }
  }

  await ensureDraftCloseRecord(orderId, actorUserId);
  await assertEntryMutable(orderId);

  await prisma.orderActualCostEntry.create({
    data: {
      orderId,
      orderItemId: input.orderItemId ?? null,
      category: input.category,
      label: input.label?.trim() || null,
      description: input.description?.trim() || null,
      amount: new PrismaNamespace.Decimal(input.amount),
      currency: order.currency,
      createdByUserId: actorUserId,
    },
  });

  return getOrderActualCostSummary(orderId);
}

export async function updateOrderActualCostEntry(
  orderId: string,
  entryId: string,
  input: UpsertOrderActualCostEntryInput,
  actorUserId: string | null,
): Promise<OrderActualCostSummary> {
  validateAmount(input.amount);
  await assertEntryMutable(orderId);

  const existing = await prisma.orderActualCostEntry.findFirst({
    where: { id: entryId, orderId },
  });
  if (!existing) {
    throw new OrderActualCostValidationError("Không tìm thấy dòng chi phí thực tế.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { currency: true },
  });
  if (!order) throw new OrderActualCostValidationError("Không tìm thấy đơn hàng.");

  if (input.orderItemId) {
    const item = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId, orderId },
      select: { id: true },
    });
    if (!item) {
      throw new OrderActualCostValidationError("Sản phẩm không thuộc đơn hàng này.");
    }
  }

  await prisma.orderActualCostEntry.update({
    where: { id: entryId },
    data: {
      orderItemId: input.orderItemId ?? null,
      category: input.category,
      label: input.label?.trim() || null,
      description: input.description?.trim() || null,
      amount: new PrismaNamespace.Decimal(input.amount),
      currency: order.currency,
    },
  });
  void actorUserId;

  return getOrderActualCostSummary(orderId);
}

export async function deleteOrderActualCostEntry(
  orderId: string,
  entryId: string,
): Promise<OrderActualCostSummary> {
  await assertEntryMutable(orderId);
  const existing = await prisma.orderActualCostEntry.findFirst({
    where: { id: entryId, orderId },
    select: { id: true },
  });
  if (!existing) {
    throw new OrderActualCostValidationError("Không tìm thấy dòng chi phí thực tế.");
  }
  await prisma.orderActualCostEntry.delete({ where: { id: entryId } });
  return getOrderActualCostSummary(orderId);
}

export async function closeOrderActualCost(
  orderId: string,
  actorUserId: string | null,
  note?: string | null,
): Promise<OrderActualCostSummary> {
  await ensureDraftCloseRecord(orderId, actorUserId);
  const summary = await getOrderActualCostSummary(orderId);
  if (summary.status === "CLOSED") {
    throw new OrderActualCostValidationError("Chi phí thực tế đã được chốt.");
  }

  const actualCostTotal = summary.hasActualEntries ? (summary.actualCostTotal ?? 0) : 0;
  const metrics = computeActualCostMetrics({
    commercialValue: summary.commercialValue,
    estimatedCost: summary.estimatedCost,
    actualCostTotal,
  });

  await prisma.orderActualCostClose.update({
    where: { orderId },
    data: {
      status: "CLOSED",
      actualCostTotal: new PrismaNamespace.Decimal(metrics.actualCostTotal),
      actualGrossMargin: new PrismaNamespace.Decimal(metrics.actualGrossMargin),
      actualGrossMarginRate:
        metrics.actualGrossMarginRate == null
          ? null
          : new PrismaNamespace.Decimal(metrics.actualGrossMarginRate),
      costVariance:
        metrics.costVariance == null ? null : new PrismaNamespace.Decimal(metrics.costVariance),
      closedAt: new Date(),
      closedByUserId: actorUserId,
      note: note?.trim() || summary.note,
      // keep estimated* unchanged
    },
  });

  return getOrderActualCostSummary(orderId);
}

export async function reopenOrderActualCost(
  orderId: string,
  actorUserId: string | null,
): Promise<OrderActualCostSummary> {
  const close = await prisma.orderActualCostClose.findUnique({ where: { orderId } });
  if (!close) {
    throw new OrderActualCostValidationError("Chưa có bản ghi chi phí thực tế để mở lại.");
  }
  if (close.status !== "CLOSED") {
    throw new OrderActualCostValidationError("Chi phí thực tế đang ở trạng thái nháp.");
  }

  await prisma.orderActualCostClose.update({
    where: { orderId },
    data: {
      status: "DRAFT",
      reopenedAt: new Date(),
      reopenedByUserId: actorUserId,
      closedAt: null,
      closedByUserId: null,
      // estimated baseline intentionally untouched
    },
  });

  return getOrderActualCostSummary(orderId);
}
