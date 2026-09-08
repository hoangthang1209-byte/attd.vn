import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewCostingCalculation } from "@/features/pricing/costing-preview";
import {
  buildCostingWorkspaceClone,
  costingWorkspaceToCalculatorInput,
} from "@/features/pricing/costing-calculation-clone";
import {
  COSTING_WORKSPACE_VERSION,
  computeStructuredLineCost,
  finalizeStructuredLine,
  newCostingLineKey,
  projectLegacyInputToCostLines,
  restoreLineReferencePrice,
  structuredLineFromSourcePick,
  suggestedSellingPricePerUnit,
  usesV2CostLines,
} from "@/features/pricing/costing-v2";
import type { CostingStructuredLine } from "@/features/pricing/costing-types";
import { formatPricingCurrency } from "@/features/pricing/format";
import { mapPricingCalculationItemToQuoteItem } from "@/features/quotes/quote-from-pricing-map";

function line(partial: Partial<CostingStructuredLine> & Pick<CostingStructuredLine, "section" | "pricingBasis" | "label">): CostingStructuredLine {
  return finalizeStructuredLine(
    {
      key: partial.key ?? newCostingLineKey(),
      componentType: partial.componentType ?? (partial.section === "MATERIAL" ? "MATERIAL" : partial.section === "OTHER" ? "OTHER" : "SEWING"),
      origin: partial.origin ?? "CUSTOM",
      unitPrice: partial.unitPrice ?? 0,
      unit: partial.unit ?? "cái",
      consumption: partial.consumption,
      quantityFactor: partial.quantityFactor,
      calculationType: partial.calculationType,
      supplierId: partial.supplierId,
      supplierName: partial.supplierName,
      sourcePriceId: partial.sourcePriceId,
      sourceType: partial.sourceType,
      sourceId: partial.sourceId,
      referenceUnitPrice: partial.referenceUnitPrice,
      note: partial.note,
      ...partial,
    },
    500,
  );
}

function tShirtLines(): CostingStructuredLine[] {
  return [
    line({
      section: "MATERIAL",
      pricingBasis: "UNIT_TIMES_CONSUMPTION",
      origin: "LIBRARY",
      label: "Cotton 100% · 250 GSM",
      supplierName: "Thiện Tâm",
      sourceType: "PRODUCTION_MATERIAL",
      sourceId: "mat-cotton",
      sourcePriceId: "price-cotton",
      supplierId: "thien-tam",
      unitPrice: 95000,
      referenceUnitPrice: 95000,
      unit: "kg",
      consumption: 0.22,
    }),
    line({
      section: "MATERIAL",
      pricingBasis: "UNIT_TIMES_CONSUMPTION",
      origin: "LIBRARY",
      label: "Bo rib",
      supplierName: "NCC A",
      componentType: "RIB",
      unitPrice: 18000,
      unit: "kg",
      consumption: 0.03,
    }),
    line({
      section: "MATERIAL",
      pricingBasis: "UNIT_TIMES_CONSUMPTION",
      origin: "LIBRARY",
      label: "Woven label",
      unitPrice: 850,
      unit: "cái",
      consumption: 1,
    }),
    line({
      section: "MATERIAL",
      pricingBasis: "UNIT_TIMES_CONSUMPTION",
      origin: "LIBRARY",
      label: "Polybag",
      unitPrice: 700,
      unit: "cái",
      consumption: 1,
    }),
    line({
      section: "PROCESS",
      pricingBasis: "PER_ITEM",
      calculationType: "PER_ITEM",
      label: "May áo thun cơ bản",
      unitPrice: 20000,
      quantityFactor: 1,
    }),
    line({
      section: "PROCESS",
      pricingBasis: "PER_POSITION",
      calculationType: "PER_POSITION",
      label: "In lụa 1 màu",
      unitPrice: 7000,
      quantityFactor: 1,
    }),
    line({
      section: "PROCESS",
      pricingBasis: "PER_ITEM",
      calculationType: "PER_ITEM",
      label: "Ủi hoàn thiện",
      unitPrice: 1000,
      quantityFactor: 1,
    }),
  ];
}

function hoodieLines(): CostingStructuredLine[] {
  const materials = [
    "Body fabric",
    "Rib",
    "Drawcord",
    "Zipper",
    "Woven label",
    "Size label",
    "Care label",
    "Polybag",
    "Carton / SP",
  ];
  const services = ["Cutting", "Sewing", "Embroidery", "Printing", "Washing", "Finishing"];
  return [
    ...materials.map((label, index) =>
      line({
        section: "MATERIAL",
        pricingBasis: "UNIT_TIMES_CONSUMPTION",
        label,
        unitPrice: 1000 + index * 100,
        unit: index < 2 ? "kg" : "cái",
        consumption: index < 2 ? 0.2 : 1,
      }),
    ),
    ...services.map((label) =>
      line({
        section: "PROCESS",
        pricingBasis: "PER_ITEM",
        calculationType: "PER_ITEM",
        label,
        unitPrice: 2000,
        quantityFactor: 1,
      }),
    ),
  ];
}

