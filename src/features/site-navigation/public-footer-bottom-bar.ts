import type { SiteNavigationSettingsConfig } from "@/features/site-navigation/site-navigation.types";
import { DEFAULT_SITE_NAVIGATION_SETTINGS } from "@/features/site-navigation/site-navigation-cms-defaults";

export type ResolvedFooterBottomBar = {
  copyright: string;
  showTaxCode: boolean;
  originText: string | null;
  legalLink: { label: string; href: string } | null;
};

function stripCopyrightPrefix(value: string): string {
  return value.replace(/^©\s*\d{4}\s*/, "").replace(/^©\s*/, "").trim();
}

/** Build public copyright line; tax code still comes from Company Settings. */
export function resolvePublicCopyrightText(
  settings: SiteNavigationSettingsConfig,
  companyBrandFallback: string,
): string {
  const brand = settings.copyrightText?.trim() || `${companyBrandFallback}.vn`;
  if (settings.showCurrentYear) {
    const label = stripCopyrightPrefix(brand);
    return `© ${new Date().getFullYear()} ${label}`;
  }
  if (brand.startsWith("©")) return brand;
  return `© ${brand}`;
}

export function resolveFooterBottomBar(
  settings: SiteNavigationSettingsConfig | undefined,
  companyBrandFallback: string,
): ResolvedFooterBottomBar {
  const defaults = DEFAULT_SITE_NAVIGATION_SETTINGS;
  const merged = settings ?? defaults;
  const originText = settings
    ? merged.originText?.trim() || null
    : merged.originText?.trim() || defaults.originText;
  const legalLabel = settings
    ? merged.legalLinkLabel?.trim() ?? ""
    : merged.legalLinkLabel?.trim() || defaults.legalLinkLabel;
  const legalHref = settings
    ? merged.legalLinkHref?.trim() ?? ""
    : merged.legalLinkHref?.trim() || defaults.legalLinkHref;
  const showLegal =
    merged.showLegalLink &&
    Boolean(legalLabel) &&
    Boolean(legalHref) &&
    (legalHref.startsWith("/") || legalHref.startsWith("http://") || legalHref.startsWith("https://"));

  return {
    copyright: resolvePublicCopyrightText(merged, companyBrandFallback),
    showTaxCode: merged.showTaxCode,
    originText: originText || null,
    legalLink: showLegal ? { label: legalLabel, href: legalHref } : null,
  };
}
