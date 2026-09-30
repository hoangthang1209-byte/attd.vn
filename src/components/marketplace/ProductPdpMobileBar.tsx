"use client";

import { getZaloUrl } from "@/lib/companyInfo";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import { trackPdpMobileZaloClicked } from "@/lib/analytics";

type Props = {
  productSlug: string;
  onRequestQuote: () => void;
  attentionKey?: number;
  isQuoteReady?: boolean;
};

export default function ProductPdpMobileBar({
  productSlug,
  onRequestQuote,
  attentionKey = 0,
  isQuoteReady = false,
}: Props) {

  return (
    <div className="pdp-mobile-action-bar" role="navigation" aria-label="Hành động sản phẩm">
      <button
        key={attentionKey}
        type="button"
        className={[
          "pdp-mobile-action-bar__btn pdp-mobile-action-bar__btn--quote",
          isQuoteReady ? "pdp-mobile-action-bar__btn--quote-active" : "",
          attentionKey > 0 ? "pdp-mobile-action-bar__btn--attention" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onRequestQuote}
      >
        Yêu cầu báo giá
      </button>
      <TrackedAnchor
        href={getZaloUrl()}
        trackEvent="contact_zalo"
        trackSource="pdp_mobile_bar"
        target="_blank"
        rel="noopener noreferrer"
        className="pdp-mobile-action-bar__btn pdp-mobile-action-bar__btn--zalo"
        onClick={() => trackPdpMobileZaloClicked(productSlug)}
      >
        Zalo
      </TrackedAnchor>
    </div>
  );
}
