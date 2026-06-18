import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import { getZaloUrl } from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";

type ProductInquiryPanelProps = {
  stockLabel?: string | null;
  stockColor?: string;
  productName?: string;
  defaultMoq?: number | null;
  leadTime?: string | null;
  skuCount?: number;
};

export default function ProductInquiryPanel({
  stockLabel,
  stockColor = "#16a34a",
  productName,
  defaultMoq,
  leadTime,
  skuCount = 0,
}: ProductInquiryPanelProps) {
  const quoteHref = productName
    ? `/lien-he?product=${encodeURIComponent(productName)}`
    : "/lien-he";

  return (
    <aside className="mp-inquiry-panel mp-pdp-inquiry-panel">
      <div className="mp-inquiry-price">
        <p className="mp-inquiry-price-label">Liên hệ báo giá sỉ</p>
        <p className="mp-inquiry-price-note">
          Giá thay đổi theo số lượng, tồn kho và yêu cầu in/thêu/OEM.
        </p>
      </div>

      <dl className="mp-pdp-inquiry-facts">
        {defaultMoq != null && (
          <div className="mp-pdp-inquiry-fact">
            <dt>Số lượng tối thiểu</dt>
            <dd>{defaultMoq} cái</dd>
          </div>
        )}
        {leadTime && (
          <div className="mp-pdp-inquiry-fact">
            <dt>Thời gian giao/sản xuất</dt>
            <dd>{leadTime}</dd>
          </div>
        )}
        {stockLabel && (
          <div className="mp-pdp-inquiry-fact">
            <dt>Tình trạng hàng</dt>
            <dd style={{ color: stockColor }}>{stockLabel}</dd>
          </div>
        )}
        {skuCount > 0 && (
          <div className="mp-pdp-inquiry-fact">
            <dt>Số lựa chọn sản phẩm</dt>
            <dd>{skuCount}</dd>
          </div>
        )}
      </dl>

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

      <ul className="mp-pdp-inquiry-trust">
        <li>Hỗ trợ in/thêu/OEM</li>
        <li>Giao hàng toàn quốc</li>
        <li>Tư vấn nguồn hàng B2B</li>
        <li>Không hiển thị giá công khai</li>
      </ul>
    </aside>
  );
}
