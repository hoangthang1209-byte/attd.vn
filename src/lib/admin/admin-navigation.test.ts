import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  adminDashboardNavItem,
  adminNavigationSections,
} from "@/lib/admin/admin-navigation";

function allNavItems() {
  return adminNavigationSections.flatMap((section) =>
    section.platforms.flatMap((platform) => platform.items),
  );
}

function hrefToPageCandidates(href: string): string[] {
  const relative = href.replace(/^\/admin\//, "");
  const base = path.join("src/app/(backend)/admin", relative);
  return [
    path.join(base, "page.tsx"),
    `${base}.tsx`,
  ];
}

describe("admin navigation CMS IA v2", () => {
  it("uses domain → items only (no visible third-level platform labels)", () => {
    for (const section of adminNavigationSections) {
      assert.equal(section.platforms.length, 1, `${section.label} should have one internal platform`);
      assert.equal(section.platforms[0].label, "", `${section.label} platform label must be empty`);
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

  it("does not place /admin/media under SẢN PHẨM", () => {
    const products = adminNavigationSections.find((s) => s.label === "SẢN PHẨM");
    assert.ok(products);
    const mediaInProducts = products.platforms[0].items.some((i) => i.href === "/admin/media");
    assert.equal(mediaInProducts, false);
    const media = allNavItems().find((i) => i.href === "/admin/media");
    assert.ok(media);
    assert.equal(media.label, "Thư viện tài sản");
  });

  it("uses KNOWLEDGE & AI naming without Tri thức", () => {
    const knowledge = adminNavigationSections.find((s) => s.label === "KNOWLEDGE & AI");
    assert.ok(knowledge);
    const raw = JSON.stringify(adminNavigationSections);
    assert.doesNotMatch(raw, /Tri thức/);
    assert.match(raw, /Knowledge Base/);
    assert.match(raw, /Knowledge Graph/);
  });

  it("gates Manufacturing Library with canManageManufacturingLibrary", () => {
    const item = allNavItems().find((i) => i.href === "/admin/manufacturing-library");
    assert.ok(item, "Manufacturing Library route present");
    assert.equal(item.label, "Thư viện sản xuất");
    assert.deepEqual(item.requiredPermissions, ["canManageManufacturingLibrary"]);
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

  it("hides domains that would have zero permitted items (filter contract)", () => {
    // Empty-permission simulation: only canViewDashboard true → only dashboard + system company/branding/trust
    const permissions = {
      canViewDashboard: true,
      canViewCrm: false,
      canAccessQuotes: false,
      canAccessPricing: false,
      canViewOrders: false,
      canManageProducts: false,
      canViewProduction: false,
      canManageManufacturingLibrary: false,
      canManageCms: false,
      canViewDelivery: false,
      canViewWarehouse: false,
      canManageEmployees: false,
      canViewFinancials: false,
      canViewReports: false,
      canManageUsers: false,
      canManageRoles: false,
    } as const;

    function allowed(required?: readonly string[]) {
      if (!required?.length) return true;
      return required.every((key) => (permissions as Record<string, boolean>)[key]);
    }

    const visibleSections = adminNavigationSections
      .map((section) => ({
        ...section,
        platforms: section.platforms
          .map((platform) => ({
            ...platform,
            items: platform.items.filter(
              (item) => item.status === "active" && item.href && allowed(item.requiredPermissions),
            ),
          }))
          .filter((platform) => platform.items.length > 0),
      }))
      .filter((section) => section.platforms.length > 0);

    assert.ok(visibleSections.every((s) => s.platforms.some((p) => p.items.length > 0)));
    assert.ok(!visibleSections.some((s) => s.label === "THƯƠNG MẠI"));
    assert.ok(visibleSections.some((s) => s.label === "HỆ THỐNG"));
    assert.ok(allowed(adminDashboardNavItem.requiredPermissions));
  });

  it("keeps site navigation under WEBSITE with updated label", () => {
    const website = adminNavigationSections.find((s) => s.label === "WEBSITE");
    assert.ok(website);
    const siteNav = website.platforms[0].items.find((i) => i.href === "/admin/site-navigation");
    assert.ok(siteNav);
    assert.equal(siteNav.label, "Điều hướng & Footer");
    assert.equal(siteNav.requiredPermissions?.[0], "canManageCms");
  });
});
