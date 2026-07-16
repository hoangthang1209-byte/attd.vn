import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminNavigationSections } from "@/lib/admin/admin-navigation";

describe("admin navigation config", () => {
  it("renders site navigation as an active link target", () => {
    const website = adminNavigationSections
      .flatMap((section) => section.platforms)
      .find((platform) => platform.label === "Website");

    assert.ok(website, "Website platform exists");
    const siteNav = website.items.find((item) => item.href === "/admin/site-navigation");
    assert.ok(siteNav, "Site navigation item exists");
    assert.equal(siteNav.label, "Điều hướng và Footer");
    assert.equal(siteNav.status, "active");
    assert.equal(siteNav.requiredPermissions?.[0], "canManageCms");
  });

  it("keeps unique href keys within each platform group", () => {
    for (const section of adminNavigationSections) {
      for (const platform of section.platforms) {
        const hrefs = platform.items.map((item) => item.href).filter(Boolean);
        assert.equal(new Set(hrefs).size, hrefs.length, `${section.label}/${platform.label} has duplicate hrefs`);
      }
    }
  });
});
