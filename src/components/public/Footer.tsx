import Link from "next/link";
import AttdLogo from "@/components/public/AttdLogo";
import FooterLinkSection from "@/components/public/FooterLinkSection";
import FooterSocialLinks from "@/components/public/FooterSocialLinks";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import TrackedLink from "@/components/analytics/TrackedLink";
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

const BRAND_HEADLINE = "Đối tác sản xuất OEM & nguồn hàng B2B";
const BRAND_POSITIONING =
  "Đồng hành cùng đại lý, agency, thương hiệu và doanh nghiệp trên toàn quốc.";

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
    <footer className="site-footer site-footer--enterprise">
      <div className="container">
        <div className="footer-enterprise">
          <div className="footer-enterprise__brand">
            <AttdLogo
              variant="desktop"
              src={branding.footerLogoUrl}
              className="footer-enterprise__logo"
            />
            {branding.companyTagline ? (
              <p className="footer-enterprise__eyebrow">{branding.companyTagline}</p>
            ) : null}
            <h2 className="footer-enterprise__headline">{BRAND_HEADLINE}</h2>
            <p className="footer-enterprise__positioning">{BRAND_POSITIONING}</p>
            <ul className="footer-enterprise__credentials" aria-label="Thông tin doanh nghiệp">
              <li>{VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm</li>
              <li>OEM / Private Label</li>
              <li>Made in Vietnam</li>
              {hasCompanyField(company.taxCode) ? <li>MST: {company.taxCode}</li> : null}
            </ul>
            <FooterSocialLinks links={socialLinks} />
          </div>

          <div className="footer-enterprise__nav">
            <FooterLinkSection title="Sản phẩm" links={FOOTER_PRODUCT_LINKS} />
            <FooterLinkSection title="Dịch vụ" links={FOOTER_SERVICE_LINKS} />
            <FooterLinkSection title="Công ty" links={FOOTER_COMPANY_LINKS} />
          </div>

          <aside className="footer-enterprise__contact-card" aria-label="Liên hệ">
            <h3 className="footer-enterprise__contact-title">Liên hệ</h3>
            <ul className="footer-enterprise__contact-list">
              {showHotline ? (
                <li className="footer-enterprise__contact-item">
                  <span className="footer-enterprise__contact-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <span className="footer-enterprise__contact-body">
                    <span className="footer-enterprise__contact-label">Hotline</span>
                    <TrackedAnchor
                      href={`tel:${company.hotline.raw}`}
                      trackEvent="contact_hotline"
                      trackSource="footer_contact"
                      className="footer-enterprise__contact-value"
                    >
                      {company.hotline.display}
                    </TrackedAnchor>
                  </span>
                </li>
              ) : null}
              {hasCompanyField(company.email) ? (
                <li className="footer-enterprise__contact-item">
                  <span className="footer-enterprise__contact-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <span className="footer-enterprise__contact-body">
                    <span className="footer-enterprise__contact-label">Email</span>
                    <TrackedAnchor
                      href={`mailto:${company.email}`}
                      trackEvent="contact_email"
                      trackSource="footer_contact"
                      className="footer-enterprise__contact-value"
                    >
                      {company.email}
                    </TrackedAnchor>
                  </span>
                </li>
              ) : null}
              {zaloUrl ? (
                <li className="footer-enterprise__contact-item">
                  <span className="footer-enterprise__contact-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </span>
                  <span className="footer-enterprise__contact-body">
                    <span className="footer-enterprise__contact-label">Zalo OA</span>
                    <TrackedAnchor
                      href={zaloUrl}
                      trackEvent="contact_zalo"
                      trackSource="footer_contact"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-enterprise__contact-value"
                    >
                      Chat Zalo
                    </TrackedAnchor>
                  </span>
                </li>
              ) : null}
              {hasCompanyField(company.address) ? (
                <li className="footer-enterprise__contact-item">
                  <span className="footer-enterprise__contact-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span className="footer-enterprise__contact-body">
                    <span className="footer-enterprise__contact-label">Địa chỉ</span>
                    <span className="footer-enterprise__contact-value footer-enterprise__contact-value--text">
                      {company.address}
                    </span>
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-enterprise__maps-link"
                      >
                        Google Maps
                      </a>
                    ) : null}
                  </span>
                </li>
              ) : null}
              {hasCompanyField(company.workingHours) ? (
                <li className="footer-enterprise__contact-item">
                  <span className="footer-enterprise__contact-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <span className="footer-enterprise__contact-body">
                    <span className="footer-enterprise__contact-label">Giờ làm việc</span>
                    <span className="footer-enterprise__contact-value footer-enterprise__contact-value--text">
                      {company.workingHours}
                    </span>
                  </span>
                </li>
              ) : null}
            </ul>
            <TrackedLink
              href="/lien-he"
              trackEvent="contact_quote"
              trackSource="footer_contact_card"
              className="footer-enterprise__cta"
            >
              Yêu cầu báo giá
            </TrackedLink>
          </aside>
        </div>

        <div className="footer-enterprise__bottom">
          <p className="footer-enterprise__copyright">
            © {year} {company.name}.vn
            {hasCompanyField(company.taxCode) ? ` · MST: ${company.taxCode}` : ""}
          </p>
          <p className="footer-enterprise__bottom-origin">Designed &amp; Manufactured in Vietnam</p>
          <Link href="/chinh-sach-dai-ly" className="footer-enterprise__legal-link">
            Chính sách đại lý
          </Link>
        </div>
      </div>
    </footer>
  );
}