describe("Costing V2 structured lines", () => {
  it("multiplies N material/trim rows: unitPrice × consumption", () => {
    const cotton = computeStructuredLineCost(
      line({
        section: "MATERIAL",
        pricingBasis: "UNIT_TIMES_CONSUMPTION",
        label: "Cotton",
        unitPrice: 95000,
        consumption: 0.22,
        unit: "kg",
      }),
      500,
    );
    assert.equal(cotton.costPerUnit, 20900);
    const trim = computeStructuredLineCost(
      line({
        section: "MATERIAL",
        pricingBasis: "UNIT_TIMES_CONSUMPTION",
        label: "Woven label",
        unitPrice: 850,
        consumption: 1,
        unit: "cái",
      }),
      500,
    );
    assert.equal(trim.costPerUnit, 850);
  });

  it("keeps override on this costing only and can restore library price", () => {
    const original = line({
      section: "MATERIAL",
      pricingBasis: "UNIT_TIMES_CONSUMPTION",
      origin: "LIBRARY",
      label: "Cotton",
      unitPrice: 97000,
      referenceUnitPrice: 95000,
      consumption: 0.22,
      unit: "kg",
    });
    assert.equal(original.isOverride, true);
    assert.equal(original.costPerUnit, 21340);
    const restored = restoreLineReferencePrice(original, 500);
    assert.equal(restored.unitPrice, 95000);
    assert.equal(restored.isOverride, false);
    assert.equal(restored.costPerUnit, 20900);
  });

  it("snapshot keeps old price and does not auto-refresh", () => {
    const saved = tShirtLines();
    const reopened = previewCostingCalculation({
      workspaceVersion: 2,
      quantity: 500,
      targetMarginRate: 30,
      customProductName: "PRICE-000010",
      costLines: saved.map((row) => ({ ...row })),
    });
    const cotton = reopened.costLines?.find((row) => row.label.includes("Cotton"));
    assert.equal(cotton?.unitPrice, 95000);
    assert.equal(cotton?.costPerUnit, 20900);
    assert.equal(reopened.totalCostPerUnit, 50990);
  });

  it("computes PER_ITEM, PER_POSITION, PER_ORDER, and MANUAL services", () => {
    assert.equal(
      computeStructuredLineCost(
        line({ section: "PROCESS", pricingBasis: "PER_ITEM", label: "May", unitPrice: 20000, quantityFactor: 1 }),
        500,
      ).costPerUnit,
      20000,
    );
    assert.equal(
      computeStructuredLineCost(
        line({ section: "PROCESS", pricingBasis: "PER_POSITION", label: "In", unitPrice: 7000, quantityFactor: 2 }),
        500,
      ).costPerUnit,
      14000,
    );
    assert.equal(
      computeStructuredLineCost(
        line({ section: "PROCESS", pricingBasis: "PER_ORDER", label: "Setup", unitPrice: 500000 }),
        500,
      ).costPerUnit,
      1000,
    );
    assert.equal(
      computeStructuredLineCost(
        line({ section: "OTHER", pricingBasis: "MANUAL", label: "Phí mẫu", unitPrice: 400 }),
        500,
      ).costPerUnit,
      400,
    );
  });

  it("T-shirt acceptance: 50,990/SP and suggested sell ≈ 72,843", () => {
    const result = previewCostingCalculation({
      workspaceVersion: COSTING_WORKSPACE_VERSION,
      customProductName: "Áo thun",
      quantity: 500,
      targetMarginRate: 30,
      costLines: tShirtLines(),
    });
    assert.equal(result.materialCostPerUnit, 22990);
    assert.equal(result.processCostPerUnit, 28000);
    assert.equal(result.otherCostPerUnit, 0);
    assert.equal(result.totalCostPerUnit, 50990);
    assert.equal(result.totalCost, 25495000);
    assert.equal(result.suggestedSellingPricePerUnit, suggestedSellingPricePerUnit(50990, 30));
    assert.equal(result.suggestedSellingPricePerUnit, 72842.86);
    assert.equal(formatPricingCurrency(result.suggestedSellingPricePerUnit), "72.843 đ");
  });

  it("Hoodie fixture stays a flat list of 8+ materials and 6+ services", () => {
    const lines = hoodieLines();
    assert.ok(lines.filter((row) => row.section === "MATERIAL").length >= 8);
    assert.ok(lines.filter((row) => row.section === "PROCESS").length >= 6);
    const result = previewCostingCalculation({
      workspaceVersion: 2,
      quantity: 200,
      targetMarginRate: 35,
      costLines: lines,
    });
    assert.ok(result.materialCostPerUnit > 0);
    assert.ok(result.processCostPerUnit > 0);
    assert.equal(result.costLines?.length, lines.length);
  });

  it("does not double-count legacy fabric/rib/components when V2 costLines are authoritative", () => {
    const result = previewCostingCalculation({
      workspaceVersion: 2,
      customProductName: "V2 only",
      quantity: 100,
      fabricPrice: 135000,
      fabricConsumption: 3.7,
      ribCostPerUnit: 4600,
      components: [{ label: "May legacy", type: "SEWING", unitCost: 20000 }],
      costLines: [
        line({
          section: "PROCESS",
          pricingBasis: "PER_ITEM",
          label: "May V2",
          unitPrice: 5000,
          quantityFactor: 1,
        }),
      ],
      targetMarginRate: 30,
    });
    assert.equal(usesV2CostLines({ workspaceVersion: 2 }), true);
    assert.equal(usesV2CostLines({ costLines: [] }), true);
    assert.equal(result.processCostPerUnit, 5000);
    assert.equal(result.materialCostPerUnit, 0);
    assert.equal(result.totalCostPerUnit, 5000);
    assert.ok(!result.components.some((row) => row.label === "May legacy"));
  });
});

