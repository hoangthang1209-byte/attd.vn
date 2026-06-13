import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: stockColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 14, color: stockColor, fontWeight: 500 }}>
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
            href="/lien-he"
            trackEvent="contact_quote"
            trackSource="PRODUCT_PAGE"
            className="btn-primary"
          >
            Liên hệ báo giá
          </TrackedLink>
          <TrackedLink
            href="/dai-ly"
            trackEvent="dealer_registration_click"
            trackSource="PRODUCT_PAGE"
            className="btn-secondary"
          >
            Đăng ký đại lý
          </TrackedLink>
          <TrackedLink
            href="https://zalo.me/0934337667"
            trackEvent="contact_zalo"
            trackSource="PRODUCT_PAGE"
            external
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Chat Zalo
          </TrackedLink>
        </div>
      </div>

      <div
        style={{
          paddingTop: 20,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 12,
          }}
        >
          Tìm hiểu thêm
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
