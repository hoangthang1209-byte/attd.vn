import Link from "next/link";
import {
  CONTACT_HOTLINE,
  CONTACT_HOTLINE_DISPLAY,
  CONTACT_ZALO_URL,
  CONTACT_EMAIL,
} from "@/lib/navConfig";

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

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-grid">
          <div className="site-footer-col site-footer-col--brand">
            <p className="site-footer-brand">ATTD</p>
            <p className="site-footer-tagline">
              KHO SỈ ĐỒNG PHỤC &amp; QUÀ TẶNG DOANH NGHIỆP
            </p>
            <p className="site-footer-text">
              Nguồn hàng B2B cho đại lý, xưởng in, agency và doanh nghiệp trên
              toàn quốc.
            </p>
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
              <a href={`tel:${CONTACT_HOTLINE}`} className="site-footer-link">
                Hotline {CONTACT_HOTLINE_DISPLAY}
              </a>
              <a
                href={CONTACT_ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer-link"
              >
                Zalo
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="site-footer-link">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">© ATTD.vn</div>
      </div>
    </footer>
  );
}
