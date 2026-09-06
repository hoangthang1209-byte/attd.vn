import { unstable_cache } from "next/cache";
import type { SiteNavCtaSlot, SiteNavPlacement } from "@prisma/client";
import {
  DEFAULT_SITE_NAVIGATION_SETTINGS,
  FOOTER_GROUP_TITLES,
  SITE_NAVIGATION_ID,
  getDefaultSiteNavCtas,
  getDefaultSiteNavItems,
  getDefaultSiteSocialLinks,
} from "@/features/site-navigation/site-navigation-cms-defaults";
import { mergeCmsConfig, mergeSettings, resolvePublicSocialFromCms } from "@/features/site-navigation/site-navigation-merge";
import type {
  PublicFooterGroup,
  PublicNavLink,
  PublicSiteNavigation,
  SiteNavCtaConfig,
  SiteNavLinkConfig,
  SiteNavigationCmsConfig,
  SiteNavigationSettingsConfig,
  SiteSocialLinkConfig,
} from "@/features/site-navigation/site-navigation.types";
import {
  normalizeSortOrders,
  validateCtaInput,
  validateNavItemInput,
  validateNavItemsForPlacement,
  validateSettingsInput,
  validateSocialLinkInput,
} from "@/features/site-navigation/site-navigation-validation";
import {
  normalizeFooterBranding,
  resolveFooterSocialLinks,
} from "@/lib/footer-config";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { prisma } from "@/lib/prisma";
import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache-tags";

type NavItemRow = {
  id: string;
  placement: SiteNavPlacement;
  parentId: string | null;
  label: string;
  href: string;
  description: string | null;
  iconKey: string | null;
  linkTarget: "INTERNAL" | "EXTERNAL";
  sortOrder: number;
  isActive: boolean;
  showDesktop: boolean;
  showMobile: boolean;
  openInNewTab: boolean;
  trackEvent: string | null;
};

let siteNavigationTableReadyCache: boolean | null = null;

export async function isSiteNavigationTableReady(): Promise<boolean> {
  if (siteNavigationTableReadyCache != null) return siteNavigationTableReadyCache;
  try {
    await prisma.siteNavigationSettings.findUnique({
      where: { id: SITE_NAVIGATION_ID },
      select: { id: true },
    });
    siteNavigationTableReadyCache = true;
    return true;
  } catch {
    siteNavigationTableReadyCache = false;
    return false;
  }
}

function mapNavItemRow(row: NavItemRow): SiteNavLinkConfig {
  return {
    id: row.id,
    placement: row.placement,
    parentId: row.parentId,
    label: row.label,
    href: row.href,
    description: row.description,
    iconKey: row.iconKey,
    linkTarget: row.linkTarget,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    showDesktop: row.showDesktop,
    showMobile: row.showMobile,
    openInNewTab: row.openInNewTab,
    trackEvent: row.trackEvent,
  };
}

function toPublicNavLink(item: SiteNavLinkConfig, children?: PublicNavLink[]): PublicNavLink {
  return {
    id: item.id,
    href: item.href,
    label: item.label,
    description: item.description,
    iconKey: item.iconKey,
    openInNewTab: item.openInNewTab,
    trackEvent: item.trackEvent,
    ...(children && children.length > 0 ? { children } : {}),
  };
}

