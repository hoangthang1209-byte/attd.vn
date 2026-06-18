import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import ProductInquiryMiniForm from "@/components/marketplace/ProductInquiryMiniForm";
import { getZaloUrl } from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";

type ProductInquiryPanelProps = {
  stockLabel?: string | null;
  stockColor?: string;
  productName?: string;
  productCode?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  stockQty?: number | null;
  skuCount?: number;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  showMiniForm?: boolean;
};

function serviceSummary(
  printing?: boolean,
  embroidery?: boolean,
  oem?: boolean
): string | null {
  const parts: string[] = [];
  if (printing) parts.push("in logo");
  if (embroidery) parts.push("thêu");
  if (oem) parts.push("OEM");
  return parts.length ? parts.join(" · ") : null;
}

export default function ProductInquiryPanel({
  stockLabel,
  stockColor = "#16a34a",
  productName,
  productCode,
  defaultMoq,
  leadTime,
  stockQty,
  skuCount = 0,
  supportsPrinting,
  supportsEmbroidery,
  supportsOem,
  showMiniForm = true,
}: ProductInquiryPanelProps) {
  const quoteHref = productName
    ? `/lien-he?product=${encodeURIComponent(productName)}${
        productCode ? `&code=${encodeURIComponent(productCode)}` : ""
      }`
    : "/lien-he";
  const services = serviceSummary(supportsPrinting, supportsEmbroidery, supportsOem);

  return (
    <aside className="mp-inquiry-panel mp-pdp-inquiry-panel mp-pdp-inquiry-panel--float mp-product-inquiry-sticky">
      <div className="mp-pdp-inquiry-body">
        <div className="mp-pdp-inquiry-head">
          <p className="mp-pdp-inquiry-title">Nhận báo giá sỉ từ ATTD</p>
          <p className="mp-pdp-inquiry-lead">
            Giá thay đổi theo số lượng, tồn kho và yêu cầu in/thêu/OEM.
          </p>
        </div>

        <dl className="mp-pdp-inquiry-facts">
          {productCode && (
            <div className="mp-pdp-inquiry-fact">
              <dt>Mã sản phẩm</dt>
              <dd>{productCode}</dd>
            </div>
          )}
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
          {stockQty != null && stockQty > 0 && (
            <div className="mp-pdp-inquiry-fact">
              <dt>Tồn kho tham khảo</dt>
              <dd>{stockQty}</dd>
            </div>
          )}
          {services && (
            <div className="mp-pdp-inquiry-fact">
              <dt>Hỗ trợ in/thêu/OEM</dt>
              <dd>{services}</dd>
            </div>
          )}
        </dl>

        {showMiniForm && <ProductInquiryMiniForm productName={productName} />}
      </div>

      <div className="mp-pdp-inquiry-footer">
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
          <li>Báo giá theo số lượng</li>
          <li>Không hiển thị giá công khai</li>
          <li>Hỗ trợ đại lý/agency/xưởng in</li>
          <li>Giao hàng toàn quốc</li>
        </ul>
      </div>
    </aside>
  );
}
