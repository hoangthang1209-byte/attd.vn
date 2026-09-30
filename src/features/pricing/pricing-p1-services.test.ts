import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createProductPriceTier } from "@/features/pricing/services/product-tier.service";
import { calculatePricing } from "@/features/pricing/services/pricing-engine.service";
import { saveCostingCalculation } from "@/features/pricing/services/costing-calculator.service";

const s = randomUUID().slice(0, 8);
let categoryId = "";
let productId = "";
let dealerGroupId = "";
let retailGroupId = "";
let dealerRuleId = "";
let retailRuleId = "";
const calculationIds: string[] = [];

before(async () => {
  const category = await prisma.category.create({ data: { name: `P1 ${s}`, slug: `p1-${s}` } });
  categoryId = category.id;
  const product = await prisma.product.create({
    data: {
      name: `Pricing P1 Product ${s}`,
      slug: `pricing-p1-product-${s}`,
      categoryId,
      useCases: [],
      targetCustomers: [],
      tags: [],
    },
  });
  productId = product.id;
  const dealer = await prisma.priceGroup.create({ data: { code: `P1D-${s}`, name: `P1 Dealer ${s}` } });
  const retail = await prisma.priceGroup.create({ data: { code: `P1R-${s}`, name: `P1 Retail ${s}` } });
  dealerGroupId = dealer.id;
  retailGroupId = retail.id;
  const dealerRule = await prisma.servicePriceRule.create({
    data: { serviceType: "PRINT_DTF", name: `Dealer rule ${s}`, priceGroupId: dealerGroupId, minQuantity: 10, maxQuantity: 100, unitPrice: 5000 },
  });
  const retailRule = await prisma.servicePriceRule.create({
    data: { serviceType: "PRINT_DTF", name: `Retail rule ${s}`, priceGroupId: retailGroupId, minQuantity: 1, unitPrice: 6000 },
  });
  dealerRuleId = dealerRule.id;
  retailRuleId = retailRule.id;
});

after(async () => {
  if (calculationIds.length) await prisma.pricingCalculation.deleteMany({ where: { id: { in: calculationIds } } });
  await prisma.servicePriceRule.deleteMany({ where: { id: { in: [dealerRuleId, retailRuleId].filter(Boolean) } } });
  await prisma.productPriceTier.deleteMany({ where: { productId } });
  if (productId) await prisma.product.delete({ where: { id: productId } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  await prisma.priceGroup.deleteMany({ where: { id: { in: [dealerGroupId, retailGroupId].filter(Boolean) } } });
});

describe("Pricing P1 service integration", () => {
  it("rejects overlapping active product tiers in the service", async () => {
    await createProductPriceTier({
      productId, priceGroupId: dealerGroupId, minQuantity: 1, maxQuantity: 100,
      unitPrice: 100000, effectiveFrom: "2026-01-01", effectiveTo: null,
    });
    await assert.rejects(
      () => createProductPriceTier({
        productId, priceGroupId: dealerGroupId, minQuantity: 50, maxQuantity: 200,
        unitPrice: 95000, effectiveFrom: "2026-06-01", effectiveTo: null,
      }),
      /chồng/,
    );
  });

  it("fails safely if legacy overlapping active tiers already exist", async () => {
    const legacy = await prisma.productPriceTier.create({
      data: {
        productId,
        priceGroupId: dealerGroupId,
        minQuantity: 50,
        maxQuantity: 200,
        unitPrice: 90000,
        effectiveFrom: new Date("2026-06-01"),
        isActive: true,
      },
    });
    try {
      await assert.rejects(
        () => calculatePricing({
          priceGroupId: dealerGroupId,
          items: [{ productId, quantity: 75 }],
        }),
        /nhiều dòng giá/,
      );
    } finally {
      await prisma.productPriceTier.delete({ where: { id: legacy.id } });
    }
  });

  it("rejects cross-group and out-of-range service rules", async () => {
    await assert.rejects(
      () => calculatePricing({
        priceGroupId: dealerGroupId,
        items: [{ productName: "Custom", quantity: 20, manualUnitPrice: 100000, serviceOptions: [{ ruleId: retailRuleId }] }],
      }),
      /không thuộc nhóm giá/,
    );
    await assert.rejects(
      () => calculatePricing({
        priceGroupId: dealerGroupId,
        items: [{ productName: "Custom", quantity: 5, manualUnitPrice: 100000, serviceOptions: [{ ruleId: dealerRuleId }] }],
      }),
      /không áp dụng/,
    );
  });

  it("rejects an item discount above line subtotal", async () => {
    await assert.rejects(
      () => calculatePricing({
        items: [{ productName: "Custom", quantity: 1, manualUnitPrice: 100000, discountAmount: 100001 }],
      }),
      /không được vượt quá/,
    );
  });

  it("recomputes quantity-break amounts on save instead of trusting client monetary fields", async () => {
    const saved = await saveCostingCalculation({
      customProductName: `Costing ${s}`,
      quantity: 10,
      fabricCostPerUnit: 50000,
      ribCostPerUnit: 5000,
      components: [{ label: "May", unitCost: 20000, quantityFactor: 1 }],
      overheadRate: 10,
      targetMarginRate: 30,
      vatRate: 8,
      quantityBreaks: [{
        quantity: 100,
        totalCostPerUnit: 999999999,
        suggestedSellingPricePerUnit: 999999999,
        revenueBeforeVat: 999999999,
        grossProfit: 999999999,
        actualMarginRate: 99,
        finalQuotePrice: 999999999,
      }],
    });
    calculationIds.push(saved.calculationId);
    const row = await prisma.pricingCalculation.findUnique({ where: { id: saved.calculationId } });
    const snapshot = row?.resultSnapshot as { quantityBreaks?: Array<{ quantity: number; totalCostPerUnit: number }> } | null;
    assert.equal(snapshot?.quantityBreaks?.[0]?.quantity, 100);
    assert.notEqual(snapshot?.quantityBreaks?.[0]?.totalCostPerUnit, 999999999);
  });
});
