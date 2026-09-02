import { computeSellingPriceCommercials } from "@/features/pricing/costing-batch-selling-price";

export type SpreadsheetEditableColumn = "style" | "quantity" | "group" | "sellingPrice";

export const SPREADSHEET_EDITABLE_COLUMNS: SpreadsheetEditableColumn[] = [
  "style",
  "quantity",
  "group",
  "sellingPrice",
];

export type SpreadsheetRowDraft = {
  draftId: string;
  productId?: string;
  variantId?: string;
  customProductName: string;
  quantity: string;
  groupLabel: string;
  sellingPrice: string;
  fieldErrors?: Partial<Record<SpreadsheetEditableColumn, string>>;
  saveError?: string;
  saving?: boolean;
};

export type ParsedPasteRow = {
  customProductName: string;
  quantity: string;
  groupLabel: string;
  sellingPrice: string;
  fieldErrors?: Partial<Record<SpreadsheetEditableColumn, string>>;
};

export type SpreadsheetLiveRow = {
  quantity: number | null;
  sellingPricePerUnit: number | null;
  costPerUnit: number | null;
  totalCost: number | null;
  revenue: number | null;
  profit: number | null;
  marginRate: number | null;
};

export function createEmptyDraftRow(draftId: string): SpreadsheetRowDraft {
  return {
    draftId,
    customProductName: "",
    quantity: "",
    groupLabel: "",
    sellingPrice: "",
  };
}

export function parseIntegerQuantity(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) return null;
  return parsed;
}

export function parseSellingPrice(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/\./g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function hasValidStyleInput(draft: {
  productId?: string;
  customProductName?: string;
}): boolean {
  return Boolean(draft.productId || draft.customProductName?.trim());
}

export function canPersistSpreadsheetRow(draft: SpreadsheetRowDraft): boolean {
  return hasValidStyleInput(draft) && parseIntegerQuantity(draft.quantity) != null;
}

export function validateSpreadsheetDraft(draft: SpreadsheetRowDraft): Partial<Record<SpreadsheetEditableColumn, string>> {
  const errors: Partial<Record<SpreadsheetEditableColumn, string>> = {};
  if (!hasValidStyleInput(draft)) {
    errors.style = "Nhập style hoặc chọn sản phẩm.";
  }
  const qty = parseIntegerQuantity(draft.quantity);
  if (!draft.quantity.trim()) {
    errors.quantity = "Nhập số lượng.";
  } else if (qty == null) {
    errors.quantity = "Số lượng phải là số nguyên dương.";
  }
  if (draft.sellingPrice.trim() && parseSellingPrice(draft.sellingPrice) == null) {
    errors.sellingPrice = "Giá bán không hợp lệ.";
  }
  return errors;
}

export function parseSpreadsheetTsv(text: string): ParsedPasteRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) => {
    const cells = line.split("\t");
    const row: ParsedPasteRow = {
      customProductName: (cells[0] ?? "").trim(),
      quantity: (cells[1] ?? "").trim(),
      groupLabel: (cells[2] ?? "").trim(),
      sellingPrice: (cells[3] ?? "").trim(),
    };
    const fieldErrors: Partial<Record<SpreadsheetEditableColumn, string>> = {};
    if (!row.customProductName) fieldErrors.style = "Thiếu style";
    const qty = parseIntegerQuantity(row.quantity);
    if (!row.quantity) fieldErrors.quantity = "Thiếu SL";
    else if (qty == null) fieldErrors.quantity = "SL không hợp lệ";
    if (row.sellingPrice && parseSellingPrice(row.sellingPrice) == null) {
      fieldErrors.sellingPrice = "Giá bán không hợp lệ";
    }
    if (Object.keys(fieldErrors).length > 0) row.fieldErrors = fieldErrors;
    return row;
  });
}

export function pastedRowToDraft(row: ParsedPasteRow, draftId: string): SpreadsheetRowDraft {
  return {
    draftId,
    customProductName: row.customProductName,
    quantity: row.quantity,
    groupLabel: row.groupLabel,
    sellingPrice: row.sellingPrice,
    fieldErrors: row.fieldErrors,
  };
}

export function computeSpreadsheetLiveRow(params: {
  quantity: number | null;
  sellingPricePerUnit: number | null;
  totalCost: number | null;
}): SpreadsheetLiveRow {
  const quantity = params.quantity;
  const sellingPricePerUnit = params.sellingPricePerUnit;
  const totalCost = params.totalCost;
  const revenue =
    quantity != null && sellingPricePerUnit != null
      ? Math.round(sellingPricePerUnit * quantity * 100) / 100
      : null;
  const costPerUnit =
    quantity != null && totalCost != null && quantity > 0
      ? Math.round((totalCost / quantity) * 100) / 100
      : null;
  const profit =
    revenue != null && totalCost != null ? Math.round((revenue - totalCost) * 100) / 100 : null;
  const marginRate =
    revenue != null && profit != null && revenue > 0
      ? Math.round((profit / revenue) * 10000) / 100
      : null;

  return {
    quantity,
    sellingPricePerUnit,
    costPerUnit,
    totalCost,
    revenue,
    profit,
    marginRate,
  };
}

