import Link from "next/link";
import AttdLogo from "@/components/public/AttdLogo";
import {
  getCompanySettings,
  getBrandingSettings,
} from "@/features/settings/services/settings.service";
import { FOOTER_TRUST } from "@/lib/siteContent";

const FOOTER_PRODUCTS = [
  { href: "/ao-thun-tron", label: "Áo thun trơn" },
  { href: "/ao-polo-tron", label: "Áo polo trơn" },
  { href: "/non", label: "Nón" },
  { href: "/tote", label: "Tote" },
  { href: "/bandana", label: "Bandana" },
  { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
];

const FOOTER_SOURCING = [
  { href: "/kho-ao-thun-tron", label: "Kho áo thun trơn" },
  { href: "/kho-ao-polo-tron", label: "Kho áo polo trơn" },
  { href: "/nguon-hang-ao-thun-tron", label: "Nguồn hàng áo thun trơn" },
  { href: "/dai-ly", label: "Đại lý" },
];

const FOOTER_KNOWLEDGE = [
  { href: "/bang-mau-ao-thun-tron", label: "Bảng màu áo thun" },
  { href: "/size-ao-thun-tron", label: "Size áo thun" },
  { href: "/vai-cvc-la-gi", label: "Vải CVC" },
  { href: "/vai-tc-la-gi", label: "Vải TC" },
];

export default async function Footer() {
  const [company, branding] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
  ]);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-trust">
          <p className="site-footer-trust-title">{FOOTER_TRUST.title}</p>
          <ul className="site-footer-trust-list">
            {FOOTER_TRUST.items.map((item) => (
              <li key={item} className="site-footer-trust-item">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-grid">
          <div className="site-footer-col site-footer-col--brand">
            <AttdLogo variant="desktop" src={branding.footerLogoUrl} className="site-footer-logo" />
            <p className="site-footer-tagline">{branding.companyTagline}</p>
            <p className="site-footer-text">
              Nguồn hàng B2B cho đại lý, xưởng in, agency và doanh nghiệp trên
              toàn quốc.
            </p>
            {company.workingHours && (
              <p className="site-footer-text" style={{ marginTop: 8 }}>
                {company.workingHours}
              </p>
            )}
          </div>

          <div className="site-footer-col">
            <p className="site-footer-heading">Sản phẩm</p>
            <div className="site-footer-links">
              {FOOTER_PRODUCTS.map((link) => (
                <Link key={link.href} href={link.href} className="site-footer-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="site-footer-col">
            <p className="site-footer-heading">Nguồn hàng</p>
            <div className="site-footer-links">
              {FOOTER_SOURCING.map((link) => (
                <Link key={link.href} href={link.href} className="site-footer-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="site-footer-col">
            <p className="site-footer-heading">Kiến thức</p>
            <div className="site-footer-links">
              {FOOTER_KNOWLEDGE.map((link) => (
                <Link key={link.href} href={link.href} className="site-footer-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="site-footer-col">
            <p className="site-footer-heading">Liên hệ</p>
            <div className="site-footer-links">
              <a href={`tel:${company.hotline.raw}`} className="site-footer-link">
                Hotline {company.hotline.display}
              </a>
              <a
                href={company.zalo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer-link"
              >
                Zalo
              </a>
              <a href={`mailto:${company.email}`} className="site-footer-link">
                {company.email}
              </a>
              {company.address && (
                <span className="site-footer-link">{company.address}</span>
              )}
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          © {company.name}.vn
          {company.taxCode ? ` · MST: ${company.taxCode}` : ""}
        </div>
      </div>
    </footer>
  );
}
