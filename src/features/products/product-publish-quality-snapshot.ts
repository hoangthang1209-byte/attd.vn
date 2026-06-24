import type { VariantStatus } from "@prisma/client";
import type { ProductPublishQualityInput } from "@/lib/seo/publish-quality-gate";

/** Creation default for variants without an explicit status in admin input. */
export const DEFAULT_NEW_VARIANT_PUBLISH_STATUS: VariantStatus = "ACTIVE";

export type PersistedVariantPublishFields = {
  id: string;
  variantStatus: VariantStatus;
  imageUrl: string | null;
};

export type VariantPublishQualityInput = {
  id?: string;
  variantStatus?: VariantStatus;
  imageUrl?: string | null;
};

export function mergeVariantPublishQualityFields(
  variant: VariantPublishQualityInput,
  persisted?: Pick<PersistedVariantPublishFields, "variantStatus" | "imageUrl">,
): { variantStatus: VariantStatus; imageUrl: string | null } {
  return {
    variantStatus:
      variant.variantStatus ?? persisted?.variantStatus ?? DEFAULT_NEW_VARIANT_PUBLISH_STATUS,
    imageUrl:
      variant.imageUrl !== undefined
        ? variant.imageUrl?.trim()
          ? variant.imageUrl.trim()
          : null
        : (persisted?.imageUrl ?? null),
  };
}

export function buildPublishQualityVariantsFromUpdateInput(
  inputVariants: VariantPublishQualityInput[],
  existingVariants: PersistedVariantPublishFields[],
): ProductPublishQualityInput["variants"] {
  const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));
  return inputVariants.map((variant) =>
    mergeVariantPublishQualityFields(
      variant,
      variant.id ? existingById.get(variant.id) : undefined,
    ),
  );
}

export function mapPersistedProductToPublishQualityInput(product: {
  name: string;
  slug: string;
  categoryId: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImage: string | null;
  gallery: string[];
  images: Array<{ imageUrl: string }>;
  variants: Array<{ variantStatus: VariantStatus; imageUrl: string | null }>;
  specifications: Array<{ label: string; value: string }>;
  attributeAssignments: Array<{
    attributeId: string;
    attributeValueId: string | null;
    customValue: string | null;
  }>;
  options: Array<{ values: Array<{ label: string }> }>;
}): ProductPublishQualityInput {
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    featuredImage: product.featuredImage,
    gallery: product.gallery,
    productImages: product.images.map((image) => image.imageUrl),
    variants: product.variants.map((variant) => ({
      variantStatus: variant.variantStatus,
      imageUrl: variant.imageUrl,
    })),
    specifications: product.specifications.map((row) => ({
      label: row.label,
      value: row.value,
    })),
    attributeAssignments: product.attributeAssignments.map((row) => ({
      attributeId: row.attributeId,
      attributeValueId: row.attributeValueId,
      customValue: row.customValue,
    })),
    options: product.options.map((group) => ({
      values: group.values.map((value) => ({ label: value.label })),
    })),
  };
}

export function mapCreateInputVariantsToPublishQualityInput(
  variants: VariantPublishQualityInput[] | undefined,
): ProductPublishQualityInput["variants"] {
  return (variants ?? []).map((variant) => mergeVariantPublishQualityFields(variant));
}
