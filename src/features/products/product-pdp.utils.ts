/** Client-safe PDP helpers (no server/Prisma imports). */

export function resolveQuoteVariantId(
  variants: Array<{ id: string; variantStatus?: string }>,
  selectedVariantId: string | null,
): string | null {
  const active = variants.filter((v) => (v.variantStatus ?? "ACTIVE") === "ACTIVE");
  if (!active.length) return null;
  if (selectedVariantId && active.some((v) => v.id === selectedVariantId)) {
    return selectedVariantId;
  }
  return null;
}