describe("Costing V2 legacy adapter", () => {
  it("keeps fabricPrice / fabricConsumption yield math and does not convert 3.7 to kg/SP", () => {
    const legacy = previewCostingCalculation({
      customProductName: "Sleeveless Top",
      quantity: 200,
      fabricPrice: 135000,
      fabricConsumption: 3.7,
      ribCostPerUnit: 4600,
      targetMarginRate: 35,
      components: [{ label: "May", type: "SEWING", unitCost: 20000 }],
    });
    assert.equal(legacy.fabricCostPerUnit, Math.round((135000 / 3.7) * 100) / 100);
    assert.equal(usesV2CostLines({}), false);

    const projected = projectLegacyInputToCostLines({
      quantity: 200,
      fabricPrice: 135000,
      fabricConsumption: 3.7,
      ribCostPerUnit: 4600,
      components: [{ label: "May", type: "SEWING", unitCost: 20000 }],
    });
    const fabric = projected.find((row) => row.pricingBasis === "LEGACY_YIELD");
    assert.ok(fabric);
    assert.equal(fabric?.consumption, 3.7);
    assert.equal(fabric?.unitPrice, 135000);
    assert.equal(fabric?.costPerUnit, legacy.fabricCostPerUnit);

    const v2 = previewCostingCalculation({
      workspaceVersion: 2,
      quantity: 200,
      targetMarginRate: 35,
      costLines: projected,
    });
    assert.equal(v2.totalCostPerUnit, legacy.totalCostPerUnit);
  });

  it("legacy fabric 130000 / 3 stays 43,333.33 and clone save without edit keeps that cost", () => {
    const input = {
      customProductName: "Legacy Tee",
      quantity: 100,
      fabricPrice: 130000,
      fabricConsumption: 3,
      targetMarginRate: 30,
    };
    const legacy = previewCostingCalculation(input);
    assert.equal(legacy.fabricCostPerUnit, 43333.33);
    const projected = projectLegacyInputToCostLines(input);
    const fabric = projected.find((row) => row.pricingBasis === "LEGACY_YIELD");
    assert.ok(fabric);
    assert.equal(fabric?.consumption, 3);
    assert.equal(fabric?.unitPrice, 130000);
    assert.equal(computeStructuredLineCost(fabric!, 100).costPerUnit, 43333.33);
    assert.notEqual(
      computeStructuredLineCost({ ...fabric!, pricingBasis: "UNIT_TIMES_CONSUMPTION" }, 100).costPerUnit,
      43333.33,
    );
    const cloned = previewCostingCalculation({
      workspaceVersion: 2,
      customProductName: "Legacy Tee",
      quantity: 100,
      targetMarginRate: 30,
      fabricPrice: 130000,
      fabricConsumption: 3,
      costLines: projected,
    });
    assert.equal(cloned.totalCostPerUnit, legacy.totalCostPerUnit);
    assert.equal(cloned.fabricCostPerUnit, 43333.33);
  });

  it("replacing a LEGACY_YIELD row with a V2 source asks for new consumption instead of reusing 3", () => {
    const projected = projectLegacyInputToCostLines({
      quantity: 100,
      fabricPrice: 130000,
      fabricConsumption: 3,
    });
    const fabric = projected.find((row) => row.pricingBasis === "LEGACY_YIELD");
    assert.equal(fabric?.consumption, 3);
    const replaced = structuredLineFromSourcePick({
      section: "MATERIAL",
      source: {
        id: "mat-cotton",
        type: "PRODUCTION_MATERIAL",
        name: "SMOKE-P2 Cotton",
      },
      price: {
        id: "price-1",
        supplierId: "thien-tam",
        supplierName: "Thiện Tâm",
        unitPrice: 95000,
        unit: "kg",
      },
      manual: false,
      quantity: 100,
    });
    assert.equal(replaced.pricingBasis, "UNIT_TIMES_CONSUMPTION");
    assert.equal(replaced.consumption, null);
    assert.equal(replaced.sourceType, "PRODUCTION_MATERIAL");
    assert.notEqual(replaced.consumption, 3);
  });

  it("clone of FINAL legacy projects lines without rewriting the stored snapshot", () => {
    const inputSnapshot = {
      calculator: "costing",
      customProductName: "Sleeveless Top",
      quantity: 200,
      fabricPrice: 135000,
      fabricConsumption: 3.7,
      ribCostPerUnit: 4600,
      targetMarginRate: 35,
      components: [{ label: "May", type: "SEWING", unitCost: 20000, quantityFactor: 1 }],
    };
    const before = structuredClone(inputSnapshot);
    const workspace = buildCostingWorkspaceClone({
      id: "calc-final",
      code: "PRICE-000002",
      revisionLabel: "V1",
      isFinal: true,
      inputSnapshot,
      resultSnapshot: inputSnapshot,
      internalNote: null,
      leadId: null,
      customerId: null,
      contactId: null,
      priceGroupId: null,
      items: [{ productId: null, variantId: null, productNameSnapshot: "Sleeveless Top", pricingSnapshot: inputSnapshot }],
    });
    assert.deepEqual(inputSnapshot, before);
    assert.equal(workspace?.workspaceVersion, 2);
    const fabric = workspace?.costLines?.find((row) => row.pricingBasis === "LEGACY_YIELD");
    assert.equal(fabric?.consumption, 3.7);
    const cloned = previewCostingCalculation(costingWorkspaceToCalculatorInput(workspace!));
    const original = previewCostingCalculation({
      customProductName: "Sleeveless Top",
      quantity: 200,
      fabricPrice: 135000,
      fabricConsumption: 3.7,
      ribCostPerUnit: 4600,
      targetMarginRate: 35,
      components: [{ label: "May", type: "SEWING", unitCost: 20000, quantityFactor: 1 }],
    });
    assert.equal(cloned.totalCostPerUnit, original.totalCostPerUnit);
  });
});