function buildNavTree(
  items: SiteNavLinkConfig[],
  options?: { desktop?: boolean; mobile?: boolean },
): PublicNavLink[] {
  const active = items.filter((item) => {
    if (!item.isActive) return false;
    if (options?.desktop === true && !item.showDesktop) return false;
    if (options?.mobile === true && !item.showMobile) return false;
    return true;
  });

  const roots = active
    .filter((item) => !item.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const childrenByParent = new Map<string, SiteNavLinkConfig[]>();
  for (const item of active) {
    if (!item.parentId) continue;
    const list = childrenByParent.get(item.parentId) ?? [];
    list.push(item);
    childrenByParent.set(item.parentId, list);
  }

  return roots.map((root) => {
    const children = (childrenByParent.get(root.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((child) => toPublicNavLink(child));
    return toPublicNavLink(root, children);
  });
}

function filterPlacement(items: SiteNavLinkConfig[], placement: SiteNavPlacement): SiteNavLinkConfig[] {
  return items.filter((item) => item.placement === placement);
}

async function loadSiteNavigationRows(): Promise<SiteNavigationCmsConfig | null> {
  const ready = await isSiteNavigationTableReady();
  if (!ready) return null;

  const settings = await prisma.siteNavigationSettings.findUnique({
    where: { id: SITE_NAVIGATION_ID },
    include: {
      items: { orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] },
      ctas: { orderBy: { sortOrder: "asc" } },
      socialLinks: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!settings) return null;

  return {
    settings: mergeSettings(settings),
    items: settings.items.map(mapNavItemRow),
    ctas: settings.ctas.map((cta) => ({
      id: cta.id,
      slot: cta.slot,
      label: cta.label,
      href: cta.href,
      trackEvent: cta.trackEvent,
      sortOrder: cta.sortOrder,
      isActive: cta.isActive,
      showDesktop: cta.showDesktop,
      showMobile: cta.showMobile,
      openInNewTab: cta.openInNewTab,
    })),
    socialLinks: settings.socialLinks.map((link) => ({
      id: link.id,
      platform: link.platform,
      label: link.label,
      href: link.href,
      sortOrder: link.sortOrder,
      isActive: link.isActive,
    })),
  };
}

/**
 * Seed singleton + default rows on first authenticated admin CMS load.
 * Public pages never call this — they use mergeCmsConfig(null) when no DB row exists.
 */
export async function ensureSiteNavigationSeededForAdmin(): Promise<void> {
  const ready = await isSiteNavigationTableReady();
  if (!ready) return;

  await prisma.siteNavigationSettings.upsert({
    where: { id: SITE_NAVIGATION_ID },
    create: { id: SITE_NAVIGATION_ID, ...DEFAULT_SITE_NAVIGATION_SETTINGS },
    update: {},
  });

  for (const item of getDefaultSiteNavItems()) {
    await prisma.siteNavItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        settingsId: SITE_NAVIGATION_ID,
        placement: item.placement,
        parentId: item.parentId,
        label: item.label,
        href: item.href,
        description: item.description,
        iconKey: item.iconKey,
        linkTarget: item.linkTarget,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        showDesktop: item.showDesktop,
        showMobile: item.showMobile,
        openInNewTab: item.openInNewTab,
        trackEvent: item.trackEvent,
      },
      update: {},
    });
  }

  for (const cta of getDefaultSiteNavCtas()) {
    await prisma.siteNavCta.upsert({
      where: {
        settingsId_slot: {
          settingsId: SITE_NAVIGATION_ID,
          slot: cta.slot,
        },
      },
      create: {
        id: cta.id,
        settingsId: SITE_NAVIGATION_ID,
        slot: cta.slot,
        label: cta.label,
        href: cta.href,
        trackEvent: cta.trackEvent,
        sortOrder: cta.sortOrder,
        isActive: cta.isActive,
        showDesktop: cta.showDesktop,
        showMobile: cta.showMobile,
        openInNewTab: cta.openInNewTab,
      },
      update: {},
    });
  }

  for (const link of getDefaultSiteSocialLinks()) {
    await prisma.siteSocialLink.upsert({
      where: {
        settingsId_platform: {
          settingsId: SITE_NAVIGATION_ID,
          platform: link.platform,
        },
      },
      create: {
        id: link.id,
        settingsId: SITE_NAVIGATION_ID,
        platform: link.platform,
        label: link.label,
        href: link.href,
        sortOrder: link.sortOrder,
        isActive: link.isActive,
      },
      update: {},
    });
  }
}

export async function getSiteNavigationCmsConfig(): Promise<SiteNavigationCmsConfig> {
  await ensureSiteNavigationSeededForAdmin();
  const loaded = await loadSiteNavigationRows();
  return mergeCmsConfig(loaded);
}

async function resolvePublicSocialLinks(
  cmsLinks: SiteSocialLinkConfig[],
): Promise<Array<{ id: string; label: string; href: string }>> {
  const branding = normalizeFooterBranding(await getBrandingSettings());
  const brandingFallback = resolveFooterSocialLinks(branding, null);
  return resolvePublicSocialFromCms(cmsLinks, brandingFallback);
}

export function mapCmsConfigToPublicNavigation(
  cms: SiteNavigationCmsConfig,
  socialLinks?: Array<{ id: string; label: string; href: string }>,
): PublicSiteNavigation {
  const footerGroups: PublicFooterGroup[] = [
    {
      key: "products",
      title: FOOTER_GROUP_TITLES.FOOTER_PRODUCTS,
      links: buildNavTree(filterPlacement(cms.items, "FOOTER_PRODUCTS"), { desktop: true }),
    },
    {
      key: "services",
      title: FOOTER_GROUP_TITLES.FOOTER_SERVICES,
      links: buildNavTree(filterPlacement(cms.items, "FOOTER_SERVICES"), { desktop: true }),
    },
    {
      key: "company",
      title: FOOTER_GROUP_TITLES.FOOTER_COMPANY,
      links: buildNavTree(filterPlacement(cms.items, "FOOTER_COMPANY"), { desktop: true }),
    },
  ];

  const ctas: Partial<Record<SiteNavCtaSlot, PublicNavLink>> = {};
  for (const cta of cms.ctas) {
    if (!cta.isActive) continue;
    ctas[cta.slot] = {
      id: cta.id,
      href: cta.href,
      label: cta.label,
      openInNewTab: cta.openInNewTab,
      trackEvent: cta.trackEvent,
    };
  }

  return {
    settings: cms.settings,
    utilityBarLinks: buildNavTree(filterPlacement(cms.items, "UTILITY_BAR"), { desktop: true }),
    headerMenuLinks: buildNavTree(filterPlacement(cms.items, "HEADER_MENU"), { desktop: true }),
    categoryNavLinks: buildNavTree(filterPlacement(cms.items, "CATEGORY_NAV"), { desktop: true }),
    mobileMenuLinks: buildNavTree(filterPlacement(cms.items, "MOBILE_MENU"), { mobile: true }),
    footerGroups,
    socialLinks: socialLinks ?? [],
    ctas,
  };
}

async function loadPublicSiteNavigation(): Promise<PublicSiteNavigation> {
  const loaded = await loadSiteNavigationRows();
  const cms = mergeCmsConfig(loaded);
  const socialLinks = await resolvePublicSocialLinks(cms.socialLinks);
  return mapCmsConfigToPublicNavigation(cms, socialLinks);
}

export async function getPublicSiteNavigation(): Promise<PublicSiteNavigation> {
  return unstable_cache(loadPublicSiteNavigation, ["public-site-navigation"], {
    tags: [PUBLIC_CACHE_TAGS.navigation, PUBLIC_CACHE_TAGS.branding],
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  })();
}

async function replacePlacementItems(
  placement: SiteNavPlacement,
  items: SiteNavLinkConfig[],
): Promise<void> {
  const scoped = normalizeSortOrders(
    items
      .filter((item) => item.placement === placement)
      .map((item) => ({ ...item, parentId: item.parentId ?? null })),
  );

  await prisma.$transaction(async (tx) => {
    await tx.siteNavItem.deleteMany({
      where: { settingsId: SITE_NAVIGATION_ID, placement },
    });

    for (const item of scoped) {
      await tx.siteNavItem.create({
        data: {
          id: item.id,
          settingsId: SITE_NAVIGATION_ID,
          placement: item.placement,
          parentId: item.parentId,
          label: item.label.trim(),
          href: item.href.trim(),
          description: item.description?.trim() || null,
          iconKey: item.iconKey?.trim() || null,
          linkTarget: item.linkTarget,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          showDesktop: item.showDesktop,
          showMobile: item.showMobile,
          openInNewTab: item.openInNewTab,
          trackEvent: item.trackEvent?.trim() || null,
        },
      });
    }
  });
}

export async function upsertSiteNavigationSettings(
  settings: SiteNavigationSettingsConfig,
): Promise<{ settings: SiteNavigationSettingsConfig } | { error: string }> {
  const error = validateSettingsInput(settings);
  if (error) return { error };

  await ensureSiteNavigationSeededForAdmin();
  const row = await prisma.siteNavigationSettings.update({
    where: { id: SITE_NAVIGATION_ID },
    data: {
      utilityTagline: settings.utilityTagline.trim(),
      megaMenuTriggerLabel: settings.megaMenuTriggerLabel.trim(),
      searchPlaceholder: settings.searchPlaceholder.trim(),
      useCategoryTreeMegaMenu: settings.useCategoryTreeMegaMenu,
      copyrightText: settings.copyrightText.trim(),
      showCurrentYear: settings.showCurrentYear,
      showTaxCode: settings.showTaxCode,
      originText: settings.originText.trim(),
      legalLinkLabel: settings.legalLinkLabel.trim(),
      legalLinkHref: settings.legalLinkHref.trim(),
      showLegalLink: settings.showLegalLink,
    },
  });

  return { settings: mergeSettings(row) };
}

export async function upsertSiteNavigationItemsForPlacement(
  placement: SiteNavPlacement,
  items: SiteNavLinkConfig[],
): Promise<{ items: SiteNavLinkConfig[] } | { error: string }> {
  const error = validateNavItemsForPlacement(placement, items);
  if (error) return { error };

  for (const item of items.filter((row) => row.placement === placement)) {
    const itemError = validateNavItemInput(item);
    if (itemError) return { error: itemError };
  }

  await ensureSiteNavigationSeededForAdmin();
  await replacePlacementItems(placement, items);
  const cms = await getSiteNavigationCmsConfig();
  return { items: filterPlacement(cms.items, placement) };
}

export async function upsertSiteNavigationFooterItems(
  items: SiteNavLinkConfig[],
): Promise<{ items: SiteNavLinkConfig[] } | { error: string }> {
  const placements: SiteNavPlacement[] = ["FOOTER_PRODUCTS", "FOOTER_SERVICES", "FOOTER_COMPANY"];
  for (const placement of placements) {
    const error = validateNavItemsForPlacement(placement, items);
    if (error) return { error };
  }

  await ensureSiteNavigationSeededForAdmin();
  for (const placement of placements) {
    await replacePlacementItems(placement, items);
  }

  const cms = await getSiteNavigationCmsConfig();
  return {
    items: cms.items.filter((item) => placements.includes(item.placement)),
  };
}

export async function upsertSiteNavigationCtas(
  ctas: SiteNavCtaConfig[],
): Promise<{ ctas: SiteNavCtaConfig[] } | { error: string }> {
  for (const cta of ctas) {
    const error = validateCtaInput(cta);
    if (error) return { error };
  }

  await ensureSiteNavigationSeededForAdmin();

  await prisma.$transaction(
    ctas.map((cta) =>
      prisma.siteNavCta.upsert({
        where: {
          settingsId_slot: {
            settingsId: SITE_NAVIGATION_ID,
            slot: cta.slot,
          },
        },
        create: {
          id: cta.id,
          settingsId: SITE_NAVIGATION_ID,
          slot: cta.slot,
          label: cta.label.trim(),
          href: cta.href.trim(),
          trackEvent: cta.trackEvent?.trim() || null,
          sortOrder: cta.sortOrder,
          isActive: cta.isActive,
          showDesktop: cta.showDesktop,
          showMobile: cta.showMobile,
          openInNewTab: cta.openInNewTab,
        },
        update: {
          label: cta.label.trim(),
          href: cta.href.trim(),
          trackEvent: cta.trackEvent?.trim() || null,
          sortOrder: cta.sortOrder,
          isActive: cta.isActive,
          showDesktop: cta.showDesktop,
          showMobile: cta.showMobile,
          openInNewTab: cta.openInNewTab,
        },
      }),
    ),
  );

  const cms = await getSiteNavigationCmsConfig();
  return { ctas: cms.ctas };
}

export async function upsertSiteNavigationSocialLinks(
  socialLinks: SiteSocialLinkConfig[],
): Promise<{ socialLinks: SiteSocialLinkConfig[] } | { error: string }> {
  for (const link of socialLinks) {
    const error = validateSocialLinkInput(link);
    if (error) return { error };
  }

  await ensureSiteNavigationSeededForAdmin();

  await prisma.$transaction(
    socialLinks.map((link) =>
      prisma.siteSocialLink.upsert({
        where: {
          settingsId_platform: {
            settingsId: SITE_NAVIGATION_ID,
            platform: link.platform,
          },
        },
        create: {
          id: link.id,
          settingsId: SITE_NAVIGATION_ID,
          platform: link.platform,
          label: link.label.trim(),
          href: link.href.trim(),
          sortOrder: link.sortOrder,
          isActive: link.isActive,
        },
        update: {
          label: link.label.trim(),
          href: link.href.trim(),
          sortOrder: link.sortOrder,
          isActive: link.isActive,
        },
      }),
    ),
  );

  const cms = await getSiteNavigationCmsConfig();
  return { socialLinks: cms.socialLinks };
}
