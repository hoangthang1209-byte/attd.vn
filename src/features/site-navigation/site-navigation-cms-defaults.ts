import type { SiteNavCtaSlot, SiteNavLinkTarget, SiteNavPlacement } from "@prisma/client";
import { CTA } from "@/lib/ctaConfig";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_SERVICE_LINKS,
} from "@/lib/footer-config";
import {
  MARKETPLACE_CATEGORY_NAV,
  NAV_PRIMARY_LINKS,
} from "@/lib/navConfig";
import type {
  SiteNavCtaConfig,
  SiteNavLinkConfig,
  SiteNavigationCmsConfig,
  SiteNavigationSettingsConfig,
  SiteSocialLinkConfig,
} from "@/features/site-navigation/site-navigation.types";

export const SITE_NAVIGATION_ID = "default";

export const FOOTER_GROUP_TITLES = {
  FOOTER_PRODUCTS: "Sản phẩm",
  FOOTER_SERVICES: "Dịch vụ",
  FOOTER_COMPANY: "Công ty",
} as const;

export const DEFAULT_SITE_NAVIGATION_SETTINGS: SiteNavigationSettingsConfig = {
  utilityTagline: "Kho sỉ đồng phục & quà tặng doanh nghiệp",
  megaMenuTriggerLabel: "Tất cả danh mục",
  searchPlaceholder: "Tìm áo thun, áo polo, nón, quà tặng…",
  useCategoryTreeMegaMenu: true,
};

