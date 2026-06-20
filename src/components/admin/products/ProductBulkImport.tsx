"use client";

import { useRef, useState } from "react";
import { PRODUCT_IMPORT_PRESETS } from "@/features/products/product-import-presets";
import { PRODUCT_IMPORT_TEMPLATES } from "@/features/products/product-import-templates";
import type { ProductImportPresetId } from "@/features/products/product-import-types";
import { mapRawRowToImportRow } from "@/features/products/product-import-utils";
import {
  filterProductImportHeaders,
  pickProductImportSheetName,
} from "@/features/products/product-import-feedback";
import ImportTemplateSection from "@/components/admin/ImportTemplateSection";
import ProductImportHistory from "@/components/admin/products/ProductImportHistory";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type ImportRow = Record<string, unknown>;
type PreviewRow = {
  rowIndex: number;
  productName: string;
  category: string;
  normalizedCategory: string;
  productCode?: string;
  generatedSku: string;
  colorName?: string;
  sizeName?: string;
  status?: string;
  stockQty?: number;
  wholesalePrice?: number;
  finalAction: string;
  isValid: boolean;
  validationErrors: { field: string; message: string }[];
  duplicateInfo: { type: string } | null;
};

type PreviewResult = {
  ok?: boolean;
  rows: PreviewRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    newProducts: number;
    newVariants: number;
  };
  jobId?: string;
  warnings?: string[];
  feedbackDownloadUrl?: string;
  feedbackCsvDownloadUrl?: string;
  error?: string;
  detail?: string;
  code?: string;
  message?: string;
};

type ExecuteResult = {
  ok: boolean;
  message: string;
  jobId?: string;
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  skippedRows: number;
  invalidRows: number;
  createdCategories: number;
};

type Step = "upload" | "map" | "preview" | "execute" | "done";
type Tab = "import" | "history";

const FINAL_ACTION_LABELS: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  skip: "Bỏ qua",
  copy: "Sao chép",
  invalid: "Lỗi",
};

const FINAL_ACTION_CLS: Record<string, string> = {
  create: "admin-kb-badge--verified",
  update: "admin-kb-badge--ai",
  skip: "admin-kb-badge--medium",
  copy: "admin-kb-badge--medium",
  invalid: "admin-kb-badge--low",
};

