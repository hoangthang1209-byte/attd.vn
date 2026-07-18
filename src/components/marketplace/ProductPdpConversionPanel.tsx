"use client";

import TrackedLink from "@/components/analytics/TrackedLink";
import { formatPdpMoqValue, isPublicMoq } from "@/lib/formatMoq";
import { CTA } from "@/lib/ctaConfig";
import { BadgeCheck, Calculator, PackageCheck, Printer, Scissors } from "lucide-react";

export type ProductPdpCapability = {
  key: string;
  title: string;
  description: string;
};

type Props = {
  productName: string;
  productCode?: string | null;
  variantLabel?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  stockLabel?: string | null;
  stockColor?: string;
  optionSummary?: string | null;
  capabilities?: ProductPdpCapability[];
  onRequestQuote: () => void;
  showFacts?: boolean;
  showCapabilities?: boolean;
  className?: string;
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
  capabilities = [],
  onRequestQuote,
  showFacts = true,
  showCapabilities = true,
  className,
}: Props) {
  return (
    <aside
      className={["product-detail-right mp-pdp-conversion-aside", className].filter(Boolean).join(" ")}
      aria-label="Yêu cầu báo giá"
    >
      <div className="mp-pdp-conversion-card">
        <div className="mp-pdp-conversion-head">
          <p className="mp-pdp-conversion-kicker">Báo giá B2B</p>
          <h2 className="mp-pdp-conversion-title">Yêu cầu báo giá</h2>
          <p className="mp-pdp-conversion-lead">
            Gửi số lượng, logo và thời gian cần hàng để ATTD tư vấn phương án phù hợp.
          </p>
        </div>

        {showFacts && (
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
        )}

        {showCapabilities && <ProductPdpCapabilityGrid capabilities={capabilities} />}

        <div className="mp-pdp-conversion-actions">
          <button
            type="button"
            className="btn-primary mp-pdp-conversion-btn mp-pdp-conversion-btn--primary"
            onClick={onRequestQuote}
          >
            Yêu cầu báo giá
          </button>
          <TrackedLink
            href={CTA.primary.href}
            trackEvent="dealer_registration_click"
            trackSource="pdp_conversion_panel"
            className="mp-pdp-conversion-dealer-link"
          >
            Đăng ký làm đại lý
          </TrackedLink>
        </div>

      </div>
    </aside>
  );
}

export function ProductPdpCapabilityGrid({
  capabilities,
  className,
}: {
  capabilities: ProductPdpCapability[];
  className?: string;
}) {
  if (capabilities.length === 0) return null;

  return (
    <section
      className={["mp-pdp-conversion-capabilities", className].filter(Boolean).join(" ")}
      aria-label="Khả năng sản phẩm"
    >
      {capabilities.map((capability) => {
        const Icon = resolveCapabilityIcon(capability.title);
        return (
          <div key={capability.key} className="mp-pdp-conversion-capability">
            <Icon className="mp-pdp-conversion-capability-icon" aria-hidden="true" />
            <div>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function resolveCapabilityIcon(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("thêu")) return Scissors;
  if (normalized.includes("oem") || normalized.includes("private") || normalized.includes("label")) {
    return PackageCheck;
  }
  if (normalized.includes("giá") || normalized.includes("moq") || normalized.includes("số lượng")) {
    return Calculator;
  }
  if (normalized.includes("in") || normalized.includes("logo")) return Printer;
  return BadgeCheck;
}
