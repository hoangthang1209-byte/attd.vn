import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_ORDER_STATUSES,
  OPEN_QUOTE_STATUSES,
} from "@/features/crm/customer-account-overview.types";
import {
  aggregatePurchasedProducts,
  purchasedProductGroupKey,
} from "@/features/crm/services/customer-account-overview.service";

describe("Customer 360 Phase 1 overview helpers", () => {
  it("defines open quotes as DRAFT/SENT/VIEWED only", () => {
    assert.deepEqual([...OPEN_QUOTE_STATUSES], ["DRAFT", "SENT", "VIEWED"]);
  });

  it("defines active orders without COMPLETED/CANCELLED", () => {
    assert.ok(ACTIVE_ORDER_STATUSES.includes("IN_PRODUCTION"));
    assert.ok(ACTIVE_ORDER_STATUSES.includes("SHIPPED"));
    assert.equal(
      (ACTIVE_ORDER_STATUSES as readonly string[]).includes("COMPLETED"),
      false,
    );
    assert.equal(
      (ACTIVE_ORDER_STATUSES as readonly string[]).includes("CANCELLED"),
      false,
    );
  });

  it("groups purchased products by productId when present", () => {
    assert.equal(
      purchasedProductGroupKey({
        productId: "p1",
        productNameSnapshot: "Polo",
        variantNameSnapshot: "M",
        skuSnapshot: "SKU-1",
      }),
      "product:p1",
    );
  });

  it("falls back to snapshot identity when productId is missing", () => {
    assert.equal(
      purchasedProductGroupKey({
        productId: null,
        productNameSnapshot: " Áo Polo ",
        variantNameSnapshot: "Đỏ",
        skuSnapshot: "SKU-X",
      }),
      "snap:áo polo|đỏ|sku-x",
    );
  });

  it("aggregates last order commercial fields and order counts", () => {
    const older = new Date("2026-01-01T00:00:00.000Z");
    const newer = new Date("2026-09-01T00:00:00.000Z");
    const rows = aggregatePurchasedProducts(
      [
        {
          id: "i1",
          productId: "p1",
          productNameSnapshot: "Polo",
          variantNameSnapshot: "M",
          skuSnapshot: "SKU-1",
          quantity: 100,
          unit: "cái",
          unitPrice: 50000,
          quotedUnitCost: 30000,
          quotedMarginRate: 40,
          order: { id: "o1", orderNo: "DH-1", orderDate: older },
          supplierName: "Factory A",
        },
        {
          id: "i2",
          productId: "p1",
          productNameSnapshot: "Polo",
          variantNameSnapshot: "M",
          skuSnapshot: "SKU-1",
          quantity: 200,
          unit: "cái",
          unitPrice: 55000,
          quotedUnitCost: 32000,
          quotedMarginRate: 42,
          order: { id: "o2", orderNo: "DH-2", orderDate: newer },
          supplierName: "Factory B",
        },
        {
          id: "i3",
          productId: null,
          productNameSnapshot: "Custom Tee",
          variantNameSnapshot: null,
          skuSnapshot: null,
          quantity: 50,
          unit: "cái",
          unitPrice: 40000,
          quotedUnitCost: null,
          quotedMarginRate: null,
          order: { id: "o2", orderNo: "DH-2", orderDate: newer },
          supplierName: null,
        },
      ],
      { includeFinancials: true },
    );

    assert.equal(rows.length, 2);
    const polo = rows.find((r) => r.productId === "p1");
    assert.ok(polo);
    assert.equal(polo.lastOrderNo, "DH-2");
    assert.equal(polo.lastQuantity, 200);
    assert.equal(polo.lastUnitPrice, 55000);
    assert.equal(polo.lastQuotedUnitCost, 32000);
    assert.equal(polo.lastQuotedMarginRate, 42);
    assert.equal(polo.orderCount, 2);
    assert.equal(polo.lastSupplierName, "Factory B");
  });

  it("redacts financial fields when includeFinancials is false", () => {
    const rows = aggregatePurchasedProducts(
      [
        {
          id: "i1",
          productId: "p1",
          productNameSnapshot: "Polo",
          variantNameSnapshot: null,
          skuSnapshot: null,
          quantity: 10,
          unit: "cái",
          unitPrice: 1000,
          quotedUnitCost: 500,
          quotedMarginRate: 50,
          order: {
            id: "o1",
            orderNo: "DH-1",
            orderDate: new Date("2026-09-01T00:00:00.000Z"),
          },
          supplierName: null,
        },
      ],
      { includeFinancials: false },
    );
    assert.equal(rows[0]?.lastUnitPrice, null);
    assert.equal(rows[0]?.lastQuotedUnitCost, null);
    assert.equal(rows[0]?.lastQuotedMarginRate, null);
  });
});
