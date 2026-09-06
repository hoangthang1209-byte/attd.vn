import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import {
  collectQuoteItemsFromPricingCalculations,
  mapPricingCalculationItemToQuoteItem,
  type PricingCalcItemForQuote,
} from "@/features/quotes/quote-from-pricing-map";

function sampleItem(
  overrides: Partial<PricingCalcItemForQuote> & Pick<PricingCalcItemForQuote, "id">,
): PricingCalcItemForQuote {
  return {
    productId: null,
    variantId: null,
    productNameSnapshot: "Custom Style",
    variantNameSnapshot: null,
    pricingSnapshot: { customProductName: "Custom Style", targetMarginRate: 30 },
    quantity: 200,
    unit: "pcs",
    baseUnitPrice: 40000,
    serviceFee: 0,
    setupFee: 0,
    unitPrice: 40000,
    discountAmount: 0,
    manualUnitPrice: null,
    manualOverrideReason: null,
    costEstimate: 5600000,
    marginAmount: 2400000,
    marginRate: 30,
    ...overrides,
  };
}

describe("batch → quote item mapping", () => {
  it("1. multiple pricing calculations produce all selected quote items", () => {
    const items = collectQuoteItemsFromPricingCalculations([
      {
        resultSnapshot: {},
        items: [
          sampleItem({
            id: "pci-1",
            productNameSnapshot: "Sleeveless Top",
            unitPrice: 164000,
            costEstimate: 5600000,
            marginAmount: 27200000,
            marginRate: 82.93,
          }),
        ],
      },
      {
        resultSnapshot: {},
        items: [
          sampleItem({
            id: "pci-2",
            productNameSnapshot: "Tank top",
            unitPrice: 40000,
          }),
        ],
      },
    ]);

    assert.equal(items.length, 2);
    assert.equal(items[0]?.productNameSnapshot, "Sleeveless Top");
    assert.equal(items[1]?.productNameSnapshot, "Tank top");
    assert.equal(items[0]?.pricingCalculationItemId, "pci-1");
    assert.equal(items[1]?.pricingCalculationItemId, "pci-2");
    assert.equal(items[0]?.sortOrder, 0);
    assert.equal(items[1]?.sortOrder, 1);
  });

  it("2. custom style without Product still creates QuoteItem", () => {
    const item = mapPricingCalculationItemToQuoteItem(
      sampleItem({
        id: "pci-custom",
        productId: null,
        productNameSnapshot: "Áo custom không catalog",
      }),
      [],
      0,
    );
    assert.equal(item.productId, null);
    assert.equal(item.productNameSnapshot, "Áo custom không catalog");
    assert.equal(item.pricingCalculationItemId, "pci-custom");
    assert.equal(item.quantity, 200);
    assert.equal(item.unitPrice, 40000);
  });

  it("3. QuoteItem product/design image is optional", () => {
    const item = mapPricingCalculationItemToQuoteItem(sampleItem({ id: "pci-no-img" }), [], 0);
    assert.equal(item.designImageUrl, undefined);
    assert.equal(item.designMediaAssetId, undefined);
  });

  it("7. cost/margin snapshots are preserved", () => {
    const item = mapPricingCalculationItemToQuoteItem(
      sampleItem({
        id: "pci-margin",
        costEstimate: 5600000,
        marginAmount: 27200000,
        marginRate: 82.93,
        unitPrice: 164000,
        pricingSnapshot: { fabricPrice: 135000, targetMarginRate: 35 },
      }),
      [{ quantity: 200 }],
      0,
    );
    assert.equal(item.costEstimate, 5600000);
    assert.equal(item.marginAmount, 27200000);
    assert.equal(item.marginRate, 82.93);
    assert.equal(item.unitPrice, 164000);
    assert.equal(item.itemNote, "Có bảng giá theo số lượng trong costing snapshot.");
    assert.deepEqual(item.pricingSnapshot, { fabricPrice: 135000, targetMarginRate: 35 });
  });
});

describe("admin quote manufacturing image bounds", () => {
  const root = process.cwd();
  const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const detailSrc = readFileSync(
    path.join(root, "src/components/admin/quotes/QuoteDetailView.tsx"),
    "utf8",
  );
  const publicMfgSrc = readFileSync(
    path.join(root, "src/components/quotes/QuoteDocumentManufacturingEvidence.tsx"),
    "utf8",
  );
  const designThumbSrc = readFileSync(
    path.join(root, "src/components/quotes/QuoteDesignThumb.tsx"),
    "utf8",
  );
  const documentContent = readFileSync(
    path.join(root, "src/components/quotes/QuoteDocumentContent.tsx"),
    "utf8",
  );

  it("4. quote detail no longer mounts manufacturing evidence picker", () => {
    assert.doesNotMatch(detailSrc, /QuoteManufacturingEvidencePicker/);
    assert.doesNotMatch(documentContent, /QuoteDocumentManufacturingEvidence/);
    assert.match(publicMfgSrc, /return null/);
  });

  it("5. two quote items render as two rows (detail maps items)", () => {
    assert.match(detailSrc, /quote\.items\.map\(\(item\)/);
    assert.match(detailSrc, /<tr key=\{item\.id\}>/);
    assert.match(detailSrc, /Sản phẩm \/ dịch vụ/);
  });

  it("6. bounded design thumbs remain; no viewport image sizing", () => {
    assert.match(designThumbSrc, /quote-doc__design-thumb/);
    assert.match(designThumbSrc, /width=\{56\}/);
    assert.match(designThumbSrc, /height=\{64\}/);
    assert.match(css, /\.quote-doc__design-thumb\s*\{[\s\S]*?width:\s*56px/);
    assert.doesNotMatch(css, /\.quote-doc__design-thumb[^}]*100vw/);
  });

  it("8. public quote design thumb stays bounded", () => {
    assert.match(designThumbSrc, /quote-doc__design-thumb/);
    assert.match(css, /\.quote-doc__design-thumb\s*\{[\s\S]*?width:\s*56px/);
  });

  it("9. legacy manufacturing media CSS remains capped if ever re-enabled", () => {
    assert.match(
      css,
      /\.quote-doc--pdf\s+\.quote-manufacturing-media__img[\s\S]*?max-height:\s*88px/,
    );
  });
});
