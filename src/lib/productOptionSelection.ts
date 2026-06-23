import type {
  ProductOptionGroup,
  PublicProductVariantDetail,
} from "@/features/products/product-detail.types";
import { isValidImageSrc } from "@/lib/imagePaths";
import { acceptProductScopedImageUrl } from "@/lib/productImageScope";

export type OptionSelectionState = Record<string, string | null>;

export function getInitialSelection(
  optionGroups: ProductOptionGroup[],
): OptionSelectionState {
  const state: OptionSelectionState = {};
  for (const group of optionGroups) {
    state[group.slug] = null;
  }
  return state;
}

export function isColorOptionGroup(group: ProductOptionGroup): boolean {
  const slug = group.slug.toLowerCase();
  const name = group.name.toLowerCase();
  return slug.includes("color") || slug.includes("mau") || name.includes("màu");
}

export function findColorGroupSlug(optionGroups: ProductOptionGroup[]): string | null {
  const group = optionGroups.find(isColorOptionGroup);
  return group?.slug ?? null;
}

export function getAvailableValues(
  variants: PublicProductVariantDetail[],
  optionGroups: ProductOptionGroup[],
  groupSlug: string,
  selection: OptionSelectionState,
): ProductOptionGroup["values"] {
  const group = optionGroups.find((g) => g.slug === groupSlug);
  if (!group) return [];

  const otherGroups = optionGroups.filter((g) => g.slug !== groupSlug);
  const matchingVariants = variants.filter((variant) =>
    otherGroups.every((g) => {
      const selected = selection[g.slug];
      if (!selected) return true;
      return variant.optionSelections[g.slug] === selected;
    }),
  );

  const labels = new Set(
    matchingVariants
      .map((v) => v.optionSelections[groupSlug])
      .filter(Boolean) as string[],
  );

  return group.values.filter((value) => labels.has(value.label));
}

export function isValueAvailable(
  variants: PublicProductVariantDetail[],
  optionGroups: ProductOptionGroup[],
  groupSlug: string,
  valueLabel: string,
  selection: OptionSelectionState,
): boolean {
  return getAvailableValues(variants, optionGroups, groupSlug, selection).some(
    (value) => value.label === valueLabel,
  );
}

export function findVariantBySelection(
  variants: PublicProductVariantDetail[],
  optionGroups: ProductOptionGroup[],
  selection: OptionSelectionState,
): PublicProductVariantDetail | null {
  if (!variants.length) return null;

  const requiredGroups = optionGroups.filter((group) =>
    variants.some((variant) => Boolean(variant.optionSelections[group.slug])),
  );

  for (const group of requiredGroups) {
    if (!selection[group.slug]) return null;
  }

  return (
    variants.find((variant) =>
      requiredGroups.every(
        (group) => variant.optionSelections[group.slug] === selection[group.slug],
      ),
    ) ?? null
  );
}

/**
 * Resolve the gallery hero image from current option selection.
 * Color is the dominant visual selector; size alone does not change image unless
 * the exact selected variant has its own image.
 */
export function resolvePdpGalleryImageUrl(
  variants: PublicProductVariantDetail[],
  optionGroups: ProductOptionGroup[],
  selection: OptionSelectionState,
  productImageUrls?: ReadonlySet<string>,
): string | null {
  if (!variants.length) return null;

  const accept = (url: string | null | undefined) =>
    productImageUrls
      ? acceptProductScopedImageUrl(url, productImageUrls)
      : url && isValidImageSrc(url)
        ? url
        : null;

  const selectedVariant = findVariantBySelection(variants, optionGroups, selection);
  const fromSelected = accept(selectedVariant?.imageUrl);
  if (fromSelected) return fromSelected;

  const colorSlug = findColorGroupSlug(optionGroups);
  const selectedColor = colorSlug ? selection[colorSlug] : null;
  if (!selectedColor || !colorSlug) {
    return null;
  }

  const colorVariants = variants.filter(
    (variant) => variant.optionSelections[colorSlug] === selectedColor,
  );

  const partialMatch = colorVariants.find((variant) => {
    if (!accept(variant.imageUrl)) return false;
    return optionGroups.every((group) => {
      if (group.slug === colorSlug) return true;
      const selected = selection[group.slug];
      if (!selected) return true;
      return variant.optionSelections[group.slug] === selected;
    });
  });
  const fromPartial = accept(partialMatch?.imageUrl);
  if (fromPartial) return fromPartial;

  const anyColorVariant = colorVariants.find((variant) => accept(variant.imageUrl));
  const fromColor = accept(anyColorVariant?.imageUrl);
  if (fromColor) return fromColor;

  const colorGroup = optionGroups.find((group) => group.slug === colorSlug);
  const optionValue = colorGroup?.values.find((value) => value.label === selectedColor);
  return accept(optionValue?.imageUrl);
}

export function selectionSignature(selection: OptionSelectionState): string {
  return Object.entries(selection)
    .filter(([, value]) => value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, value]) => `${slug}:${value}`)
    .join("|");
}
