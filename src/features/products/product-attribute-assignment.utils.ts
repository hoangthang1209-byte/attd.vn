import type { ProductSpecificationRow } from "@/features/products/product-detail.types";

/**
 * One-way legacy mirror rules (assignment → Product scalar fields).
 *
 * - MATERIAL → Product.material
 * - FIT (Form dáng preset) → Product.form — NOT Product.fit
 * - COLLAR, GENDER, CAPACITY, SLEEVE, FABTYPE → no legacy column; PDP/assignment only
 * - GSM stays a legacy numeric field; not mirrored from assignments in this sprint
 * - CAPACITY must NOT map to ProductVariant.capacity
 *
 * Removing an assignment does not clear legacy fields (handled in sync service).
 */
export const LEGACY_MIRROR_FIELD_BY_ATTRIBUTE_CODE: Record<string, "material" | "form"> = {
  MATERIAL: "material",
  FIT: "form",
};

export const LEGACY_FIELD_LABELS: Record<"material" | "form" | "fit" | "gsm", string> = {
  material: "Chất liệu",
  form: "Form dáng",
  fit: "Fit",
  gsm: "GSM",
};

export type AssignmentDisplayRow = {
  attributeId: string;
  attributeCode: string;
  attributeName: string;
  displayValue: string;
  sortOrder: number;
};

export type ProductAttributeAssignmentInput = {
  id?: string;
  attributeId: string;
  attributeValueId?: string | null;
  customValue?: string | null;
  sortOrder?: number;
};

export type ResolvedAssignmentValue = {
  attributeId: string;
  attributeCode: string;
  attributeName: string;
  attributeValueId: string | null;
  customValue: string | null;
  displayValue: string;
  sortOrder: number;
};

function normalizeLabelKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const LABEL_ALIASES_BY_CODE: Record<string, string[]> = {
  MATERIAL: ["chat lieu", "material", "vat lieu"],
  FIT: ["form dang", "form / kieu dang", "form", "kieu dang", "kiểu dáng"],
  COLLAR: ["kieu co", "cổ", "co"],
  GENDER: ["gioi tinh", "giới tính"],
  CAPACITY: ["dung tich", "dung tích"],
  SLEEVE: ["kieu tay ao", "kiểu tay áo"],
  FABTYPE: ["loai vai", "loại vải"],
};

export function resolveAssignmentDisplayValue(
  valueName: string | null | undefined,
  customValue: string | null | undefined,
): string {
  const shared = valueName?.trim();
  if (shared) return shared;
  return customValue?.trim() ?? "";
}

export function computeLegacyMirrorFromAssignments(
  assignments: ResolvedAssignmentValue[],
): Partial<Record<"material" | "form", string>> {
  const mirror: Partial<Record<"material" | "form", string>> = {};
  for (const row of assignments) {
    const field = LEGACY_MIRROR_FIELD_BY_ATTRIBUTE_CODE[row.attributeCode];
    if (!field) continue;
    const value = row.displayValue.trim();
    if (!value) continue;
    mirror[field] = value;
  }
  return mirror;
}

function isLabelCovered(label: string, covered: Set<string>, code?: string): boolean {
  const key = normalizeLabelKey(label);
  if (covered.has(key)) return true;
  if (code) {
    for (const alias of LABEL_ALIASES_BY_CODE[code] ?? []) {
      if (covered.has(alias)) return true;
    }
  }
  return false;
}

function markLabelCovered(label: string, covered: Set<string>, code?: string): void {
  covered.add(normalizeLabelKey(label));
  if (code) {
    for (const alias of LABEL_ALIASES_BY_CODE[code] ?? []) {
      covered.add(alias);
    }
  }
}

