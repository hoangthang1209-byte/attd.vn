"use client";

import { useEffect, useState } from "react";
import { formatOrderDate } from "@/features/orders/order-format";
import type { TechPackSourceItem } from "@/features/tech-pack/tech-pack.types";

type Props = {
  sourceType: "order-item" | "quote-item";
  selectedId: string;
  onSelect: (item: TechPackSourceItem | null) => void;
};

export default function TechPackSourceItemSelector({ sourceType, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<TechPackSourceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("type", sourceType);
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "25");
      void fetch(`/api/tech-packs/source-items?${params.toString()}`)
        .then((r) => r.json())
        .then((data: { items?: TechPackSourceItem[] }) => setItems(data.items ?? []))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, sourceType]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const label =
    sourceType === "order-item" ? "Chọn hạng mục đơn hàng" : "Chọn hạng mục báo giá";

  return (
    <div className="tech-pack-source-selector">
      <label className="admin-field">
        <span>{label}</span>
        <input
          className="admin-input"
          placeholder={
            sourceType === "order-item"
              ? "Tìm mã đơn, khách hàng, sản phẩm, SKU…"
              : "Tìm mã báo giá, khách hàng, sản phẩm…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {loading && <p className="admin-field-hint">Đang tìm…</p>}
      <ul className="tech-pack-source-selector__list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`tech-pack-source-selector__item${selectedId === item.id ? " is-selected" : ""}`}
              onClick={() => onSelect(item)}
            >
              <strong>
                {item.parentCode} / {item.productName ?? "—"}
              </strong>
              <span className="tech-pack-source-selector__meta">
                {item.customerName && <span>{item.customerName}</span>}
                {item.sku && <span>SKU: {item.sku}</span>}
                {item.color && <span>Màu: {item.color}</span>}
                {item.size && <span>Size: {item.size}</span>}
                <span>SL: {item.quantity}</span>
                {item.deadline && <span>Deadline: {formatOrderDate(item.deadline)}</span>}
                {item.hasTechPack && (
                  <span className="order-workspace-badge">Đã có Tech Pack v{item.latestTechPackVersion}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="tech-pack-source-selector__preview admin-message admin-message--info">
          <p>
            <strong>{selected.parentCode}</strong> · {selected.customerName ?? "—"} ·{" "}
            {selected.productName ?? "—"}
          </p>
          <p className="admin-field-hint">
            SKU: {selected.sku ?? "—"} · Màu: {selected.color ?? "—"} · Size: {selected.size ?? "—"} · SL:{" "}
            {selected.quantity}
          </p>
        </div>
      )}
    </div>
  );
}