export function computeSpreadsheetTotals(rows: SpreadsheetLiveRow[]) {
  let totalQuantity = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let hasCost = false;

  for (const row of rows) {
    if (row.quantity != null) totalQuantity += row.quantity;
    if (row.revenue != null) totalRevenue += row.revenue;
    if (row.totalCost != null) {
      totalCost += row.totalCost;
      hasCost = true;
    }
  }

  const totalProfit = hasCost ? Math.round((totalRevenue - totalCost) * 100) / 100 : 0;
  const averageMarginRate =
    hasCost && totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : null;

  return {
    totalQuantity,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: hasCost ? Math.round(totalCost * 100) / 100 : 0,
    totalProfit: hasCost ? totalProfit : 0,
    averageMarginRate,
    hasCostTotals: hasCost,
  };
}

export function nextEditableColumn(
  column: SpreadsheetEditableColumn,
  direction: 1 | -1,
): SpreadsheetEditableColumn {
  const index = SPREADSHEET_EDITABLE_COLUMNS.indexOf(column);
  const next = index + direction;
  if (next < 0) return SPREADSHEET_EDITABLE_COLUMNS[0];
  if (next >= SPREADSHEET_EDITABLE_COLUMNS.length) {
    return SPREADSHEET_EDITABLE_COLUMNS[SPREADSHEET_EDITABLE_COLUMNS.length - 1];
  }
  return SPREADSHEET_EDITABLE_COLUMNS[next];
}

export function buildPersistPayloadFromDraft(draft: SpreadsheetRowDraft) {
  const quantity = parseIntegerQuantity(draft.quantity);
  if (!quantity || !hasValidStyleInput(draft)) return null;
  const sellingPricePerUnit = draft.sellingPrice.trim()
    ? parseSellingPrice(draft.sellingPrice)
    : undefined;

  return {
    productId: draft.productId ?? null,
    variantId: draft.variantId ?? null,
    customProductName: draft.productId ? null : draft.customProductName.trim(),
    quantity,
    groupLabel: draft.groupLabel.trim() || null,
    sellingPricePerUnit: sellingPricePerUnit ?? undefined,
  };
}

export function liveRowFromPersisted(params: {
  quantity: number | null;
  sellingPricePerUnit: number | null;
  totalCost: number | null;
}): SpreadsheetLiveRow {
  if (params.sellingPricePerUnit != null && params.quantity != null && params.totalCost != null) {
    const commercials = computeSellingPriceCommercials({
      quantity: params.quantity,
      costEstimate: params.totalCost,
      sellingPricePerUnit: params.sellingPricePerUnit,
    });
    return computeSpreadsheetLiveRow({
      quantity: commercials.quantity,
      sellingPricePerUnit: commercials.sellingPricePerUnit,
      totalCost: commercials.costEstimate,
    });
  }

  return computeSpreadsheetLiveRow(params);
}

/** Acceptance dataset for Big Bang regression tests — not used in production UI. */
export const BIG_BANG_ACCEPTANCE_ROWS = [
  { name: "Sleeveless Top", quantity: 270, group: "T-SHIRTS", sell: 162000 },
  { name: "Tour T-Shirt", quantity: 750, group: "T-SHIRTS", sell: 171000 },
  { name: "T-Shirt Charcoal", quantity: 860, group: "T-SHIRTS", sell: 176000 },
  { name: "T-Shirt Black", quantity: 700, group: "T-SHIRTS", sell: 146000 },
  { name: "Tour Hoodie", quantity: 550, group: "HOODIES", sell: 392000 },
  { name: "Hoodie", quantity: 480, group: "HOODIES", sell: 367000 },
  { name: "Windbreaker", quantity: 430, group: "OUTERWEAR", sell: 282000 },
  { name: "Jacket", quantity: 50, group: "OUTERWEAR", sell: 380000 },
  { name: "Uniform", quantity: 430, group: "UNIFORM", sell: 172000 },
  { name: "Shoulder Bag", quantity: 310, group: "BAGS", sell: 168000 },
  { name: "Twilly Scarf", quantity: 430, group: "ACCESSORIES", sell: 41000 },
  { name: "Bandana", quantity: 500, group: "ACCESSORIES", sell: 52000 },
  { name: "Tour Bandana", quantity: 700, group: "ACCESSORIES", sell: 52000 },
] as const;
