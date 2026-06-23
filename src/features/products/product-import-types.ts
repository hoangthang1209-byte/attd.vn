import type { ProductImportMode } from "@/features/products/product-import-constants";

export type ProductImportPresetId =
  | "blank-apparel"
  | "corporate-gift"
  | "oem-product"
  | "custom";

export type ProductImportRow = {
  rowIndex: number;
  entityType?: "product" | "variant" | "specification" | "customization";
  sheetName?: string;
  // Product fields
  productName: string;
  category: string;
  productCode?: string;
  systemCode?: string;
  productId?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  material?: string;
  form?: string;
  fit?: string;
  gsm?: number;
  productAttributes?: string;
  defaultMoq?: number;
  leadTime?: string;
  useCases?: string;
  targetCustomers?: string;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  tags?: string;
  status?: string;
  featuredImage?: string;
  galleryUrls?: string;
  seoTitle?: string;
  seoDescription?: string;
  // Variant fields
  sku?: string;
  displayLabel?: string;
  optionValues?: string;
  optionGroup?: string;
  optionValue?: string;
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
  dimensions?: string;
  capacity?: string;
  materialOverride?: string;
  stockQty?: number;
  stockStatus?: string;
  moqOverride?: number;
  leadTimeOverride?: string;
  imageUrl?: string;
  variantStatus?: string;
  wholesalePrice?: number;
  dealerPrice?: number;
  costPrice?: number;
  priceTiers?: string;
  weight?: number;
  internalNote?: string;
  // Specification fields
  specGroup?: string;
  specLabel?: string;
  specValue?: string;
  specSortOrder?: number;
  // Customization fields
  capability?: string;
  capabilityDescription?: string;
  capabilitySortOrder?: number;
  capabilityEnabled?: boolean;
  /** Raw cell presence — used to avoid overwriting on update. */
  _presentFields?: Record<string, boolean>;
};

export type ProductImportValidationError = {
  field: string;
  message: string;
  severity?: "error" | "warning";
  suggestedFix?: string;
};

export type ProductImportDuplicateInfo = {
  type: "sku" | "name+category" | "productCode" | "systemCode" | "slug" | "option-combination";
  existingId?: string;
  existingName?: string;
};

export type ProductImportPreviewRow = ProductImportRow & {
  entityType?: "product" | "variant" | "specification" | "customization";
  normalizedCategory: string;
  generatedSku: string;
  matchedProductId?: string;
  matchedProductCode?: string;
  matchedVariantId?: string;
  validationErrors: ProductImportValidationError[];
  duplicateInfo: ProductImportDuplicateInfo | null;
  duplicateStrategy: "skip" | "update" | "copy";
  finalAction: "create" | "update" | "skip" | "copy" | "invalid" | "error";
  isValid: boolean;
  warningCount?: number;
  parsedOptionPairs?: Array<{ group: string; value: string }>;
  affectedFields?: string[];
};

export type ProductImportPreviewResult = {
  rows: ProductImportPreviewRow[];
  summary: ProductImportPreviewSummary;
};

export type ProductImportPreviewSummary = {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  duplicates: number;
  newProducts: number;
  newVariants: number;
  updatedProducts: number;
  updatedVariants: number;
  existingProductsMatched: number;
  existingVariantsMatched: number;
  duplicateSkuCount: number;
  duplicateOptionComboCount: number;
  missingCategoryCount: number;
  invalidImageUrlCount: number;
  invalidStockMoqLeadTimeCount: number;
  productsDetected: number;
  variantsDetected: number;
  specsDetected: number;
  customizationsDetected: number;
};

export type ProductImportExecuteResult = {
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  updatedVariants: number;
  createdSpecs: number;
  updatedSpecs: number;
  createdCustomizations: number;
  updatedCustomizations: number;
  skippedRows: number;
  invalidRows: number;
  failedRows: number;
  duplicateRows: number;
  createdCategories: number;
  errors: string[];
  rowFailures?: Array<{ rowIndex: number; message: string }>;
};

export type ProductImportColumnMapping = {
  productName: string;
  category: string;
  productCode?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  material?: string;
  form?: string;
  fit?: string;
  defaultMoq?: string;
  useCases?: string;
  targetCustomers?: string;
  supportsPrinting?: string;
  supportsEmbroidery?: string;
  supportsOem?: string;
  tags?: string;
  status?: string;
  sku?: string;
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
  dimensions?: string;
  capacity?: string;
  stockQty?: string;
  stockStatus?: string;
  wholesalePrice?: string;
  dealerPrice?: string;
  costPrice?: string;
  priceTiers?: string;
  weight?: string;
  internalNote?: string;
  featuredImage?: string;
  galleryUrls?: string;
  gsm?: string;
  productAttributes?: string;
  leadTime?: string;
  seoTitle?: string;
  seoDescription?: string;
  systemCode?: string;
  productId?: string;
  displayLabel?: string;
  optionValues?: string;
  optionGroup?: string;
  optionValue?: string;
  materialOverride?: string;
  moqOverride?: string;
  leadTimeOverride?: string;
  imageUrl?: string;
  variantStatus?: string;
  specGroup?: string;
  specLabel?: string;
  specValue?: string;
  specSortOrder?: string;
  capability?: string;
  capabilityDescription?: string;
  capabilitySortOrder?: string;
  capabilityEnabled?: string;
};

export type ProductImportOptions = {
  importMode?: ProductImportMode;
  presetId?: ProductImportPresetId;
  columnMapping: ProductImportColumnMapping;
  defaultDuplicateStrategy: "skip" | "update" | "copy";
  autoCreateCategories: boolean;
  allowCreateOptions?: boolean;
  importValidRowsOnly?: boolean;
  generateSkuWhenMissing?: boolean;
};
