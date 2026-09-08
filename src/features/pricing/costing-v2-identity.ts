import type { CostingSourceSearchHit } from "@/features/pricing/costing-source-price";
import type { CostingStructuredLine } from "@/features/pricing/costing-types";

export function compactSourceIdentity(hit: CostingSourceSearchHit): string {
  const parts = [hit.name];
  if (hit.composition) parts.push(hit.composition);
  if (hit.gsm) parts.push(`${hit.gsm} GSM`);
  if (hit.code) parts.push(hit.code);
  return parts.join(" · ");
}

export function materialLineSubtitle(line: CostingStructuredLine): string {
  const parts = [
    line.supplierName,
    line.sourceComposition,
    line.sourceGsm ? `${line.sourceGsm} GSM` : null,
    line.sourceCode,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function pricingBasisLabel(basis: CostingStructuredLine["pricingBasis"]): string {
  switch (basis) {
    case "UNIT_TIMES_CONSUMPTION":
      return "Đơn giá × định mức";
    case "LEGACY_YIELD":
      return "Định mức cũ (SP/đơn vị)";
    case "PER_ITEM":
      return "PER_ITEM";
    case "PER_POSITION":
      return "PER_POSITION";
    case "PER_ORDER":
      return "PER_ORDER";
    case "MANUAL":
      return "MANUAL";
    default:
      return basis;
  }
}

export function consumptionHint(unit: string, basis: CostingStructuredLine["pricingBasis"]): string {
  if (basis === "LEGACY_YIELD") return "Định mức cũ (SP/đơn vị)";
  const normalized = unit.trim() || "đơn vị";
  return `${normalized} / sản phẩm`;
}