export default function ProductBulkImport() {
  const mutate = useAdminMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const originalFileRef = useRef<File | null>(null);
  const [tab, setTab] = useState<Tab>("import");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [step, setStep] = useState<Step>("upload");
  const [presetId, setPresetId] = useState<ProductImportPresetId>("blank-apparel");
  const [rawRows, setRawRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "copy">("skip");
  const [autoCreateCats, setAutoCreateCats] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [feedbackDownloadUrl, setFeedbackDownloadUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const preset = PRODUCT_IMPORT_PRESETS.find((p) => p.id === presetId) ?? PRODUCT_IMPORT_PRESETS[0];

  async function handleFile(file: File) {
    originalFileRef.current = file;
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) { setError("File CSV trống."); return; }
      const allHdr = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(filterProductImportHeaders(allHdr));
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        return Object.fromEntries(allHdr.map((h, i) => [h, vals[i] ?? ""]));
      });
      setRawRows(rows);
      initMapping(allHdr);
      setStep("map");
    } else if (ext === "xlsx" || ext === "xls") {
      try {
        const xlsx = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = xlsx.read(buffer, { type: "array" });
        const sheetName = pickProductImportSheetName(wb.SheetNames);
        const ws = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (!data.length) { setError("File XLSX trống."); return; }
        const hdr = filterProductImportHeaders(Object.keys(data[0]));
        setHeaders(hdr);
        setRawRows(data);
        initMapping(hdr);
        setStep("map");
      } catch {
        setError("Không đọc được file XLSX. Hãy thử CSV.");
      }
    } else {
      setError("Chỉ hỗ trợ .csv và .xlsx");
    }
  }

  function initMapping(hdr: string[]) {
    const productHeaders = filterProductImportHeaders(hdr);
    const map: Record<string, string> = {};
    const targetFields = Object.keys(preset.columnMapping) as (keyof typeof preset.columnMapping)[];
    for (const field of targetFields) {
      const expectedCol = preset.columnMapping[field] ?? field;
      const found = productHeaders.find(
        (h) => h.toLowerCase() === expectedCol.toLowerCase() || h.toLowerCase() === String(field).toLowerCase(),
      );
      map[field] = found ?? "";
    }
    setColumnMapping(map);
  }

  async function handlePreview() {
    setError(null);
    setErrorDetail(null);
    setPreviewWarnings([]);
    setFeedbackDownloadUrl(null);
    setPreviewLoading(true);

    const mappedRows = rawRows.map((raw, i) =>
      mapRawRowToImportRow(raw, columnMapping as Parameters<typeof mapRawRowToImportRow>[1], i, preset.defaults as Record<string, unknown>)
    );
    const options = {
      presetId,
      columnMapping,
      defaultDuplicateStrategy: duplicateStrategy,
      autoCreateCategories: autoCreateCats,
    };

    try {
      let res: Response;
      const originalFile = originalFileRef.current;

      if (originalFile) {
        const form = new FormData();
        form.append("file", originalFile);
        form.append("fileName", originalFile.name);
        form.append("rows", JSON.stringify(mappedRows));
        form.append("rawRows", JSON.stringify(rawRows));
        form.append("options", JSON.stringify(options));
        if (jobId) form.append("jobId", jobId);
        res = await fetch("/api/admin/products/import/preview", { method: "POST", body: form });
      } else {
        res = await fetch("/api/admin/products/import/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: mappedRows, rawRows, options, fileName }),
        });
      }

      const data = await res.json() as PreviewResult;

      if (!res.ok || data.ok === false) {
        setError(data.error ?? data.message ?? "Không thể xem trước file import.");
        setErrorDetail(data.detail ?? null);
        if (data.jobId) setJobId(data.jobId);
        if (data.code === "IMPORT_JOB_SCHEMA_MISMATCH" || (data.detail ?? "").includes("migration")) {
          setError("Không thể tạo lịch sử import. Kiểm tra migration production.");
        }
        return;
      }

      if (!Array.isArray(data.rows) || !data.summary) {
        setError("Không thể xem trước file import.");
        setErrorDetail("Phản hồi preview không hợp lệ từ server.");
        return;
      }

      setPreview(data);
      if (data.jobId) setJobId(data.jobId);
      if (data.warnings?.length) setPreviewWarnings(data.warnings);
      if (data.feedbackDownloadUrl) setFeedbackDownloadUrl(data.feedbackDownloadUrl);
      else if ((data.summary.invalid > 0 || data.summary.duplicates > 0) && data.jobId) {
        setFeedbackDownloadUrl(`/api/admin/products/import/jobs/${data.jobId}/download-feedback`);
      }
      setHistoryRefreshKey((k) => k + 1);
      setStep("preview");
    } catch (err) {
      setError("Không thể xem trước file import.");
      setErrorDetail(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleExecute() {
    if (!preview) return;
    setExecuting(true);
    setError(null);
    const result = await mutate({
      loadingMessage: "Đang xử lý dữ liệu…",
      successMessage: "Đã bắt đầu nhập sản phẩm.",
      action: async () => {
        const res = await fetch("/api/admin/products/import/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: preview.rows,
            fileName,
            jobId,
            options: {
              presetId,
              columnMapping,
              defaultDuplicateStrategy: duplicateStrategy,
              autoCreateCategories: autoCreateCats,
            },
          }),
        });
        return parseAdminJsonResponse(res, (data) => data as ExecuteResult);
      },
      onSuccess: (data) => {
        setExecuteResult(data);
        if (data.jobId) setJobId(data.jobId);
        setHistoryRefreshKey((k) => k + 1);
        setStep("done");
      },
    });
    if (!result) {
      setError("Lỗi thực hiện import.");
    }
    setExecuting(false);
  }

  function reset() {
    setStep("upload");
    setRawRows([]);
    setHeaders([]);
    setFileName("");
    setPreview(null);
    setExecuteResult(null);
    setJobId(null);
    setError(null);
    setErrorDetail(null);
    setPreviewWarnings([]);
    setFeedbackDownloadUrl(null);
    originalFileRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  }

  function feedbackLinks(jobId: string | null, feedbackDownloadUrl: string | null) {
    if (!jobId) return null;
    const excelUrl = feedbackDownloadUrl ?? `/api/admin/products/import/jobs/${jobId}/download-feedback`;
    const csvUrl = `${excelUrl}?format=csv`;
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <a href={excelUrl} className="admin-btn admin-btn--secondary" download>
          Tải file lỗi Excel
        </a>
        <a href={csvUrl} className="admin-link-button" download>
          Tải CSV
        </a>
      </div>
    );
  }

  function switchToImportTab() {
    setTab("import");
    reset();
    setStep("upload");
  }

  return (
    <div className="admin-bulk-import-page">
      <div className="admin-bulk-import-tabs">
        <button
          type="button"
          className={`admin-bulk-import-tab ${tab === "import" ? "is-active" : ""}`}
          onClick={() => setTab("import")}
        >
          Nhập sản phẩm
        </button>
        <button
          type="button"
          className={`admin-bulk-import-tab ${tab === "history" ? "is-active" : ""}`}
          onClick={() => setTab("history")}
        >
          Lịch sử nhập file
        </button>
      </div>

      {tab === "history" && (
        <ProductImportHistory
          refreshKey={historyRefreshKey}
          onRetryUpload={switchToImportTab}
        />
      )}

      {tab === "import" && (
        <>
          <p className="admin-field-hint">
            Nếu file có lỗi, hãy tải file feedback Excel, sửa các ô màu đỏ/vàng rồi upload lại file đã chỉnh sửa.
          </p>
          <p className="admin-field-hint">
            File feedback sẽ tô đỏ các ô lỗi và tô vàng các ô cần kiểm tra. Sửa trực tiếp trong file feedback rồi upload lại.
            <strong> Ô màu đỏ:</strong> bắt buộc sửa. <strong>Ô màu vàng:</strong> nên kiểm tra.
          </p>

          {/* Step indicator */}
          <div className="admin-bulk-import-steps">
            {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => {
              const labels: Record<string, string> = { upload: "1. Tải file", map: "2. Ánh xạ cột", preview: "3. Xem trước", done: "4. Hoàn tất" };
              return (
                <div key={s} className={`admin-bulk-import-step ${step === s ? "is-active" : ""} ${["upload","map","preview","execute","done"].indexOf(step) > i ? "is-done" : ""}`}>
                  {labels[s]}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="admin-catalog-fieldset admin-import-error-panel">
              <p className="admin-error">{error}</p>
              <p className="admin-field-hint">Kiểm tra lại file hoặc ánh xạ cột.</p>
              {errorDetail && (
                <details className="admin-import-error-detail">
                  <summary>Chi tiết lỗi</summary>
                  <pre>{errorDetail}</pre>
                </details>
              )}
              {jobId && feedbackLinks(jobId, feedbackDownloadUrl)}
            </div>
          )}

          {previewWarnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {previewWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {/* Step 1: Upload */}
          {step === "upload" && (
            <>
            <ImportTemplateSection
              heading="File mẫu sản phẩm"
              apiBase="/api/admin/products/import/templates"
              templates={PRODUCT_IMPORT_TEMPLATES.slice(0, 3).map((t) => ({ id: t.id, label: t.label, description: "" }))}
              notes={[
                "Các cột bắt buộc: category, productName",
                "Nếu productCode (ID sản phẩm) để trống, hệ thống tự cấp mã theo danh mục (vd. TS0001, TS0002)",
                "Danh mục phải có mã ID (skuCode) trước khi nhập — nếu thiếu sẽ báo lỗi",
                "Nếu danh mục chưa có, bật \"Tự tạo danh mục mới\" phía dưới",
                "priceTiers có thể nhập JSON: [{\"minQty\":50,\"price\":45000}]",
                "Ảnh nên là URL Cloudinary hoặc URL ảnh hợp lệ",
                "stockStatus: IN_STOCK | LOW_STOCK | OUT_OF_STOCK | PREORDER",
                "status: ACTIVE | DRAFT | INACTIVE | ARCHIVED",
              ]}
            />
            <div className="admin-catalog-fieldset">
              <h3 className="admin-subtitle">Tải file sản phẩm</h3>
              <div className="admin-field">
                <label className="admin-label">Preset nhập hàng</label>
                <select className="admin-input" value={presetId} onChange={(e) => setPresetId(e.target.value as ProductImportPresetId)}>
                  {PRODUCT_IMPORT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <p className="admin-field-hint">{preset.description}</p>
                <p className="admin-field-hint">Cột khuyến nghị: {preset.expectedColumns.join(", ")}</p>
              </div>
              <div className="admin-field">
                <label className="admin-label">File (.csv hoặc .xlsx)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="admin-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </div>
            </div>
            </>
          )}

          {/* Step 2: Column mapping */}
          {step === "map" && (
            <div className="admin-catalog-fieldset">
              <h3 className="admin-subtitle">Ánh xạ cột</h3>
              <p className="admin-field-hint">File: <strong>{fileName}</strong> — {rawRows.length} hàng dữ liệu</p>
              <div className="admin-catalog-mapping-grid">
                {(Object.keys(columnMapping) as string[]).map((field) => (
                  <div key={field} className="admin-field">
                    <label className="admin-label">{field}</label>
                    <select className="admin-input" value={columnMapping[field] ?? ""} onChange={(e) => setColumnMapping((prev) => ({ ...prev, [field]: e.target.value }))}>
                      <option value="">— Bỏ qua —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="admin-catalog-import-options">
                <div className="admin-field">
                  <label className="admin-label">Xử lý trùng lặp</label>
                  <select className="admin-input" value={duplicateStrategy} onChange={(e) => setDuplicateStrategy(e.target.value as "skip" | "update" | "copy")}>
                    <option value="skip">Bỏ qua (skip)</option>
                    <option value="update">Cập nhật (update)</option>
                    <option value="copy">Sao chép (copy)</option>
                  </select>
                </div>
                <label className="admin-catalog-toggle">
                  <input type="checkbox" checked={autoCreateCats} onChange={(e) => setAutoCreateCats(e.target.checked)} />
                  Tự tạo danh mục nếu chưa có
                </label>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => void handlePreview()} disabled={previewLoading}>
                  {previewLoading ? "Đang xem trước…" : "Xem trước →"}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={reset}>Bắt đầu lại</button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && preview && (
            <div>
              <div className="admin-catalog-kpi-bar">
                <div className="admin-catalog-kpi"><strong>{preview.summary.total}</strong><span>Tổng hàng</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{preview.summary.valid}</strong><span>Hợp lệ</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--danger"><strong>{preview.summary.invalid}</strong><span>Lỗi</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--warn"><strong>{preview.summary.duplicates}</strong><span>Trùng lặp</span></div>
                <div className="admin-catalog-kpi"><strong>{preview.summary.newProducts}</strong><span>Sản phẩm mới</span></div>
              </div>

              {(preview.summary.invalid > 0 || preview.summary.duplicates > 0) && (feedbackDownloadUrl || jobId) && (
                <div style={{ marginTop: 12 }}>
                  <p className="admin-field-hint" style={{ color: "var(--admin-danger, #dc2626)" }}>
                    Có lỗi cần sửa — tải file feedback Excel, chỉnh sửa các ô màu đỏ/vàng và upload lại.
                  </p>
                  {feedbackLinks(jobId, feedbackDownloadUrl)}
                </div>
              )}

              <div className="admin-catalog-table-wrap" style={{ marginTop: 16 }}>
                <table className="admin-catalog-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tên sản phẩm</th>
                      <th>Danh mục</th>
                      <th>ID sản phẩm</th>
                      <th>Màu</th>
                      <th>Size</th>
                      <th>SKU lựa chọn</th>
                      <th>Hành động</th>
                      <th>Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 100).map((r) => (
                      <tr key={r.rowIndex} className={r.finalAction === "invalid" ? "is-invalid" : ""}>
                        <td>{r.rowIndex + 1}</td>
                        <td>{r.productName}</td>
                        <td><span className="admin-field-hint">{r.normalizedCategory}</span></td>
                        <td><code className="admin-catalog-code">{r.productCode ?? "—"}</code></td>
                        <td>{r.colorName ?? ""}</td>
                        <td>{r.sizeName ?? ""}</td>
                        <td><code className="admin-catalog-code">{r.generatedSku}</code></td>
                        <td><span className={`admin-kb-badge ${FINAL_ACTION_CLS[r.finalAction] ?? ""}`}>{FINAL_ACTION_LABELS[r.finalAction] ?? r.finalAction}</span></td>
                        <td>
                          {r.validationErrors.length > 0 && (
                            <span className="admin-kb-badge admin-kb-badge--low">
                              {r.validationErrors.map((e) => e.message).join(" / ")}
                            </span>
                          )}
                          {r.duplicateInfo && <span className="admin-kb-badge admin-kb-badge--medium">Trùng {r.duplicateInfo.type}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 100 && (
                <p className="admin-field-hint">Hiển thị 100 / {preview.rows.length} hàng.</p>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => void handleExecute()} disabled={executing}>
                  {executing ? "Đang nhập…" : "Thực hiện import →"}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setStep("map")}>← Quay lại</button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={reset}>Bắt đầu lại</button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && executeResult && (
            <div className="admin-catalog-fieldset">
              <h3 className="admin-subtitle">Import hoàn tất</h3>
              <p style={{ color: "var(--admin-success, green)", marginBottom: 12 }}>{executeResult.message}</p>
              <div className="admin-catalog-kpi-bar">
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{executeResult.createdProducts}</strong><span>Sản phẩm tạo</span></div>
                <div className="admin-catalog-kpi"><strong>{executeResult.updatedProducts}</strong><span>Cập nhật</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{executeResult.createdVariants}</strong><span>SKU tạo</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--warn"><strong>{executeResult.skippedRows}</strong><span>Bỏ qua</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--danger"><strong>{executeResult.invalidRows}</strong><span>Lỗi</span></div>
                <div className="admin-catalog-kpi"><strong>{executeResult.createdCategories}</strong><span>Danh mục tạo</span></div>
              </div>
              {executeResult.invalidRows > 0 && jobId && (
                <div style={{ marginTop: 12 }}>
                  <p className="admin-field-hint">Tải file feedback để xem chi tiết các dòng lỗi.</p>
                  {feedbackLinks(jobId, feedbackDownloadUrl)}
                </div>
              )}
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <a href="/admin/products" className="admin-btn admin-btn--primary">Xem danh sách sản phẩm</a>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={reset}>Import thêm</button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setTab("history")}>Xem lịch sử</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
