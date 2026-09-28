export type PricingCalculationMethod = "costing" | "price-list" | "unknown";

export function pricingCalculationMethodFromSnapshot(inputSnapshot: unknown): PricingCalculationMethod {
  if (!inputSnapshot || typeof inputSnapshot !== "object") return "unknown";
  const raw = inputSnapshot as Record<string, unknown>;
  if (raw.calculator === "costing") return "costing";
  if (Array.isArray(raw.items)) return "price-list";
  return "unknown";
}

export function pricingCalculationMethodLabel(method: PricingCalculationMethod): string {
  switch (method) {
    case "costing":
      return "Costing V2";
    case "price-list":
      return "Bảng giá / quy tắc";
    default:
      return "Chưa phân loại";
  }
}

export function pricingCalculationMethodBadgeClass(method: PricingCalculationMethod): string {
  switch (method) {
    case "costing":
      return "admin-kb-badge admin-kb-badge--ok";
    case "price-list":
      return "admin-kb-badge admin-kb-badge--medium";
    default:
      return "admin-kb-badge";
  }
}
