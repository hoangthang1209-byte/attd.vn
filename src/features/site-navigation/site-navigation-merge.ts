import type { SiteNavPlacement } from "@prisma/client";
import {
  DEFAULT_SITE_NAVIGATION_SETTINGS,
  getDefaultSiteNavCtas,
  getDefaultSiteNavItems,
  getDefaultSiteNavigationCmsConfig,
  getDefaultSiteSocialLinks,
} from "@/features/site-navigation/site-navigation-cms-defaults";
import type {
  SiteNavCtaConfig,
  SiteNavLinkConfig,
  SiteNavigationCmsConfig,
  SiteNavigationSettingsConfig,
  SiteSocialLinkConfig,
} from "@/features/site-navigation/site-navigation.types";

/** Item placements resolved independently for CMS vs hardcoded fallback. */
export const SITE_NAV_ITEM_PLACEMENTS: SiteNavPlacement[] = [
  "UTILITY_BAR",
  "HEADER_MENU",
  "CATEGORY_NAV",
  "MOBILE_MENU",
  "FOOTER_PRODUCTS",
  "FOOTER_SERVICES",
  "FOOTER_COMPANY",
];

/**
 * Resolve one placement: use CMS rows when the placement has at least one active item;
 * otherwise fall back to hardcoded defaults for that placement only.
 */
export function resolvePlacementItems(
  cmsItems: SiteNavLinkConfig[] | undefined,
  placement: SiteNavPlacement,
  defaultItems: SiteNavLinkConfig[],
): SiteNavLinkConfig[] {
  const scoped = (cmsItems ?? []).filter((item) => item.placement === placement);
  if (scoped.length === 0) {
    return defaultItems.filter((item) => item.placement === placement);
  }
  if (!scoped.some((item) => item.isActive)) {
    return defaultItems.filter((item) => item.placement === placement);
  }
  return scoped;
}

export function mergeCmsNavItems(cmsItems?: SiteNavLinkConfig[]): SiteNavLinkConfig[] {
  const defaults = getDefaultSiteNavItems();
  return SITE_NAV_ITEM_PLACEMENTS.flatMap((placement) =>
    resolvePlacementItems(cmsItems, placement, defaults),
  );
}

/** Each CTA slot falls back to its hardcoded default when missing from CMS. */
export function mergeCmsCtas(cmsCtas?: SiteNavCtaConfig[]): SiteNavCtaConfig[] {
  const defaults = getDefaultSiteNavCtas();
  if (!cmsCtas?.length) return defaults;
  const cmsBySlot = new Map(cmsCtas.map((cta) => [cta.slot, cta]));
  return defaults.map((def) => cmsBySlot.get(def.slot) ?? def);
}

export function pickActiveCmsSocialLinks(
  cmsLinks: SiteSocialLinkConfig[],
): Array<{ id: string; label: string; href: string }> {
  return cmsLinks
    .filter((link) => link.isActive && link.href.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => ({ id: link.platform, label: link.label, href: link.href.trim() }));
}

export function resolvePublicSocialFromCms(
  cmsLinks: SiteSocialLinkConfig[],
  brandingFallback: Array<{ id: string; label: string; href: string }>,
): Array<{ id: string; label: string; href: string }> {
  const activeCms = pickActiveCmsSocialLinks(cmsLinks);
  if (activeCms.length > 0) return activeCms;
  return brandingFallback;
}

export function mergeCmsSocialLinks(
  cmsSocialLinks?: SiteSocialLinkConfig[],
): SiteSocialLinkConfig[] {
  if (!cmsSocialLinks?.length) return getDefaultSiteSocialLinks();
  return cmsSocialLinks;
}

export function mergeSettings(
  row: Partial<SiteNavigationSettingsConfig> | null | undefined,
): SiteNavigationSettingsConfig {
  return {
    utilityTagline: row?.utilityTagline?.trim() || DEFAULT_SITE_NAVIGATION_SETTINGS.utilityTagline,
    megaMenuTriggerLabel:
      row?.megaMenuTriggerLabel?.trim() || DEFAULT_SITE_NAVIGATION_SETTINGS.megaMenuTriggerLabel,
    searchPlaceholder:
      row?.searchPlaceholder?.trim() || DEFAULT_SITE_NAVIGATION_SETTINGS.searchPlaceholder,
    useCategoryTreeMegaMenu:
      row?.useCategoryTreeMegaMenu ?? DEFAULT_SITE_NAVIGATION_SETTINGS.useCategoryTreeMegaMenu,
  };
}

/**
 * Merge partial CMS rows with hardcoded defaults.
 * Public rendering does not require DB seed — null/empty partial uses in-memory defaults.
 * Per-placement item fallback keeps other placements intact when one panel is cleared.
 */
export function mergeCmsConfig(
  partial: Partial<SiteNavigationCmsConfig> | null | undefined,
): SiteNavigationCmsConfig {
  const defaults = getDefaultSiteNavigationCmsConfig();
  if (!partial) return defaults;

  return {
    settings: mergeSettings(partial.settings),
    items: mergeCmsNavItems(partial.items),
    ctas: mergeCmsCtas(partial.ctas),
    socialLinks: mergeCmsSocialLinks(partial.socialLinks),
  };
}
