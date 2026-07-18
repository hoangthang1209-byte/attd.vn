import {
  mapProductCardAvailableColors,
  type ProductCardColorProductInput,
  type ProductCardColorSwatch,
} from "@/features/products/product-card-color-swatches";
import {
  mapPublicProductCardSalesBadges,
  type PublicProductSalesBadge,
} from "@/features/products/product-sales-badges";
import { getPrimaryProductImageFromProduct, getProductCardHoverImageFromProduct } from "@/lib/productImages";

export const RECENTLY_VIEWED_PRODUCTS_STORAGE_KEY = "attd_recent_product_slugs";
export const RECENTLY_VIEWED_PRODUCTS_LIMIT = 12;

export type ProductDiscoveryCard = {
  id: string;
  slug: string;
  name: string;
  productCode?: string | null;
  category?: string;
  imageUrl?: string | null;
  hoverImageUrl?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  salesBadges?: PublicProductSalesBadge[];
  availableColors?: ProductCardColorSwatch[];
};

type ProductDiscoveryInput = ProductCardColorProductInput & {
  id: string;
  slug: string;
  name: string;
  productCode?: string | null;
  featuredImage?: string | null;
  gallery?: string[] | unknown;
  defaultMoq?: number | null;
  leadTime?: string | null;
  supportsPrinting?: boolean | null;
  supportsOem?: boolean | null;
  category?: { name?: string | null } | null;
  images?: { imageUrl: string; altText?: string | null; sortOrder?: number }[] | null;
};

export function normalizeProductSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  if (!slug || slug.length > 120) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return null;
  return slug;
}

export function normalizeRecentProductSlugs(input: unknown, limit = RECENTLY_VIEWED_PRODUCTS_LIMIT): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of input) {
    const slug = normalizeProductSlug(item);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    normalized.push(slug);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

export function addRecentlyViewedProductSlug(
  input: unknown,
  currentSlug: string,
  limit = RECENTLY_VIEWED_PRODUCTS_LIMIT,
): string[] {
  const slug = normalizeProductSlug(currentSlug);
  if (!slug) return normalizeRecentProductSlugs(input, limit);
  return normalizeRecentProductSlugs([slug, ...normalizeRecentProductSlugs(input, limit)], limit);
}

export function getRenderableRecentProductSlugs(
  input: unknown,
  currentSlug: string,
  limit = RECENTLY_VIEWED_PRODUCTS_LIMIT,
): string[] {
  const current = normalizeProductSlug(currentSlug);
  return normalizeRecentProductSlugs(input, limit).filter((slug) => slug !== current);
}

export function dedupeProductRailSlugs<T extends { slug: string }>(
  products: T[],
  excludedSlugs: Iterable<string> = [],
): T[] {
  const seen = new Set<string>(Array.from(excludedSlugs).map((slug) => slug.trim()).filter(Boolean));
  const result: T[] = [];

  for (const product of products) {
    const slug = normalizeProductSlug(product.slug);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push(product);
  }

  return result;
}

export function mapProductToDiscoveryCard(product: ProductDiscoveryInput): ProductDiscoveryCard {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    productCode: product.productCode,
    category: product.category?.name ?? "",
    imageUrl: getPrimaryProductImageFromProduct({ ...product, images: product.images ?? [] }),
    hoverImageUrl: getProductCardHoverImageFromProduct({ ...product, images: product.images ?? [] }),
    moq: product.defaultMoq,
    leadTime: product.leadTime,
    salesBadges: mapPublicProductCardSalesBadges({
      defaultMoq: product.defaultMoq,
      supportsPrinting: product.supportsPrinting === true ? true : undefined,
      supportsOem: product.supportsOem === true ? true : undefined,
      metadata: product.metadata,
    }),
    availableColors: mapProductCardAvailableColors(product),
  };
}
