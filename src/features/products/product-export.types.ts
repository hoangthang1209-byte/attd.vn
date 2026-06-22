import type { ExportEntityType, ExportFormat, ExportScopeType } from "@/features/products/product-export.constants";
import type { ProductListParams } from "@/features/products/product-admin.service";

export type ProductExportOptions = {
  scope: ExportScopeType;
  format: ExportFormat;
  productIds?: string[];
  filters?: ProductListParams;
  includeWholesalePrice?: boolean;
  includeDealerPrice?: boolean;
  includeInactiveVariants?: boolean;
  includeSpecifications?: boolean;
  includeCustomizations?: boolean;
  /** Single-sheet CSV entity when format=csv */
  csvEntity?: ExportEntityType;
  cloneTemplate?: boolean;
};

export type ProductExportSheetData = {
  sheetName: string;
  headers: string[];
  rows: Record<string, string>[];
};

export type ProductExportBundle = {
  fileName: string;
  sheets: ProductExportSheetData[];
  productCount: number;
  variantCount: number;
};

export type ProductExportValidationIssue = {
  sheet: string;
  row: number;
  field: string;
  message: string;
};
