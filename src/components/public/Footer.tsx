import Link from "next/link";
import AttdLogo from "@/components/public/AttdLogo";
import FooterLinkSection from "@/components/public/FooterLinkSection";
import FooterSocialLinks from "@/components/public/FooterSocialLinks";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import TrackedLink from "@/components/analytics/TrackedLink";
import {
  getCachedCompanySettings,
  getBrandingSettings,
} from "@/features/settings/services/settings.service";
import { buildGoogleMapsSearchUrl } from "@/lib/company-trust";
import { hasCompanyField } from "@/lib/companyInfo";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_SERVICE_LINKS,
  hasFooterHotline,
  normalizeFooterBranding,
  normalizeFooterCompany,
  resolveFooterSocialLinks,
  resolveFooterZaloUrl,
} from "@/lib/footer-config";
import type { FooterLink } from "@/lib/footer-config";
import type { PublicSiteNavigation } from "@/features/site-navigation/site-navigation.types";
import { publicNavLinkToNavLink } from "@/features/site-navigation/public-nav-utils";
import { resolveFooterBottomBar } from "@/features/site-navigation/public-footer-bottom-bar";

const FOOTER_NAV_PRODUCT_LINKS: readonly FooterLink[] = [
  { href: "/ao-thun-tron", label: "Áo thun" },
  { href: "/ao-polo-tron", label: "Áo polo" },
  { href: "/non", label: "Nón" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng" },
];

export default async function Footer({
  siteNavigation,
}: {
  siteNavigation?: PublicSiteNavigation;
}) {
  const [rawCompany, rawBranding] = await Promise.all([
    getCachedCompanySettings(),
    getBrandingSettings(),
  ]);

  const company = normalizeFooterCompany(rawCompany);
  const branding = normalizeFooterBranding(rawBranding);
  const mapsUrl = hasCompanyField(company.address)
    ? buildGoogleMapsSearchUrl(company.address)
    : null;

  const socialLinks = siteNavigation?.socialLinks.length
    ? siteNavigation.socialLinks
    : resolveFooterSocialLinks(branding, company);

  const footerGroups = siteNavigation?.footerGroups ?? [
    {
      key: "products" as const,
      title: "Sản phẩm",
      links: FOOTER_NAV_PRODUCT_LINKS.map((link) => ({
        id: link.href,
        ...link,
        openInNewTab: false,
      })),
    },
    {
      key: "services" as const,
      title: "Dịch vụ",
      links: FOOTER_SERVICE_LINKS.map((link) => ({
        id: link.href,
        ...link,
        openInNewTab: false,
      })),
    },
    {
      key: "company" as const,
      title: "Công ty",
      links: FOOTER_COMPANY_LINKS.map((link) => ({
        id: link.href,
        ...link,
        openInNewTab: false,
      })),
    },
  ];

  const footerCta = siteNavigation?.ctas.FOOTER ?? {
    id: "footer-cta-fallback",
    href: "/lien-he",
    label: "Yêu cầu báo giá",
    openInNewTab: false,
    trackEvent: "contact_quote",
  };

  const zaloUrl = resolveFooterZaloUrl(branding, company);
  const showHotline = hasFooterHotline(company);
  const footerBottomBar = resolveFooterBottomBar(siteNavigation?.settings, company.name);

  return (
    <footer className="site-footer site-footer--v5">
      <div className="container">
        <section className="footer-v6__cta" aria-label="Bắt đầu dự án">
          <div className="footer-v6__cta-index">01 / BẮT ĐẦU</div>
          <div className="footer-v6__cta-copy">
            <p>Đang có một dự án cần triển khai?</p>
            <h2>Gửi brief cho ATTD.</h2>
          </div>
          <TrackedLink
            href={footerCta.href}
            trackEvent={(footerCta.trackEvent as "contact_quote") ?? "contact_quote"}
            trackSource="footer_contact"
            className="footer-v6__cta-button"
            target={footerCta.openInNewTab ? "_blank" : undefined}
            rel={footerCta.openInNewTab ? "noopener noreferrer" : undefined}
          >
            {footerCta.label}
            <span aria-hidden>↗</span>
          </TrackedLink>
        </section>

        <div className="footer-v6__brandword" aria-hidden="true">ATTD</div>

        <div className="footer-v5__main footer-v6__main">
          <div className="footer-v5__brand footer-v6__brand">
            <AttdLogo
              variant="desktop"
              src={branding.footerLogoUrl}
              className="footer-v5__logo"
            />
            <p className="footer-v5__statement footer-v6__statement">
              Nguồn hàng B2B, đồng phục, quà tặng và OEM cho doanh nghiệp, đại lý,
              agency và thương hiệu.
            </p>

            <div className="footer-v5__contact">
              {showHotline ? (
                <TrackedAnchor
                  href={`tel:${company.hotline.raw}`}
                  trackEvent="contact_hotline"
                  trackSource="footer_contact"
                >
                  {company.hotline.display}
                </TrackedAnchor>
              ) : null}

              {hasCompanyField(company.email) ? (
                <TrackedAnchor
                  href={`mailto:${company.email}`}
                  trackEvent="contact_email"
                  trackSource="footer_contact"
                >
                  {company.email}
                </TrackedAnchor>
              ) : null}

              {zaloUrl ? (
                <TrackedAnchor
                  href={zaloUrl}
                  trackEvent="contact_zalo"
                  trackSource="footer_contact"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Zalo
                </TrackedAnchor>
              ) : null}
            </div>

            {hasCompanyField(company.workingHours) ? (
              <p className="footer-v5__hours">{company.workingHours}</p>
            ) : null}

            <FooterSocialLinks links={socialLinks} />
          </div>

          <nav className="footer-v5__nav footer-v6__nav" aria-label="Điều hướng cuối trang">
            {footerGroups.map((group) => (
              <FooterLinkSection
                key={group.key}
                title={group.title}
                links={group.links.map(publicNavLinkToNavLink) as readonly FooterLink[]}
              />
            ))}
          </nav>
        </div>

        <div className="footer-v5__meta footer-v6__meta">
          <div className="footer-v5__address">
            {hasCompanyField(company.address) ? (
              <>
                <span>{company.address}</span>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    Google Maps ↗
                  </a>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="footer-v5__bottom">
            <span>{footerBottomBar.copyright}</span>
            {hasCompanyField(company.taxCode) ? (
              <span>MST {company.taxCode}</span>
            ) : null}
            {footerBottomBar.originText ? <span>{footerBottomBar.originText}</span> : null}
            {footerBottomBar.legalLink ? (
              <Link href={footerBottomBar.legalLink.href}>
                {footerBottomBar.legalLink.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
