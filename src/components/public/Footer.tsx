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
  FOOTER_SERVICE_LINKS,
  hasFooterHotline,
  normalizeFooterBranding,
  normalizeFooterCompany,
  resolveFooterSocialLinks,
  resolveFooterZaloUrl,
} from "@/lib/footer-config";
import type { FooterLink } from "@/lib/footer-config";

const BRAND_POSITIONING =
  "Đồng hành cùng đại lý, agency, thương hiệu và doanh nghiệp trên toàn quốc.";

const FOOTER_NAV_PRODUCT_LINKS: readonly FooterLink[] = [
  { href: "/ao-thun-tron", label: "Áo thun" },
  { href: "/ao-polo-tron", label: "Áo polo" },
  { href: "/non", label: "Nón" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng" },
];

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
            <h2 className="footer-enterprise__headline">
              Đối tác sản xuất OEM &amp;
              <span className="footer-enterprise__headline-line">Nguồn hàng B2B</span>
            </h2>
            <p className="footer-enterprise__positioning">{BRAND_POSITIONING}</p>
            <ul className="footer-enterprise__credentials" aria-label="Thông tin doanh nghiệp">
              <li>{VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm</li>
              <li>OEM / Private Label</li>
              <li>Made in Vietnam</li>
              {hasCompanyField(company.taxCode) ? <li>MST {company.taxCode}</li> : null}
            </ul>
            <FooterSocialLinks links={socialLinks} />
          </div>

          <div className="footer-enterprise__nav">
            <FooterLinkSection title="Sản phẩm" links={FOOTER_NAV_PRODUCT_LINKS} />
            <FooterLinkSection title="Dịch vụ" links={FOOTER_SERVICE_LINKS} />
            <FooterLinkSection title="Công ty" links={FOOTER_COMPANY_LINKS} />
          </div>

          <aside className="footer-enterprise__contact-card" aria-label="Liên hệ">
            <h3 className="footer-enterprise__contact-title">Liên hệ</h3>
            <ul className="footer-enterprise__contact-list">
              {showHotline ? (
                <li className="footer-enterprise__contact-row">
                  <TrackedAnchor
                    href={`tel:${company.hotline.raw}`}
                    trackEvent="contact_hotline"
                    trackSource="footer_contact"
                    className="footer-enterprise__contact-primary"
                  >
                    {company.hotline.display}
                  </TrackedAnchor>
                  <span className="footer-enterprise__contact-meta">Hotline</span>
                </li>
              ) : null}
              {hasCompanyField(company.email) ? (
                <li className="footer-enterprise__contact-row">
                  <TrackedAnchor
                    href={`mailto:${company.email}`}
                    trackEvent="contact_email"
                    trackSource="footer_contact"
                    className="footer-enterprise__contact-primary"
                  >
                    {company.email}
                  </TrackedAnchor>
                  <span className="footer-enterprise__contact-meta">Email</span>
                </li>
              ) : null}
              {zaloUrl ? (
                <li className="footer-enterprise__contact-row">
                  <TrackedAnchor
                    href={zaloUrl}
                    trackEvent="contact_zalo"
                    trackSource="footer_contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-enterprise__contact-primary"
                  >
                    Chat Zalo
                  </TrackedAnchor>
                  <span className="footer-enterprise__contact-meta">Zalo OA</span>
                </li>
              ) : null}
              {hasCompanyField(company.address) ? (
                <li className="footer-enterprise__contact-row">
                  <span className="footer-enterprise__contact-primary footer-enterprise__contact-primary--text">
                    {company.address}
                  </span>
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-enterprise__contact-link"
                    >
                      Google Maps
                    </a>
                  ) : null}
                </li>
              ) : null}
              {hasCompanyField(company.workingHours) ? (
                <li className="footer-enterprise__contact-row">
                  <span className="footer-enterprise__contact-primary footer-enterprise__contact-primary--text">
                    {company.workingHours}
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
          <div className="footer-enterprise__bottom-start">
            <p className="footer-enterprise__copyright">© {year} {company.name}.vn</p>
            {hasCompanyField(company.taxCode) ? (
              <p className="footer-enterprise__copyright-meta">MST {company.taxCode}</p>
            ) : null}
          </div>
          <p className="footer-enterprise__bottom-origin">Designed &amp; Manufactured in Vietnam</p>
          <Link href="/chinh-sach-dai-ly" className="footer-enterprise__legal-link">
            Chính sách đại lý
          </Link>
        </div>
      </div>
    </footer>
  );
}
