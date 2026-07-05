import type { CompanyInfoData } from "@/features/settings/services/settings.service";
import { hasCompanyField } from "@/lib/companyInfo";
import { VERIFIED_EXPERIENCE_YEARS } from "@/lib/company-trust";

type Props = {
  company: CompanyInfoData;
  className?: string;
};

export default function CompanyIntroSection({ company, className }: Props) {
  const classes = ["company-intro", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label="Giới thiệu công ty">
      <div className="container">
        <div className="company-intro__layout">
          <div className="company-intro__copy">
            <p className="company-intro__eyebrow">Về ATTD</p>
            <h2 className="company-intro__title">
              {hasCompanyField(company.legalName) ? company.legalName : company.name}
            </h2>
            {hasCompanyField(company.tagline) ? (
              <p className="company-intro__tagline">{company.tagline}</p>
            ) : null}
            <p className="company-intro__lead">
              ATTD là nền tảng nguồn hàng B2B cho đại lý, agency, xưởng in và doanh nghiệp
              cần đồng phục, phôi trơn, quà tặng và giải pháp OEM/Private Label. Với hơn{" "}
              {VERIFIED_EXPERIENCE_YEARS} năm kinh nghiệm từ AOTHUNTHONGDIEP và VietnamClothing,
              chúng tôi kết hợp showroom, kho hàng và mạng lưới sản xuất để hỗ trợ đối tác triển
              khai đơn hàng rõ ràng, có thể mở rộng.
            </p>
          </div>

          <ul className="company-intro__highlights">
            <li>Hơn {VERIFIED_EXPERIENCE_YEARS} năm kinh nghiệm ngành may mặc &amp; đồng phục</li>
            <li>Showroom &amp; kho hàng tại TP. Hồ Chí Minh</li>
            <li>OEM / Private Label theo yêu cầu thương hiệu</li>
            <li>Mạng lưới sản xuất phối hợp trên toàn quốc</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