const DEFAULT_FOOTER_PRODUCT_LINKS = [
  { href: "/ao-thun-tron", label: "Áo thun" },
  { href: "/ao-polo-tron", label: "Áo polo" },
  { href: "/non", label: "Nón" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng" },
] as const;

const DEFAULT_UTILITY_BAR_LINKS = [
  { href: "/dai-ly", label: "Đại lý" },
  { href: "/oem", label: "OEM" },
  { href: "/lien-he", label: "Liên hệ" },
] as const;

function makeDefaultItem(
  id: string,
  placement: SiteNavPlacement,
  label: string,
  href: string,
  sortOrder: number,
  overrides: Partial<SiteNavLinkConfig> = {},
): SiteNavLinkConfig {
  return {
    id,
    placement,
    parentId: null,
    label,
    href,
    description: null,
    iconKey: null,
    linkTarget: href.startsWith("http") ? "EXTERNAL" : "INTERNAL",
    sortOrder,
    isActive: true,
    showDesktop: true,
    showMobile: true,
    openInNewTab: false,
    trackEvent: null,
    ...overrides,
  };
}

function linksToDefaults(
  placement: SiteNavPlacement,
  prefix: string,
  links: ReadonlyArray<{ href: string; label: string }>,
): SiteNavLinkConfig[] {
  return links.map((link, index) =>
    makeDefaultItem(`${prefix}-${index + 1}`, placement, link.label, link.href, (index + 1) * 10),
  );
}

export function getDefaultSiteNavItems(): SiteNavLinkConfig[] {
  return [
    ...linksToDefaults("UTILITY_BAR", "sn-utility", DEFAULT_UTILITY_BAR_LINKS),
    ...linksToDefaults("HEADER_MENU", "sn-header", NAV_PRIMARY_LINKS),
    ...linksToDefaults("CATEGORY_NAV", "sn-category", MARKETPLACE_CATEGORY_NAV),
    ...linksToDefaults("MOBILE_MENU", "sn-mobile", NAV_PRIMARY_LINKS),
    ...linksToDefaults("FOOTER_PRODUCTS", "sn-footer-products", DEFAULT_FOOTER_PRODUCT_LINKS),
    ...linksToDefaults("FOOTER_SERVICES", "sn-footer-services", FOOTER_SERVICE_LINKS),
    ...linksToDefaults("FOOTER_COMPANY", "sn-footer-company", FOOTER_COMPANY_LINKS),
  ];
}

export function getDefaultSiteNavCtas(): SiteNavCtaConfig[] {
  const defaults: Array<Omit<SiteNavCtaConfig, "id">> = [
    {
      slot: "HEADER_PRIMARY",
      label: "Liên hệ báo giá sỉ",
      href: "/lien-he",
      trackEvent: "contact_quote",
      sortOrder: 10,
      isActive: true,
      showDesktop: true,
      showMobile: false,
      openInNewTab: false,
    },
    {
      slot: "MOBILE_NAV_PRIMARY",
      label: CTA.secondary.label,
      href: CTA.secondary.href,
      trackEvent: CTA.secondary.event,
      sortOrder: 10,
      isActive: true,
      showDesktop: false,
      showMobile: true,
      openInNewTab: false,
    },
    {
      slot: "MOBILE_NAV_SECONDARY",
      label: CTA.primary.label,
      href: CTA.primary.href,
      trackEvent: CTA.primary.event,
      sortOrder: 20,
      isActive: true,
      showDesktop: false,
      showMobile: true,
      openInNewTab: false,
    },
    {
      slot: "FOOTER",
      label: "Yêu cầu báo giá",
      href: "/lien-he",
      trackEvent: "contact_quote",
      sortOrder: 10,
      isActive: true,
      showDesktop: true,
      showMobile: true,
      openInNewTab: false,
    },
    {
      slot: "MOBILE_ACTION_PRIMARY",
      label: "Báo giá",
      href: "/lien-he",
      trackEvent: "contact_quote",
      sortOrder: 10,
      isActive: true,
      showDesktop: false,
      showMobile: true,
      openInNewTab: false,
    },
    {
      slot: "MOBILE_ACTION_SECONDARY",
      label: "Đại lý",
      href: "/dai-ly",
      trackEvent: "dealer_registration_click",
      sortOrder: 20,
      isActive: true,
      showDesktop: false,
      showMobile: true,
      openInNewTab: false,
    },
  ];

  return defaults.map((item) => ({
    id: `sn-cta-${item.slot.toLowerCase()}`,
    ...item,
  }));
}

export function getDefaultSiteSocialLinks(): SiteSocialLinkConfig[] {
  return [
    { id: "sn-social-facebook", platform: "facebook", label: "Facebook", href: "", sortOrder: 10, isActive: false },
    { id: "sn-social-linkedin", platform: "linkedin", label: "LinkedIn", href: "", sortOrder: 20, isActive: false },
    { id: "sn-social-youtube", platform: "youtube", label: "YouTube", href: "", sortOrder: 30, isActive: false },
    { id: "sn-social-tiktok", platform: "tiktok", label: "TikTok", href: "", sortOrder: 40, isActive: false },
    { id: "sn-social-zalo", platform: "zalo", label: "Zalo OA", href: "", sortOrder: 50, isActive: false },
  ];
}

export function getDefaultSiteNavigationCmsConfig(): SiteNavigationCmsConfig {
  return {
    settings: DEFAULT_SITE_NAVIGATION_SETTINGS,
    items: getDefaultSiteNavItems(),
    ctas: getDefaultSiteNavCtas(),
    socialLinks: getDefaultSiteSocialLinks(),
  };
}

export const SITE_NAV_PLACEMENT_LABELS: Record<SiteNavPlacement, string> = {
  UTILITY_BAR: "Thanh tiện ích",
  HEADER_MENU: "Menu header",
  CATEGORY_NAV: "Danh mục ngang",
  MOBILE_MENU: "Menu mobile",
  FOOTER_PRODUCTS: "Footer — Sản phẩm",
  FOOTER_SERVICES: "Footer — Dịch vụ",
  FOOTER_COMPANY: "Footer — Công ty",
};

export const SITE_NAV_CTA_SLOT_LABELS: Record<SiteNavCtaSlot, string> = {
  HEADER_PRIMARY: "CTA header (desktop)",
  MOBILE_NAV_PRIMARY: "CTA menu mobile — chính",
  MOBILE_NAV_SECONDARY: "CTA menu mobile — phụ",
  FOOTER: "CTA footer",
  MOBILE_ACTION_PRIMARY: "Thanh hành động mobile — chính",
  MOBILE_ACTION_SECONDARY: "Thanh hành động mobile — phụ",
};

export const SITE_NAV_LINK_TARGET_LABELS: Record<SiteNavLinkTarget, string> = {
  INTERNAL: "Nội bộ",
  EXTERNAL: "Bên ngoài",
};

export const SITE_NAV_ICON_OPTIONS = [
  { value: "", label: "Không có" },
  { value: "phone", label: "Điện thoại" },
  { value: "mail", label: "Email" },
  { value: "message-circle", label: "Chat" },
  { value: "package", label: "Gói hàng" },
  { value: "users", label: "Người dùng" },
  { value: "external-link", label: "Liên kết ngoài" },
] as const;
