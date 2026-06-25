import { isValidImageSrc } from "@/lib/imagePaths";
import type { ProductImageRecord } from "@/lib/productImages";
import { buildProductImageUrlSet, buildPdpImageAllowlist, isProductScopedImageUrl, acceptProductScopedImageUrl } from "@/lib/productImageScope";

export type PublicVariantRow = {
  id: string;
  sku: string;
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
  stockStatus: string;
  imageUrl?: string | null;
  stockQty?: number | null;
};

export const VARIANT_STOCK_LABELS: Record<string, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết hàng",
  OUT_OF_STOCK: "Hết hàng / Đặt trước",
};

export const VARIANT_STOCK_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LOW_STOCK: "#d97706",
  OUT_OF_STOCK: "#dc2626",
};

export function getVariantSizeKey(v: PublicVariantRow): string | null {
  return v.sizeName ?? v.capacity ?? v.dimensions ?? null;
}

export function uniqueStrings(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

export type ColorOption = {
  name: string;
  colorCode?: string | null;
  imageUrl?: string | null;
};

export function getColorOptions(variants: PublicVariantRow[]): ColorOption[] {
  const map = new Map<string, ColorOption>();

  for (const v of variants) {
    if (!v.colorName) continue;
    const prev = map.get(v.colorName);
    const imageUrl =
      v.imageUrl && isValidImageSrc(v.imageUrl)
        ? v.imageUrl
        : prev?.imageUrl ?? null;

    map.set(v.colorName, {
      name: v.colorName,
      colorCode: v.colorCode ?? prev?.colorCode ?? null,
      imageUrl,
    });
  }

  return Array.from(map.values());
}

export function getSizeOptions(
  variants: PublicVariantRow[],
  selectedColor: string | null
): string[] {
  const pool = selectedColor
    ? variants.filter((v) => v.colorName === selectedColor)
    : variants;

  return uniqueStrings(pool.map(getVariantSizeKey));
}

export function findVariant(
  variants: PublicVariantRow[],
  color: string | null,
  size: string | null
): PublicVariantRow | null {
  if (variants.length === 0) return null;

  const match = variants.find((v) => {
    const colorOk = !color || v.colorName === color;
    const sizeKey = getVariantSizeKey(v);
    const sizeOk = !size || sizeKey === size;
    return colorOk && sizeOk;
  });

  return match ?? variants[0] ?? null;
}

/** Resolve variant from explicit user selection — no fallback to first variant. */
export function findSelectedVariant(
  variants: PublicVariantRow[],
  color: string | null,
  size: string | null
): PublicVariantRow | null {
  if (variants.length === 0) return null;

  const hasColors = variants.some((v) => v.colorName);
  const hasSizes = variants.some((v) => getVariantSizeKey(v));

  if (hasColors && !color) return null;
  if (hasSizes && !size) return null;
  if (!color && !size) return null;

  return (
    variants.find((v) => {
      const colorOk = !color || v.colorName === color;
      const sizeKey = getVariantSizeKey(v);
      const sizeOk = !size || sizeKey === size;
      return colorOk && sizeOk;
    }) ?? null
  );
}

/** Dev-only warning when SKU token and colorCode disagree (data quality). */
export function warnVariantColorSkuMismatch(variant: PublicVariantRow): void {
  if (process.env.NODE_ENV === "production") return;

  const sku = variant.sku?.toUpperCase() ?? "";
  const code = variant.colorCode?.toUpperCase() ?? "";
  if (!sku || !code) return;

  const skuTokens: Record<string, string[]> = {
    WHT: ["WHITE", "WHT"],
    BLK: ["BLACK", "BLK"],
    RED: ["RED"],
    BLU: ["BLUE", "BLU"],
  };

  for (const [token, hints] of Object.entries(skuTokens)) {
    const skuHas = hints.some((h) => sku.includes(h));
    const codeIs = code === token || hints.includes(code);
    if (skuHas && !codeIs) {
      console.warn(
        `[PDP] Variant ${variant.sku}: SKU suggests ${token} but colorCode is ${variant.colorCode}; displaying colorName "${variant.colorName}".`
      );
      return;
    }
  }
}

export function warnAllVariantMismatches(variants: PublicVariantRow[]): void {
  for (const v of variants) warnVariantColorSkuMismatch(v);
}

export function isSizeAvailable(
  variants: PublicVariantRow[],
  color: string | null,
  size: string
): boolean {
  return variants.some(
    (v) =>
      (!color || v.colorName === color) && getVariantSizeKey(v) === size
  );
}

export function getInitialSelection(variants: PublicVariantRow[]): {
  color: string | null;
  size: string | null;
  variant: PublicVariantRow | null;
} {
  const first = variants[0] ?? null;
  const color = first?.colorName ?? null;
  const sizes = getSizeOptions(variants, color);
  const size = sizes[0] ?? getVariantSizeKey(first!) ?? null;
  const variant = findVariant(variants, color, size);

  return { color, size, variant };
}

/**
 * Prepend the currently selected product-owned image to the gallery strip.
 * Selected variant/color URLs are allowed even when absent from stored gallery.
 */
export function mergeGalleryWithVariantImage(
  baseImages: ProductImageRecord[],
  selectedImageUrl?: string | null,
  productOwnedUrls?: ReadonlySet<string>,
): ProductImageRecord[] {
  const allowed = productOwnedUrls ?? buildProductImageUrlSet(baseImages);
  const scopedUrl = acceptProductScopedImageUrl(selectedImageUrl, allowed);
  if (!scopedUrl) {
    return baseImages;
  }

  const rest = baseImages.filter((img) => img.imageUrl !== scopedUrl);
  return [
    {
      id: "variant-selected",
      imageUrl: scopedUrl,
      altText: null,
      sortOrder: -1,
    },
    ...rest,
  ];
}

/** Append unique variant images already present in the product gallery. */
export function appendVariantImagesToGallery(
  baseImages: ProductImageRecord[],
  variants: PublicVariantRow[],
): ProductImageRecord[] {
  const allowed = buildProductImageUrlSet(baseImages);
  const seen = new Set(baseImages.map((img) => img.imageUrl));
  const extra: ProductImageRecord[] = [];

  for (const v of variants) {
    if (
      v.imageUrl &&
      isProductScopedImageUrl(v.imageUrl, allowed) &&
      !seen.has(v.imageUrl)
    ) {
      seen.add(v.imageUrl);
      extra.push({
        id: `variant-${v.id}`,
        imageUrl: v.imageUrl,
        altText: v.colorName ?? null,
        sortOrder: 100 + extra.length,
      });
    }
  }

  return extra.length ? [...baseImages, ...extra] : baseImages;
}

export function buildInteractiveGalleryImages(
  baseImages: ProductImageRecord[],
  variants: PublicVariantRow[],
  selectedVariant: PublicVariantRow | null,
  prependVariantImage = false
): ProductImageRecord[] {
  const ownedUrls = buildPdpImageAllowlist({
    images: baseImages,
    variantImageUrls: variants.map((variant) => variant.imageUrl),
  });
  const withVariants = appendVariantImagesToGallery(baseImages, variants);
  if (!prependVariantImage || !selectedVariant?.imageUrl) {
    return withVariants;
  }
  return mergeGalleryWithVariantImage(withVariants, selectedVariant.imageUrl, ownedUrls);
}
