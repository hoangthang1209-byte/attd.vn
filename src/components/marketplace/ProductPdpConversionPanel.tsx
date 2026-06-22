"use client";

import Link from "next/link";
import { formatPdpMoqValue, isPublicMoq } from "@/lib/formatMoq";
import { CTA } from "@/lib/ctaConfig";

type Props = {
  productName: string;
  productCode?: string | null;
  variantLabel?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  stockLabel?: string | null;
  stockColor?: string;
  onRequestQuote: () => void;
};

export default function ProductPdpConversionPanel({
  productName,
  productCode,
  variantLabel,
  moq,
  leadTime,
  stockLabel,
  stockColor = "#16a34a",
  onRequestQuote,
}: Props) {
  return (
    <aside className="product-detail-right">
      <div className="mp-inquiry-panel mp-pdp-inquiry-panel mp-pdp-inquiry-panel--float mp-product-inquiry-sticky">
        <div className="mp-pdp-inquiry-body">
          <div className="mp-pdp-inquiry-head">
            <p className="mp-pdp-inquiry-title">Nhận báo giá sản phẩm</p>
            <p className="mp-pdp-inquiry-lead">
              Gửi nhu cầu của bạn để ATTD tư vấn phương án nguồn hàng, MOQ và thời gian triển khai phù hợp.
            </p>
          </div>

          <dl className="mp-pdp-inquiry-facts">
            <div className="mp-pdp-inquiry-fact">
              <dt>Sản phẩm</dt>
              <dd>{productName}</dd>
            </div>
            {variantLabel && (
              <div className="mp-pdp-inquiry-fact">
                <dt>Biến thể</dt>
                <dd>{variantLabel}</dd>
              </div>
            )}
            {productCode && (
              <div className="mp-pdp-inquiry-fact">
                <dt>Mã / SKU</dt>
                <dd>{productCode}</dd>
              </div>
            )}
            {isPublicMoq(moq) && (
              <div className="mp-pdp-inquiry-fact">
                <dt>MOQ</dt>
                <dd>{formatPdpMoqValue(moq)}</dd>
              </div>
            )}
            {leadTime && (
              <div className="mp-pdp-inquiry-fact">
                <dt>Thời gian sản xuất</dt>
                <dd>{leadTime}</dd>
              </div>
            )}
            {stockLabel && (
              <div className="mp-pdp-inquiry-fact">
                <dt>Tình trạng hàng</dt>
                <dd style={{ color: stockColor }}>{stockLabel}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mp-pdp-inquiry-footer">
          <div className="mp-inquiry-actions">
            <button type="button" className="btn-primary mp-inquiry-btn" onClick={onRequestQuote}>
              Yêu cầu báo giá
            </button>
            <Link href={CTA.primary.href} className="btn-secondary mp-inquiry-btn">
              Đăng ký làm đại lý
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
