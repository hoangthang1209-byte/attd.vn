/** Use the explicit preparer when available, otherwise the assigned consultant. */
export function resolveQuoteIssuerName(
  preparedBy: string | null | undefined,
  salesName: string | null | undefined,
): string | null {
  return preparedBy?.trim() || salesName?.trim() || null;
}
