"use client";

import { useMemo, useState } from "react";
import {
  COST_LIBRARY_CATEGORY_LABELS,
  type CostLibraryCategory,
  type CostLibraryItem,
} from "@/features/pricing/cost-library";
import { formatPricingCurrency } from "@/features/pricing/format";

type Props = {
  open: boolean;
  items: CostLibraryItem[];
  onClose: () => void;
  onPickLibraryItem: (itemId: string) => void;
  onOpenCustomForm: () => void;
};

const CATEGORY_ORDER: Array<CostLibraryCategory | "ALL"> = [
  "ALL",
  "PRINTING",
  "EMBROIDERY",
  "SEWING",
  "CUTTING",
  "FINISHING",
  "PACKAGING",
  "LOGISTICS",
  "ACCESSORY",
  "OTHER",
];

export default function CostingCostPicker({
  open,
  items,
  onClose,
  onPickLibraryItem,
  onOpenCustomForm,
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CostLibraryCategory | "ALL">("ALL");

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi-VN");
    return items.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (!query) return true;
      return item.name.toLocaleLowerCase("vi-VN").includes(query);
    });
  }, [category, items, search]);

  if (!open) return null;

  return (
    <div className="costing-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="costing-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costing-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="costing-picker__header">
          <h3 id="costing-picker-title" className="costing-picker__title">Thêm chi phí</h3>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onClose}>
            Đóng
          </button>
        </div>

        <input
          className="admin-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm chi phí..."
          autoFocus
        />

        <div className="costing-picker__chips">
          {CATEGORY_ORDER.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`costing-picker__chip${category === chip ? " is-active" : ""}`}
              onClick={() => setCategory(chip)}
            >
              {chip === "ALL" ? "Tất cả" : COST_LIBRARY_CATEGORY_LABELS[chip]}
            </button>
          ))}
        </div>

        <div className="costing-picker__list">
          {filtered.length === 0 ? (
            <p className="admin-field-hint">Không tìm thấy chi phí phù hợp.</p>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="costing-picker__row">
                <div className="costing-picker__row-main">
                  <strong>{item.name}</strong>
                  <span className="admin-field-hint">
                    {COST_LIBRARY_CATEGORY_LABELS[item.category]}
                  </span>
                </div>
                <div className="costing-picker__row-actions">
                  <span className="costing-picker__price">{formatPricingCurrency(item.defaultUnitCost)}</span>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--xs"
                    onClick={() => {
                      onPickLibraryItem(item.id);
                      onClose();
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="costing-picker__footer">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onOpenCustomForm}>
            + Chi phí tùy chỉnh
          </button>
        </div>
      </div>
    </div>
  );
}
