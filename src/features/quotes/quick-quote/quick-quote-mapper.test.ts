import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPricingCalculatePayload,
  mergeLineNotes,
  pricingResultToQuoteItems,
  validateQuickQuoteLine,
} from "@/features/quotes/quick-quote/quick-quote-mapper";
import type { CalculatePricingResult } from "@/features/pricing/types";

describe("quick-quote-mapper", () => {
  it("validates product and quantity", () => {
    assert.equal(
      validateQuickQuoteLine({
        key: "1",
        productId: "",
        variantId: "",
        quantity: "10",
        itemNote: "",
        manualUnitPrice: "",
      }),
      "Chọn sản phẩm",
    );
    assert.equal(
      validateQuickQuoteLine({
        key: "1",
        productId: "p1",
        variantId: "",
        quantity: "0",
        itemNote: "",
        manualUnitPrice: "",
      }),
      "Số lượng phải ≥ 1",
    );
    assert.equal(
      validateQuickQuoteLine({
        key: "1",
        productId: "p1",
        variantId: "",
        quantity: "50",
        itemNote: "",
        manualUnitPrice: "",
      }),
      null,
    );
  });

  it("builds pricing payload from lines", () => {
    const payload = buildPricingCalculatePayload({
      customerId: "c1",
      lines: [
        {
          key: "1",
          productId: "p1",
          variantId: "v1",
          quantity: "100",
          itemNote: "",
          manualUnitPrice: "",
        },
      ],
      discountAmount: "0",
      shippingFee: "50000",
      vatRate: "8",
    });
    assert.equal(payload.customerId, "c1");
    assert.equal(payload.items.length, 1);
    assert.equal(payload.items[0]?.quantity, 100);
    assert.equal(payload.shippingFee, 50000);
  });

  it("maps pricing result to quote items", () => {
    const result: CalculatePricingResult = {
      priceGroup: null,
      items: [
        {
          productId: "p1",
          variantId: "v1",
          productName: "Áo thun",
          variantName: "Trắng / M",
          quantity: 100,
          unit: "cái",
          baseUnitPrice: 45000,
          serviceFee: 0,
          setupFee: 0,
          unitPrice: 45000,
          discountAmount: 0,
          lineSubtotal: 4500000,
          lineTotal: 4500000,
          costEstimate: null,
          marginAmount: null,
          marginRate: null,
          manualOverride: false,
          manualUnitPrice: null,
          manualOverrideReason: null,
          pricingSnapshot: { tier: "default" },
        },
      ],
      subtotal: 4500000,
      serviceTotal: 0,
      setupTotal: 0,
      discountAmount: 0,
      shippingFee: 0,
      vatRate: 8,
      vatAmount: 360000,
      totalAmount: 4860000,
      calculatedTotalAmount: 4860000,
      manualOverride: false,
      manualTotalAmount: null,
      manualOverrideReason: null,
      warnings: [],
    };
    const items = pricingResultToQuoteItems(result);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.productNameSnapshot, "Áo thun");
    assert.equal(items[0]?.unitPrice, 45000);
    assert.deepEqual(items[0]?.pricingSnapshot, { tier: "default" });
  });

  it("merges line notes onto calculated items", () => {
    const merged = mergeLineNotes(
      [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 100,
        },
      ],
      [
        {
          key: "1",
          productId: "p1",
          variantId: "v1",
          quantity: "100",
          itemNote: "In logo ngực trái",
          manualUnitPrice: "",
        },
      ],
    );
    assert.equal(merged[0]?.itemNote, "In logo ngực trái");
  });
});
