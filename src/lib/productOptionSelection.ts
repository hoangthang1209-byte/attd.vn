import type {
  ProductOptionGroup,
  PublicProductVariantDetail,
} from "@/features/products/product-detail.types";

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

export function selectionSignature(selection: OptionSelectionState): string {
  return Object.entries(selection)
    .filter(([, value]) => value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, value]) => `${slug}:${value}`)
    .join("|");
}
