import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { BulkVariantResult } from "@/features/products/product-variant-bulk.service";
import {
  parseCuratedSalesBadgeKeysFromMetadata,
  type ProductCuratedBadgeKey,
} from "@/features/products/product-sales-badges";
import {
  parsePublicSizeChartFromMetadata,
  type ProductSizeChart,
} from "@/features/products/product-size-chart";
import {
  readProductEntryFromMetadata,
  type ProductEntryMode,
  type ProductPricingMode,
  type ProductStockMode,
} from "@/features/products/product-entry-modes";
import type { ProductDescriptionBlock } from "@/features/products/product-description-blocks";
import { parseProductDescriptionBlocks } from "@/features/products/product-description-blocks";

export function mapDescriptionBlocksToFormState(raw: unknown): ProductDescriptionBlock[] {
  if (raw == null) return [];
  try {
    const parsed = parseProductDescriptionBlocks(raw);
    return parsed ?? [];
  } catch {
    return [];
  }
}

export type MatrixVariantFormRow = {
  id?: string;
  clientKey: string;
  variantKind: "structured" | "legacy";
  displayLabel: string;
  optionValueIds: string[];
  colorName: string;
  colorCode: string;
  sizeName: string;
  dimensions: string;
  capacity: string;
  sku: string;
  variantStatus: string;
  stockQty: string;
  stockStatus: string;
  moqOverride: string;
  leadTimeOverride: string;
  materialOverride: string;
  wholesalePrice: string;
  dealerPrice: string;
  imageUrl: string;
  internalNote: string;
};

type AdminProductOption = {
  id: string;
  attributeId?: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  values?: Array<{
    id: string;
    attributeValueId?: string | null;
    label: string;
    valueCode: string | null;
    imageUrl: string | null;
    sortOrder: number;
  }> | null;
};

type AdminProductVariant = {
  id: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
  dimensions: string | null;
  capacity: string | null;
  displayLabel: string | null;
  moqOverride: number | null;
  leadTimeOverride: string | null;
  materialOverride: string | null;
  wholesalePrice: number | null;
  dealerPrice: number | null;
  stockQty: number;
  stockStatus: string;
  variantStatus: string;
  imageUrl: string | null;
  internalNote: string | null;
  sku: string;
  optionValues?: Array<{ optionValueId: string }>;
};

type AdminProductSpecification = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
};

type AdminProductCustomization = {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
};

export type ProductAttributeAssignmentFormRow = {
  id?: string;
  clientKey: string;
  attributeId: string;
  attributeValueId?: string;
  customValue?: string;
  useCustomValue: boolean;
  sortOrder: number;
};

export type ProductAdminEditInitialData = {
  id: string;
  slug?: string;
  name: string;
  productCode: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  descriptionBlocks: ProductDescriptionBlock[];
  material: string;
  form: string;
  fit: string;
  defaultMoq: string;
  leadTime: string;
  useCases: string;
  targetCustomers: string;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  tags: string;
  status: string;
  featuredImage: string;
  gallery: string[];
  specifications: Array<{
    id: string;
    label: string;
    value: string;
    sortOrder: number;
  }>;
  attributeAssignments: ProductAttributeAssignmentFormRow[];
  customizations: Array<{
    id: string;
    label: string;
    description: string;
    sortOrder: number;
    enabled: boolean;
  }>;
  options: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
  seoTitle: string;
  seoDescription: string;
  curatedSalesBadges: ProductCuratedBadgeKey[];
  publicSizeChart: ProductSizeChart;
  productMode?: ProductEntryMode;
  productTemplateKey?: string;
  stockMode?: ProductStockMode;
  pricingMode?: ProductPricingMode;
};

function joinStringArray(value: unknown): string {
  return Array.isArray(value) ? value.map(String).join(", ") : "";
}

