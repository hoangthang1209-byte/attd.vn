import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  aggregateOrderQuotedCommercialSummary,
  assertQuoteFinancialFieldsImmutable,
  buildOrderItemQuotedCostSnapshot,
  deriveQuotedUnitCost,
  isQuoteFinanciallyLocked,
  QuoteFinancialLockError,
} from "@/features/orders/order-quoted-cost";
import { deriveRevisionLabel, formatRevisionDisplayLabel } from "@/features/pricing/pricing-calculation-revision";
import { canViewOrderFinancials } from "@/features/auth/admin-permissions";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";

describe("quoted cost continuity", () => {
  it("1. PricingCalculation estimate maps to QuoteItem-style order snapshot", () => {
    const snapshot = buildOrderItemQuotedCostSnapshot({
      quantity: 750,
      costEstimate: 85500000,
      marginAmount: 42750000,
      marginRate: 33.33,
      pricingCalculationItemId: "pci-1",
    });
    assert.equal(snapshot.quotedTotalCost, 85500000);
    assert.equal(snapshot.quotedUnitCost, 114000);
    assert.equal(snapshot.quotedMarginAmount, 42750000);
    assert.equal(snapshot.quotedMarginRate, 33.33);
    assert.equal(snapshot.pricingCalculationItemId, "pci-1");
  });

  it("2. accepted quote financial fields cannot silently mutate", () => {
    const existing = [
      {
        id: "qi-1",
        sortOrder: 0,
        quantity: 750,
        unitPrice: 171000,
        costEstimate: 85500000,
        marginAmount: 42750000,
        marginRate: 33.33,
        pricingSnapshot: { calculator: "costing" },
      },
    ];
    const incoming = [
      {
        id: "qi-1",
        sortOrder: 0,
        quantity: 750,
        unitPrice: 180000,
        costEstimate: 85500000,
        marginAmount: 42750000,
        marginRate: 33.33,
        pricingSnapshot: { calculator: "costing" },
      },
    ];
    assert.throws(
      () => assertQuoteFinancialFieldsImmutable("ACCEPTED", existing, incoming),
      QuoteFinancialLockError,
    );
  });

  it("3–5. quote → order snapshot copies unit/total cost and margin", () => {
    const item = buildOrderItemQuotedCostSnapshot({
      quantity: 550,
      costEstimate: 137500000,
      marginAmount: 75600000,
      marginRate: 35.48,
      pricingCalculationItemId: "pci-hoodie",
    });
    assert.equal(deriveQuotedUnitCost(550, 137500000), 250000);
    assert.equal(item.quotedUnitCost, 250000);
    assert.equal(item.quotedTotalCost, 137500000);
    assert.equal(item.quotedMarginAmount, 75600000);
    assert.equal(item.quotedMarginRate, 35.48);
  });

  it("6. catalog tier change does not alter stored order quoted cost (snapshot isolation)", () => {
    const orderItemQuoted = buildOrderItemQuotedCostSnapshot({
      quantity: 860,
      costEstimate: 94600000,
      marginAmount: 57160000,
      marginRate: 37.62,
      pricingCalculationItemId: "pci-old",
    });
    const recalculatedFromCatalogTier = deriveQuotedUnitCost(860, 50000000);
    assert.notEqual(recalculatedFromCatalogTier, orderItemQuoted.quotedUnitCost);
    assert.equal(orderItemQuoted.quotedUnitCost, 110000);
  });

  it("7. old order with null quoted cost still aggregates safely", () => {
    const summary = aggregateOrderQuotedCommercialSummary([
      { lineTotal: 162000000, quotedTotalCost: null, quotedMarginAmount: null },
      { lineTotal: 128250000, quotedTotalCost: null, quotedMarginAmount: null },
    ]);
    assert.equal(summary.hasQuotedCost, false);
    assert.equal(summary.revenue, 290250000);
    assert.equal(summary.quotedTotalCost, null);
    assert.equal(summary.expectedProfit, null);
  });

  it("8. duplicate quote → order idempotency is preserved in service", () => {
    const source = readFileSync(
      "src/features/orders/order-conversion.service.ts",
      "utf8",
    );
    assert.match(source, /if \(quote\.order\)/);
    assert.match(source, /where: \{ quoteId \}/);
  });

  it("9. 13-line quote conversion remains supported", () => {
    const items = Array.from({ length: 13 }, (_, index) =>
      buildOrderItemQuotedCostSnapshot({
        quantity: 100 + index,
        costEstimate: (100 + index) * 50000,
        marginAmount: (100 + index) * 20000,
        marginRate: 28,
        pricingCalculationItemId: `pci-${index}`,
      }),
    );
    assert.equal(items.length, 13);
    const summary = aggregateOrderQuotedCommercialSummary(
      items.map((item, index) => ({
        lineTotal: (100 + index) * 171000,
        quotedTotalCost: item.quotedTotalCost,
        quotedMarginAmount: item.quotedMarginAmount,
      })),
    );
    assert.equal(summary.hasQuotedCost, true);
    assert.ok(summary.quotedTotalCost! > 0);
  });

  it("10. permission guard for order cost/margin display", () => {
    const sessionWithoutFinancials: AdminSessionUser = {
      authenticated: true,
      mode: "user",
      userId: "u1",
      username: "ops",
      employeeId: null,
      roleId: null,
      roleCode: "PRODUCTION",
      permissions: new Map([["orders.view", "ALL"]]),
      legacyEmployeeRole: null,
    };
    const sessionWithFinancials: AdminSessionUser = {
      authenticated: true,
      mode: "user",
      userId: "u2",
      username: "sales",
      employeeId: null,
      roleId: null,
      roleCode: "SALES",
      permissions: new Map([
        ["orders.view", "ALL"],
        ["orders.view_financials", "ALL"],
      ]),
      legacyEmployeeRole: null,
    };
    assert.equal(canViewOrderFinancials(sessionWithoutFinancials), false);
    assert.equal(canViewOrderFinancials(sessionWithFinancials), true);

    const redactSource = readFileSync("src/features/orders/order-financial-redact.ts", "utf8");
    assert.match(redactSource, /quotedUnitCost/);
    assert.match(redactSource, /quotedCommercial/);
  });

  it("revision labels derive V1/V2 and FINAL display", () => {
    assert.equal(deriveRevisionLabel(1), "V1");
    assert.equal(deriveRevisionLabel(3), "V3");
    assert.equal(formatRevisionDisplayLabel("V3", 3, true), "V3 — FINAL");
  });

  it("SENT quotes block quantity changes", () => {
    assert.equal(isQuoteFinanciallyLocked("SENT"), true);
    assert.throws(
      () =>
        assertQuoteFinancialFieldsImmutable(
          "SENT",
          [
            {
              id: "a",
              sortOrder: 0,
              quantity: 10,
              unitPrice: 100,
              costEstimate: 500,
              marginAmount: 500,
              marginRate: 50,
              pricingSnapshot: null,
            },
          ],
          [
            {
              id: "a",
              sortOrder: 0,
              quantity: 11,
              unitPrice: 100,
              costEstimate: 500,
              marginAmount: 500,
              marginRate: 50,
              pricingSnapshot: null,
            },
          ],
        ),
      QuoteFinancialLockError,
    );
  });
});
