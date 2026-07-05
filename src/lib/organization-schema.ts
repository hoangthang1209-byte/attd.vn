import type { CompanyInfoData } from "@/features/settings/services/settings.service";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { getCompanySettings } from "@/features/settings/services/settings.service";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { buildGoogleMapsSearchUrl } from "@/lib/company-trust";
import { hasCompanyField } from "@/lib/companyInfo";

export type OrganizationJsonLd = Record<string, unknown>;

export function buildOrganizationJsonLd(
  company: CompanyInfoData,
  branding?: { facebookUrl?: string | null; zaloUrl?: string | null; linkedinUrl?: string | null },
): OrganizationJsonLd {
  const sameAs = [
    company.zalo.url,
    branding?.facebookUrl,
    branding?.linkedinUrl,
  ].filter((url): url is string => Boolean(url?.trim()));

  const schema: OrganizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name || SITE_NAME,
    legalName: hasCompanyField(company.legalName) ? company.legalName : undefined,
    url: SITE_URL,
    description: company.tagline || undefined,
    telephone: company.hotline.international,
    email: hasCompanyField(company.email) ? company.email : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: company.hotline.international,
      contactType: "customer service",
      areaServed: "VN",
      availableLanguage: "Vietnamese",
      email: hasCompanyField(company.email) ? company.email : undefined,
    },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  if (hasCompanyField(company.address)) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: company.address,
      addressCountry: "VN",
    };

    const mapsUrl = buildGoogleMapsSearchUrl(company.address);
    if (mapsUrl) {
      schema.hasMap = mapsUrl;
    }
  }

  if (hasCompanyField(company.taxCode)) {
    schema.taxID = company.taxCode;
  }

  return schema;
}

export async function getOrganizationJsonLd(): Promise<OrganizationJsonLd> {
  const [company, branding] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
  ]);

  return buildOrganizationJsonLd(company, branding);
}
