import { isValidImageSrc } from "@/lib/imagePaths";

export type PatternCategoryVisualInput = {
  name?: string | null;
  imageUrl?: string | null;
  featuredImage?: string | null;
};

export function resolvePatternCategoryImageUrl(
  source: PatternCategoryVisualInput | null | undefined,
): string | null {
  if (!source) return null;
  if (source.imageUrl && isValidImageSrc(source.imageUrl)) return source.imageUrl;
  if (source.featuredImage && isValidImageSrc(source.featuredImage)) return source.featuredImage;
  return null;
}

export function getPatternCategoryInitials(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "—";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toLocaleUpperCase("vi");
  }
  return trimmed.slice(0, 2).toLocaleUpperCase("vi");
}

export function normalizePatternCategoryVisual(
  category:
    | {
        name: string;
        imageUrl?: string | null;
        featuredImage?: string | null;
        products?: Array<{ featuredImage: string | null }>;
      }
    | null
    | undefined,
): PatternCategoryVisualInput | null {
  if (!category) return null;
  return {
    name: category.name,
    imageUrl: category.imageUrl ?? null,
    featuredImage:
      category.featuredImage ?? category.products?.[0]?.featuredImage ?? null,
  };
}
