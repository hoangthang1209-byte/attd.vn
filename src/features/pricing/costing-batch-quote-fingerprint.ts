import { createHash } from "node:crypto";

/**
 * Commercial fingerprint for Costing Batch ↔ Quote revision lifecycle.
 *
 * Counts as a change (dirty vs last quote):
 * - add/remove style (item id / calculation id set)
 * - product / custom style identity
 * - quantity
 * - selling price
 * - selected calculation / revision (calculationId, revisionLabel, isFinal)
 * - cost estimate that would enter the next quote snapshot
 * - batch customer / contact
 *
 * Does NOT count:
 * - groupLabel (UI grouping only; not written onto QuoteItem commercial fields)
 * - batch title / internalNote alone
 */
export type BatchQuoteFingerprintRow = {
  itemId: string;
  calculationId: string | null;
  productId: string | null;
  customProductName: string | null;
  quantity: number | null;
  sellingPricePerUnit: number | null;
  /** Total cost estimate for the line (same basis as QuoteItem.costEstimate). */
  costEstimate: number | null;
  revisionLabel: string | null;
  isFinal: boolean;
};

export type BatchQuoteFingerprintInput = {
  customerId: string | null;
  contactId: string | null;
  rows: BatchQuoteFingerprintRow[];
};

function roundMoney(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function buildBatchQuoteFingerprintPayload(input: BatchQuoteFingerprintInput) {
  const rows = [...input.rows]
    .map((row) => ({
      itemId: row.itemId,
      calculationId: row.calculationId,
      productId: row.productId,
      customProductName: row.customProductName?.trim() || null,
      quantity: row.quantity,
      sellingPricePerUnit: roundMoney(row.sellingPricePerUnit),
      costEstimate: roundMoney(row.costEstimate),
      revisionLabel: row.revisionLabel,
      isFinal: row.isFinal,
    }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));

  return {
    customerId: input.customerId,
    contactId: input.contactId,
    rows,
  };
}

export function computeBatchQuoteFingerprint(input: BatchQuoteFingerprintInput): string {
  const payload = buildBatchQuoteFingerprintPayload(input);
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function isBatchChangedSinceQuote(
  currentFingerprint: string,
  lastQuotedFingerprint: string | null | undefined,
): boolean {
  if (!lastQuotedFingerprint) return false;
  return currentFingerprint !== lastQuotedFingerprint;
}
