"use client";

import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
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
            <p className="footer-cta-eyebrow">Đối tác B2B &amp; OEM</p>
            <h2 className="footer-cta-title">Sẵn sàng nhận báo giá theo số lượng?</h2>
            <p className="footer-cta-desc">
              Gửi yêu cầu để ATTD tư vấn MOQ, thời gian sản xuất và báo giá cho đại lý, agency và
              doanh nghiệp.
            </p>
            <p className="footer-cta-note">
              {VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm · OEM / B2B sourcing · Designed &amp;
              Manufactured in Vietnam
            </p>
          </div>
          <div className="footer-cta-btns">
            <TrackedLink
              href="/lien-he"
              trackEvent="contact_quote"
              trackSource="footer_cta_band"
              className="btn-primary footer-cta-btn-primary"
            >
              Yêu cầu báo giá
            </TrackedLink>
            {showHotline ? (
              <TrackedAnchor
                href={`tel:${company.hotline.raw}`}
                trackEvent="contact_hotline"
                trackSource="footer_cta_band"
                className="btn-secondary footer-cta-btn-secondary"
              >
                Hotline {company.hotline.display}
              </TrackedAnchor>
            ) : zaloUrl ? (
              <TrackedAnchor
                href={zaloUrl}
                trackEvent="contact_zalo"
                trackSource="footer_cta_band"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary footer-cta-btn-secondary"
              >
                Chat Zalo
              </TrackedAnchor>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
