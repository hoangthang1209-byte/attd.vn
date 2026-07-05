import Link from "next/link";
import AttdLogo from "@/components/public/AttdLogo";
import FooterCtaBand from "@/components/public/FooterCtaBand";
import {
  getCompanySettings,
  getBrandingSettings,
} from "@/features/settings/services/settings.service";
import { buildGoogleMapsSearchUrl } from "@/lib/company-trust";
import { hasCompanyField } from "@/lib/companyInfo";

const FOOTER_PRODUCTS = [
  { href: "/san-pham", label: "Tất cả sản phẩm" },
  { href: "/danh-muc-san-pham", label: "Danh mục sản phẩm" },
  { href: "/ao-thun-tron", label: "Áo thun" },
  { href: "/ao-polo-tron", label: "Polo" },
  { href: "/non", label: "Nón" },
  { href: "/tote", label: "Tote" },
  { href: "/bandana", label: "Bandana" },
  { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
  { href: "/gift-set-doanh-nghiep", label: "Gift set" },
];

const FOOTER_SOURCING = [
  { href: "/nguon-hang", label: "Nguồn hàng sỉ" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng DN" },
  { href: "/oem", label: "OEM / Private Label" },
  { href: "/kho-ao-thun-tron", label: "Kho áo thun trơn" },
];

const FOOTER_COMPANY = [
  { href: "/gioi-thieu", label: "Giới thiệu công ty" },
  { href: "/dai-ly", label: "Đăng ký đại lý" },
  { href: "/chinh-sach-dai-ly", label: "Chính sách đại lý" },
  { href: "/lien-he", label: "Liên hệ báo giá" },
];

const FOOTER_KNOWLEDGE = [
  { href: "/blog", label: "Blog B2B" },
  { href: "/bang-mau-ao-thun-tron", label: "Bảng màu áo thun" },
  { href: "/size-ao-thun-tron", label: "Size áo thun" },
  { href: "/vai-cvc-la-gi", label: "Vải CVC" },
];

export default async function Footer() {
  const [company, branding] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
  ]);

  const mapsUrl = hasCompanyField(company.address)
    ? buildGoogleMapsSearchUrl(company.address)
    : null;

  return (
    <>
      <FooterCtaBand />
      <footer className="site-footer site-footer--premium">
        <div className="container">
          <div className="site-footer-grid site-footer-grid--premium">
            <div className="site-footer-col site-footer-col--brand">
              <AttdLogo variant="desktop" src={branding.footerLogoUrl} className="site-footer-logo" />
              <p className="site-footer-tagline">{branding.companyTagline}</p>
              <p className="site-footer-text">
                Kho sỉ đồng phục &amp; quà tặng doanh nghiệp — nguồn hàng B2B cho đại lý,
                agency, xưởng in và doanh nghiệp trên toàn quốc.
              </p>
              {company.workingHours && (
                <p className="site-footer-text site-footer-hours">
                  {company.workingHours}
                </p>
              )}
              {hasCompanyField(company.taxCode) ? (
                <p className="site-footer-text site-footer-mst">MST: {company.taxCode}</p>
              ) : null}
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
              <p className="site-footer-heading">Công ty</p>
              <div className="site-footer-links">
                {FOOTER_COMPANY.map((link) => (
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
                {company.address ? (
                  <span className="site-footer-link">{company.address}</span>
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
              </div>
            </div>
          </div>

          <div className="site-footer-bottom">
            © {company.name}.vn
            {company.taxCode ? ` · MST: ${company.taxCode}` : ""}
          </div>
        </div>
      </footer>
    </>
  );
}
