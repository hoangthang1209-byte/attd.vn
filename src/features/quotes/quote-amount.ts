import type { Prisma } from "@prisma/client";

/** Resolved quote total respecting manual override (shared across sales, search, follow-up). */
export function resolveQuoteDisplayAmount(row: {
  totalAmount: Prisma.Decimal | number | null | undefined;
  manualOverride?: boolean | null;
  manualTotalAmount?: Prisma.Decimal | number | null;
}): number | null {
  if (row.manualOverride && row.manualTotalAmount != null) {
    return typeof row.manualTotalAmount === "number"
      ? row.manualTotalAmount
      : row.manualTotalAmount.toNumber();
  }
  if (row.totalAmount == null) return null;
  return typeof row.totalAmount === "number" ? row.totalAmount : row.totalAmount.toNumber();
}
