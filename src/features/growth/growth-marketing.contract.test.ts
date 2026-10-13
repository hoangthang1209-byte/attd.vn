import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { adminNavigationSections } from "@/lib/admin/admin-navigation";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("GROWTH-1 marketing foundation contracts", () => {
  it("exposes Growth Engine dashboard in admin navigation", () => {
    const growth = adminNavigationSections.find((s) => s.label === "TĂNG TRƯỞNG");
    assert.ok(growth);
    const hrefs = growth!.platforms.flatMap((p) => p.items.map((i) => i.href));
    assert.ok(hrefs.includes("/admin/growth/dashboard"));
  });

  it("wires public lead forms to attribution payload", () => {
    const contact = read("src/components/public/ContactForm.tsx");
    const quote = read("src/components/public/ProductQuoteDialog.tsx");
    assert.match(contact, /getLeadAttributionPayload/);
    assert.match(quote, /getLeadAttributionPayload/);
  });

  it("defines growth dashboard API route", () => {
    const route = read("src/app/api/growth/dashboard/route.ts");
    assert.match(route, /getGrowthDashboardReport/);
    assert.match(route, /assertCanViewGrowthDashboard/);
  });
});
