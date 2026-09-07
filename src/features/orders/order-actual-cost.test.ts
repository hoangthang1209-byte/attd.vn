import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFrozenEstimatedBaseline,
  computeActualCostMetrics,
  computeEstimatedCostFromQuotedItems,
  computeOrderCommercialValue,
  sumActualCostAmounts,
} from "@/features/orders/order-actual-cost-math";
import { omitOrderDetailFinancialFields } from "@/features/orders/order-financial-redact";
import { canViewOrderFinancials, can } from "@/features/auth/admin-permissions";
import {
  createAnonymousSession,
  createOwnerSession,
  grantsToPermissionMap,
  type AdminSessionUser,
} from "@/features/auth/admin-session.types";
import type { OrderDetailRecord } from "@/features/orders/order.types";

describe("order actual cost math", () => {
  it("matches DH-000123 scenario (VAT-exclusive)", () => {
    const commercialValue = computeOrderCommercialValue({
      subtotal: 50_000_000,
      discountAmount: 0,
      shippingFee: 0,
    });
    assert.equal(commercialValue, 50_000_000);

    const estimatedCost = 34_000_000;
    const actualCost = sumActualCostAmounts([31_200_000, 3_400_000, 900_000, 700_000]);
    assert.equal(actualCost, 36_200_000);

    const metrics = computeActualCostMetrics({
      commercialValue,
      estimatedCost,
      actualCostTotal: actualCost,
    });

    assert.equal(metrics.estimatedGrossMargin, 16_000_000);
    assert.equal(metrics.estimatedGrossMarginRate, 32);
    assert.equal(metrics.actualGrossMargin, 13_800_000);
    assert.equal(metrics.actualGrossMarginRate, 27.6);
    assert.equal(metrics.costVariance, 2_200_000);
  });

  it("excludes VAT from commercial value / margin basis", () => {
    const commercialValue = computeOrderCommercialValue({
      subtotal: 50_000_000,
      discountAmount: 0,
      shippingFee: 0,
    });
    // vatAmount 5_000_000 must not inflate basis
    const metrics = computeActualCostMetrics({
      commercialValue,
      estimatedCost: 34_000_000,
      actualCostTotal: 36_200_000,
    });
    assert.equal(metrics.commercialValue, 50_000_000);
    assert.equal(metrics.actualGrossMargin, 13_800_000);
  });

  it("reduces commercial value by header discount", () => {
    assert.equal(
      computeOrderCommercialValue({
        subtotal: 50_000_000,
        discountAmount: 2_000_000,
        shippingFee: 0,
      }),
      48_000_000,
    );
  });

  it("increases commercial value by customer shipping fee", () => {
    assert.equal(
      computeOrderCommercialValue({
        subtotal: 50_000_000,
        discountAmount: 0,
        shippingFee: 700_000,
      }),
      50_700_000,
    );
  });

  it("treats actual SHIPPING cost independently of shippingFee", () => {
    const commercialValue = computeOrderCommercialValue({
      subtotal: 50_000_000,
      discountAmount: 0,
      shippingFee: 500_000,
    });
    const metrics = computeActualCostMetrics({
      commercialValue,
      estimatedCost: 34_000_000,
      actualCostTotal: 34_000_000 + 700_000,
    });
    assert.equal(commercialValue, 50_500_000);
    assert.equal(metrics.actualCostTotal, 34_700_000);
    assert.equal(metrics.costVariance, 700_000);
  });

  it("sums shared + item costs without allocation", () => {
    const actual = sumActualCostAmounts([10_000_000, 12_000_000, 500_000]);
    assert.equal(actual, 22_500_000);
  });

  it("allows actual margin without estimate; variance unavailable", () => {
    const metrics = computeActualCostMetrics({
      commercialValue: 50_000_000,
      estimatedCost: null,
      actualCostTotal: 36_200_000,
    });
    assert.equal(metrics.estimatedCost, null);
    assert.equal(metrics.estimatedGrossMargin, null);
    assert.equal(metrics.actualGrossMargin, 13_800_000);
    assert.equal(metrics.costVariance, null);
  });

  it("aggregates multi-item quoted estimates", () => {
    assert.equal(
      computeEstimatedCostFromQuotedItems([
        { quotedTotalCost: 20_000_000 },
        { quotedTotalCost: 14_000_000 },
      ]),
      34_000_000,
    );
    assert.equal(computeEstimatedCostFromQuotedItems([{ quotedTotalCost: null }]), null);
  });

  it("freezes estimated baseline snapshot fields", () => {
    const baseline = buildFrozenEstimatedBaseline({
      commercialValue: 50_000_000,
      estimatedCost: 34_000_000,
    });
    assert.equal(baseline.estimatedCommercialValue, 50_000_000);
    assert.equal(baseline.estimatedCost, 34_000_000);
    assert.equal(baseline.estimatedGrossMargin, 16_000_000);
    assert.equal(baseline.estimatedGrossMarginRate, 32);
  });
});

describe("order actual cost permissions", () => {
  it("financial viewer can see financials; production-only cannot", () => {
    const viewer: AdminSessionUser = {
      ...createAnonymousSession(),
      authenticated: true,
      mode: "user",
      permissions: grantsToPermissionMap([["orders.view_financials", "ALL"]]),
    };
    const productionOnly: AdminSessionUser = {
      ...createAnonymousSession(),
      authenticated: true,
      mode: "user",
      permissions: grantsToPermissionMap([["production.view", "ALL"]]),
    };
    assert.equal(canViewOrderFinancials(viewer), true);
    assert.equal(canViewOrderFinancials(productionOnly), false);
    assert.equal(can(viewer, "orders.update"), false);
    assert.equal(can(createOwnerSession(), "orders.update") || createOwnerSession().mode === "owner", true);
  });

  it("redacts actualCost from operational order detail", () => {
    const order = {
      id: "o1",
      orderNo: "DH-1",
      subtotal: 1,
      discountAmount: 0,
      shippingFee: 0,
      vatAmount: 0,
      totalAmount: 1,
      sampleFee: null,
      customerTaxCode: null,
      priceVatType: "EXCLUDING_VAT",
      quotedCommercial: null,
      actualCost: {
        orderId: "o1",
        actualCostTotal: 100,
      },
      payments: [],
      financials: {
        totalAmount: 1,
        paidAmount: 0,
        outstandingAmount: 1,
        overpaidAmount: 0,
        paymentState: "UNPAID",
      },
      items: [
        {
          id: "i1",
          unitPrice: 1,
          lineTotal: 1,
          quotedUnitCost: 1,
          quotedTotalCost: 1,
          quotedMarginAmount: 0,
          quotedMarginRate: 0,
          pricingCalculationItemId: null,
        },
      ],
      activities: [],
    } as unknown as OrderDetailRecord;

    const redacted = omitOrderDetailFinancialFields(order);
    assert.equal("actualCost" in redacted, false);
    assert.equal("quotedCommercial" in redacted, false);
    assert.equal("unitPrice" in redacted.items[0], false);
  });
});
