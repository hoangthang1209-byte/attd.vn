import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseOrderListCustomerId } from "@/features/orders/order-list-customer-id";

describe("order list customerId filter", () => {
  it("accepts cuid-like customer ids", () => {
    assert.equal(parseOrderListCustomerId("clxyz0123456789abcdef"), "clxyz0123456789abcdef");
    assert.equal(parseOrderListCustomerId("  abc_DEF-123  "), "abc_DEF-123");
  });

  it("rejects empty, oversized, or unsafe values", () => {
    assert.equal(parseOrderListCustomerId(""), undefined);
    assert.equal(parseOrderListCustomerId("   "), undefined);
    assert.equal(parseOrderListCustomerId(null), undefined);
    assert.equal(parseOrderListCustomerId("bad id"), undefined);
    assert.equal(parseOrderListCustomerId("id;drop"), undefined);
    assert.equal(parseOrderListCustomerId("a".repeat(65)), undefined);
  });

  it("dashboard route validates and forwards customerId", () => {
    const source = readFileSync("src/app/api/orders/dashboard/route.ts", "utf8");
    assert.match(source, /parseOrderListCustomerId/);
    assert.match(source, /customerId/);
    assert.match(source, /customerId không hợp lệ/);
  });

  it("order list UI preserves customerId in query string", () => {
    const source = readFileSync("src/components/admin/orders/OrderListManager.tsx", "utf8");
    assert.match(source, /customerId: searchParams\.get\("customerId"\)/);
    assert.match(source, /params\.set\("customerId"/);
    assert.match(source, /order-ops-customer-filter/);
    assert.match(source, /Bỏ lọc khách hàng/);
  });

  it("Customer 360 uses exact customerId navigation", () => {
    const source = readFileSync(
      "src/components/admin/crm/CustomerAccountWorkspace.tsx",
      "utf8",
    );
    assert.match(
      source,
      /\/admin\/orders\?customerId=\$\{encodeURIComponent\(overview\.customerId\)\}/,
    );
    assert.doesNotMatch(source, /\/admin\/orders\?search=\$\{encodeURIComponent\(overview\.customerName\)\}/);
  });
});
