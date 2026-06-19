import type { CompanyInfoData } from "@/features/settings/services/settings.service";

/** Default ATTD quote document company profile — used when DB settings are empty. */
export const QUOTE_COMPANY_DEFAULTS = {
  brandName: "ATTD",
  legalName: "Vietnam Clothing Manufacturing Co.,Ltd",
  address: "14B Bùi Cẩm Hổ, Tân Phú, TP Hồ Chí Minh, Việt Nam",
  phone: "0934 337 667",
  email: "hi@attd.vn",
  website: "attd.vn",
  taxCode: "",
} as const;

export type QuoteCompanyProfile = {
  brandName: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxCode: string;
};

function pick(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

/** Resolve quote document company header from settings with ATTD defaults. */
export function resolveQuoteCompanyProfile(
  settings: CompanyInfoData,
): QuoteCompanyProfile {
  return {
    brandName: pick(settings.name, QUOTE_COMPANY_DEFAULTS.brandName),
    legalName: pick(settings.legalName, QUOTE_COMPANY_DEFAULTS.legalName),
    address: pick(settings.address, QUOTE_COMPANY_DEFAULTS.address),
    phone: pick(settings.hotline?.display, QUOTE_COMPANY_DEFAULTS.phone),
    email: pick(settings.email, QUOTE_COMPANY_DEFAULTS.email),
    website: QUOTE_COMPANY_DEFAULTS.website,
    taxCode: pick(settings.taxCode, QUOTE_COMPANY_DEFAULTS.taxCode),
  };
}
