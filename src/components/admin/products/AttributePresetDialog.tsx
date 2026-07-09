"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { CardGridLoading } from "@/components/ui/loading/ContextLoading";

type PresetSummary = {
  key: string;
  name: string;
  description: string;
  icon: string;
  valueCount: number;
  isVariantAttribute: boolean;
  isSpecificationAttribute: boolean;
  displayType: string;
  attributeCode: string;
};

type PresetValuePreview = {
  key: string;
  name: string;
  code: string;
  slug: string;
  hexCode?: string | null;
  sortOrder: number;
  state: "new" | "exists-active" | "exists-inactive" | "not-selected";
  existingValueId?: string;
};

type PresetPreview = {
  presetKey: string;
  presetName: string;
  attributeConflict: {
    id: string;
    name: string;
    code: string;
    slug: string;
  } | null;
  values: PresetValuePreview[];
  summary: {
    selectedCount: number;
    newCount: number;
    existingActiveCount: number;
    existingInactiveCount: number;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (attributeId: string, message: string) => void;
  onOpenExisting: (attributeId: string) => void;
};

const STEPS = ["Chọn bộ mặc định", "Xem lại giá trị", "Tạo thuộc tính"] as const;

export default function AttributePresetDialog({ open, onClose, onSuccess, onOpenExisting }: Props) {
  const [step, setStep] = useState(1);
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [selectedValueKeys, setSelectedValueKeys] = useState<string[]>([]);
  const [valueNameEdits, setValueNameEdits] = useState<Record<string, string>>({});
  const [advancedCodes, setAdvancedCodes] = useState(false);
  const [preview, setPreview] = useState<PresetPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.key === selectedPresetKey) ?? null,
    [presets, selectedPresetKey],
  );

  const resetState = useCallback(() => {
    setStep(1);
    setSelectedPresetKey(null);
    setSelectedValueKeys([]);
    setValueNameEdits({});
    setAdvancedCodes(false);
    setPreview(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      resetState();
      setLoadingPresets(true);
      void fetch("/api/admin/attributes/presets")
        .then((res) => res.json() as Promise<{ presets?: PresetSummary[] }>)
        .then((data) => setPresets(Array.isArray(data.presets) ? data.presets : []))
        .catch(() => setPresets([]))
        .finally(() => setLoadingPresets(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, resetState]);

  async function loadPreview(presetKey: string, valueKeys: string[], nameEdits: Record<string, string>) {
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/attributes/presets/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetKey,
          selectedValueKeys: valueKeys,
          valueNameEdits: nameEdits,
          previewOnly: true,
        }),
      });
      const data = await res.json() as { preview?: PresetPreview; message?: string };
      if (!res.ok || !data.preview) {
        setError(data.message ?? "Không thể tải xem trước bộ mặc định.");
        return null;
      }
      setPreview(data.preview);
      return data.preview;
    } catch {
      setError("Không thể tải xem trước bộ mặc định.");
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }

  async function goToReview() {
    if (!selectedPresetKey) return;
    const initialPreview = await loadPreview(selectedPresetKey, [], {});
    if (!initialPreview) return;
    const allKeys = initialPreview.values.map((value) => value.key);
    setSelectedValueKeys(allKeys);
    await loadPreview(selectedPresetKey, allKeys, valueNameEdits);
    setStep(2);
  }

  async function refreshPreview(keys: string[], edits: Record<string, string>) {
    if (!selectedPresetKey) return;
    await loadPreview(selectedPresetKey, keys, edits);
  }

  function toggleValue(key: string) {
    setSelectedValueKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      void refreshPreview(next, valueNameEdits);
      return next;
    });
  }

  function updateValueName(key: string, name: string) {
    const nextEdits = { ...valueNameEdits, [key]: name };
    setValueNameEdits(nextEdits);
    void refreshPreview(selectedValueKeys, nextEdits);
  }

  async function applyPreset(mergeMode: "create" | "add-missing-values") {
    if (!selectedPresetKey || selectedValueKeys.length === 0) {
      setError("Chọn ít nhất một giá trị trước khi tạo.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/attributes/presets/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetKey: selectedPresetKey,
          selectedValueKeys,
          valueNameEdits,
          mergeMode,
        }),
      });
      const data = await res.json() as {
        message?: string;
        attributeId?: string;
        conflict?: boolean;
        existingAttributeId?: string;
      };

      if (res.status === 409 && data.conflict && data.existingAttributeId) {
        setPreview((current) => current
          ? {
              ...current,
              attributeConflict: {
                id: data.existingAttributeId!,
                name: selectedPreset?.name ?? current.presetName,
                code: selectedPreset?.attributeCode ?? "",
                slug: "",
              },
            }
          : current);
        setStep(3);
        setError(data.message ?? "Thuộc tính đã tồn tại.");
        return;
      }

      if (!res.ok) {
        setError(data.message ?? "Không thể tạo thuộc tính từ bộ mặc định.");
        return;
      }

      onSuccess(String(data.attributeId), data.message ?? "Đã tạo thuộc tính.");
      onClose();
    } catch {
      setError("Không thể tạo thuộc tính từ bộ mặc định.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasAttributeConflict = Boolean(preview?.attributeConflict);

  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-modal admin-modal--wide admin-attribute-preset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attribute-preset-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <h3 id="attribute-preset-title">Tạo từ bộ mặc định</h3>
            <div className="admin-attribute-preset-steps" aria-label="Tiến trình">
              {STEPS.map((label, index) => (
                <span
                  key={label}
                  className={`admin-attribute-preset-step${step === index + 1 ? " admin-attribute-preset-step--active" : step > index + 1 ? " admin-attribute-preset-step--done" : ""}`}
                >
                  {index + 1}. {label}
                </span>
              ))}
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}

        {step === 1 && (
          <div className="admin-modal-body">
            {loadingPresets ? (
              <CardGridLoading
                title="Đang tải bộ mặc định..."
                description="Hệ thống đang tải các mẫu thuộc tính có sẵn."
                tone="admin"
                cards={4}
              />
            ) : (
              <div className="admin-attribute-preset-grid">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`admin-attribute-preset-card${selectedPresetKey === preset.key ? " admin-attribute-preset-card--selected" : ""}`}
                    onClick={() => setSelectedPresetKey(preset.key)}
                  >
                    <div className="admin-attribute-preset-card-icon" aria-hidden>{preset.icon}</div>
                    <div className="admin-attribute-preset-card-body">
                      <strong>{preset.name}</strong>
                      <p>{preset.description}</p>
                      <span className="admin-field-hint">{preset.valueCount} giá trị mặc định · <code className="admin-catalog-code">{preset.attributeCode}</code></span>
                      <div className="admin-attribute-preset-badges">
                        {preset.isVariantAttribute && (
                          <span className="admin-kb-badge admin-kb-badge--verified">Dùng tạo biến thể</span>
                        )}
                        {preset.isSpecificationAttribute && (
                          <span className="admin-kb-badge">Dùng làm thông số</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && preview && (
          <div className="admin-modal-body">
            <div className="admin-attribute-preset-review-head">
              <div>
                <h4 className="admin-subtitle" style={{ margin: 0 }}>{selectedPreset?.name}</h4>
                <p className="admin-field-hint">
                  Chọn giá trị cần tạo. Mã thuộc tính: <code className="admin-catalog-code">{preview.attributeConflict?.code ?? selectedPreset?.attributeCode}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => setAdvancedCodes((value) => !value)}
              >
                {advancedCodes ? "Ẩn mã nâng cao" : "Chỉnh mã nâng cao"}
              </button>
            </div>

            {hasAttributeConflict && (
              <p className="admin-field-hint admin-attribute-preset-conflict-hint">
                Thuộc tính &quot;{preview.attributeConflict?.name}&quot; đã tồn tại. Ở bước tiếp theo bạn có thể mở thuộc tính hiện có hoặc bổ sung giá trị còn thiếu.
              </p>
            )}

            <div className="admin-attribute-preset-value-list">
              {preview.values.map((value) => {
                const selected = selectedValueKeys.includes(value.key);
                const displayName = valueNameEdits[value.key] ?? value.name;
                const stateLabel = value.state === "exists-active"
                  ? "Đã có"
                  : value.state === "exists-inactive"
                    ? "Đã có (ngừng)"
                    : value.state === "new"
                      ? "Mới"
                      : "";

                return (
                  <label
                    key={value.key}
                    className={`admin-attribute-preset-value-row${selected ? "" : " admin-attribute-preset-value-row--off"}${value.state === "exists-active" ? " admin-attribute-preset-value-row--exists" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleValue(value.key)}
                    />
                    <div className="admin-attribute-preset-value-main">
                      <input
                        className="admin-input admin-input--sm"
                        value={displayName}
                        onChange={(e) => updateValueName(value.key, e.target.value)}
                        disabled={!selected}
                      />
                      <div className="admin-attribute-preset-value-meta">
                        <code className="admin-catalog-code">{value.code}</code>
                        {advancedCodes && <span>{value.slug}</span>}
                        {value.hexCode && (
                          <span className="admin-attribute-preset-swatch" style={{ background: value.hexCode }} title={value.hexCode} />
                        )}
                        {stateLabel && <span className="admin-attribute-preset-state">{stateLabel}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="admin-field-hint">
              Đã chọn {preview.summary.selectedCount} giá trị · {preview.summary.newCount} mới · {preview.summary.existingActiveCount} đã có · {preview.summary.existingInactiveCount} ngừng sử dụng
            </p>
          </div>
        )}

        {step === 3 && preview && (
          <div className="admin-modal-body">
            {hasAttributeConflict ? (
              <>
                <p className="admin-error" role="alert">
                  Thuộc tính &quot;{preview.attributeConflict?.name}&quot; đã tồn tại.
                </p>
                <p className="admin-field-hint">
                  Sẽ bổ sung {preview.summary.newCount} giá trị mới trong số {preview.summary.selectedCount} giá trị đã chọn.
                </p>
              </>
            ) : (
              <>
                <p className="admin-field-hint">
                  Sắp tạo thuộc tính <strong>{selectedPreset?.name}</strong> với {preview.summary.newCount} giá trị mới
                  {preview.summary.existingActiveCount > 0 ? ` (${preview.summary.existingActiveCount} giá trị đã có sẽ được bỏ qua)` : ""}.
                </p>
              </>
            )}
          </div>
        )}

        <div className="admin-modal-footer" style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 1 && (
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setStep((current) => current - 1)}>
                Quay lại
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {step === 1 && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={!selectedPresetKey || loadingPresets}
                onClick={() => void goToReview()}
              >
                Tiếp tục
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={previewLoading || selectedValueKeys.length === 0}
                onClick={() => setStep(3)}
              >
                Tiếp tục
              </button>
            )}
            {step === 3 && preview && (
              <>
                {hasAttributeConflict && preview.attributeConflict && (
                  <>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => {
                        onOpenExisting(preview.attributeConflict!.id);
                        onClose();
                      }}
                    >
                      Mở thuộc tính hiện có
                    </button>
                    <AdminLoadingButton
                      variant="primary"
                      pending={submitting}
                      pendingLabel="Đang bổ sung giá trị..."
                      disabled={preview.summary.newCount === 0}
                      onClick={() => void applyPreset("add-missing-values")}
                    >
                      Bổ sung giá trị còn thiếu
                    </AdminLoadingButton>
                  </>
                )}
                {!hasAttributeConflict && (
                  <AdminLoadingButton
                    variant="primary"
                    pending={submitting}
                    pendingLabel="Đang tạo thuộc tính..."
                    disabled={preview.summary.newCount === 0}
                    onClick={() => void applyPreset("create")}
                  >
                    Tạo thuộc tính và giá trị
                  </AdminLoadingButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
