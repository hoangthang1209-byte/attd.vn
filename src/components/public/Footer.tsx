import Link from "next/link";
import AttdLogo from "@/components/public/AttdLogo";
import FooterCtaBand from "@/components/public/FooterCtaBand";
import FooterLinkSection from "@/components/public/FooterLinkSection";
import FooterSocialLinks from "@/components/public/FooterSocialLinks";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import {
  getCompanySettings,
  getBrandingSettings,
} from "@/features/settings/services/settings.service";
import { buildGoogleMapsSearchUrl, VERIFIED_EXPERIENCE_YEARS } from "@/lib/company-trust";
import { hasCompanyField } from "@/lib/companyInfo";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_PRODUCT_LINKS,
  FOOTER_SERVICE_LINKS,
  hasFooterHotline,
  normalizeFooterBranding,
  normalizeFooterCompany,
  resolveFooterSocialLinks,
  resolveFooterZaloUrl,
} from "@/lib/footer-config";

const BRAND_POSITIONING =
  "Nguồn hàng B2B đồng phục, phôi trơn và quà tặng doanh nghiệp cho đại lý, agency, xưởng in và doanh nghiệp trên toàn quốc.";

export default async function Footer() {
  const [rawCompany, rawBranding] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
  ]);
  const company = normalizeFooterCompany(rawCompany);
  const branding = normalizeFooterBranding(rawBranding);

  const mapsUrl = hasCompanyField(company.address)
    ? buildGoogleMapsSearchUrl(company.address)
    : null;
  const socialLinks = resolveFooterSocialLinks(branding, company);
  const zaloUrl = resolveFooterZaloUrl(branding, company);
  const showHotline = hasFooterHotline(company);
  const year = new Date().getFullYear();

  return (
    <>
      <FooterCtaBand company={company} branding={branding} />
      <footer className="site-footer site-footer--premium site-footer--launch">
        <div className="container">
          <div className="site-footer-grid site-footer-grid--launch">
            <div className="site-footer-col site-footer-col--brand">
              <AttdLogo variant="desktop" src={branding.footerLogoUrl} className="site-footer-logo" />
              {branding.companyTagline ? (
                <p className="site-footer-tagline">{branding.companyTagline}</p>
              ) : null}
              <p className="site-footer-text">{BRAND_POSITIONING}</p>
              <p className="site-footer-trust-line">
                {VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm trong ngành may mặc &amp; đồng phục
              </p>
              {hasCompanyField(company.taxCode) ? (
                <p className="site-footer-text site-footer-mst">MST: {company.taxCode}</p>
              ) : null}
            </div>

            <FooterLinkSection title="Sản phẩm" links={FOOTER_PRODUCT_LINKS} />
            <FooterLinkSection title="Dịch vụ B2B" links={FOOTER_SERVICE_LINKS} />
            <FooterLinkSection title="Công ty" links={FOOTER_COMPANY_LINKS} />

            <div className="site-footer-col site-footer-col--contact">
              <p className="site-footer-heading site-footer-heading--static">Liên hệ</p>
              <div className="site-footer-links">
                {showHotline ? (
                  <TrackedAnchor
                    href={`tel:${company.hotline.raw}`}
                    trackEvent="contact_hotline"
                    trackSource="footer_contact"
                    className="site-footer-link"
                  >
                    Hotline {company.hotline.display}
                  </TrackedAnchor>
                ) : null}
                {hasCompanyField(company.email) ? (
                  <TrackedAnchor
                    href={`mailto:${company.email}`}
                    trackEvent="contact_email"
                    trackSource="footer_contact"
                    className="site-footer-link"
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
                    className="site-footer-link"
                  >
                    Zalo OA
                  </TrackedAnchor>
                ) : null}
                {hasCompanyField(company.address) ? (
                  <span className="site-footer-link site-footer-link--text">{company.address}</span>
                ) : null}
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer-link"
                  >
                    Xem trên Google Maps
                  </a>
                ) : null}
                {hasCompanyField(company.workingHours) ? (
                  <span className="site-footer-link site-footer-link--text site-footer-hours">
                    {company.workingHours}
                  </span>
                ) : null}
              </div>

              <FooterSocialLinks links={socialLinks} />
            </div>
          </div>

          <div className="site-footer-bottom">
            <div className="site-footer-bottom__meta">
              <span>
                © {year} {company.name}.vn
                {hasCompanyField(company.taxCode) ? ` · MST: ${company.taxCode}` : ""}
              </span>
              <span className="site-footer-bottom__origin">Thiết kế &amp; Sản xuất tại Việt Nam</span>
            </div>
            <div className="site-footer-bottom__legal">
              <Link href="/chinh-sach-dai-ly" className="site-footer-bottom__link">
                Chính sách đại lý
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