describe("Costing V2 quote confidentiality", () => {
  it("does not leak V2 supplier rows into customer description", () => {
    const item = mapPricingCalculationItemToQuoteItem(
      {
        id: "pci-v2",
        productId: "prod-1",
        variantId: null,
        productNameSnapshot: "Áo thun oversize",
        variantNameSnapshot: "Đen / L",
        pricingSnapshot: {
          workspaceVersion: 2,
          targetMarginRate: 30,
          costLines: tShirtLines(),
          supplierName: "Thiện Tâm",
          supplierUnitPrice: 95000,
        },
        quantity: 500,
        unit: "cái",
        baseUnitPrice: 72842.86,
        serviceFee: 0,
        setupFee: 0,
        unitPrice: 72842.86,
        discountAmount: 0,
        manualUnitPrice: null,
        manualOverrideReason: null,
        costEstimate: 25495000,
        marginAmount: 10926430,
        marginRate: 30,
      },
      [],
      0,
    );
    assert.equal(item.description, "Áo thun oversize · Đen / L");
    assert.equal(item.costEstimate, 25495000);
    assert.equal((item.pricingSnapshot as { targetMarginRate?: number }).targetMarginRate, 30);
    assert.equal(((item.pricingSnapshot as { costLines?: CostingStructuredLine[] }).costLines ?? []).length, 7);
    assert.doesNotMatch(item.description ?? "", /Thiện Tâm/);
    assert.doesNotMatch(item.description ?? "", /0\.22/);
    assert.doesNotMatch(item.description ?? "", /PER_ITEM/);
  });
});
