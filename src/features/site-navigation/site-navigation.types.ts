import type { SiteNavCtaSlot, SiteNavLinkTarget, SiteNavPlacement } from "@prisma/client";

export type SiteNavLinkConfig = {
  id: string;
  placement: SiteNavPlacement;
  parentId: string | null;
  label: string;
  href: string;
  description: string | null;
  iconKey: string | null;
  linkTarget: SiteNavLinkTarget;
  sortOrder: number;
  isActive: boolean;
  showDesktop: boolean;
  showMobile: boolean;
  openInNewTab: boolean;
  trackEvent: string | null;
  children?: SiteNavLinkConfig[];
};

export type SiteNavCtaConfig = {
  id: string;
  slot: SiteNavCtaSlot;
  label: string;
  href: string;
  trackEvent: string | null;
  sortOrder: number;
  isActive: boolean;
  showDesktop: boolean;
  showMobile: boolean;
  openInNewTab: boolean;
};

export type SiteSocialLinkConfig = {
  id: string;
  platform: string;
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

export type SiteNavigationSettingsConfig = {
  utilityTagline: string;
  megaMenuTriggerLabel: string;
  searchPlaceholder: string;
  useCategoryTreeMegaMenu: boolean;
  copyrightText: string;
  showCurrentYear: boolean;
  showTaxCode: boolean;
  originText: string;
  legalLinkLabel: string;
  legalLinkHref: string;
  showLegalLink: boolean;
};

export type SiteNavigationCmsConfig = {
  settings: SiteNavigationSettingsConfig;
  items: SiteNavLinkConfig[];
  ctas: SiteNavCtaConfig[];
  socialLinks: SiteSocialLinkConfig[];
};

export type PublicNavLink = {
  id: string;
  href: string;
  label: string;
  description?: string | null;
  iconKey?: string | null;
  openInNewTab: boolean;
  trackEvent?: string | null;
  children?: PublicNavLink[];
};

export type PublicFooterGroup = {
  key: "products" | "services" | "company";
  title: string;
  links: PublicNavLink[];
};

export type PublicSiteNavigation = {
  settings: SiteNavigationSettingsConfig;
  utilityBarLinks: PublicNavLink[];
  headerMenuLinks: PublicNavLink[];
  categoryNavLinks: PublicNavLink[];
  mobileMenuLinks: PublicNavLink[];
  footerGroups: PublicFooterGroup[];
  socialLinks: Array<{ id: string; label: string; href: string }>;
  ctas: Partial<Record<SiteNavCtaSlot, PublicNavLink>>;
};

export type SiteNavigationCmsPanel =
  | "settings"
  | "utility_bar"
  | "header_menu"
  | "category_nav"
  | "mobile_menu"
  | "footer"
  | "social"
  | "ctas";
