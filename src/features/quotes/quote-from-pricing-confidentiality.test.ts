import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  collectQuoteItemsFromPricingCalculations,
  mapPricingCalculationItemToQuoteItem,
  type PricingCalcItemForQuote,
} from "@/features/quotes/quote-from-pricing-map";
import {
  assertPublicTokenSafePayload,
  PUBLIC_TOKEN_FORBIDDEN_FIELDS,
} from "@/lib/permissions/public-token-safety";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

function sampleItem(overrides: Partial<PricingCalcItemForQuote> = {}): PricingCalcItemForQuote {
  return {
    id: "pci-1",
    productId: "prod-1",
    variantId: null,
    productNameSnapshot: "Áo thun oversize",
    variantNameSnapshot: "Đen / L",
    pricingSnapshot: {
      materialName: "Cotton 100%",
      gsm: 250,
      targetMarginRate: 35,
      fabricPrice: 95000,
      supplierName: "Thiện Tâm",
      supplierUnitPrice: 95000,
      components: [{ label: "May", unitCost: 20000 }],
    },
    quantity: 200,
    unit: "cái",
    baseUnitPrice: 40000,
    serviceFee: 0,
    setupFee: 0,
    unitPrice: 164000,
    discountAmount: 0,
    manualUnitPrice: null,
    manualOverrideReason: null,
    costEstimate: 5600000,
    marginAmount: 27200000,
    marginRate: 35,
    ...overrides,
  };
}

describe("Costing → Quote customer description confidentiality", () => {
  it("keeps customer-facing product text only", () => {
    const item = mapPricingCalculationItemToQuoteItem(sampleItem(), [{ quantity: 200 }], 0);
    assert.equal(item.description, "Áo thun oversize · Đen / L");
    assert.equal(item.productNameSnapshot, "Áo thun oversize");
    assert.equal(item.itemNote, null);
  });

  it("does not put target margin, supplier, purchase price, or cost breakdown in description", () => {
    const item = mapPricingCalculationItemToQuoteItem(sampleItem(), [{ quantity: 500 }], 0);
    const description = item.description ?? "";
    assert.doesNotMatch(description, /target margin/i);
    assert.doesNotMatch(description, /Thiện Tâm/);
    assert.doesNotMatch(description, /95000|95\.000|95,000/);
    assert.doesNotMatch(description, /VL:/);
    assert.doesNotMatch(description, /GSM:/);
    assert.doesNotMatch(description, /Cotton 100%/);
    assert.doesNotMatch(description, /costing/i);
    assert.doesNotMatch(description, /May/);
    assert.equal(item.itemNote, null);
    assert.doesNotMatch(item.itemNote ?? "", /costing snapshot/i);
  });

  it("still copies admin-only financial snapshots onto QuoteItem", () => {
    const item = mapPricingCalculationItemToQuoteItem(sampleItem(), [], 0);
    assert.equal(item.costEstimate, 5600000);
    assert.equal(item.marginRate, 35);
    assert.equal((item.pricingSnapshot as { targetMarginRate?: number }).targetMarginRate, 35);
  });

  it("batch mapping stays description-safe", () => {
    const items = collectQuoteItemsFromPricingCalculations([
      { resultSnapshot: { quantityBreaks: [{ quantity: 100 }] }, items: [sampleItem()] },
    ]);
    assert.equal(items[0]?.description, "Áo thun oversize · Đen / L");
    assert.equal(items[0]?.itemNote, null);
  });

  it("preserves a legitimate customer-facing description when present", () => {
    const item = mapPricingCalculationItemToQuoteItem(
      sampleItem({
        pricingSnapshot: {
          ...(sampleItem().pricingSnapshot as object),
          customerFacingDescription: "Áo thun oversize cotton 250gsm — in logo 1 màu",
        },
      }),
      [],
      0,
    );
    assert.equal(item.description, "Áo thun oversize cotton 250gsm — in logo 1 màu");
  });

  it("ignores existing snapshot descriptions that contain costing internals", () => {
    const item = mapPricingCalculationItemToQuoteItem(
      sampleItem({
        pricingSnapshot: {
          ...(sampleItem().pricingSnapshot as object),
          customerFacingDescription: "VL: Cotton | Target margin: 35% | Giá từ Costing Calculator",
        },
      }),
      [],
      0,
    );
    assert.equal(item.description, "Áo thun oversize · Đen / L");
  });
});

describe("public Quote serialization still forbids internal financial fields", () => {
  it("forbids costing source-price keys on public payloads", () => {
    assert.ok(PUBLIC_TOKEN_FORBIDDEN_FIELDS.includes("costingSourcePrices"));
    assert.ok(PUBLIC_TOKEN_FORBIDDEN_FIELDS.includes("supplierUnitPrice"));
    const unsafe = assertPublicTokenSafePayload({
      quoteNo: "BG-009",
      costingSourcePrices: [{ unitPrice: 95000 }],
      supplierUnitPrice: 95000,
    });
    assert.equal(unsafe.ok, false);
  });

  it("public quote mapper omits costing internals", () => {
    const document = read("src/features/quotes/quote-document.ts");
    assert.match(document, /function mapPublicItem/);
    assert.doesNotMatch(document, /costEstimate/);
    assert.doesNotMatch(document, /pricingSnapshot/);
    assert.doesNotMatch(document, /costingSourcePrice/);
    assert.doesNotMatch(document, /marginRate/);
    const publicRoute = read("src/app/api/quotes/public/[token]/route.ts");
    assert.match(publicRoute, /assertPublicTokenSafePayload/);
  });
});
