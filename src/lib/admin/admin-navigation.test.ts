import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  adminDashboardNavItem,
  adminNavigationSections,
  filterNavigationForWorkspaceMode,
  SOLO_HIDDEN_CONTENT_HREFS,
} from "@/lib/admin/admin-navigation";
import {
  ADMIN_DOCUMENT_TITLE,
  ADMIN_TITLE_TEMPLATE,
  adminPageMetadata,
} from "@/lib/admin/admin-metadata";

function allNavItems() {
  return adminNavigationSections.flatMap((section) =>
    section.platforms.flatMap((platform) => platform.items),
  );
}

function hrefToPageCandidates(href: string): string[] {
  const relative = href.replace(/^\/admin\//, "");
  const base = path.join("src/app/(backend)/admin", relative);
  return [path.join(base, "page.tsx"), `${base}.tsx`];
}

describe("lean admin navigation", () => {
  it("uses domain → items only (no visible third-level platform labels)", () => {
    for (const section of adminNavigationSections) {
      assert.equal(section.platforms.length, 1, `${section.label} should have one internal platform`);
      assert.equal(section.platforms[0].label, "", `${section.label} platform label must be empty`);
    }
  });

  it("keeps primary section order for the operating spine", () => {
    assert.deepEqual(
      adminNavigationSections.map((section) => section.label),
      [
        "BÁN HÀNG",
        "SẢN PHẨM",
        "SẢN XUẤT",
        "KỸ THUẬT",
        "CONTENT & SEO",
        "WEBSITE",
        "CẤU HÌNH",
      ],
    );
    assert.equal(adminDashboardNavItem.label, "Tổng quan");
    assert.equal(adminDashboardNavItem.href, "/admin/dashboard");
  });

  it("keeps commercial spine primary with costing promoted", () => {
    const sales = adminNavigationSections.find((s) => s.label === "BÁN HÀNG");
    assert.ok(sales);
    assert.deepEqual(
      sales.platforms[0].items.map((item) => [item.label, item.href]),
      [
        ["Khách hàng", "/admin/crm/customers"],
        ["Lead", "/admin/crm/leads"],
        ["Tính giá", "/admin/pricing/costing"],
        ["Báo giá", "/admin/quotes"],
        ["Đơn hàng", "/admin/orders"],
      ],
    );
  });

  it("keeps products lean and demotes product configuration", () => {
    const products = adminNavigationSections.find((s) => s.label === "SẢN PHẨM");
    assert.ok(products);
    assert.deepEqual(
      products.platforms[0].items.map((item) => item.href),
      ["/admin/products"],
    );
    const hrefs = allNavItems().map((item) => item.href);
    assert.ok(!hrefs.includes("/admin/variant"));
    assert.ok(!hrefs.includes("/admin/attributes"));
    assert.ok(!hrefs.includes("/admin/pricing/product-tiers"));
    assert.ok(hrefs.includes("/admin/danh-muc"));
  });

  it("keeps Content & SEO and Website as primary business domains", () => {
    const content = adminNavigationSections.find((s) => s.label === "CONTENT & SEO");
    assert.ok(content);
    assert.deepEqual(
      content.platforms[0].items.map((item) => item.href),
      [
        "/admin/blog",
        "/admin/landing-pages",
        "/admin/content/seo",
        "/admin/case-studies",
      ],
    );
    const website = adminNavigationSections.find((s) => s.label === "WEBSITE");
    assert.ok(website);
    assert.ok(website.platforms[0].items.some((i) => i.href === "/admin/settings/homepage"));
    assert.ok(website.platforms[0].items.some((i) => i.href === "/admin/site-navigation"));
  });

  it("hides experimental/enterprise surfaces from primary nav", () => {
    const hrefs = new Set(allNavItems().map((item) => item.href));
    for (const href of [
      "/admin/knowledge-graph",
      "/admin/knowledge-base",
      "/admin/content/ai",
      "/admin/content/operations",
      "/admin/dealer",
      "/admin/crm/whatsapp-assistant",
      "/admin/sales/pipeline",
      "/admin/media/dashboard",
      "/admin/manufacturing-library",
    ]) {
      assert.equal(hrefs.has(href), false, `${href} must not be primary`);
    }
  });

  it("contains no coming-soon items in the production registry", () => {
    for (const item of allNavItems()) {
      assert.notEqual(item.status, "coming-soon", `${item.label} must not be coming-soon`);
    }
  });

  it("keeps globally unique active hrefs", () => {
    const hrefs = allNavItems()
      .filter((item) => item.status === "active" && item.href)
      .map((item) => item.href as string);
    assert.equal(new Set(hrefs).size, hrefs.length, "duplicate hrefs in navigation");
  });

  it("resolves every sidebar href to an existing admin page", () => {
    for (const item of allNavItems()) {
      if (!item.href || item.status !== "active") continue;
      const candidates = hrefToPageCandidates(item.href);
      assert.ok(
        candidates.some((candidate) => existsSync(candidate)),
        `missing page for ${item.href} (tried ${candidates.join(", ")})`,
      );
    }
  });

  it("Solo filter still drops enterprise content ops when present", () => {
    const filtered = filterNavigationForWorkspaceMode(adminNavigationSections, true);
    const content = filtered.find((s) => s.label === "CONTENT & SEO");
    assert.ok(content);
    const hrefs = content.platforms.flatMap((p) => p.items.map((i) => i.href));
    for (const hidden of SOLO_HIDDEN_CONTENT_HREFS) {
      assert.ok(!hrefs.includes(hidden));
    }
    assert.ok(hrefs.includes("/admin/blog"));
    assert.ok(hrefs.includes("/admin/content/seo"));
  });

  it("keeps primary visible destination count lean", () => {
    const count =
      (adminDashboardNavItem.href ? 1 : 0) +
      allNavItems().filter((item) => item.status === "active" && item.href).length;
    assert.ok(count <= 30, `expected lean primary count, got ${count}`);
    assert.ok(count >= 20, `expected core domains retained, got ${count}`);
  });
});

describe("admin document titles", () => {
  it("uses ATTD Admin title template without duplication", () => {
    assert.equal(ADMIN_DOCUMENT_TITLE, "ATTD Admin");
    assert.equal(ADMIN_TITLE_TEMPLATE, "%s | ATTD Admin");
    assert.deepEqual(adminPageMetadata("Khách hàng"), { title: "Khách hàng" });
    assert.doesNotMatch(ADMIN_TITLE_TEMPLATE, /ATTD Admin \| ATTD Admin/);
  });
});
