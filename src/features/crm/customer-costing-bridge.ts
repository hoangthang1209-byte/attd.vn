/** Customer 360 ↔ Costing bridge helpers (no DB). */

export const CUSTOMER_360_COSTING_LIMIT = 5;

export function buildCustomerCostingHref(customerId: string): string {
  const id = customerId.trim();
  if (!id) return "/admin/pricing/costing";
  return `/admin/pricing/costing?customerId=${encodeURIComponent(id)}`;
}

export function buildCostingOpenHref(calculationId: string): string {
  return `/admin/pricing/costing?fromCalculation=${encodeURIComponent(calculationId)}`;
}

export function parseCostingCustomerIdParam(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type CustomerCostingSourceRow = {
  id: string;
  code: string;
  status: string;
  isFinal: boolean;
  revisionLabel: string | null;
  updatedAt: Date | string;
  totalAmount: number | { toNumber(): number };
  items: Array<{
    productNameSnapshot: string | null;
    costEstimate: number | { toNumber(): number } | null;
    marginRate: number | { toNumber(): number } | null;
  }>;
};

export type CustomerCostingRow = {
  id: string;
  code: string;
  status: string;
  isFinal: boolean;
  revisionLabel: string | null;
  updatedAt: string;
  productCount: number;
  productLabel: string | null;
  sellingTotal: number | null;
  estimatedCost: number | null;
  marginRate: number | null;
};

function decimalToNumber(value: number | { toNumber(): number } | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

/** Map DB rows → Customer 360 costing rows with optional financial redaction. */
export function mapCustomerCostingRows(
  rows: CustomerCostingSourceRow[],
  options: { includeFinancials: boolean },
): CustomerCostingRow[] {
  return rows.map((row) => {
    const costSum = row.items.reduce((sum, item) => {
      const cost = decimalToNumber(item.costEstimate);
      return sum + (cost ?? 0);
    }, 0);
    const hasCost = row.items.some((item) => item.costEstimate != null);
    const marginRates = row.items
      .map((item) => decimalToNumber(item.marginRate))
      .filter((rate): rate is number => rate != null);
    const marginRate =
      marginRates.length === 1
        ? marginRates[0]
        : marginRates.length > 1
          ? Math.round(
              (marginRates.reduce((a, b) => a + b, 0) / marginRates.length) * 10000,
            ) / 10000
          : null;
    const firstName = row.items[0]?.productNameSnapshot?.trim() || null;

    return {
      id: row.id,
      code: row.code,
      status: row.status,
      isFinal: row.isFinal,
      revisionLabel: row.revisionLabel,
      updatedAt: toIso(row.updatedAt),
      productCount: row.items.length,
      productLabel: firstName,
      sellingTotal: options.includeFinancials ? decimalToNumber(row.totalAmount) : null,
      estimatedCost: options.includeFinancials && hasCost ? Math.round(costSum * 100) / 100 : null,
      marginRate: options.includeFinancials ? marginRate : null,
    };
  });
}

export function costingStatusDisplay(row: {
  status: string;
  isFinal: boolean;
  revisionLabel: string | null;
}): string {
  if (row.isFinal) {
    return row.revisionLabel?.trim() ? `${row.revisionLabel.trim()} — FINAL` : "FINAL";
  }
  if (row.status === "USED_FOR_QUOTE") return "Đã tạo BG";
  if (row.status === "DRAFT") return "Nháp";
  if (row.status === "CALCULATED") {
    return row.revisionLabel?.trim() || "Đã tính";
  }
  return row.status;
}
