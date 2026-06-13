import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import { CTA } from "@/lib/ctaConfig";
import { getZaloUrl } from "@/lib/companyInfo";

type InternalLink = {
  href: string;
  label: string;
};

type StickyInquiryBoxProps = {
  stockLabel?: string | null;
  stockColor?: string;
  internalLinks: InternalLink[];
};

export default function StickyInquiryBox({
  stockLabel,
  stockColor = "#16a34a",
  internalLinks,
}: StickyInquiryBoxProps) {
  return (
    <div className="product-sticky-sidebar">
      {stockLabel && (
        <div className="product-stock-badge">
          <span
            className="product-stock-dot"
            style={{ background: stockColor }}
          />
          <span className="product-stock-label" style={{ color: stockColor }}>
            {stockLabel}
          </span>
        </div>
      )}

      <div className="inquiry-box">
        <p>
          Liên hệ ATTD để nhận báo giá sỉ dành cho đại lý, xưởng in và doanh
          nghiệp. Hỗ trợ tư vấn nguồn hàng và gia công theo yêu cầu.
        </p>
        <div className="btn-row">
          <TrackedLink
            href={CTA.primary.href}
            trackEvent={CTA.primary.event}
            trackSource="PRODUCT_PAGE"
            className="btn-primary"
          >
            {CTA.primary.label}
          </TrackedLink>
          <TrackedLink
            href={CTA.secondary.href}
            trackEvent={CTA.secondary.event}
            trackSource="PRODUCT_PAGE"
            className="btn-secondary"
          >
            {CTA.secondary.label}
          </TrackedLink>
          <TrackedLink
            href={getZaloUrl()}
            trackEvent="contact_zalo"
            trackSource="PRODUCT_PAGE"
            external
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Chat Zalo
          </TrackedLink>
          <Link href={CTA.tertiary.href} className="btn-tertiary btn-row-tertiary">
            {CTA.tertiary.label}
          </Link>
        </div>
      </div>

      <div className="inquiry-links">
        <span className="inquiry-links-label">Tìm hiểu thêm</span>
        <div className="inquiry-links-list">
          {internalLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="link-chip"
              style={{ justifyContent: "space-between" }}
            >
              {l.label}
              <span aria-hidden style={{ color: "#9ca3af" }}>
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
