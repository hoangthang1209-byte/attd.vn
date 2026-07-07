"use client";

import Link from "next/link";
import { formatPdpMoqValue, isPublicMoq } from "@/lib/formatMoq";
import { CTA } from "@/lib/ctaConfig";
import ManufacturingEvidenceStrip from "@/components/public/manufacturing/ManufacturingEvidenceStrip";
import PublicContactChannels from "@/components/public/PublicContactChannels";
import ProcessTrustBlock from "@/components/public/trust/ProcessTrustBlock";
import { PDP_CONVERSION_POINTS } from "@/lib/b2b-trust-v2-copy";
import { getManufacturingEvidenceForSurface } from "@/lib/manufacturing-library.config";
import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";

type Props = {
  productName: string;
  productCode?: string | null;
  variantLabel?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  stockLabel?: string | null;
  stockColor?: string;
  optionSummary?: string | null;
  onRequestQuote: () => void;
  manufacturingEvidenceItems?: readonly ManufacturingEvidenceItem[];
};

export default function ProductPdpConversionPanel({
  productName,
  productCode,
  variantLabel,
  moq,
  leadTime,
  stockLabel,
  stockColor = "#16a34a",
  optionSummary,
  onRequestQuote,
  manufacturingEvidenceItems,
}: Props) {
  const pdpEvidence =
    manufacturingEvidenceItems ??
    getManufacturingEvidenceForSurface("pdp", { limit: 2 });

  return (
    <aside className="product-detail-right mp-pdp-conversion-aside" aria-label="Yêu cầu báo giá">
      <div className="mp-pdp-conversion-card">
        <div className="mp-pdp-conversion-head">
          <p className="mp-pdp-conversion-kicker">Báo giá B2B</p>
          <h2 className="mp-pdp-conversion-title">Yêu cầu báo giá</h2>
          <p className="mp-pdp-conversion-lead">
            Gửi số lượng, logo và thời gian cần hàng để ATTD tư vấn phương án phù hợp.
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
          {optionSummary && (
            <div className="mp-pdp-conversion-fact mp-pdp-conversion-fact--selected-options">
              <dt>Đang chọn</dt>
              <dd>{optionSummary}</dd>
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
            Yêu cầu báo giá
          </button>
          <Link
            href={CTA.primary.href}
            className="mp-pdp-conversion-dealer-link"
          >
            Đăng ký làm đại lý
          </Link>
        </div>

        <ProcessTrustBlock
          steps={PDP_CONVERSION_POINTS}
          ordered={false}
          variant="compact"
          className="mp-pdp-conversion-trust"
        />

        <PublicContactChannels compact className="mp-pdp-conversion-contact" />

        <ManufacturingEvidenceStrip
          title="Tại ATTD"
          items={pdpEvidence}
          className="mp-pdp-manufacturing-gallery"
        />
      </div>
    </aside>
  );
}
