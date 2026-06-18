import { isValidImageSrc } from "@/lib/imagePaths";
import type { ProductImageRecord } from "@/lib/productImages";

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

/** Put selected variant image first without duplicating URLs. */
export function mergeGalleryWithVariantImage(
  baseImages: ProductImageRecord[],
  variantImageUrl?: string | null
): ProductImageRecord[] {
  if (!variantImageUrl || !isValidImageSrc(variantImageUrl)) {
    return baseImages;
  }

  const rest = baseImages.filter((img) => img.imageUrl !== variantImageUrl);
  return [
    {
      id: "variant-selected",
      imageUrl: variantImageUrl,
      altText: null,
      sortOrder: -1,
    },
    ...rest,
  ];
}

/** Append unique variant images not already in product gallery. */
export function appendVariantImagesToGallery(
  baseImages: ProductImageRecord[],
  variants: PublicVariantRow[]
): ProductImageRecord[] {
  const seen = new Set(baseImages.map((img) => img.imageUrl));
  const extra: ProductImageRecord[] = [];

  for (const v of variants) {
    if (v.imageUrl && isValidImageSrc(v.imageUrl) && !seen.has(v.imageUrl)) {
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
  selectedVariant: PublicVariantRow | null
): ProductImageRecord[] {
  const withVariants = appendVariantImagesToGallery(baseImages, variants);
  return mergeGalleryWithVariantImage(
    withVariants,
    selectedVariant?.imageUrl
  );
}
