import type { TechPackBomCategory } from "@prisma/client";
import {
  getExpectedBomMasterType,
  isBomMasterLinkRecommended,
} from "@/features/production-master/bom-category-mapping";

export type BomValidationSeverity = "error" | "warning" | "info";

export type BomValidationIssue = {
  severity: BomValidationSeverity;
  code: string;
  message: string;
  bomItemId: string;
  category: TechPackBomCategory;
  field?: string;
};

type BomRow = {
  id: string;
  category: TechPackBomCategory;
  itemName: string;
  supplier: string | null;
  materialId: string | null;
  trimId: string | null;
  supplierId: string | null;
};

export function validateBomMasterLinks(rows: BomRow[]): BomValidationIssue[] {
  const issues: BomValidationIssue[] = [];

  for (const row of rows) {
    const masterType = getExpectedBomMasterType(row.category);
    if (!isBomMasterLinkRecommended(row.category)) continue;

    if (masterType === "material" && !row.materialId) {
      issues.push({
        severity: "error",
        code: "BOM_MISSING_MATERIAL_LINK",
        message: "Dòng BOM này nên liên kết với nguyên liệu trong thư viện.",
        bomItemId: row.id,
        category: row.category,
        field: "materialId",
      });
    }

    if (masterType === "trim" && !row.trimId) {
      issues.push({
        severity: "error",
        code: "BOM_MISSING_TRIM_LINK",
        message: "Dòng BOM này nên liên kết với phụ liệu trong thư viện.",
        bomItemId: row.id,
        category: row.category,
        field: "trimId",
      });
    }

    if (masterType === "material_or_trim" && !row.materialId && !row.trimId) {
      issues.push({
        severity: "error",
        code: "BOM_MISSING_MASTER_LINK",
        message: "Dòng BOM này nên liên kết với nguyên liệu hoặc phụ liệu trong thư viện.",
        bomItemId: row.id,
        category: row.category,
      });
    }

    if ((row.materialId || row.trimId) && !row.itemName?.trim()) {
      issues.push({
        severity: "error",
        code: "BOM_MISSING_SNAPSHOT",
        message: "Thiếu thông tin snapshot từ dữ liệu master.",
        bomItemId: row.id,
        category: row.category,
        field: "itemName",
      });
    }

    if (row.supplier?.trim() && !row.supplierId) {
      issues.push({
        severity: "warning",
        code: "BOM_SUPPLIER_TEXT_ONLY",
        message: "Nhà cung cấp đang nhập tay, nên liên kết với thư viện nhà cung cấp.",
        bomItemId: row.id,
        category: row.category,
        field: "supplierId",
      });
    }
  }

  return issues;
}
