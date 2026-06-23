"use client";

import Link from "next/link";
import { FileText, Handshake } from "lucide-react";
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
    <aside className="product-detail-right mp-pdp-conversion-aside" aria-label="Yêu cầu báo giá">
      <div className="mp-pdp-conversion-card">
        <div className="mp-pdp-conversion-head">
          <p className="mp-pdp-conversion-kicker">Báo giá B2B</p>
          <h2 className="mp-pdp-conversion-title">Nhận báo giá sản phẩm</h2>
          <p className="mp-pdp-conversion-lead">
            Gửi nhu cầu để ATTD tư vấn phương án nguồn hàng, MOQ và thời gian triển khai phù hợp.
          </p>
        </div>

        <dl className="mp-pdp-conversion-facts">
          <div className="mp-pdp-conversion-fact">
            <dt>Sản phẩm</dt>
            <dd>{productName}</dd>
          </div>
          {variantLabel && (
            <div className="mp-pdp-conversion-fact">
              <dt>Biến thể</dt>
              <dd>{variantLabel}</dd>
            </div>
          )}
          {productCode && (
            <div className="mp-pdp-conversion-fact">
              <dt>Mã / SKU</dt>
              <dd>{productCode}</dd>
            </div>
          )}
          {isPublicMoq(moq) && (
            <div className="mp-pdp-conversion-fact">
              <dt>MOQ</dt>
              <dd>{formatPdpMoqValue(moq)}</dd>
            </div>
          )}
          {leadTime && (
            <div className="mp-pdp-conversion-fact">
              <dt>Thời gian sản xuất</dt>
              <dd>{leadTime}</dd>
            </div>
          )}
          {stockLabel && (
            <div className="mp-pdp-conversion-fact">
              <dt>Tình trạng hàng</dt>
              <dd style={{ color: stockColor }}>{stockLabel}</dd>
            </div>
          )}
        </dl>

        <div className="mp-pdp-conversion-actions">
          <button
            type="button"
            className="btn-primary mp-pdp-conversion-btn mp-pdp-conversion-btn--primary"
            onClick={onRequestQuote}
          >
            <FileText size={18} aria-hidden />
            Yêu cầu báo giá
          </button>
          <Link
            href={CTA.primary.href}
            className="btn-secondary mp-pdp-conversion-btn mp-pdp-conversion-btn--secondary"
          >
            <Handshake size={18} aria-hidden />
            Đăng ký làm đại lý
          </Link>
        </div>
      </div>
    </aside>
  );
}
