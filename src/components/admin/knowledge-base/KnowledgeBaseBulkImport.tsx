"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DuplicateBehavior,
  ImportExecuteResult,
  ImportPreviewResult,
  KnowledgeBaseImportJobRecord,
} from "@/features/knowledge-base/knowledge-base-import-types";
import {
  IMPORT_MAPPING_PRESETS,
  applyMappingPreset,
  guessColumnMapping,
} from "@/features/knowledge-base/knowledge-base-import-mapping";
import { IMPORT_TEMPLATES } from "@/features/knowledge-base/knowledge-base-import-templates";
import { parseImportFile } from "@/features/knowledge-base/knowledge-base-import-parser";
import { KB_IMPORT_FIELDS } from "@/features/knowledge-base/knowledge-base-import-types";
import {
  getEntryStatusLabel,
  getEntryTypeLabel,
} from "@/features/knowledge-base/knowledge-base-utils";

type Step = 1 | 2 | 3;

type Props = {
  onImported: () => void;
};

export default function KnowledgeBaseBulkImport({ onImported }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateBehavior, setDuplicateBehavior] = useState<DuplicateBehavior>("skip");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportExecuteResult | null>(null);
  const [history, setHistory] = useState<KnowledgeBaseImportJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/admin/knowledge-base/import/history");
    const data = await res.json();
    setHistory(Array.isArray(data.jobs) ? data.jobs : []);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseImportFile(file);
      setFilename(parsed.filename);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      const guessed = guessColumnMapping(parsed.headers);
      setMapping(guessed);
      setStep(2);
      setPreview(null);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được file");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(presetId: string) {
    setMapping(applyMappingPreset(headers, presetId));
  }

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/knowledge-base/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows, mapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Preview thất bại");
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function runImport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/knowledge-base/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows, mapping, duplicateBehavior, filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Import thất bại");
      setResult(data);
      setStep(3);
      void loadHistory();
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import thất bại");
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate(templateId: string, format: "csv" | "xlsx") {
    window.open(
      `/api/admin/knowledge-base/import/templates?type=${templateId}&format=${format}`,
      "_blank"
    );
  }

  function validationLabel(row: ImportPreviewResult["rows"][number]): string {
    if (row.issues.some((i) => i.level === "error")) return "Lỗi";
    if (row.issues.some((i) => i.level === "warning")) return "Cảnh báo";
    return "OK";
  }

  return (
    <div className="admin-kb-bulk-import">
      <div className="admin-kb-bulk-steps">
        <span className={step === 1 ? "is-active" : ""}>1. Chọn file</span>
        <span className={step === 2 ? "is-active" : ""}>2. Xem trước</span>
        <span className={step === 3 ? "is-active" : ""}>3. Import</span>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {step === 1 && (
        <div className="admin-kb-bulk-panel">
          <h3 className="admin-subtitle">Bulk Import — Nhập dữ liệu hàng loạt</h3>
          <p className="admin-field-hint">
            Hỗ trợ Excel (.xlsx), CSV và JSON. Dùng template mẫu để đảm bảo cột đúng định dạng.
          </p>

          <div className="admin-kb-template-downloads">
            <p className="admin-field-hint">Download Template</p>
            <div className="admin-kb-templates-grid">
              {IMPORT_TEMPLATES.map((template) => (
                <div key={template.id} className="admin-kb-template-actions">
                  <span>{template.label}</span>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => downloadTemplate(template.id, "csv")}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => downloadTemplate(template.id, "xlsx")}
                  >
                    XLSX
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-label">Chọn file (.xlsx, .csv, .json)</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="admin-input"
              disabled={loading}
              onChange={(e) => void handleFileChange(e)}
            />
          </div>
          {loading && <p className="admin-loading">Đang đọc file…</p>}
        </div>
      )}

      {step >= 2 && (
        <div className="admin-kb-bulk-panel">
          <p className="admin-field-hint">
            File: <strong>{filename}</strong> — {rawRows.length} dòng
          </p>

          <div className="admin-kb-mapping">
            <h4 className="admin-subtitle">Column Mapping</h4>
            <div className="admin-kb-presets">
              {IMPORT_MAPPING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={() => applyPreset(preset.id)}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="admin-kb-mapping-grid">
              {headers.map((header) => (
                <div key={header} className="admin-kb-mapping-row">
                  <span className="admin-kb-mapping-source">{header}</span>
                  <span>→</span>
                  <select
                    className="admin-input"
                    value={mapping[header] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Bỏ qua —</option>
                    {KB_IMPORT_FIELDS.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-kb-duplicate-behavior">
            <label className="admin-label">Xử lý trùng lặp</label>
            <select
              className="admin-input"
              value={duplicateBehavior}
              onChange={(e) => setDuplicateBehavior(e.target.value as DuplicateBehavior)}
            >
              <option value="skip">Skip — bỏ qua</option>
              <option value="update">Update Existing — cập nhật</option>
              <option value="copy">Create Copy — tạo bản sao</option>
            </select>
          </div>

          <div className="admin-kb-bulk-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setStep(1)}
            >
              ← Chọn file khác
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={loading}
              onClick={() => void runPreview()}
            >
              {loading ? "Đang xử lý…" : "Xem trước"}
            </button>
          </div>

          {preview && (
            <>
              <div className="admin-kb-preview-summary">
                <span>Tổng: {preview.summary.total}</span>
                <span>Hợp lệ: {preview.summary.valid}</span>
                <span>Lỗi: {preview.summary.errors}</span>
                <span>Cảnh báo: {preview.summary.warnings}</span>
                <span>Trùng: {preview.summary.duplicates}</span>
              </div>
              <div className="admin-kb-preview-table-wrap">
                <table className="admin-kb-preview-table">
                  <thead>
                    <tr>
                      <th>Row #</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 100).map((row) => (
                      <tr key={row.rowNumber} className={row.canImport ? "" : "has-error"}>
                        <td>{row.rowNumber}</td>
                        <td>{row.title || "—"}</td>
                        <td>{getEntryTypeLabel(row.type)}</td>
                        <td>{row.categoryName ?? "—"}</td>
                        <td>{getEntryStatusLabel(row.status)}</td>
                        <td>
                          {validationLabel(row)}
                          {row.issues.length > 0 && (
                            <span className="admin-field-hint">
                              {" "}
                              ({row.issues.map((i) => i.message).join(", ")})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 100 && (
                <p className="admin-field-hint">Hiển thị 100/{preview.rows.length} dòng đầu tiên.</p>
              )}
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={loading || preview.summary.valid === 0}
                onClick={() => void runImport()}
              >
                {loading ? "Đang import…" : "Import dữ liệu"}
              </button>
            </>
          )}
        </div>
      )}

      {step === 3 && result && (
        <div className="admin-kb-bulk-panel admin-kb-import-result">
          <h3 className="admin-subtitle">Kết quả import</h3>
          <p>Imported: <strong>{result.imported}</strong></p>
          <p>Skipped: <strong>{result.skipped}</strong></p>
          <p>Errors: <strong>{result.errors.length}</strong></p>
          {result.errors.length > 0 && (
            <ul className="admin-kb-warning-list">
              {result.errors.slice(0, 20).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              setStep(1);
              setPreview(null);
              setResult(null);
              setRawRows([]);
            }}
          >
            Import file mới
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="admin-kb-import-history">
          <h4 className="admin-subtitle">Lịch sử import gần đây</h4>
          <ul>
            {history.map((job) => (
              <li key={job.id}>
                {job.filename} — {job.imported}/{job.rows} imported, {job.skipped} skipped —{" "}
                {new Date(job.createdAt).toLocaleString("vi-VN")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
