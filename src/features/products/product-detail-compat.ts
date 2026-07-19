import { Prisma } from "@prisma/client";

/** Prisma P2021 or missing catalog table/column messages from partially migrated DBs. */
export function isPartialCatalogSchemaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022") return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    /does not exist in the current database/i.test(message) &&
    /ProductOption|ProductSpecification|ProductCustomizationCapability|ProductAttributeAssignment|ProductVariantOptionValue|ProductOptionValue|ProductVariant\.(displayLabel|moqOverride|leadTimeOverride|materialOverride)/i.test(
      message,
    )
  );
}

/** Explicit select compatible with pre–Sprint 27.2 catalog migrations. */
export const PRODUCT_DETAIL_LEGACY_SELECT = {
  id: true,
  slug: true,
  name: true,
  productCode: true,
  shortDescription: true,
  description: true,
  // descriptionBlocks omitted on legacy path — partial DBs without the column stay compatible
  seoTitle: true,
  seoDescription: true,
  material: true,
  form: true,
  fit: true,
  gsm: true,
  defaultMoq: true,
  leadTime: true,
  supportsPrinting: true,
  supportsEmbroidery: true,
  supportsOem: true,
  useCases: true,
  targetCustomers: true,
  featuredImage: true,
  gallery: true,
  metadata: true,
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: {
    where: { variantStatus: "ACTIVE" as const },
    select: {
      id: true,
      sku: true,
      colorName: true,
      colorCode: true,
      sizeName: true,
      dimensions: true,
      capacity: true,
      stockStatus: true,
      stockQty: true,
      imageUrl: true,
      color: { select: { name: true, hex: true } },
      size: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.ProductSelect;

export type LegacyProductDetailRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_DETAIL_LEGACY_SELECT;
}>;

export function normalizeLegacyProductRow(row: LegacyProductDetailRow) {
  return {
    ...row,
    options: [] as [],
    specifications: [] as [],
    attributeAssignments: [] as [],
    customizationCapabilities: [] as [],
    variants: row.variants.map((variant) => ({
      ...variant,
      displayLabel: null,
      moqOverride: null,
      leadTimeOverride: null,
      materialOverride: null,
      optionValues: [] as [],
    })),
  };
}