export function buildPdpSpecificationRows(input: {
  assignments: AssignmentDisplayRow[];
  legacy: {
    material?: string | null;
    form?: string | null;
    fit?: string | null;
    gsm?: number | null;
  };
  freeformSpecs: ProductSpecificationRow[];
}): ProductSpecificationRow[] {
  const rows: ProductSpecificationRow[] = [];
  const covered = new Set<string>();

  for (const assignment of input.assignments) {
    const value = assignment.displayValue.trim();
    if (!value) continue;
    markLabelCovered(assignment.attributeName, covered, assignment.attributeCode);
    rows.push({
      id: `assignment-${assignment.attributeCode.toLowerCase()}`,
      label: assignment.attributeName,
      value,
      sortOrder: assignment.sortOrder,
    });
  }

  const legacyRows: Array<{ code: string; label: string; value: string | null | undefined; sortOrder: number }> = [
    { code: "MATERIAL", label: LEGACY_FIELD_LABELS.material, value: input.legacy.material, sortOrder: 1000 },
    { code: "FIT", label: LEGACY_FIELD_LABELS.form, value: input.legacy.form, sortOrder: 1001 },
    { code: "FIT_LEGACY", label: LEGACY_FIELD_LABELS.fit, value: input.legacy.fit, sortOrder: 1002 },
    {
      code: "GSM",
      label: LEGACY_FIELD_LABELS.gsm,
      value: input.legacy.gsm != null ? String(input.legacy.gsm) : null,
      sortOrder: 1003,
    },
  ];

  for (const legacy of legacyRows) {
    const value = legacy.value?.trim();
    if (!value) continue;
    if (isLabelCovered(legacy.label, covered, legacy.code === "FIT_LEGACY" ? undefined : legacy.code)) {
      continue;
    }
    markLabelCovered(legacy.label, covered, legacy.code === "FIT_LEGACY" ? undefined : legacy.code);
    rows.push({
      id: `legacy-${legacy.code.toLowerCase()}`,
      label: legacy.label,
      value,
      sortOrder: legacy.sortOrder,
    });
  }

  for (const spec of input.freeformSpecs) {
    const label = spec.label.trim();
    const value = spec.value.trim();
    if (!label || !value) continue;
    if (isLabelCovered(label, covered)) continue;
    markLabelCovered(label, covered);
    rows.push(spec);
  }

  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "vi"));
}

export function buildPdpHighlightFields(input: {
  assignments: AssignmentDisplayRow[];
  legacy: {
    material?: string | null;
    form?: string | null;
  };
}): { material?: string; form?: string } {
  const materialAssignment = input.assignments.find((a) => a.attributeCode === "MATERIAL");
  const formAssignment = input.assignments.find((a) => a.attributeCode === "FIT");

  return {
    material: materialAssignment?.displayValue.trim() || input.legacy.material?.trim() || undefined,
    form: formAssignment?.displayValue.trim() || input.legacy.form?.trim() || undefined,
  };
}

const PRODUCT_ATTRIBUTES_PAIR_RE = /^([^=]+)=(.+)$/;

export function parseProductAttributesField(raw: string): Array<{ label: string; value: string }> {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const pairs: Array<{ label: string; value: string }> = [];
  for (const segment of trimmed.split("|")) {
    const part = segment.trim();
    if (!part) continue;
    const match = PRODUCT_ATTRIBUTES_PAIR_RE.exec(part);
    if (!match) {
      throw new Error(`Cú pháp productAttributes không hợp lệ: "${part}". Dùng Tên thuộc tính=Giá trị.`);
    }
    const label = match[1].trim();
    const value = match[2].trim();
    if (!label || !value) {
      throw new Error(`Cú pháp productAttributes không hợp lệ: "${part}". Thiếu tên hoặc giá trị.`);
    }
    pairs.push({ label, value });
  }
  return pairs;
}

export function serializeProductAttributesField(
  assignments: Array<{ attributeName: string; displayValue: string }>,
): string {
  return assignments
    .filter((row) => row.displayValue.trim())
    .map((row) => `${row.attributeName}=${row.displayValue.trim()}`)
    .join(" | ");
}
