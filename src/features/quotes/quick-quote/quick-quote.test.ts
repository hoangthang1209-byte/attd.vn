import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuickQuotePayload,
  validateQuickQuoteItems,
} from "./quick-quote-payload";

describe("buildQuickQuotePayload", () => {
  it("maps party and commercial fields to create quote API shape", () => {
    const payload = buildQuickQuotePayload(
      {
        customerId: "cust-1",
        contactId: "contact-1",
        customerCompany: "Công ty ABC",
        customerTaxCode: "",
        customerAddress: "Hà Nội",
        customerContactName: "Nguyễn A",
        customerContactTitle: "",
        customerPhone: "0901234567",
        customerEmail: "a@abc.vn",
      },
      {
        leadId: "lead-1",
        title: "Báo giá test",
        validUntil: "2026-12-31",
        quoteDate: "2026-09-24",
        currency: "VND",
        priceVatType: "EXCLUDING_VAT",
        discountAmount: "10000",
        shippingFee: "5000",
        vatRate: "8",
        salesRepresentativeId: "emp-1",
        salesName: "Sales Rep",
        salesTitle: "NVKD",
        salesPhone: "0900000000",
        salesEmail: "sales@attd.vn",
        salesAddress: "",
        customerNote: "Giao nhanh",
      },
      [
        {
          productNameSnapshot: "Áo thun",
          quantity: 100,
          unit: "cái",
          unitPrice: 85000,
          baseUnitPrice: 85000,
        },
      ],
      "DRAFT",
    );

    assert.equal(payload.customerId, "cust-1");
    assert.equal(payload.leadId, "lead-1");
    assert.equal(payload.discountAmount, 10000);
    assert.equal(payload.vatRate, 8);
    assert.equal(payload.status, "DRAFT");
    assert.equal(payload.items.length, 1);
    assert.equal(payload.sourceType, "MANUAL");
  });
});

describe("validateQuickQuoteItems", () => {
  it("requires at least one product line", () => {
    assert.match(validateQuickQuoteItems([]) ?? "", /ít nhất một sản phẩm/);
  });

  it("requires product name and positive quantity", () => {
    assert.match(
      validateQuickQuoteItems([{ productId: "prod-1", productNameSnapshot: "", quantity: 10, unitPrice: 0 }]) ?? "",
      /tên sản phẩm/,
    );

    assert.match(
      validateQuickQuoteItems([{ productNameSnapshot: "Áo", quantity: 0, unitPrice: 100 }]) ?? "",
      /Số lượng/,
    );
  });

  it("accepts valid items", () => {
    assert.equal(
      validateQuickQuoteItems([
        { productNameSnapshot: "Áo thun", quantity: 50, unitPrice: 80000 },
      ]),
      null,
    );
  });
});
