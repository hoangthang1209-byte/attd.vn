import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDefaultSiteNavCtas, getDefaultSiteNavItems } from "@/features/site-navigation/site-navigation-cms-defaults";
import {
  mergeCmsCtas,
  mergeCmsConfig,
  mergeCmsNavItems,
  resolvePlacementItems,
  resolvePublicSocialFromCms,
} from "@/features/site-navigation/site-navigation-merge";
import type { SiteNavLinkConfig, SiteSocialLinkConfig } from "@/features/site-navigation/site-navigation.types";
import {
  validateNavItemsHierarchy,
  validateNavItemsForPlacement,
} from "@/features/site-navigation/site-navigation-validation";

function makeItem(
  overrides: Partial<SiteNavLinkConfig> & Pick<SiteNavLinkConfig, "id" | "placement" | "label" | "href">,
): SiteNavLinkConfig {
  return {
    parentId: null,
    description: null,
    iconKey: null,
    linkTarget: "INTERNAL",
    sortOrder: 10,
    isActive: true,
    showDesktop: true,
    showMobile: true,
    openInNewTab: false,
    trackEvent: null,
    ...overrides,
  };
}

describe("site-navigation merge", () => {
  it("falls back one empty placement while keeping CMS placements", () => {
    const defaults = getDefaultSiteNavItems();
    const headerDefaults = defaults.filter((item) => item.placement === "HEADER_MENU");
    const utilityDefaults = defaults.filter((item) => item.placement === "UTILITY_BAR");

    const cmsUtility = utilityDefaults.map((item, index) => ({
      ...item,
      id: `cms-utility-${index + 1}`,
      label: `CMS ${item.label}`,
    }));

    const merged = mergeCmsNavItems([
      ...cmsUtility,
      // HEADER_MENU intentionally cleared in CMS
    ]);

    assert.deepEqual(
      merged.filter((item) => item.placement === "UTILITY_BAR").map((item) => item.label),
      cmsUtility.map((item) => item.label),
    );
    assert.deepEqual(
      merged.filter((item) => item.placement === "HEADER_MENU").map((item) => item.label),
      headerDefaults.map((item) => item.label),
    );
  });

  it("falls back when a placement has only inactive items", () => {
    const defaults = getDefaultSiteNavItems();
    const headerDefaults = defaults.filter((item) => item.placement === "HEADER_MENU");

    const inactiveHeader = headerDefaults.map((item) => ({
      ...item,
      id: `inactive-${item.id}`,
      isActive: false,
    }));

    const merged = mergeCmsNavItems(inactiveHeader);
    assert.deepEqual(
      merged.filter((item) => item.placement === "HEADER_MENU").map((item) => item.label),
      headerDefaults.map((item) => item.label),
    );
  });

  it("uses defaults when all placements are empty", () => {
    const merged = mergeCmsConfig({ items: [], ctas: [], socialLinks: [] });
    const defaults = getDefaultSiteNavItems();
    assert.equal(merged.items.length, defaults.length);
    assert.equal(merged.items.filter((item) => item.placement === "FOOTER_PRODUCTS").length, 4);
  });

  it("keeps one populated placement from CMS", () => {
    const customHeader = [
      makeItem({
        id: "custom-header-1",
        placement: "HEADER_MENU",
        label: "Menu tùy chỉnh",
        href: "/custom",
      }),
    ];

    const merged = resolvePlacementItems(customHeader, "HEADER_MENU", getDefaultSiteNavItems());
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.label, "Menu tùy chỉnh");
  });

  it("fills missing CTA slots from defaults", () => {
    const defaults = getDefaultSiteNavCtas();
    const partial = defaults
      .filter((cta) => cta.slot === "HEADER_PRIMARY")
      .map((cta) => ({ ...cta, label: "CTA CMS" }));

    const merged = mergeCmsCtas(partial);
    assert.equal(merged.length, defaults.length);
    assert.equal(merged.find((cta) => cta.slot === "HEADER_PRIMARY")?.label, "CTA CMS");
    assert.ok(merged.find((cta) => cta.slot === "MOBILE_NAV_PRIMARY"));
  });

  it("uses branding fallback for inactive social links", () => {
    const inactiveSocial: SiteSocialLinkConfig[] = [
      {
        id: "social-1",
        platform: "facebook",
        label: "Facebook",
        href: "",
        sortOrder: 10,
        isActive: false,
      },
    ];
    const branding = [{ id: "facebook", label: "Facebook Branding", href: "https://facebook.com/attd" }];

    const resolved = resolvePublicSocialFromCms(inactiveSocial, branding);
    assert.deepEqual(resolved, branding);
  });
});

describe("site-navigation parentId validation", () => {
  it("rejects self-parent", () => {
    const items = [
      makeItem({ id: "a", placement: "HEADER_MENU", label: "A", href: "/a", parentId: "a" }),
    ];
    assert.match(validateNavItemsHierarchy("HEADER_MENU", items) ?? "", /không thể là cha của chính nó/);
  });

  it("rejects missing parent", () => {
    const items = [
      makeItem({ id: "child", placement: "HEADER_MENU", label: "Child", href: "/child", parentId: "missing" }),
    ];
    assert.match(validateNavItemsHierarchy("HEADER_MENU", items) ?? "", /mục cha không tồn tại/);
  });

  it("rejects cross-placement parent via missing parent in batch", () => {
    const items = [
      makeItem({ id: "parent", placement: "MOBILE_MENU", label: "Parent", href: "/parent" }),
      makeItem({
        id: "child",
        placement: "HEADER_MENU",
        label: "Child",
        href: "/child",
        parentId: "parent",
      }),
    ];
    const error = validateNavItemsForPlacement("HEADER_MENU", items);
    assert.match(error ?? "", /mục cha không tồn tại/);
  });

  it("rejects circular parent chain", () => {
    const items = [
      makeItem({ id: "a", placement: "HEADER_MENU", label: "A", href: "/a", parentId: "b" }),
      makeItem({ id: "b", placement: "HEADER_MENU", label: "B", href: "/b", parentId: "a" }),
    ];
    const error = validateNavItemsHierarchy("HEADER_MENU", items);
    assert.ok(error);
    assert.match(error, /vòng lặp|tối đa 2 cấp/);
  });

  it("rejects depth beyond two levels", () => {
    const items = [
      makeItem({ id: "root", placement: "HEADER_MENU", label: "Root", href: "/root" }),
      makeItem({
        id: "child",
        placement: "HEADER_MENU",
        label: "Child",
        href: "/child",
        parentId: "root",
      }),
      makeItem({
        id: "grandchild",
        placement: "HEADER_MENU",
        label: "Grandchild",
        href: "/grandchild",
        parentId: "child",
      }),
    ];
    assert.match(validateNavItemsHierarchy("HEADER_MENU", items) ?? "", /tối đa 2 cấp/);
  });
});