export function mapOptionsToFormRows(options: AdminProductOption[]): OptionGroupFormRow[] {
  return (options ?? []).map((option) => ({
    id: option.id,
    attributeId: option.attributeId ?? undefined,
    clientKey: option.id,
    name: option.name,
    slug: option.slug,
    sortOrder: option.sortOrder,
    values: (option.values ?? []).map((value) => ({
      id: value.id,
      attributeValueId: value.attributeValueId ?? undefined,
      clientKey: value.id,
      label: value.label,
      valueCode: value.valueCode ?? "",
      imageUrl: value.imageUrl ?? "",
      sortOrder: value.sortOrder,
    })),
  }));
}

export function mapVariantsToFormRows(variants: AdminProductVariant[]): MatrixVariantFormRow[] {
  return (variants ?? []).map((variant) => {
    const optionValueIds = variant.optionValues?.map((link) => link.optionValueId) ?? [];
    const isStructured = optionValueIds.length > 0;
    return {
      id: variant.id,
      clientKey: variant.id,
      variantKind: isStructured ? "structured" : "legacy",
      displayLabel: variant.displayLabel ?? "",
      optionValueIds,
      colorName: variant.colorName ?? "",
      colorCode: variant.colorCode ?? "",
      sizeName: variant.sizeName ?? "",
      dimensions: variant.dimensions ?? "",
      capacity: variant.capacity ?? "",
      sku: variant.sku,
      variantStatus: variant.variantStatus,
      stockQty: String(variant.stockQty ?? ""),
      stockStatus: variant.stockStatus,
      moqOverride: variant.moqOverride != null ? String(variant.moqOverride) : "",
      leadTimeOverride: variant.leadTimeOverride ?? "",
      materialOverride: variant.materialOverride ?? "",
      wholesalePrice: variant.wholesalePrice != null ? String(variant.wholesalePrice) : "",
      dealerPrice: variant.dealerPrice != null ? String(variant.dealerPrice) : "",
      imageUrl: variant.imageUrl ?? "",
      internalNote: variant.internalNote ?? "",
    };
  });
}

export function applyBulkResultToVariants(
  variants: MatrixVariantFormRow[],
  result: BulkVariantResult,
): MatrixVariantFormRow[] {
  let next = variants;
  if (result.deletedIds.length) {
    const deleted = new Set(result.deletedIds);
    next = next.filter((row) => !row.id || !deleted.has(row.id));
  }
  const updatedById = new Map(result.variants.map((variant) => [variant.id, variant]));
  return next.map((row) => {
    if (!row.id) return row;
    const updated = updatedById.get(row.id);
    if (!updated) return row;
    const optionValueIds =
      updated.optionValueIds.length > 0 ? updated.optionValueIds : row.optionValueIds;
    return {
      ...row,
      variantKind: optionValueIds.length > 0 ? "structured" : row.variantKind,
      displayLabel: updated.displayLabel ?? row.displayLabel,
      sku: updated.sku,
      variantStatus: updated.variantStatus,
      stockQty: String(updated.stockQty),
      stockStatus: updated.stockStatus,
      moqOverride: updated.moqOverride != null ? String(updated.moqOverride) : "",
      leadTimeOverride: updated.leadTimeOverride ?? "",
      wholesalePrice: updated.wholesalePrice != null ? String(updated.wholesalePrice) : "",
      dealerPrice: updated.dealerPrice != null ? String(updated.dealerPrice) : "",
      imageUrl: updated.imageUrl ?? "",
      colorName: updated.colorName ?? row.colorName,
      colorCode: updated.colorCode ?? row.colorCode,
      sizeName: updated.sizeName ?? row.sizeName,
      dimensions: updated.dimensions ?? row.dimensions,
      capacity: updated.capacity ?? row.capacity,
      optionValueIds,
    };
  });
}

type AdminProductAttributeAssignment = {
  id: string;
  attributeId: string;
  attributeValueId: string | null;
  customValue: string | null;
  sortOrder: number;
};

