import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import { getZaloUrl } from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";

type ProductInquiryPanelProps = {
  stockLabel?: string | null;
  stockColor?: string;
  productName?: string;
};

export default function ProductInquiryPanel({
  stockLabel,
  stockColor = "#16a34a",
  productName,
}: ProductInquiryPanelProps) {
  const quoteHref = productName
    ? `/lien-he?product=${encodeURIComponent(productName)}`
    : "/lien-he";

  return (
    <aside className="mp-inquiry-panel">
      <div className="mp-inquiry-price">
        <p className="mp-inquiry-price-label">Liên hệ báo giá sỉ</p>
        <p className="mp-inquiry-price-note">
          Giá thay đổi theo số lượng, tồn kho và yêu cầu in/thêu/OEM.
        </p>
      </div>

      {stockLabel && (
        <div className="mp-inquiry-stock">
          <span className="mp-inquiry-stock-label">Tình trạng hàng</span>
          <span
            className="mp-inquiry-stock-value"
            style={{ color: stockColor, borderColor: stockColor }}
          >
            {stockLabel}
          </span>
        </div>
      )}

      <div className="mp-inquiry-actions">
        <TrackedLink
          href={quoteHref}
          trackEvent="contact_quote"
          trackSource="PRODUCT"
          className="btn-primary mp-inquiry-btn"
        >
          Gửi yêu cầu báo giá
        </TrackedLink>
        <a
          href={getZaloUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary mp-inquiry-btn"
        >
          Chat Zalo
        </a>
        <Link href={CTA.primary.href} className="btn-tertiary mp-inquiry-btn">
          Đăng ký đại lý
        </Link>
      </div>
    </aside>
  );
}
