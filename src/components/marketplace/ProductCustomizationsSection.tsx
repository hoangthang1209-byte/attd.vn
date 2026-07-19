"use client";

import type { ProductCustomizationRow } from "@/features/products/product-detail.types";

type Props = {
  items: ProductCustomizationRow[];
  onRequestQuote?: () => void;
};

export default function ProductCustomizationsSection({ items, onRequestQuote }: Props) {
  if (!items.length) return null;

  return (
    <section className="mp-section mp-pdp-section mp-pdp-section--alt" id="mp-pdp-custom">
      <header className="mp-pdp-section-head">
        <h2 className="mp-pdp-section-title">Khả năng tùy chỉnh</h2>
        <p className="mp-pdp-section-subtitle">
          Các phương án in, thêu và OEM phù hợp đồng phục doanh nghiệp.
        </p>
      </header>

      <ul className="mp-pdp-custom-grid">
        {items.map((item, index) => (
          <li key={item.id} className="mp-pdp-custom-card">
            <span className="mp-pdp-custom-card-index" aria-hidden>
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="mp-pdp-custom-card-body">
              <strong className="mp-pdp-custom-card-label">{item.label}</strong>
              {item.description ? (
                <p className="mp-pdp-custom-card-desc">{item.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {onRequestQuote ? (
        <div className="mp-pdp-custom-cta-wrap">
          <button
            type="button"
            className="btn-secondary mp-pdp-custom-cta"
            onClick={onRequestQuote}
          >
            Yêu cầu báo giá theo tùy chỉnh
          </button>
        </div>
      ) : null}
    </section>
  );
}
