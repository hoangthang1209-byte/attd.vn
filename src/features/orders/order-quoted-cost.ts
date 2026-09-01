import type { QuoteStatus } from "@prisma/client";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type QuoteItemCostSource = {
  quantity: number;
  costEstimate: number | null;
  marginAmount: number | null;
  marginRate: number | null;
  pricingCalculationItemId: string | null;
};

export type OrderItemQuotedCostSnapshot = {
  quotedUnitCost: number | null;
  quotedTotalCost: number | null;
  quotedMarginAmount: number | null;
  quotedMarginRate: number | null;
  pricingCalculationItemId: string | null;
};

/** QuoteItem.costEstimate stores line total cost (not per-unit). */
export function deriveQuotedUnitCost(quantity: number, lineTotalCost: number | null): number | null {
  if (lineTotalCost == null || quantity <= 0) return null;
  return roundMoney(lineTotalCost / quantity);
}

export function buildOrderItemQuotedCostSnapshot(
  item: QuoteItemCostSource,
): OrderItemQuotedCostSnapshot {
  const quotedTotalCost = item.costEstimate;
  return {
    quotedUnitCost: deriveQuotedUnitCost(item.quantity, item.costEstimate),
    quotedTotalCost,
    quotedMarginAmount: item.marginAmount,
    quotedMarginRate: item.marginRate,
    pricingCalculationItemId: item.pricingCalculationItemId,
  };
}

export type OrderQuotedCommercialLine = {
  lineTotal: number;
  quotedTotalCost: number | null;
  quotedMarginAmount: number | null;
};

export type OrderQuotedCommercialSummary = {
  revenue: number;
  quotedTotalCost: number | null;
  expectedProfit: number | null;
  expectedMarginRate: number | null;
  hasQuotedCost: boolean;
};

export function aggregateOrderQuotedCommercialSummary(
  items: OrderQuotedCommercialLine[],
): OrderQuotedCommercialSummary {
  const revenue = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const hasQuotedCost = items.some((item) => item.quotedTotalCost != null);

  if (!hasQuotedCost) {
    return {
      revenue,
      quotedTotalCost: null,
      expectedProfit: null,
      expectedMarginRate: null,
      hasQuotedCost: false,
    };
  }

  const quotedTotalCost = roundMoney(
    items.reduce((sum, item) => sum + (item.quotedTotalCost ?? 0), 0),
  );

  const expectedProfit = roundMoney(
    items.reduce((sum, item) => {
      if (item.quotedMarginAmount != null) return sum + item.quotedMarginAmount;
      if (item.quotedTotalCost != null) return sum + item.lineTotal - item.quotedTotalCost;
      return sum;
    }, 0),
  );

  const expectedMarginRate =
    revenue > 0 ? roundMoney((expectedProfit / revenue) * 100) : null;

  return {
    revenue,
    quotedTotalCost,
    expectedProfit,
    expectedMarginRate,
    hasQuotedCost: true,
  };
}

export const QUOTE_FINANCIALLY_LOCKED_STATUSES: QuoteStatus[] = [
  "SENT",
  "VIEWED",
  "ACCEPTED",
];

export function isQuoteFinanciallyLocked(status: QuoteStatus): boolean {
  return QUOTE_FINANCIALLY_LOCKED_STATUSES.includes(status);
}

export type QuoteItemFinancialSnapshot = {
  id?: string | null;
  sortOrder?: number;
  quantity: number;
  unitPrice: number;
  costEstimate: number | null;
  marginAmount: number | null;
  marginRate: number | null;
  pricingSnapshot: unknown;
};

function pricingSnapshotKey(snapshot: unknown): string {
  if (snapshot == null) return "";
  try {
    return JSON.stringify(snapshot);
  } catch {
    return String(snapshot);
  }
}

function financialFieldsEqual(
  existing: QuoteItemFinancialSnapshot,
  incoming: QuoteItemFinancialSnapshot,
): boolean {
  return (
    existing.quantity === incoming.quantity &&
    existing.unitPrice === incoming.unitPrice &&
    existing.costEstimate === incoming.costEstimate &&
    existing.marginAmount === incoming.marginAmount &&
    existing.marginRate === incoming.marginRate &&
    pricingSnapshotKey(existing.pricingSnapshot) === pricingSnapshotKey(incoming.pricingSnapshot)
  );
}

export function assertQuoteFinancialFieldsImmutable(
  status: QuoteStatus,
  existingItems: QuoteItemFinancialSnapshot[],
  incomingItems: QuoteItemFinancialSnapshot[],
): void {
  if (!isQuoteFinanciallyLocked(status)) return;

  if (status === "ACCEPTED" && incomingItems.length !== existingItems.length) {
    throw new QuoteFinancialLockError(
      "Báo giá đã được khách đồng ý. Tạo bản sao để thay đổi dòng sản phẩm hoặc giá.",
    );
  }

  const existingByKey = new Map(
    existingItems.map((item, index) => [
      item.id ?? `sort:${item.sortOrder ?? index}`,
      item,
    ]),
  );

  for (let index = 0; index < incomingItems.length; index += 1) {
    const incoming = incomingItems[index];
    const key = incoming.id ?? `sort:${incoming.sortOrder ?? index}`;
    const existing = existingByKey.get(key);
    if (!existing) {
      throw new QuoteFinancialLockError(
        "Không thể thêm hoặc xóa dòng trên báo giá đã phát hành. Tạo bản sao để chỉnh sửa.",
      );
    }
    if (!financialFieldsEqual(existing, incoming)) {
      throw new QuoteFinancialLockError(
        "Không thể thay đổi số lượng, đơn giá hoặc giá vốn trên báo giá đã phát hành. Tạo bản sao để chỉnh sửa.",
      );
    }
  }
}

export class QuoteFinancialLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteFinancialLockError";
  }
}
