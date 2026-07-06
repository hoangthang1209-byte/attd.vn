import type { BrandingSettingsData, CompanyInfoData } from "@/features/settings/services/settings.service";
import { companyInfo as staticCompanyInfo, hasCompanyField } from "@/lib/companyInfo";

export type FooterLink = {
  href: string;
  label: string;
};

export type FooterSocialLink = {
  id: string;
  label: string;
  href: string;
};

type FooterCompanyInput = Partial<Omit<CompanyInfoData, "hotline" | "zalo">> & {
  hotline?: Partial<CompanyInfoData["hotline"]> | null;
  zalo?: Partial<CompanyInfoData["zalo"]> | null;
};

const DEFAULT_FOOTER_BRANDING: BrandingSettingsData = {
  headerLogoUrl: null,
  footerLogoUrl: null,
  faviconUrl: null,
  defaultOgImageUrl: null,
  companyTagline: staticCompanyInfo.tagline,
  facebookUrl: null,
  zaloUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  linkedinUrl: null,
};

const DEFAULT_FOOTER_COMPANY: CompanyInfoData = {
  name: staticCompanyInfo.name,
  legalName: staticCompanyInfo.legalName,
  tagline: staticCompanyInfo.tagline,
  hotline: {
    raw: staticCompanyInfo.hotline.raw,
    display: staticCompanyInfo.hotline.display,
    international: staticCompanyInfo.hotline.international,
  },
  zalo: {
    phone: staticCompanyInfo.zalo.phone,
    url: staticCompanyInfo.zalo.url,
  },
  email: staticCompanyInfo.email,
  address: staticCompanyInfo.address,
  taxCode: staticCompanyInfo.taxCode,
  workingHours: staticCompanyInfo.workingHours,
};

export const FOOTER_PRODUCT_LINKS: readonly FooterLink[] = [
  { href: "/ao-thun-tron", label: "Áo thun trơn" },
  { href: "/ao-polo-tron", label: "Áo polo trơn" },
  { href: "/non", label: "Nón" },
  { href: "/tote", label: "Tote bag" },
  { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp" },
];

export const FOOTER_SERVICE_LINKS: readonly FooterLink[] = [
  { href: "/nguon-hang", label: "Nguồn hàng" },
  { href: "/oem", label: "OEM / Private Label" },
  { href: "/ao-thun-doanh-nghiep", label: "Đồng phục doanh nghiệp" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp" },
  { href: "/dai-ly", label: "Đại lý" },
];

export const FOOTER_COMPANY_LINKS: readonly FooterLink[] = [
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/lien-he", label: "Liên hệ" },
  { href: "/blog", label: "Blog" },
  { href: "/danh-muc-san-pham", label: "Danh mục sản phẩm" },
  { href: "/chinh-sach-dai-ly", label: "Chính sách đại lý" },
];

function isValidExternalUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredString(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

export function normalizeFooterBranding(
  branding: Partial<BrandingSettingsData> | null | undefined,
): BrandingSettingsData {
  return {
    headerLogoUrl: normalizeOptionalString(branding?.headerLogoUrl),
    footerLogoUrl: normalizeOptionalString(branding?.footerLogoUrl),
    faviconUrl: normalizeOptionalString(branding?.faviconUrl),
    defaultOgImageUrl: normalizeOptionalString(branding?.defaultOgImageUrl),
    companyTagline: normalizeRequiredString(
      branding?.companyTagline,
      DEFAULT_FOOTER_BRANDING.companyTagline,
    ),
    facebookUrl: normalizeOptionalString(branding?.facebookUrl),
    zaloUrl: normalizeOptionalString(branding?.zaloUrl),
    youtubeUrl: normalizeOptionalString(branding?.youtubeUrl),
    tiktokUrl: normalizeOptionalString(branding?.tiktokUrl),
    linkedinUrl: normalizeOptionalString(branding?.linkedinUrl),
  };
}

export function normalizeFooterCompany(
  company: FooterCompanyInput | null | undefined,
): CompanyInfoData {
  const missingCompany = company == null;
  const fallback = missingCompany ? DEFAULT_FOOTER_COMPANY : null;

  return {
    name: normalizeRequiredString(company?.name, DEFAULT_FOOTER_COMPANY.name),
    legalName: normalizeRequiredString(company?.legalName, DEFAULT_FOOTER_COMPANY.legalName),
    tagline: normalizeRequiredString(company?.tagline, DEFAULT_FOOTER_COMPANY.tagline),
    hotline: {
      raw: normalizeOptionalString(company?.hotline?.raw) ?? fallback?.hotline.raw ?? "",
      display: normalizeOptionalString(company?.hotline?.display) ?? fallback?.hotline.display ?? "",
      international:
        normalizeOptionalString(company?.hotline?.international) ??
        fallback?.hotline.international ??
        "",
    },
    zalo: {
      phone: normalizeOptionalString(company?.zalo?.phone) ?? fallback?.zalo.phone ?? "",
      url: normalizeOptionalString(company?.zalo?.url) ?? fallback?.zalo.url ?? "",
    },
    email: normalizeOptionalString(company?.email) ?? fallback?.email ?? "",
    address: normalizeOptionalString(company?.address) ?? fallback?.address ?? "",
    taxCode: normalizeOptionalString(company?.taxCode) ?? fallback?.taxCode ?? "",
    workingHours: normalizeOptionalString(company?.workingHours) ?? fallback?.workingHours ?? "",
  };
}

export function resolveFooterSocialLinks(
  branding: BrandingSettingsData | null | undefined,
  company: CompanyInfoData | null | undefined,
): FooterSocialLink[] {
  const normalizedBranding = normalizeFooterBranding(branding);
  const normalizedCompany = normalizeFooterCompany(company);
  const zaloUrl = normalizedBranding.zaloUrl ?? normalizedCompany.zalo.url;

  const candidates: Array<{ id: string; label: string; url: string | null | undefined }> = [
    { id: "facebook", label: "Facebook", url: normalizedBranding.facebookUrl },
    { id: "linkedin", label: "LinkedIn", url: normalizedBranding.linkedinUrl },
    { id: "youtube", label: "YouTube", url: normalizedBranding.youtubeUrl },
    { id: "tiktok", label: "TikTok", url: normalizedBranding.tiktokUrl },
    { id: "zalo", label: "Zalo OA", url: zaloUrl },
  ];

  return candidates
    .filter((item): item is typeof item & { url: string } => isValidExternalUrl(item.url))
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.url.trim(),
    }));
}

export function resolveFooterZaloUrl(
  branding: BrandingSettingsData | null | undefined,
  company: CompanyInfoData | null | undefined,
): string | null {
  const normalizedBranding = normalizeFooterBranding(branding);
  const normalizedCompany = normalizeFooterCompany(company);
  const url = normalizedBranding.zaloUrl ?? normalizedCompany.zalo.url;
  return isValidExternalUrl(url) ? url : null;
}

export function hasFooterHotline(company: CompanyInfoData): boolean {
  return hasCompanyField(company.hotline.raw);
}
