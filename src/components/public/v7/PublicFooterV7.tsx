import Link from "next/link";
import AttdLogo from "@/components/public/AttdLogo";
import FooterSocialLinks from "@/components/public/FooterSocialLinks";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import { getCachedCompanySettings, getBrandingSettings } from "@/features/settings/services/settings.service";
import { hasCompanyField } from "@/lib/companyInfo";
import { normalizeFooterBranding, normalizeFooterCompany } from "@/lib/footer-config";
import type { PublicSiteNavigation } from "@/features/site-navigation/site-navigation.types";

const SOLUTIONS = [
  { href: "/dong-phuc-doanh-nghiep", label: "Đồng phục doanh nghiệp" },
  { href: "/nguon-hang", label: "Nguồn hàng B2B" },
  { href: "/oem", label: "OEM / Private Label" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp" },
  { href: "/merchandise", label: "Artist & Event Merchandise" },
] as const;

export default async function PublicFooterV7({
  siteNavigation,
}: {
  siteNavigation: PublicSiteNavigation;
}) {
  const [rawCompany, rawBranding] = await Promise.all([
    getCachedCompanySettings(),
    getBrandingSettings(),
  ]);
  const company = normalizeFooterCompany(rawCompany);
  const branding = normalizeFooterBranding(rawBranding);
  const footerCta = siteNavigation.ctas.FOOTER ?? {
    id: "v7-footer-cta",
    href: "/lien-he",
    label: "Bắt đầu một dự án",
    openInNewTab: false,
  };

  return (
    <footer className="v7-footer">
      <div className="container">
        <div className="v7-footer__lead">
          <div>
            <p className="v7-kicker v7-kicker--light">Một đầu mối cho toàn bộ dự án B2B</p>
            <h2>Có brief. Có deadline. ATTD triển khai phần còn lại.</h2>
          </div>
          <Link
            href={footerCta.href}
            className="v7-footer__lead-link"
            target={footerCta.openInNewTab ? "_blank" : undefined}
            rel={footerCta.openInNewTab ? "noopener noreferrer" : undefined}
          >
            {footerCta.label} <span>↗</span>
          </Link>
        </div>

        <div className="v7-footer__grid">
          <div className="v7-footer__brand">
            <AttdLogo src={branding.footerLogoUrl} className="v7-footer__logo" />
            <p>
              Đối tác sourcing, customization, OEM và merchandise cho doanh nghiệp,
              agency, đại lý và thương hiệu.
            </p>
            <div className="v7-footer__contact">
              {company.hotline.raw ? (
                <TrackedAnchor href={`tel:${company.hotline.raw}`} trackEvent="contact_hotline" trackSource="footer_contact">
                  {company.hotline.display}
                </TrackedAnchor>
              ) : null}
              {hasCompanyField(company.email) ? (
                <TrackedAnchor href={`mailto:${company.email}`} trackEvent="contact_email" trackSource="footer_contact">
                  {company.email}
                </TrackedAnchor>
              ) : null}
            </div>
            {siteNavigation.socialLinks.length > 0 ? (
              <FooterSocialLinks links={siteNavigation.socialLinks} />
            ) : null}
          </div>

          <div className="v7-footer__nav v7-footer__nav--cms">
            <div>
              <h3>Giải pháp</h3>
              {SOLUTIONS.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </div>
            {siteNavigation.footerGroups.map((group) => (
              <div key={group.key}>
                <h3>{group.title}</h3>
                {group.links.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    target={item.openInNewTab ? "_blank" : undefined}
                    rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="v7-footer__bottom">
          <span>
            {siteNavigation.settings.copyrightText || "© ATTD"}
            {siteNavigation.settings.showCurrentYear ? ` ${new Date().getFullYear()}` : ""}
          </span>
          <span>{hasCompanyField(company.address) ? company.address : "TP. Hồ Chí Minh, Việt Nam"}</span>
          {siteNavigation.settings.showTaxCode && hasCompanyField(company.taxCode) ? <span>MST {company.taxCode}</span> : null}
          {siteNavigation.settings.showLegalLink ? (
            <Link href={siteNavigation.settings.legalLinkHref}>{siteNavigation.settings.legalLinkLabel}</Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
