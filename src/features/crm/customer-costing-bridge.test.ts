import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildCostingOpenHref,
  buildCustomerCostingHref,
  costingStatusDisplay,
  CUSTOMER_360_COSTING_LIMIT,
  mapCustomerCostingRows,
  parseCostingCustomerIdParam,
} from "@/features/crm/customer-costing-bridge";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Customer → Costing bridge", () => {
  it("builds Costing URL with exact customerId", () => {
    assert.equal(
      buildCustomerCostingHref("cust_axxel"),
      "/admin/pricing/costing?customerId=cust_axxel",
    );
    assert.equal(
      buildCustomerCostingHref("id with space"),
      "/admin/pricing/costing?customerId=id%20with%20space",
    );
  });

  it("parses customerId query without inventing another id", () => {
    assert.equal(parseCostingCustomerIdParam("abc"), "abc");
    assert.equal(parseCostingCustomerIdParam("  abc  "), "abc");
    assert.equal(parseCostingCustomerIdParam(""), null);
    assert.equal(parseCostingCustomerIdParam(null), null);
  });

  it("opens existing calculation via fromCalculation only", () => {
    assert.equal(
      buildCostingOpenHref("calc_1"),
      "/admin/pricing/costing?fromCalculation=calc_1",
    );
  });

  it("bounds Customer 360 costing list to 5", () => {
    assert.equal(CUSTOMER_360_COSTING_LIMIT, 5);
  });

  it("maps only provided customer rows and redacts financials", () => {
    const rows = mapCustomerCostingRows(
      [
        {
          id: "c1",
          code: "PC-1",
          status: "CALCULATED",
          isFinal: false,
          revisionLabel: "V1",
          updatedAt: "2026-09-07T00:00:00.000Z",
          totalAmount: 50_000_000,
          items: [
            {
              productNameSnapshot: "Polo",
              costEstimate: 34_000_000,
              marginRate: 32,
            },
          ],
        },
      ],
      { includeFinancials: false },
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sellingTotal, null);
    assert.equal(rows[0].estimatedCost, null);
    assert.equal(rows[0].marginRate, null);
    assert.equal(rows[0].productLabel, "Polo");
  });

  it("keeps financial fields when includeFinancials", () => {
    const rows = mapCustomerCostingRows(
      [
        {
          id: "c1",
          code: "PC-1",
          status: "CALCULATED",
          isFinal: true,
          revisionLabel: "V2",
          updatedAt: new Date("2026-09-07T00:00:00.000Z"),
          totalAmount: { toNumber: () => 50_000_000 },
          items: [
            {
              productNameSnapshot: "Polo",
              costEstimate: { toNumber: () => 34_000_000 },
              marginRate: { toNumber: () => 32 },
            },
          ],
        },
      ],
      { includeFinancials: true },
    );
    assert.equal(rows[0].sellingTotal, 50_000_000);
    assert.equal(rows[0].estimatedCost, 34_000_000);
    assert.equal(rows[0].marginRate, 32);
    assert.equal(costingStatusDisplay(rows[0]), "V2 — FINAL");
  });

  it("does not treat navigation helpers as writers", () => {
    assert.match(buildCustomerCostingHref("x"), /^\/admin\/pricing\/costing\?customerId=/);
    assert.doesNotMatch(buildCustomerCostingHref("x"), /create|save|post/i);
  });
});

describe("Customer → Costing bridge contracts", () => {
  it("CostingCalculator prefills exact customerId from URL and does not POST on mount", () => {
    const source = read("src/components/admin/pricing/CostingCalculator.tsx");
    assert.match(source, /parseCostingCustomerIdParam\(searchParams\.get\("customerId"\)\)/);
    assert.match(source, /\/api\/crm\/customers\/\$\{encodeURIComponent\(customerIdFromUrl\)\}/);
    assert.match(source, /Khách hàng:/);
    assert.match(source, /customerPrefillError/);
    assert.match(source, /fromCalculationId \|\| !customerIdFromUrl/);
    const prefillStart = source.indexOf("// fromCalculation clone owns customer selection");
    const prefillEnd = source.indexOf("}, [customerIdFromUrl, fromCalculationId, customerPrefillDone]);");
    assert.ok(prefillStart >= 0 && prefillEnd > prefillStart);
    const prefillBlock = source.slice(prefillStart, prefillEnd);
    assert.doesNotMatch(prefillBlock, /method:\s*"POST"/);
    assert.doesNotMatch(prefillBlock, /\/api\/pricing\/costing/);
  });

  it("Customer 360 gates Costing CTA and section on pricing.manage capabilities", () => {
    const page = read("src/app/(backend)/admin/crm/customers/[id]/page.tsx");
    const workspace = read("src/components/admin/crm/CustomerAccountWorkspace.tsx");
    assert.match(page, /includeCosting:\s*can\(session,\s*"pricing\.manage"\)/);
    assert.match(page, /canCreateCosting:\s*can\(session,\s*"pricing\.manage"\)/);
    assert.match(workspace, /capabilities\.includeCosting/);
    assert.match(workspace, /capabilities\.canCreateCosting/);
    assert.match(workspace, /buildCustomerCostingHref\(overview\.customerId\)/);
    assert.match(workspace, /Tính giá gần đây/);
    assert.ok(
      workspace.indexOf("Tính giá gần đây") < workspace.indexOf("Báo giá đang xử lý"),
    );
    assert.match(workspace, /Tạo báo giá/);
  });

  it("overview loads bounded PricingCalculation by exact customerId without pricingSnapshot", () => {
    const service = read("src/features/crm/services/customer-account-overview.service.ts");
    assert.match(service, /prisma\.pricingCalculation\.findMany/);
    assert.match(service, /customerId,/);
    assert.match(service, /status:\s*\{\s*not:\s*"ARCHIVED"\s*\}/);
    assert.match(service, /take:\s*CUSTOMER_360_COSTING_LIMIT/);
    assert.doesNotMatch(service, /pricingSnapshot/);
    assert.match(service, /mapCustomerCostingRows\(costingRows/);
  });

  it("Costing → Quote propagates PricingCalculation.customerId exactly", () => {
    const quoteService = read("src/features/quotes/quote.service.ts");
    const costingSave = read("src/features/pricing/services/costing-calculator.service.ts");
    assert.match(
      quoteService,
      /customerId:\s*overrides\?\.customerId\s*\?\?\s*calc\.customer\?\.id\s*\?\?\s*null/,
    );
    assert.match(costingSave, /customerId:\s*input\.customerId\s*\|\|\s*null/);
    assert.match(costingSave, /createQuoteFromPricingCalculation\(calculation\.id/);
    assert.doesNotMatch(
      quoteService.slice(
        quoteService.indexOf("export async function createQuoteFromPricingCalculation"),
        quoteService.indexOf("export async function updateQuote"),
      ),
      /fuzzy|name search|findFirst\(\s*\{\s*where:\s*\{\s*name/i,
    );
  });

  it("pricing route stays behind pricing.manage gate", () => {
    const perms = read("src/features/auth/order-financial-permissions.ts");
    assert.match(perms, /pathname\.startsWith\("\/admin\/pricing"\)/);
    assert.match(perms, /"pricing\.manage"/);
  });
});