type BuildProductAdminEditInitialDataInput = {
  id: string;
  slug: string | null;
  name: string;
  productCode: string | null;
  categoryId: string;
  shortDescription: string | null;
  description: string | null;
  descriptionBlocks?: unknown;
  material: string | null;
  form: string | null;
  fit: string | null;
  defaultMoq: number | null;
  leadTime: string | null;
  useCases: unknown;
  targetCustomers: unknown;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  tags: unknown;
  status: string;
  featuredImage: string | null;
  gallery: unknown;
  specifications: AdminProductSpecification[];
  attributeAssignments?: AdminProductAttributeAssignment[];
  customizationCapabilities: AdminProductCustomization[];
  options: AdminProductOption[];
  variants: AdminProductVariant[];
  seoTitle: string | null;
  seoDescription: string | null;
  metadata?: unknown;
};

export function mapAttributeAssignmentsToFormRows(
  assignments: AdminProductAttributeAssignment[] | undefined,
): ProductAttributeAssignmentFormRow[] {
  return (assignments ?? []).map((row) => ({
    id: row.id,
    clientKey: row.id,
    attributeId: row.attributeId,
    attributeValueId: row.attributeValueId ?? undefined,
    customValue: row.customValue ?? undefined,
    useCustomValue: Boolean(row.customValue?.trim()),
    sortOrder: row.sortOrder,
  }));
}

/** Maps a loaded admin product record into client-serializable edit form state. */
export function buildProductAdminEditInitialData(
  product: BuildProductAdminEditInitialDataInput,
): ProductAdminEditInitialData {
  return {
    id: product.id,
    slug: product.slug ?? undefined,
    name: product.name,
    productCode: product.productCode ?? "",
    categoryId: product.categoryId,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    descriptionBlocks: mapDescriptionBlocksToFormState(product.descriptionBlocks),
    material: product.material ?? "",
    form: product.form ?? "",
    fit: product.fit ?? "",
    defaultMoq: product.defaultMoq ? String(product.defaultMoq) : "",
    leadTime: product.leadTime ?? "",
    useCases: joinStringArray(product.useCases),
    targetCustomers: joinStringArray(product.targetCustomers),
    supportsPrinting: product.supportsPrinting,
    supportsEmbroidery: product.supportsEmbroidery,
    supportsOem: product.supportsOem,
    tags: joinStringArray(product.tags),
    status: product.status,
    featuredImage: product.featuredImage ?? "",
    gallery: Array.isArray(product.gallery) ? product.gallery.map(String) : [],
    specifications: (product.specifications ?? []).map((row) => ({
      id: row.id,
      clientKey: row.id,
      label: row.label,
      value: row.value,
      sortOrder: row.sortOrder,
    })),
    attributeAssignments: mapAttributeAssignmentsToFormRows(product.attributeAssignments),
    customizations: (product.customizationCapabilities ?? []).map((row) => ({
      id: row.id,
      clientKey: row.id,
      label: row.label,
      description: row.description ?? "",
      sortOrder: row.sortOrder,
      enabled: row.enabled,
    })),
    options: mapOptionsToFormRows(product.options ?? []),
    variants: mapVariantsToFormRows(product.variants ?? []),
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    curatedSalesBadges: parseCuratedSalesBadgeKeysFromMetadata(product.metadata),
    publicSizeChart: parsePublicSizeChartFromMetadata(product.metadata),
    ...mapProductEntryMetaToInitialData(product.metadata),
  };
}

function mapProductEntryMetaToInitialData(metadata: unknown): {
  productMode?: ProductEntryMode;
  productTemplateKey?: string;
  stockMode?: ProductStockMode;
  pricingMode?: ProductPricingMode;
} {
  const entry = readProductEntryFromMetadata(metadata);
  return {
    productMode: entry.mode,
    productTemplateKey: entry.templateKey,
    stockMode: entry.stockMode,
    pricingMode: entry.pricingMode,
  };
}
