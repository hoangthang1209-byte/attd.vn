"use client";

import { useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import type { PatternSourceType, PatternStatus } from "@prisma/client";
import { formatPatternSourceLabel } from "@/features/patterns/pattern-source-labels";
import styles from "./PatternLibrary.module.css";

export type BulkEditablePattern = {
  id: string;
  code: string;
  name: string;
  status: PatternStatus;
  baseSize: string | null;
  sizeRange: string | null;
  sourceType: PatternSourceType | null;
};

type DraftRow = BulkEditablePattern;

type Props = {
  rows: BulkEditablePattern[];
  onClose: () => void;
  onSaved: () => void;
};

const SOURCE_OPTIONS: Array<{ value: PatternSourceType | ""; label: string }> = [
  { value: "", label: "Chưa chọn" },
  { value: "INTERNAL", label: formatPatternSourceLabel("INTERNAL") ?? "Nội bộ" },
  { value: "EXTERNAL_STUDIO", label: formatPatternSourceLabel("EXTERNAL_STUDIO") ?? "Phòng rập ngoài" },
  { value: "CUSTOMER", label: formatPatternSourceLabel("CUSTOMER") ?? "Khách hàng" },
  { value: "FACTORY", label: formatPatternSourceLabel("FACTORY") ?? "Xưởng / nhà máy" },
  { value: "OTHER", label: formatPatternSourceLabel("OTHER") ?? "Khác" },
];

function normalize(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function rowChanged(original: BulkEditablePattern, draft: DraftRow): boolean {
  return (
    original.code !== draft.code ||
    original.name !== draft.name ||
    normalize(original.baseSize) !== normalize(draft.baseSize) ||
    normalize(original.sizeRange) !== normalize(draft.sizeRange) ||
    original.sourceType !== draft.sourceType
  );
}

export default function PatternBulkEditDialog({ rows, onClose, onSaved }: Props) {
  const [drafts, setDrafts] = useState<DraftRow[]>(() => rows.map((row) => ({ ...row })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changedCount = useMemo(
    () =>
      drafts.filter((draft) => {
        const original = rows.find((row) => row.id === draft.id);
        return original ? rowChanged(original, draft) : false;
      }).length,
    [drafts, rows],
  );

  function updateDraft(id: string, patch: Partial<DraftRow>) {
    setDrafts((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function saveAll() {
    if (saving || changedCount === 0) return;
    setSaving(true);
    setError(null);

    const changedRows = drafts.filter((draft) => {
      const original = rows.find((row) => row.id === draft.id);
      return original ? rowChanged(original, draft) : false;
    });

    const failures: string[] = [];
    let saved = 0;

    for (const row of changedRows) {
      try {
        const payload =
          row.status === "DRAFT"
            ? {
                code: row.code.trim().toUpperCase(),
                name: row.name.trim(),
                baseSize: normalize(row.baseSize) || null,
                sizeRange: normalize(row.sizeRange) || null,
                sourceType: row.sourceType,
              }
            : {
                code: row.code.trim().toUpperCase(),
              };

        const response = await fetch(`/api/patterns/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        if (!response.ok) {
          failures.push(
            `${row.code}: ${data.message ?? data.error ?? "Không thể cập nhật"}`,
          );
          continue;
        }
        saved += 1;
      } catch {
        failures.push(`${row.code}: lỗi kết nối`);
      }
    }

    if (failures.length > 0) {
      setError(`Đã lưu ${saved}/${changedRows.length} rập. ${failures.join(" · ")}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Sửa rập hàng loạt"
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Sửa rập hàng loạt</h3>
            <p className={styles.modalDescription}>
              Chỉnh thông tin của các rập đã chọn rồi lưu một lần. Với rập đã duyệt/lưu trữ, chỉ mã rập được phép sửa; hãy đổi trạng thái về Bản nháp nếu cần sửa thông tin kỹ thuật.
            </p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Đóng"
            disabled={saving}
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <p className="admin-error">{error}</p>}

          <div className={styles.bulkEditWrap}>
            <table className={styles.bulkEditTable}>
              <thead>
                <tr>
                  <th>Mã rập</th>
                  <th>Tên rập</th>
                  <th>Base size</th>
                  <th>Dải size</th>
                  <th>Nguồn</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        className="admin-input"
                        value={row.code}
                        onChange={(event) => updateDraft(row.id, { code: event.target.value.toUpperCase() })}
                      />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        value={row.name}
                        disabled={row.status !== "DRAFT"}
                        title={row.status !== "DRAFT" ? "Đổi về Bản nháp trước để sửa thông tin kỹ thuật." : undefined}
                        onChange={(event) =>
                          updateDraft(row.id, { name: event.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        value={row.baseSize ?? ""}
                        disabled={row.status !== "DRAFT"}
                        onChange={(event) =>
                          updateDraft(row.id, { baseSize: event.target.value })
                        }
                        placeholder="M"
                      />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        value={row.sizeRange ?? ""}
                        disabled={row.status !== "DRAFT"}
                        onChange={(event) =>
                          updateDraft(row.id, { sizeRange: event.target.value })
                        }
                        placeholder="S-3XL"
                      />
                    </td>
                    <td>
                      <select
                        className="admin-select"
                        value={row.sourceType ?? ""}
                        disabled={row.status !== "DRAFT"}
                        onChange={(event) =>
                          updateDraft(row.id, {
                            sourceType: (event.target.value || null) as PatternSourceType | null,
                          })
                        }
                      >
                        {SOURCE_OPTIONS.map((option) => (
                          <option key={option.value || "empty"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <span className={styles.footerHint}>
            {rows.length} rập đã chọn · {changedCount} rập có thay đổi
          </span>
          <div className={styles.footerActions}>
            <button
              type="button"
              className="admin-btn"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => void saveAll()}
              disabled={saving || changedCount === 0}
            >
              <Save size={14} />
              &nbsp;{saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
