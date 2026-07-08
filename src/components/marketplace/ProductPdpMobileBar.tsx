"use client";

import Link from "next/link";
import { getZaloUrl } from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import { trackPdpMobileZaloClicked } from "@/lib/analytics";

type Props = {
  productSlug: string;
  onRequestQuote: () => void;
};

export default function ProductPdpMobileBar({ productSlug, onRequestQuote }: Props) {
  return (
    <div className="pdp-mobile-action-bar" role="navigation" aria-label="Hành động sản phẩm">
      <button type="button" className="pdp-mobile-action-bar__btn pdp-mobile-action-bar__btn--quote" onClick={onRequestQuote}>
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
      <TrackedLink
        href={CTA.primary.href}
        trackEvent="dealer_registration_click"
        trackSource="pdp_mobile_bar"
        className="pdp-mobile-action-bar__btn pdp-mobile-action-bar__btn--dealer"
      >
        Đại lý
      </TrackedLink>
    </div>
  );
}
