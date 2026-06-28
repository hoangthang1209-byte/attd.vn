import type { TechPackBomCategory } from "@prisma/client";
import type { BomValidationIssue } from "@/features/tech-pack/bom-release-validation";

type BomRow = {
  id: string;
  category: TechPackBomCategory;
  itemName: string;
  materialId: string | null;
  trimId: string | null;
  supplierId: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function detectBomDuplicates(rows: BomRow[]): BomValidationIssue[] {
  const issues: BomValidationIssue[] = [];

  const materialGroups = new Map<string, string[]>();
  const trimGroups = new Map<string, string[]>();
  const textGroups = new Map<string, string[]>();
  const supplierGroups = new Map<string, string[]>();

  for (const row of rows) {
    if (row.materialId) {
      const ids = materialGroups.get(row.materialId) ?? [];
      ids.push(row.id);
      materialGroups.set(row.materialId, ids);
    }
    if (row.trimId) {
      const ids = trimGroups.get(row.trimId) ?? [];
      ids.push(row.id);
      trimGroups.set(row.trimId, ids);
    }
    if (!row.materialId && !row.trimId) {
      const key = `${row.category}::${normalizeText(row.itemName)}`;
      if (normalizeText(row.itemName)) {
        const ids = textGroups.get(key) ?? [];
        ids.push(row.id);
        textGroups.set(key, ids);
      }
    }
    if (row.supplierId) {
      const ids = supplierGroups.get(row.supplierId) ?? [];
      ids.push(row.id);
      supplierGroups.set(row.supplierId, ids);
    }
  }

  for (const [, ids] of materialGroups) {
    if (ids.length < 2) continue;
    for (const bomItemId of ids) {
      const row = rows.find((r) => r.id === bomItemId);
      if (!row) continue;
      issues.push({
        severity: "warning",
        code: "DUPLICATE_MATERIAL",
        message: "Nguyên liệu này đang xuất hiện nhiều lần trong BOM.",
        bomItemId,
        category: row.category,
        field: "materialId",
      });
    }
  }

  for (const [, ids] of trimGroups) {
    if (ids.length < 2) continue;
    for (const bomItemId of ids) {
      const row = rows.find((r) => r.id === bomItemId);
      if (!row) continue;
      issues.push({
        severity: "warning",
        code: "DUPLICATE_TRIM",
        message: "Phụ liệu này đang xuất hiện nhiều lần trong BOM.",
        bomItemId,
        category: row.category,
        field: "trimId",
      });
    }
  }

  for (const [, ids] of textGroups) {
    if (ids.length < 2) continue;
    for (const bomItemId of ids) {
      const row = rows.find((r) => r.id === bomItemId);
      if (!row) continue;
      issues.push({
        severity: "warning",
        code: "DUPLICATE_BOM_TEXT",
        message: "Dòng BOM này có vẻ bị trùng nội dung.",
        bomItemId,
        category: row.category,
        field: "itemName",
      });
    }
  }

  for (const [, ids] of supplierGroups) {
    if (ids.length < 2) continue;
    for (const bomItemId of ids) {
      const row = rows.find((r) => r.id === bomItemId);
      if (!row) continue;
      issues.push({
        severity: "info",
        code: "REPEATED_SUPPLIER",
        message: "Nhà cung cấp này được dùng ở nhiều dòng BOM.",
        bomItemId,
        category: row.category,
        field: "supplierId",
      });
    }
  }

  return issues;
}
