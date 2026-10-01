import Link from "next/link";
import AttdLogo from "@/components/public/AttdLogo";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import { getCachedCompanySettings, getBrandingSettings } from "@/features/settings/services/settings.service";
import { hasCompanyField } from "@/lib/companyInfo";
import { normalizeFooterBranding, normalizeFooterCompany } from "@/lib/footer-config";

const SOLUTIONS = [
  { href: "/dong-phuc-doanh-nghiep", label: "Đồng phục doanh nghiệp" },
  { href: "/nguon-hang", label: "Nguồn hàng B2B" },
  { href: "/oem", label: "OEM / Private Label" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp" },
  { href: "/merchandise", label: "Artist & Event Merchandise" },
] as const;

const COMPANY = [
  { href: "/gioi-thieu", label: "Về ATTD" },
  { href: "/san-pham", label: "Danh mục sản phẩm" },
  { href: "/dai-ly", label: "Hợp tác đại lý" },
  { href: "/blog", label: "Kiến thức & tin tức" },
  { href: "/lien-he", label: "Liên hệ" },
] as const;

export default async function PublicFooterV7() {
  const [rawCompany, rawBranding] = await Promise.all([
    getCachedCompanySettings(),
    getBrandingSettings(),
  ]);
  const company = normalizeFooterCompany(rawCompany);
  const branding = normalizeFooterBranding(rawBranding);

  return (
    <footer className="v7-footer">
      <div className="container">
        <div className="v7-footer__lead">
          <div>
            <p className="v7-kicker v7-kicker--light">Một đầu mối cho toàn bộ dự án B2B</p>
            <h2>Có brief. Có deadline. ATTD triển khai phần còn lại.</h2>
          </div>
          <Link href="/lien-he" className="v7-footer__lead-link">
            Bắt đầu một dự án <span>↗</span>
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
          </div>

          <div className="v7-footer__nav">
            <div>
              <h3>Giải pháp</h3>
              {SOLUTIONS.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </div>
            <div>
              <h3>ATTD</h3>
              {COMPANY.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </div>
          </div>
        </div>

        <div className="v7-footer__bottom">
          <span>© {new Date().getFullYear()} ATTD</span>
          <span>{hasCompanyField(company.address) ? company.address : "TP. Hồ Chí Minh, Việt Nam"}</span>
          {hasCompanyField(company.taxCode) ? <span>MST {company.taxCode}</span> : null}
        </div>
      </div>
    </footer>
  );
}
