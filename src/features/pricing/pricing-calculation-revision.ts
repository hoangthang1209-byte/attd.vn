type CostingInputSnapshot = {
  calculator?: string;
  productId?: string;
  customProductName?: string;
};

export type CostingRevisionContext = {
  productId: string | null;
  customProductName: string | null;
  customerId: string | null;
};

export function extractCostingRevisionContext(
  inputSnapshot: unknown,
  firstItemProductId: string | null,
  firstItemProductName: string | null,
): CostingRevisionContext {
  const snapshot =
    inputSnapshot && typeof inputSnapshot === "object"
      ? (inputSnapshot as CostingInputSnapshot)
      : null;

  return {
    productId: firstItemProductId ?? snapshot?.productId ?? null,
    customProductName:
      snapshot?.customProductName?.trim() || firstItemProductName?.trim() || null,
    customerId: null,
  };
}

export function deriveRevisionLabel(sequence: number): string {
  return `V${sequence}`;
}

export function formatRevisionDisplayLabel(
  revisionLabel: string | null,
  sequence: number,
  isFinal: boolean,
): string {
  const base = revisionLabel?.trim() || deriveRevisionLabel(sequence);
  return isFinal ? `${base} — FINAL` : base;
}
