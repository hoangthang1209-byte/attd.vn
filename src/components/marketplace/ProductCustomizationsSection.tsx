"use client";

import type { ProductCustomizationRow } from "@/features/products/product-detail.types";

type Props = {
  items: ProductCustomizationRow[];
  onRequestQuote?: () => void;
};

export default function ProductCustomizationsSection({ items, onRequestQuote }: Props) {
  if (!items.length) return null;

  return (
    <section className="mp-section mp-section--alt mp-section--compact" id="mp-pdp-custom">
      <div className="container">
        <h2 className="mp-section-title">Khả năng tùy chỉnh</h2>
        <ul className="mp-pdp-custom-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              {item.description ? <span>{item.description}</span> : null}
            </li>
          ))}
        </ul>
        {onRequestQuote ? (
          <button type="button" className="btn-secondary mp-pdp-custom-cta" onClick={onRequestQuote}>
            Yêu cầu báo giá theo tùy chỉnh
          </button>
        ) : null}
      </div>
    </section>
  );
}
