"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  DuplicateBehavior,
  ImportDefaultValues,
  ImportExecuteResult,
  ImportPreviewResult,
  KnowledgeBaseImportJobRecord,
  PreviewFilter,
} from "@/features/knowledge-base/knowledge-base-import-types";
import {
  IMPORT_PRESETS,
  applyImportPreset,
  guessColumnMapping,
} from "@/features/knowledge-base/knowledge-base-import-presets";
import { parseImportFile } from "@/features/knowledge-base/knowledge-base-import-parser";
import { KB_IMPORT_FIELDS } from "@/features/knowledge-base/knowledge-base-import-types";
import { isSupportedImportFile } from "@/features/knowledge-base/knowledge-base-import-utils";
import {
  exportKnowledgeImportReportCsv,
  downloadImportReportCsv,
} from "@/features/knowledge-base/knowledge-base-import-report";
import { calculateKnowledgeAiReadiness } from "@/features/knowledge-base/knowledge-base-ai-readiness";
import KnowledgeBaseAiReadinessBadge from "@/components/admin/knowledge-base/KnowledgeBaseAiReadinessBadge";
import {
  getEntryStatusLabel,
  getEntryTypeLabel,
  getPriorityLabel,
} from "@/features/knowledge-base/knowledge-base-utils";
import ImportTemplateSection from "@/components/admin/ImportTemplateSection";

type Step = 1 | 2 | 3;

