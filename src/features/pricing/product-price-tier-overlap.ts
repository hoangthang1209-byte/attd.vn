export type ProductPriceTierOverlapFields = {
  id?: string;
  productId: string;
  variantId: string | null;
  priceGroupId: string;
  minQuantity: number;
  maxQuantity: number | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  isActive: boolean;
};

function quantityRangesOverlap(
  minA: number,
  maxA: number | null,
  minB: number,
  maxB: number | null,
): boolean {
  const endA = maxA ?? Number.POSITIVE_INFINITY;
  const endB = maxB ?? Number.POSITIVE_INFINITY;
  return minA <= endB && minB <= endA;
}

function effectiveDateRangesOverlap(
  fromA: Date | null,
  toA: Date | null,
  fromB: Date | null,
  toB: Date | null,
): boolean {
  const startA = fromA?.getTime() ?? Number.NEGATIVE_INFINITY;
  const endA = toA?.getTime() ?? Number.POSITIVE_INFINITY;
  const startB = fromB?.getTime() ?? Number.NEGATIVE_INFINITY;
  const endB = toB?.getTime() ?? Number.POSITIVE_INFINITY;
  return startA <= endB && startB <= endA;
}

function sameVariantScope(a: string | null, b: string | null): boolean {
  return (a ?? null) === (b ?? null);
}

export function tiersOverlap(a: ProductPriceTierOverlapFields, b: ProductPriceTierOverlapFields): boolean {
  if (a.id && b.id && a.id === b.id) return false;
  if (a.productId !== b.productId) return false;
  if (a.priceGroupId !== b.priceGroupId) return false;
  if (!sameVariantScope(a.variantId, b.variantId)) return false;
  if (!a.isActive || !b.isActive) return false;
  if (!quantityRangesOverlap(a.minQuantity, a.maxQuantity, b.minQuantity, b.maxQuantity)) return false;
  if (!effectiveDateRangesOverlap(a.effectiveFrom, a.effectiveTo, b.effectiveFrom, b.effectiveTo)) {
    return false;
  }
  return true;
}

export function findOverlappingActiveTier(
  candidate: ProductPriceTierOverlapFields,
  existing: ProductPriceTierOverlapFields[],
): ProductPriceTierOverlapFields | null {
  if (!candidate.isActive) return null;
  for (const row of existing) {
    if (tiersOverlap(candidate, row)) return row;
  }
  return null;
}

export const PRODUCT_PRICE_TIER_OVERLAP_ERROR =
  "Đã tồn tại bảng giá hoạt động trùng sản phẩm, biến thể, nhóm giá, khoảng số lượng hoặc thời gian hiệu lực.";
