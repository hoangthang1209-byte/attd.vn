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
      <footer className="site-footer site-footer--premium site-footer--launch site-footer--b2b">
        <div className="container">
          <div className="site-footer-shell">
            <div className="site-footer-brand-block">
              <AttdLogo variant="desktop" src={branding.footerLogoUrl} className="site-footer-logo" />
              {branding.companyTagline ? (
                <p className="site-footer-tagline">{branding.companyTagline}</p>
              ) : null}
              <p className="site-footer-text">{BRAND_POSITIONING}</p>
              <ul className="site-footer-credentials" aria-label="Thông tin doanh nghiệp">
                <li>{VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm</li>
                <li>OEM / B2B sourcing</li>
                {hasCompanyField(company.taxCode) ? <li>MST: {company.taxCode}</li> : null}
                <li>Designed &amp; Manufactured in Vietnam</li>
              </ul>
            </div>

            <div className="site-footer-nav-grid">
              <FooterLinkSection title="Sản phẩm" links={FOOTER_PRODUCT_LINKS} />
              <FooterLinkSection title="Dịch vụ B2B" links={FOOTER_SERVICE_LINKS} />
              <FooterLinkSection title="Công ty" links={FOOTER_COMPANY_LINKS} />
            </div>

            <div className="site-footer-contact-block">
              <p className="site-footer-heading site-footer-heading--static">Liên hệ</p>
              <dl className="site-footer-contact-list">
                {showHotline ? (
                  <div className="site-footer-contact-item">
                    <dt>Hotline</dt>
                    <dd>
                      <TrackedAnchor
                        href={`tel:${company.hotline.raw}`}
                        trackEvent="contact_hotline"
                        trackSource="footer_contact"
                        className="site-footer-link"
                      >
                        {company.hotline.display}
                      </TrackedAnchor>
                    </dd>
                  </div>
                ) : null}
                {hasCompanyField(company.email) ? (
                  <div className="site-footer-contact-item">
                    <dt>Email</dt>
                    <dd>
                      <TrackedAnchor
                        href={`mailto:${company.email}`}
                        trackEvent="contact_email"
                        trackSource="footer_contact"
                        className="site-footer-link"
                      >
                        {company.email}
                      </TrackedAnchor>
                    </dd>
                  </div>
                ) : null}
                {zaloUrl ? (
                  <div className="site-footer-contact-item">
                    <dt>Zalo</dt>
                    <dd>
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
                    </dd>
                  </div>
                ) : null}
                {hasCompanyField(company.address) ? (
                  <div className="site-footer-contact-item">
                    <dt>Địa chỉ</dt>
                    <dd className="site-footer-contact-value">{company.address}</dd>
                  </div>
                ) : null}
                {mapsUrl ? (
                  <div className="site-footer-contact-item">
                    <dt>Maps</dt>
                    <dd>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="site-footer-link"
                      >
                        Xem trên Google Maps
                      </a>
                    </dd>
                  </div>
                ) : null}
                {hasCompanyField(company.workingHours) ? (
                  <div className="site-footer-contact-item">
                    <dt>Giờ làm việc</dt>
                    <dd className="site-footer-contact-value site-footer-hours">
                      {company.workingHours}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <FooterSocialLinks links={socialLinks} />
            </div>
          </div>

          <div className="site-footer-bottom">
            <div className="site-footer-bottom__meta">
              <span>
                © {year} {company.name}.vn
                {hasCompanyField(company.taxCode) ? ` · MST: ${company.taxCode}` : ""}
              </span>
              <span className="site-footer-bottom__origin">Designed &amp; Manufactured in Vietnam</span>
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
