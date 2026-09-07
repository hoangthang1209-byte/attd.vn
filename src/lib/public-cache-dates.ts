/** Revive Date fields after Next.js `unstable_cache` JSON round-trip. */
export function asCachedDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function asCachedDateRequired(
  value: Date | string | null | undefined,
  fallback: Date = new Date(0),
): Date {
  return asCachedDate(value) ?? fallback;
}
