import Link from "next/link";
import type { BrandingSettingsData, CompanyInfoData } from "@/features/settings/services/settings.service";
import { VERIFIED_EXPERIENCE_YEARS } from "@/lib/company-trust";
import {
  hasFooterHotline,
  resolveFooterZaloUrl,
} from "@/lib/footer-config";

type Props = {
  company: CompanyInfoData;
  branding: BrandingSettingsData;
};

export default function FooterCtaBand({ company, branding }: Props) {
  const zaloUrl = resolveFooterZaloUrl(branding, company);
  const showHotline = hasFooterHotline(company);

  return (
    <section className="footer-cta-band" aria-label="Yêu cầu báo giá B2B">
      <div className="container">
        <div className="footer-cta-inner">
          <div className="footer-cta-copy">
            <h2 className="footer-cta-title">Bạn đang tìm nguồn hàng B2B?</h2>
            <p className="footer-cta-desc">
              Gửi yêu cầu để ATTD tư vấn MOQ, thời gian giao/sản xuất và báo giá theo số lượng
              cho đại lý, agency và doanh nghiệp.
            </p>
          </div>
          <div className="footer-cta-btns">
            <Link href="/lien-he" className="btn-primary footer-cta-btn-primary">
              Yêu cầu báo giá
            </Link>
            {showHotline ? (
              <a href={`tel:${company.hotline.raw}`} className="btn-secondary footer-cta-btn-secondary">
                Gọi {company.hotline.display}
              </a>
            ) : zaloUrl ? (
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary footer-cta-btn-secondary"
              >
                Chat Zalo
              </a>
            ) : null}
          </div>
        </div>
        <div className="footer-trust-chips" aria-label="Điểm tin cậy">
          {[
            `${VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm`,
            "OEM / Private Label",
            "Showroom & Kho hàng",
            "Giao hàng toàn quốc",
          ].map((chip) => (
            <span key={chip} className="footer-trust-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
