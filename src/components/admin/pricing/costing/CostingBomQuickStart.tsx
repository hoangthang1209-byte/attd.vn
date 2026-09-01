"use client";

import { useMemo, useState } from "react";
import { formatPricingCurrency } from "@/features/pricing/format";
import {
  COSTING_BOM_PRESETS,
  COSTING_BOM_PRESET_CATEGORY_LABELS,
  type CostingBomPresetCategory,
} from "@/features/pricing/costing-bom-presets";
import { COSTING_TEMPLATES } from "@/features/pricing/costing-templates";

type Props = {
  open: boolean;
  onClose: () => void;
  onApplyTemplate: (templateKey: string) => void;
  onApplyBomPreset: (presetKey: string) => void;
};

export default function CostingBomQuickStart({
  open,
  onClose,
  onApplyTemplate,
  onApplyBomPreset,
}: Props) {
  const [bomCategory, setBomCategory] = useState<CostingBomPresetCategory | "ALL">("ALL");
  const [templateKey, setTemplateKey] = useState(COSTING_TEMPLATES[0]?.key ?? "");
  const [bomKey, setBomKey] = useState(COSTING_BOM_PRESETS[0]?.key ?? "");

  const filteredBom = useMemo(
    () =>
      COSTING_BOM_PRESETS.filter((preset) =>
        bomCategory === "ALL" ? true : preset.category === bomCategory,
      ),
    [bomCategory],
  );

  const selectedTemplate = COSTING_TEMPLATES.find((t) => t.key === templateKey);
  const selectedBom = COSTING_BOM_PRESETS.find((p) => p.key === bomKey);

  if (!open) return null;

  return (
    <div className="costing-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="costing-picker costing-picker--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costing-quickstart-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="costing-picker__header">
          <h3 id="costing-quickstart-title" className="costing-picker__title">Bắt đầu nhanh từ mẫu</h3>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onClose}>
            Đóng
          </button>
        </div>

        <fieldset className="admin-catalog-fieldset">
          <legend>Mẫu costing nhanh</legend>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Mẫu</label>
              <select className="admin-input" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
                {COSTING_TEMPLATES.map((template) => (
                  <option key={template.key} value={template.key}>{template.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <p className="admin-field-hint" style={{ marginTop: 8 }}>
                {selectedTemplate?.description ?? "Áp dụng giá trị mặc định cho toàn bộ costing."}
              </p>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={!selectedTemplate}
                onClick={() => {
                  onApplyTemplate(templateKey);
                  onClose();
                }}
              >
                Áp dụng mẫu
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-catalog-fieldset">
          <legend>BOM preset</legend>
          <p className="admin-field-hint">Thêm dòng chi phí từ preset — có thể sửa sau khi áp dụng.</p>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Danh mục</label>
              <select
                className="admin-input"
                value={bomCategory}
                onChange={(e) => {
                  const next = e.target.value as CostingBomPresetCategory | "ALL";
                  setBomCategory(next);
                  const nextPresets = COSTING_BOM_PRESETS.filter((p) =>
                    next === "ALL" ? true : p.category === next,
                  );
                  if (!nextPresets.some((p) => p.key === bomKey)) {
                    setBomKey(nextPresets[0]?.key ?? "");
                  }
                }}
              >
                <option value="ALL">Tất cả</option>
                {(Object.keys(COSTING_BOM_PRESET_CATEGORY_LABELS) as CostingBomPresetCategory[]).map(
                  (category) => (
                    <option key={category} value={category}>
                      {COSTING_BOM_PRESET_CATEGORY_LABELS[category]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Preset</label>
              <select className="admin-input" value={bomKey} onChange={(e) => setBomKey(e.target.value)}>
                {filteredBom.map((preset) => (
                  <option key={preset.key} value={preset.key}>{preset.name}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedBom && (
            <ul className="admin-field-hint" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {selectedBom.items.map((item) => (
                <li key={`${selectedBom.key}-${item.label}`}>
                  {item.label} · {formatPricingCurrency(item.unitCost)}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            style={{ marginTop: 12 }}
            disabled={!selectedBom}
            onClick={() => {
              onApplyBomPreset(bomKey);
              onClose();
            }}
          >
            Áp dụng BOM preset
          </button>
        </fieldset>
      </div>
    </div>
  );
}
