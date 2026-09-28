import type { PricingCalculationType } from "@prisma/client";
import type { PricingItemInput, PricingServiceOptionInput } from "@/features/pricing/types";

export type ServiceRulePricingRow = {
  id: string;
  name: string;
  priceGroupId: string | null;
  minQuantity: number;
  maxQuantity: number | null;
  calculationType: PricingCalculationType;
  unitPrice: number;
  setupFee: number;
  isActive: boolean;
};

export function serviceRuleAppliesToPriceGroup(
  rule: Pick<ServiceRulePricingRow, "priceGroupId">,
  priceGroupId: string | null,
): boolean {
  if (!rule.priceGroupId) return true;
  if (!priceGroupId) return false;
  return rule.priceGroupId === priceGroupId;
}

export function serviceRuleAppliesToQuantity(
  rule: Pick<ServiceRulePricingRow, "minQuantity" | "maxQuantity">,
  quantity: number,
): boolean {
  if (quantity < rule.minQuantity) return false;
  if (rule.maxQuantity != null && quantity > rule.maxQuantity) return false;
  return true;
}

export type ServiceRuleScopeIssue = {
  ruleId: string;
  ruleName: string;
  message: string;
};

export function collectServiceRuleScopeIssues(params: {
  priceGroupId: string | null;
  items: PricingItemInput[];
  rulesById: Map<string, ServiceRulePricingRow>;
}): ServiceRuleScopeIssue[] {
  const issues: ServiceRuleScopeIssue[] = [];

  for (const item of params.items) {
    const itemQty = item.quantity;
    for (const opt of item.serviceOptions ?? []) {
      if (!opt.ruleId) continue;
      const rule = params.rulesById.get(opt.ruleId);
      if (!rule || !rule.isActive) {
        issues.push({
          ruleId: opt.ruleId,
          ruleName: opt.name ?? opt.ruleId,
          message: "Quy tắc phí dịch vụ không tồn tại hoặc không còn hoạt động.",
        });
        continue;
      }
      if (!serviceRuleAppliesToPriceGroup(rule, params.priceGroupId)) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: "Quy tắc phí không thuộc nhóm giá đang chọn.",
        });
        continue;
      }
      const qty = opt.quantity ?? itemQty;
      if (!serviceRuleAppliesToQuantity(rule, qty)) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Số lượng ${qty} không nằm trong phạm vi áp dụng của quy tắc phí (${rule.minQuantity}${rule.maxQuantity != null ? `–${rule.maxQuantity}` : "+"}).`,
        });
      }
    }
  }

  return issues;
}

export function filterServiceOptionsToAllowedRules(
  item: PricingItemInput,
  priceGroupId: string | null,
  rulesById: Map<string, ServiceRulePricingRow>,
): PricingServiceOptionInput[] {
  return (item.serviceOptions ?? []).filter((opt) => {
    if (!opt.ruleId) return true;
    const rule = rulesById.get(opt.ruleId);
    if (!rule || !rule.isActive) return false;
    if (!serviceRuleAppliesToPriceGroup(rule, priceGroupId)) return false;
    const qty = opt.quantity ?? item.quantity;
    return serviceRuleAppliesToQuantity(rule, qty);
  });
}
