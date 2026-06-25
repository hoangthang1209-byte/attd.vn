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
 *
 * Priority:
 * 1. Exact fully selected variant image
 * 2. Selected color product-specific option-value image
 * 3. Same-color sibling variant image (stable SKU, then id)
 * 4. Product featured/primary image
 */
export function resolvePdpGalleryImageUrl(
  variants: PublicProductVariantDetail[],
  optionGroups: ProductOptionGroup[],
  selection: OptionSelectionState,
  productImageUrls?: ReadonlySet<string>,
  primaryImageUrl?: string | null,
): string | null {
  const accept = (url: string | null | undefined) =>
    productImageUrls
      ? acceptProductScopedImageUrl(url, productImageUrls)
      : url && isValidImageSrc(url)
        ? url.trim()
        : null;

  if (variants.length > 0) {
    const selectedVariant = findVariantBySelection(variants, optionGroups, selection);
    const fromSelected = accept(selectedVariant?.imageUrl);
    if (fromSelected) return fromSelected;

    const colorSlug = findColorGroupSlug(optionGroups);
    const selectedColor = colorSlug ? selection[colorSlug] : null;

    if (selectedColor && colorSlug) {
      const colorGroup = optionGroups.find((group) => group.slug === colorSlug);
      const optionValue = colorGroup?.values.find((value) => value.label === selectedColor);
      const fromColorOption = accept(optionValue?.imageUrl);
      if (fromColorOption) return fromColorOption;

      const colorVariants = variants
        .filter((variant) => variant.optionSelections[colorSlug] === selectedColor)
        .slice()
        .sort((a, b) => a.sku.localeCompare(b.sku) || a.id.localeCompare(b.id));

      const fromSibling = colorVariants
        .map((variant) => accept(variant.imageUrl))
        .find((url): url is string => Boolean(url));
      if (fromSibling) return fromSibling;
    }
  }

  return accept(primaryImageUrl);
}

export function selectionSignature(selection: OptionSelectionState): string {
  return Object.entries(selection)
    .filter(([, value]) => value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, value]) => `${slug}:${value}`)
    .join("|");
}
