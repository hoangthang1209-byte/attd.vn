import type { VariantStatus } from "@prisma/client";
import { evaluateProductPublishQuality } from "@/lib/seo/publish-quality-gate";
import { readProductEntryFromMetadata } from "@/features/products/product-entry-modes";
import type { ProductSetupChecklistInput } from "@/features/products/product-setup-checklist";

export type SetupChecklistProductInput = {
  name: string;
  slug: string | null;
  shortDescription: string | null;
  description: string | null;
  categoryId: string;
  category?: { skuCode?: string | null } | null;
  featuredImage: string | null;
  gallery?: string[] | null;
  images?: Array<{ imageUrl: string }> | null;
  variants?: Array<{ variantStatus: VariantStatus; imageUrl: string | null }> | null;
  specifications?: Array<{ label: string; value: string }> | null;
  attributeAssignments?: Array<{
    attributeId: string;
    attributeValueId: string | null;
    customValue: string | null;
  }> | null;
  options?: Array<{ values: Array<{ label: string }> }> | null;
  defaultMoq: number | null;
  leadTime: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  metadata?: unknown;
};

/** Maps a persisted admin product into checklist input. Graceful for products without metadata.productEntry. */
export function buildProductSetupChecklistInputFromProduct(
  product: SetupChecklistProductInput,
): ProductSetupChecklistInput {
  const entry = readProductEntryFromMetadata(product.metadata);
  const variants = product.variants ?? [];
  const activeVariantCount = variants.filter((v) => v.variantStatus === "ACTIVE").length;

  const publishResult = evaluateProductPublishQuality({
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    featuredImage: product.featuredImage,
    gallery: product.gallery ?? [],
    productImages: (product.images ?? []).map((image) => image.imageUrl),
    variants: variants.map((v) => ({ variantStatus: v.variantStatus, imageUrl: v.imageUrl })),
    specifications: product.specifications ?? [],
    attributeAssignments: product.attributeAssignments ?? [],
    options: product.options ?? [],
    productMode: entry.mode ?? null,
    pricingMode: entry.pricingMode ?? null,
    stockMode: entry.stockMode ?? null,
    defaultMoq: product.defaultMoq,
    leadTime: product.leadTime,
    supportsPrinting: product.supportsPrinting,
    supportsEmbroidery: product.supportsEmbroidery,
    supportsOem: product.supportsOem,
  });

  const hasImage =
    Boolean(product.featuredImage?.trim()) ||
    (product.gallery ?? []).some((url) => url.trim()) ||
    (product.images ?? []).some((image) => image.imageUrl.trim()) ||
    variants.some((v) => Boolean(v.imageUrl?.trim()));

  return {
    productMode: entry.mode ?? null,
    productTemplateKey: entry.templateKey ?? null,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    hasImage,
    categoryId: product.categoryId,
    categoryHasSkuCode: Boolean(product.category?.skuCode?.trim()),
    activeVariantCount,
    defaultMoq: product.defaultMoq,
    leadTime: product.leadTime,
    pricingMode: entry.pricingMode ?? null,
    stockMode: entry.stockMode ?? null,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    hasSeoFallback: Boolean(product.seoTitle?.trim() && product.seoDescription?.trim()),
    publishReady: publishResult.valid,
  };
}