export default function KnowledgeBaseBulkImport() {
  const [step, setStep] = useState<Step>(1);
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<ImportDefaultValues>({});
  const [duplicateBehavior, setDuplicateBehavior] = useState<DuplicateBehavior>("skip");
  const [rowStrategies, setRowStrategies] = useState<Record<number, DuplicateBehavior>>({});
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [autoCreateCategories, setAutoCreateCategories] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>("all");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportExecuteResult | null>(null);
  const [history, setHistory] = useState<KnowledgeBaseImportJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/admin/knowledge-base/import/history");
    const data = await res.json();
    setHistory(Array.isArray(data.jobs) ? data.jobs : []);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function processFile(file: File) {
    if (!isSupportedImportFile(file.name)) {
      setError("Định dạng không hỗ trợ. Chỉ chấp nhận .xlsx, .csv, .json");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseImportFile(file);
      setFilename(parsed.filename);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(guessColumnMapping(parsed.headers));
      setDefaults({});
      setRowStrategies({});
      setPreview(null);
      setResult(null);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được file");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(presetId: string) {
    const applied = applyImportPreset(headers, presetId);
    setMapping(applied.mapping);
    setDefaults(applied.defaults);
  }

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/knowledge-base/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows, mapping, defaults, duplicateBehavior, autoCreateCategories }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Xem trước thất bại");
      setPreview(data);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xem trước thất bại");
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
        body: JSON.stringify({
          rows: rawRows,
          mapping,
          defaults,
          duplicateBehavior,
          rowStrategies,
          skipInvalid,
          autoCreateCategories,
          filename,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Import thất bại");
      setResult(data);
      void loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import thất bại");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((row) => {
      if (previewFilter === "valid") return row.canImport;
      if (previewFilter === "invalid") return !row.canImport;
      if (previewFilter === "duplicate") {
        return row.duplicateSlug || row.duplicateTitle || row.strongDuplicate || row.similarTitle;
      }
      return true;
    });
  }, [preview, previewFilter]);

  const canExecute = useMemo(() => {
    if (!preview) return false;
    if (preview.summary.valid === 0) return false;
    if (!skipInvalid && preview.summary.invalid > 0) return false;
    return true;
  }, [preview, skipInvalid]);

  function duplicateStatus(row: ImportPreviewResult["rows"][number]): string {
    if (row.strongDuplicate) return "Trùng mạnh";
    if (row.duplicateTitle || row.duplicateSlug) return "Trùng";
    if (row.similarTitle) return "Tương tự";
    return "—";
  }

  return (
    <div className="admin-kb-bulk-import">
      <div className="admin-kb-import-header">
        <Link href="/admin/knowledge-base" className="admin-kb-back-link">
          ← Quay về Knowledge Base
        </Link>
      </div>

      <div className="admin-kb-bulk-steps">
        <span className={step === 1 ? "is-active" : ""}>1. Tải file lên</span>
        <span className={step >= 2 ? "is-active" : ""}>2. Ánh xạ cột</span>
        <span className={step >= 3 ? "is-active" : ""}>3. Xem trước & import</span>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {step === 1 && (
        <div className="admin-kb-bulk-panel">
          <ImportTemplateSection
            heading="File mẫu Knowledge Base"
            apiBase="/api/admin/knowledge-base/import/templates"
            templates={[
              { id: "faq", label: "Mẫu FAQ", description: "Câu hỏi thường gặp cho khách B2B" },
              { id: "product-knowledge", label: "Mẫu kiến thức sản phẩm", description: "Nguồn hàng, chất liệu, sản phẩm sỉ" },
              { id: "sop", label: "Mẫu quy trình/SOP", description: "Báo giá, đặt hàng, giao hàng" },
              { id: "b2b-knowledge", label: "Mẫu Knowledge ATTD B2B", description: "Định vị thương hiệu B2B" },
            ]}
            notes={[
              "Các cột bắt buộc: title, content",
              "type: FAQ | PRODUCT | OEM | DEALER | POLICY | BRAND",
              "status: DRAFT | PUBLISHED | ARCHIVED",
              "priority: LOW | MEDIUM | HIGH | CRITICAL",
              "usageScope: SEO_PLANNING | SALES | CRM | PRODUCT | SUPPORT | INTERNAL",
              "isVerified: true/false hoặc có/không",
              "tags: cách nhau bằng dấu phẩy",
              "structuredData: để trống hoặc nhập JSON hợp lệ",
            ]}
          />
          <h3 className="admin-subtitle">Nhập dữ liệu hàng loạt</h3>
          <p className="admin-field-hint">Hỗ trợ .xlsx, .csv, .json</p>

          <div
            className={`admin-kb-dropzone ${dragOver ? "is-dragover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void processFile(file);
            }}
          >
            <p>Kéo thả file vào đây hoặc chọn file</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
              }}
            />
          </div>
          {filename && <p className="admin-field-hint">Đã chọn: <strong>{filename}</strong></p>}
          {loading && <p className="admin-loading">Đang đọc file…</p>}
        </div>
      )}

      {step >= 2 && (
        <div className="admin-kb-bulk-panel">
          <p className="admin-field-hint">File: <strong>{filename}</strong> — {rawRows.length} dòng</p>

          <h4 className="admin-subtitle">Ánh xạ cột</h4>
          <div className="admin-kb-presets">
            {IMPORT_PRESETS.map((preset) => (
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
                  onChange={(e) => setMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                >
                  <option value="">— Bỏ qua —</option>
                  {KB_IMPORT_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="admin-kb-bulk-actions">
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setStep(1)}>
              ← Tải file khác
            </button>
            <label className="admin-radio-item">
              <input
                type="checkbox"
                checked={autoCreateCategories}
                onChange={(e) => setAutoCreateCategories(e.target.checked)}
              />
              <span>Tự tạo danh mục mới nếu chưa tồn tại</span>
            </label>
            <button type="button" className="admin-btn admin-btn--primary" disabled={loading} onClick={() => void runPreview()}>
              {loading ? "Đang xử lý…" : "Xem trước dữ liệu"}
            </button>
          </div>
        </div>
      )}

      {step >= 3 && preview && (
        <div className="admin-kb-bulk-panel">
          <h4 className="admin-subtitle">Xem trước dữ liệu</h4>
          <div className="admin-kb-preview-summary">
            <span>Tổng: {preview.summary.total}</span>
            <span>Dòng hợp lệ: {preview.summary.valid}</span>
            <span>Dòng lỗi: {preview.summary.invalid}</span>
            <span>Trùng dữ liệu: {preview.summary.duplicates}</span>
          </div>

          <div className="admin-kb-preview-filters">
            {([
              ["all", "Tất cả"],
              ["valid", "Dòng hợp lệ"],
              ["invalid", "Dòng lỗi"],
              ["duplicate", "Trùng dữ liệu"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`admin-btn admin-btn--small ${previewFilter === key ? "admin-btn--primary" : "admin-btn--secondary"}`}
                onClick={() => setPreviewFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="admin-kb-duplicate-behavior">
            <label className="admin-label">Chiến lược trùng lặp (mặc định)</label>
            <select className="admin-input" value={duplicateBehavior} onChange={(e) => setDuplicateBehavior(e.target.value as DuplicateBehavior)}>
              <option value="skip">Bỏ qua</option>
              <option value="update">Cập nhật</option>
              <option value="copy">Tạo bản sao</option>
            </select>
          </div>

          <label className="admin-radio-item">
            <input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} />
            <span>Bỏ qua dòng lỗi khi import</span>
          </label>

          <label className="admin-radio-item">
            <input
              type="checkbox"
              checked={autoCreateCategories}
              onChange={(e) => setAutoCreateCategories(e.target.checked)}
            />
            <span>Tự tạo danh mục mới nếu chưa tồn tại</span>
          </label>

          <div className="admin-kb-bulk-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => {
                const csv = exportKnowledgeImportReportCsv(preview.rows, { errorsOnly: true, skipInvalid });
                downloadImportReportCsv(csv, `kb-import-errors-${Date.now()}.csv`);
              }}
            >
              Xuất báo cáo lỗi CSV
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => {
                const csv = exportKnowledgeImportReportCsv(preview.rows, { skipInvalid });
                downloadImportReportCsv(csv, `kb-import-report-${Date.now()}.csv`);
              }}
            >
              Xuất báo cáo import CSV
            </button>
          </div>

          <div className="admin-kb-preview-table-wrap">
            <table className="admin-kb-preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tiêu đề</th>
                  <th>Danh mục</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Ưu tiên</th>
                  <th>Tags</th>
                  <th>Kiểm tra</th>
                  <th>Trùng</th>
                  <th>AI readiness</th>
                  <th>Xử lý</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 100).map((row) => {
                  const aiReadiness = calculateKnowledgeAiReadiness({
                    title: row.title,
                    content: row.content,
                    categoryId: row.categoryId ?? undefined,
                    tags: row.tags,
                    usageScope: row.usageScope,
                    isVerified: row.isVerified,
                    priority: row.priority,
                    structuredData: row.structuredData,
                    sourceId: row.sourceId,
                  });
                  return (
                  <tr key={row.rowNumber} className={row.canImport ? "" : "has-error"}>
                    <td>{row.rowNumber}</td>
                    <td>{row.title || "—"}</td>
                    <td>{row.categoryName ?? "—"}</td>
                    <td>{getEntryTypeLabel(row.type)}</td>
                    <td>{getEntryStatusLabel(row.status)}</td>
                    <td>{getPriorityLabel(row.priority)}</td>
                    <td>{row.tags.join(", ") || "—"}</td>
                    <td>
                      {row.canImport ? "Hợp lệ" : "Lỗi"}
                      {row.issues.length > 0 && (
                        <span className="admin-field-hint"> ({row.issues.map((i) => i.message).join(", ")})</span>
                      )}
                    </td>
                    <td>{duplicateStatus(row)}</td>
                    <td>
                      <KnowledgeBaseAiReadinessBadge readiness={aiReadiness} />
                    </td>
                    <td>
                      {(row.duplicateSlug || row.duplicateTitle || row.strongDuplicate || row.similarTitle) && (
                        <select
                          className="admin-input admin-input--inline"
                          value={rowStrategies[row.rowNumber] ?? duplicateBehavior}
                          onChange={(e) =>
                            setRowStrategies((prev) => ({
                              ...prev,
                              [row.rowNumber]: e.target.value as DuplicateBehavior,
                            }))
                          }
                        >
                          <option value="skip">Bỏ qua</option>
                          <option value="update">Cập nhật</option>
                          <option value="copy">Tạo bản sao</option>
                        </select>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!result && (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={loading || !canExecute}
              onClick={() => void runImport()}
            >
              {loading ? "Đang import…" : "Thực hiện import"}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="admin-kb-bulk-panel admin-kb-import-result">
          <h3 className="admin-subtitle">Hoàn tất import</h3>
          <p>Tổng dòng: <strong>{result.totalRows}</strong></p>
          <p>Đã tạo: <strong>{result.created}</strong></p>
          <p>Đã cập nhật: <strong>{result.updated}</strong></p>
          <p>Bỏ qua: <strong>{result.skipped}</strong></p>
          <p>Dòng lỗi: <strong>{result.invalid}</strong></p>
          <p>Trùng: <strong>{result.duplicates}</strong></p>
          <p>Thất bại: <strong>{result.failed}</strong></p>
          <p>Danh mục đã tạo: <strong>{result.createdCategoryCount}</strong></p>
          <p>Nguồn đã liên kết: <strong>{result.linkedSourceCount}</strong></p>
          <p>Nguồn đã tạo: <strong>{result.createdSourceCount}</strong></p>
          <p>Trạng thái: <strong>{result.status}</strong></p>
          {result.errors.length > 0 && (
            <ul className="admin-kb-warning-list">
              {result.errors.slice(0, 20).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
          <div className="admin-kb-bulk-actions">
            <Link href="/admin/knowledge-base" className="admin-btn admin-btn--primary">
              Về Knowledge Base
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => {
                setStep(1);
                setPreview(null);
                setResult(null);
                setRawRows([]);
                setFilename("");
              }}
            >
              Import file mới
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="admin-kb-import-history">
          <h4 className="admin-subtitle">Lịch sử import gần đây</h4>
          <ul>
            {history.map((job) => (
              <li key={job.id}>
                {job.fileName} — tạo {job.createdRows}, cập nhật {job.updatedRows}, bỏ qua {job.skippedRows} — {job.status} —{" "}
                {new Date(job.createdAt).toLocaleString("vi-VN")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
