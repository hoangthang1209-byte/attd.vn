"use client";

import { useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  COST_LIBRARY_CATEGORY_LABELS,
  type CostLibraryCategory,
} from "@/features/pricing/cost-library";

export type CustomCostFormValues = {
  name: string;
  category: CostLibraryCategory;
  defaultUnitCost: string;
  note: string;
  saveToLibrary: boolean;
};

type Props = {
  open: boolean;
  busy: boolean;
  error: string | null;
  canSaveToLibrary: boolean;
  onClose: () => void;
  onSubmit: (values: CustomCostFormValues) => void;
};

const CATEGORY_OPTIONS: CostLibraryCategory[] = [
  "PRINTING",
  "EMBROIDERY",
  "SEWING",
  "CUTTING",
  "PACKAGING",
  "LOGISTICS",
  "ACCESSORY",
  "OTHER",
];

export default function CostingCustomCostForm({
  open,
  busy,
  error,
  canSaveToLibrary,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CostLibraryCategory>("OTHER");
  const [defaultUnitCost, setDefaultUnitCost] = useState("");
  const [note, setNote] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      category,
      defaultUnitCost,
      note,
      saveToLibrary: canSaveToLibrary && saveToLibrary,
    });
  }

  return (
    <div className="costing-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="costing-picker costing-picker--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costing-custom-cost-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="costing-picker__header">
          <h3 id="costing-custom-cost-title" className="costing-picker__title">Chi phí tùy chỉnh</h3>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onClose}>
            Đóng
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <form onSubmit={handleSubmit} className="costing-custom-cost-form">
          <div className="admin-field">
            <label className="admin-label">Tên chi phí</label>
            <input
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Ủi"
              required
              autoFocus
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại</label>
            <select
              className="admin-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as CostLibraryCategory)}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COST_LIBRARY_CATEGORY_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Cost mặc định / đơn vị</label>
            <input
              className="admin-input"
              type="number"
              min="0"
              step="1"
              value={defaultUnitCost}
              onChange={(e) => setDefaultUnitCost(e.target.value)}
              required
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Ghi chú</label>
            <input
              className="admin-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tùy chọn"
            />
          </div>

          {canSaveToLibrary && (
            <label className="costing-custom-cost-form__checkbox">
              <input
                type="checkbox"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
              />
              Lưu vào thư viện chi phí
            </label>
          )}

          <div className="costing-custom-cost-form__actions">
            <AdminLoadingButton
              type="submit"
              variant="primary"
              pending={busy}
              pendingLabel="Đang thêm…"
            >
              Thêm chi phí
            </AdminLoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
