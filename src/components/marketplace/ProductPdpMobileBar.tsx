"use client";

import { CTA } from "@/lib/ctaConfig";

type Props = {
  onRequestQuote: () => void;
};

export default function ProductPdpMobileBar({ onRequestQuote }: Props) {
  return (
    <div className="pdp-mobile-action-bar" role="navigation" aria-label="Hành động sản phẩm">
      <button type="button" className="pdp-mobile-action-bar__btn pdp-mobile-action-bar__btn--quote" onClick={onRequestQuote}>
        Báo giá
      </button>
      <a href={CTA.primary.href} className="pdp-mobile-action-bar__btn pdp-mobile-action-bar__btn--dealer">
        Đại lý
      </a>
    </div>
  );
}
