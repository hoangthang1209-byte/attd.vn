"use client";

type Props = {
  open: boolean;
  previewText: string;
  theoreticalCount: number;
  existingCount: number;
  missingCount: number;
  missingCombinations: Array<{ displayLabel: string }>;
  requiresWarning: boolean;
  requiresConfirmation: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function VariantMatrixConfirmDialog({
  open,
  previewText,
  theoreticalCount,
  existingCount,
  missingCount,
  missingCombinations,
  requiresWarning,
  requiresConfirmation,
  submitting = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="admin-modal admin-modal--md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-matrix-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id="variant-matrix-confirm-title">Tạo tổ hợp biến thể</h3>
          <button type="button" className="admin-modal-close" onClick={onCancel} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="admin-modal-body">
          <p className="admin-field-hint">{previewText}</p>
          <dl className="admin-matrix-preview-stats">
            <div>
              <dt>Tổ hợp lý thuyết</dt>
              <dd>{theoreticalCount}</dd>
            </div>
            <div>
              <dt>Đã có</dt>
              <dd>{existingCount}</dd>
            </div>
            <div>
              <dt>Sẽ tạo mới</dt>
              <dd><strong>{missingCount}</strong></dd>
            </div>
          </dl>
          {requiresWarning && (
            <p className="admin-kb-warning-list" role="status">
              Ma trận lớn ({theoreticalCount} tổ hợp lý thuyết). Hãy kiểm tra trước khi tạo hàng loạt.
            </p>
          )}
          {requiresConfirmation && (
            <p className="admin-error" role="alert">
              Cần xác nhận vì sẽ tạo {missingCount} biến thể mới.
            </p>
          )}
          {missingCombinations.length > 0 && (
            <div className="admin-matrix-preview-list-wrap">
              <p className="admin-field-hint">Xem trước tổ hợp sẽ tạo:</p>
              <ul className="admin-matrix-preview-list">
                {missingCombinations.map((combo) => (
                  <li key={combo.displayLabel}>{combo.displayLabel}</li>
                ))}
              </ul>
              {missingCount > missingCombinations.length && (
                <p className="admin-field-hint">
                  … và {missingCount - missingCombinations.length} tổ hợp khác.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Hủy
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Đang tạo…" : `Tạo ${missingCount} biến thể`}
          </button>
        </div>
      </div>
    </div>
  );
}
