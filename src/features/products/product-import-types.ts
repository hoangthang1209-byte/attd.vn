export type ProductImportPresetId =
  | "blank-apparel"
  | "corporate-gift"
  | "oem-product"
  | "custom";

export type ProductImportRow = {
  rowIndex: number;
  // Product fields
  productName: string;
  category: string;
  productCode?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  material?: string;
  form?: string;
  fit?: string;
  defaultMoq?: number;
  useCases?: string;
  targetCustomers?: string;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  tags?: string;
  status?: string;
  featuredImage?: string;
  // Variant fields
  sku?: string;
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
  dimensions?: string;
  capacity?: string;
  stockQty?: number;
  stockStatus?: string;
  wholesalePrice?: number;
  dealerPrice?: number;
  costPrice?: number;
  priceTiers?: string;
  weight?: number;
  internalNote?: string;
};

export type ProductImportValidationError = {
  field: string;
  message: string;
  severity?: "error" | "warning";
  suggestedFix?: string;
};

export type ProductImportDuplicateInfo = {
  type: "sku" | "name+category" | "productCode";
  existingId?: string;
  existingName?: string;
};

export type ProductImportPreviewRow = ProductImportRow & {
  normalizedCategory: string;
  generatedSku: string;
  validationErrors: ProductImportValidationError[];
  duplicateInfo: ProductImportDuplicateInfo | null;
  duplicateStrategy: "skip" | "update" | "copy";
  finalAction: "create" | "update" | "skip" | "copy" | "invalid";
  isValid: boolean;
};

export type ProductImportPreviewResult = {
  rows: ProductImportPreviewRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    newProducts: number;
    newVariants: number;
  };
};

export type ProductImportExecuteResult = {
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  updatedVariants: number;
  skippedRows: number;
  invalidRows: number;
  duplicateRows: number;
  createdCategories: number;
  errors: string[];
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
};

export type ProductImportOptions = {
  presetId?: ProductImportPresetId;
  columnMapping: ProductImportColumnMapping;
  defaultDuplicateStrategy: "skip" | "update" | "copy";
  autoCreateCategories: boolean;
};
