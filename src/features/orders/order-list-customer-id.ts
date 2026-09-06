/**
 * Validate `customerId` query values for order listing.
 * Accepts Prisma cuid / cuid-like ids only — rejects empty, oversized, or unsafe strings.
 */
export function parseOrderListCustomerId(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const id = value.trim();
  if (!id) return undefined;
  if (id.length > 64) return undefined;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return undefined;
  return id;
}
