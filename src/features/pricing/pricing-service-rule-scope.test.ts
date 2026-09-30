import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectServiceRuleScopeIssues,
  serviceRuleAppliesToPriceGroup,
  serviceRuleAppliesToQuantity,
  type ServiceRulePricingRow,
} from "@/features/pricing/pricing-service-rule-scope";

const globalRule: ServiceRulePricingRow = {
  id: "r-global",
  name: "Global fee",
  priceGroupId: null,
  minQuantity: 1,
  maxQuantity: null,
  calculationType: "PER_ORDER",
  unitPrice: 1000,
  setupFee: 0,
  isActive: true,
};

const groupRule: ServiceRulePricingRow = {
  ...globalRule,
  id: "r-group-a",
  name: "Group A fee",
  priceGroupId: "pg-a",
};

describe("pricing service rule scope", () => {
  it("allows global rules for any price group", () => {
    assert.equal(serviceRuleAppliesToPriceGroup(globalRule, "pg-a"), true);
  });

  it("blocks rules from another price group", () => {
    assert.equal(serviceRuleAppliesToPriceGroup(groupRule, "pg-b"), false);
  });

  it("validates quantity bounds", () => {
    const bounded = { ...globalRule, minQuantity: 100, maxQuantity: 500 };
    assert.equal(serviceRuleAppliesToQuantity(bounded, 50), false);
    assert.equal(serviceRuleAppliesToQuantity(bounded, 200), true);
  });

  it("collects cross-group rule issues", () => {
    const rulesById = new Map<string, ServiceRulePricingRow>([
      [groupRule.id, groupRule],
    ]);
    const issues = collectServiceRuleScopeIssues({
      priceGroupId: "pg-b",
      items: [
        {
          quantity: 100,
          serviceOptions: [{ ruleId: groupRule.id }],
        },
      ],
      rulesById,
    });
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /nhóm giá/);
  });
});
