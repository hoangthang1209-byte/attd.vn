"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  IMPORT_PREVIEW_PAGE_SIZE,
  IMPORT_PROGRESS_LABELS,
  PRODUCT_IMPORT_MODE_HINTS,
  PRODUCT_IMPORT_MODE_LABELS,
  PRODUCT_IMPORT_MODES,
  type ImportProgressStage,
  type ProductImportMode,
} from "@/features/products/product-import-constants";
import { PRODUCT_IMPORT_V2_TEMPLATES, CATALOG_BUNDLE_TEMPLATE_ID } from "@/features/products/product-import-v2-templates";
import type { ProductImportRow } from "@/features/products/product-import-types";
import { ROUND_TRIP_QA_CHECKLIST } from "@/features/products/product-catalog-qa-fixtures";
import { mapImportVariantStatusForDisplay } from "@/features/products/product-catalog-qa-regression";
import ImportTemplateSection from "@/components/admin/ImportTemplateSection";
import ProductImportHistory from "@/components/admin/products/ProductImportHistory";
import ProductExportDialog from "@/components/admin/products/ProductExportDialog";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type PreviewRow = ProductImportRow & {
  entityType?: string;
  normalizedCategory?: string;
  generatedSku?: string;
  matchedProductId?: string;
  matchedProductCode?: string;
  finalAction: string;
  isValid: boolean;
  validationErrors: Array<{ field: string; message: string; severity?: string }>;
  duplicateInfo: { type: string } | null;
  optionValues?: string;
  affectedFields?: string[];
};

type PreviewSummary = {
  total: number;
  valid: number;
  invalid: number;
  warnings?: number;
  duplicates: number;
  newProducts: number;
  newVariants: number;
  updatedProducts?: number;
  updatedVariants?: number;
  duplicateSkuCount?: number;
  missingCategoryCount?: number;
  invalidImageUrlCount?: number;
};

type PreviewResult = {
  ok?: boolean;
  rows: PreviewRow[];
  summary: PreviewSummary;
  jobId?: string;
  warnings?: string[];
  feedbackDownloadUrl?: string;
  error?: string;
  detail?: string;
  message?: string;
};

type ExecuteResult = {
  ok: boolean;
  message: string;
  jobId?: string;
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  updatedVariants?: number;
  skippedRows: number;
  invalidRows: number;
  failedRows?: number;
  createdCategories: number;
};

type Step = "upload" | "preview" | "done";
type Tab = "import" | "history";
type PreviewFilter = "all" | "valid" | "warning" | "error";

const FINAL_ACTION_LABELS: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  skip: "Bỏ qua",
  copy: "Sao chép",
  invalid: "Lỗi",
  error: "Lỗi",
};

const FINAL_ACTION_CLS: Record<string, string> = {
  create: "admin-kb-badge--verified",
  update: "admin-kb-badge--ai",
  skip: "admin-kb-badge--medium",
  copy: "admin-kb-badge--medium",
  invalid: "admin-kb-badge--low",
  error: "admin-kb-badge--low",
};

export default function ProductBulkImport() {
  const mutate = useAdminMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const originalFileRef = useRef<File | null>(null);
  const [tab, setTab] = useState<Tab>("import");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [step, setStep] = useState<Step>("upload");
  const [importMode, setImportMode] = useState<ProductImportMode>("create-product");
  const [fileName, setFileName] = useState("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "copy">("skip");
  const [autoCreateCats, setAutoCreateCats] = useState(true);
  const [allowCreateOptions, setAllowCreateOptions] = useState(false);
  const [importValidRowsOnly, setImportValidRowsOnly] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [feedbackDownloadUrl, setFeedbackDownloadUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<ImportProgressStage>("reading");
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>("all");
  const [previewPage, setPreviewPage] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  const importOptions = {
    importMode,
    columnMapping: {},
    defaultDuplicateStrategy: duplicateStrategy,
    autoCreateCategories: autoCreateCats,
    allowCreateOptions,
    importValidRowsOnly,
  };

  async function handleFile(file: File) {
    setError(null);
    setErrorDetail(null);
    originalFileRef.current = file;
    setFileName(file.name);
    setProgressStage("reading");
    setPreviewLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("importMode", importMode);
      const parseRes = await fetch("/api/admin/products/import/parse", { method: "POST", body: form });
      const parsed = await parseRes.json() as {
        ok?: boolean;
        rows?: ProductImportRow[];
        rawRows?: Record<string, unknown>[];
        warnings?: string[];
        message?: string;
      };

      if (!parseRes.ok || !parsed.ok || !parsed.rows?.length) {
        setError(parsed.message ?? "Không đọc được tệp.");
        return;
      }

      if (parsed.warnings?.length) setPreviewWarnings(parsed.warnings);

      setProgressStage("validating");
      await runPreview(parsed.rows, parsed.rawRows ?? [], file);
    } catch (err) {
      setError("Không đọc được tệp.");
      setErrorDetail(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function runPreview(
    rows: ProductImportRow[],
    raw: Record<string, unknown>[],
    file?: File | null,
  ) {
    setPreviewLoading(true);
    setError(null);
    setFeedbackDownloadUrl(null);

    try {
      const originalFile = file ?? originalFileRef.current;
      let res: Response;

      if (originalFile) {
        const form = new FormData();
        form.append("file", originalFile);
        form.append("fileName", originalFile.name);
        form.append("rows", JSON.stringify(rows));
        form.append("rawRows", JSON.stringify(raw));
        form.append("options", JSON.stringify(importOptions));
        if (jobId) form.append("jobId", jobId);
        res = await fetch("/api/admin/products/import/preview", { method: "POST", body: form });
      } else {
        res = await fetch("/api/admin/products/import/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows, rawRows: raw, options: importOptions, fileName }),
        });
      }

      const data = await res.json() as PreviewResult;
      if (!res.ok || data.ok === false) {
        setError(data.error ?? data.message ?? "Không thể xem trước file import.");
        setErrorDetail(data.detail ?? null);
        return;
      }

      setPreview(data);
      if (data.jobId) setJobId(data.jobId);
      if (data.warnings?.length) setPreviewWarnings((prev) => [...prev, ...data.warnings!]);
      if (data.feedbackDownloadUrl) setFeedbackDownloadUrl(data.feedbackDownloadUrl);
      else if ((data.summary.invalid > 0) && data.jobId) {
        setFeedbackDownloadUrl(`/api/admin/products/import/jobs/${data.jobId}/download-feedback`);
      }
      setPreviewPage(0);
      setProgressStage("ready");
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
    if (preview.summary.invalid > 0 && !importValidRowsOnly) {
      setError("Còn dòng lỗi. Sửa file hoặc chọn \"Chỉ nhập các dòng hợp lệ\".");
      return;
    }

    setExecuting(true);
    setProgressStage("executing");
    setError(null);

    const result = await mutate({
      loadingMessage: "Đang nhập dữ liệu…",
      successMessage: "Đã nhập dữ liệu.",
      action: async () => {
        const res = await fetch("/api/admin/products/import/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: preview.rows,
            fileName,
            jobId,
            options: importOptions,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data as ExecuteResult);
      },
      onSuccess: (data) => {
        setExecuteResult(data);
        if (data.jobId) setJobId(data.jobId);
        setHistoryRefreshKey((k) => k + 1);
        setProgressStage("done");
        setStep("done");
      },
    });

    if (!result) setError("Lỗi thực hiện import.");
    setExecuting(false);
  }

  function reset() {
    setStep("upload");
    setFileName("");
    setPreview(null);
    setExecuteResult(null);
    setJobId(null);
    setError(null);
    setErrorDetail(null);
    setPreviewWarnings([]);
    setFeedbackDownloadUrl(null);
    setPreviewFilter("all");
    setPreviewPage(0);
    setProgressStage("reading");
    originalFileRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  }

  function feedbackLinks(id: string | null, url: string | null) {
    if (!id) return null;
    const excelUrl = url ?? `/api/admin/products/import/jobs/${id}/download-feedback`;
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <a href={excelUrl} className="admin-btn admin-btn--secondary" download>
          Tải báo cáo lỗi Excel
        </a>
        <a href={`${excelUrl}?format=csv`} className="admin-link-button" download>
          Tải CSV
        </a>
      </div>
    );
  }

  const filteredPreviewRows = (preview?.rows ?? []).filter((row) => {
    if (previewFilter === "valid") return row.isValid;
    if (previewFilter === "error") return !row.isValid || row.finalAction === "error" || row.finalAction === "invalid";
    if (previewFilter === "warning") {
      return row.validationErrors.some((e) => e.severity === "warning");
    }
    return true;
  });

  const pageStart = previewPage * IMPORT_PREVIEW_PAGE_SIZE;
  const pageRows = filteredPreviewRows.slice(pageStart, pageStart + IMPORT_PREVIEW_PAGE_SIZE);
  const pageCount = Math.ceil(filteredPreviewRows.length / IMPORT_PREVIEW_PAGE_SIZE);

  const v2Templates = [
    { id: CATALOG_BUNDLE_TEMPLATE_ID, label: "Bộ mẫu catalog đầy đủ (workbook)", description: "5 sheet: Hướng dẫn, Sản phẩm, Biến thể, Thông số, Tùy chỉnh" },
    ...PRODUCT_IMPORT_V2_TEMPLATES.map((t) => ({ id: t.id, label: t.label, description: "" })),
  ];

  return (
    <div className="admin-bulk-import-page">
      <div className="admin-bulk-import-tabs">
        <button type="button" className={`admin-bulk-import-tab ${tab === "import" ? "is-active" : ""}`} onClick={() => setTab("import")}>
          Nhập sản phẩm
        </button>
        <button type="button" className={`admin-bulk-import-tab ${tab === "history" ? "is-active" : ""}`} onClick={() => setTab("history")}>
          Lịch sử nhập file
        </button>
        <button type="button" className="admin-link-button" style={{ marginLeft: "auto" }} onClick={() => setExportOpen(true)}>
          Xuất dữ liệu hiện có
        </button>
      </div>

      <ProductExportDialog open={exportOpen} onClose={() => setExportOpen(false)} defaultScope="all" />

      {tab === "history" && (
        <ProductImportHistory refreshKey={historyRefreshKey} onRetryUpload={() => { setTab("import"); reset(); }} />
      )}

      {tab === "import" && (
        <>
          <p className="admin-field-hint" role="status">
            Giai đoạn: <strong>{IMPORT_PROGRESS_LABELS[progressStage]}</strong>
          </p>

          <div className="admin-bulk-import-steps">
            {(["upload", "preview", "done"] as Step[]).map((s, i) => {
              const labels = { upload: "1. Tải file", preview: "2. Xem trước", done: "3. Hoàn tất" };
              return (
                <div key={s} className={`admin-bulk-import-step ${step === s ? "is-active" : ""} ${["upload", "preview", "done"].indexOf(step) > i ? "is-done" : ""}`}>
                  {labels[s]}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="admin-catalog-fieldset admin-import-error-panel" role="alert">
              <p className="admin-error">{error}</p>
              {errorDetail && <details className="admin-import-error-detail"><summary>Chi tiết</summary><pre>{errorDetail}</pre></details>}
              {jobId && feedbackLinks(jobId, feedbackDownloadUrl)}
            </div>
          )}

          {previewWarnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {previewWarnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}

          {step === "upload" && (
            <>
              <ImportTemplateSection
                heading="Tải mẫu nhập liệu"
                apiBase="/api/admin/products/import/templates"
                templates={v2Templates}
                notes={[
                  "Workbook XLSX gồm sheet Hướng dẫn, Sản phẩm, Biến thể, Thông số, Tùy chỉnh",
                  "optionValues: Màu sắc=Đen | Kích thước=M",
                  "galleryUrls: URL1|URL2",
                  "Ô trống giữ nguyên giá trị hiện có (chế độ cập nhật)",
                  "__CLEAR__ để xóa giá trị khi cập nhật",
                  "Chỉ tạo biến thể có trong file — không sinh Cartesian tự động",
                ]}
              />

              <div className="admin-catalog-fieldset">
                <h3 className="admin-subtitle">Chế độ nhập</h3>
                <div className="admin-catalog-import-options">
                  {PRODUCT_IMPORT_MODES.map((mode) => (
                    <label key={mode} className="admin-catalog-toggle">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === mode}
                        onChange={() => setImportMode(mode)}
                      />
                      {PRODUCT_IMPORT_MODE_LABELS[mode]}
                    </label>
                  ))}
                </div>
                <p className="admin-field-hint">{PRODUCT_IMPORT_MODE_HINTS[importMode]}</p>
                {(importMode === "update-product" || importMode === "update-variants-bulk") && (
                  <p className="admin-field-hint">
                    <strong>__CLEAR__</strong> — nhập vào ô cần xóa khi cập nhật (MOQ override, ảnh, mô tả…). Ô trống không đổi dữ liệu hiện có.
                  </p>
                )}

                <details className="admin-catalog-fieldset" style={{ marginTop: 12 }}>
                  <summary className="admin-subtitle">Trước khi nhập lại (round-trip)</summary>
                  <ol className="admin-field-hint" style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                    {ROUND_TRIP_QA_CHECKLIST.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </details>

                <div className="admin-catalog-import-options" style={{ marginTop: 12 }}>
                  <div className="admin-field">
                    <label className="admin-label">Xử lý trùng lặp</label>
                    <select className="admin-input" value={duplicateStrategy} onChange={(e) => setDuplicateStrategy(e.target.value as "skip" | "update" | "copy")}>
                      <option value="skip">Bỏ qua</option>
                      <option value="update">Cập nhật</option>
                      <option value="copy">Sao chép</option>
                    </select>
                  </div>
                  <label className="admin-catalog-toggle">
                    <input type="checkbox" checked={autoCreateCats} onChange={(e) => setAutoCreateCats(e.target.checked)} />
                    Tự tạo danh mục nếu chưa có
                  </label>
                  <label className="admin-catalog-toggle">
                    <input type="checkbox" checked={allowCreateOptions} onChange={(e) => setAllowCreateOptions(e.target.checked)} />
                    Cho phép tạo nhóm thuộc tính/giá trị mới
                  </label>
                </div>

                <div className="admin-field" style={{ marginTop: 12 }}>
                  <label className="admin-label">Tệp (.csv hoặc .xlsx, tối đa 5MB)</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="admin-input"
                    disabled={previewLoading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                    }}
                  />
                  {previewLoading && <p className="admin-field-hint">Đang đọc và kiểm tra tệp…</p>}
                </div>
              </div>
            </>
          )}

          {step === "preview" && preview && (
            <div>
              <div className="admin-catalog-kpi-bar">
                <div className="admin-catalog-kpi"><strong>{preview.summary.total}</strong><span>Tổng</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{preview.summary.valid}</strong><span>Hợp lệ</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--warn"><strong>{preview.summary.warnings ?? 0}</strong><span>Cảnh báo</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--danger"><strong>{preview.summary.invalid}</strong><span>Lỗi</span></div>
                <div className="admin-catalog-kpi"><strong>{preview.summary.newProducts}</strong><span>SP mới</span></div>
                <div className="admin-catalog-kpi"><strong>{preview.summary.updatedProducts ?? 0}</strong><span>SP cập nhật</span></div>
                <div className="admin-catalog-kpi"><strong>{preview.summary.newVariants}</strong><span>BT mới</span></div>
                <div className="admin-catalog-kpi"><strong>{preview.summary.updatedVariants ?? 0}</strong><span>BT cập nhật</span></div>
                {(preview.summary.invalidImageUrlCount ?? 0) > 0 && (
                  <div className="admin-catalog-kpi admin-catalog-kpi--warn">
                    <strong>{preview.summary.invalidImageUrlCount}</strong>
                    <span>URL ảnh lỗi</span>
                  </div>
                )}
              </div>

              <p className="admin-field-hint" role="status">
                Tóm tắt: {preview.summary.valid} hợp lệ · {preview.summary.invalid} lỗi ·{" "}
                {(preview.summary.warnings ?? 0)} cảnh báo ·{" "}
                {preview.summary.newProducts} tạo mới SP · {preview.summary.updatedProducts ?? 0} cập nhật SP
              </p>

              {(preview.summary.invalid > 0) && (
                <p className="admin-field-hint" style={{ color: "#dc2626" }}>
                  Các dòng lỗi không được áp dụng. Kiểm tra tệp báo lỗi trước khi nhập lại.
                </p>
              )}

              <div className="admin-variant-matrix-filters" style={{ marginTop: 12 }}>
                {(["all", "valid", "warning", "error"] as PreviewFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`btn-secondary btn-sm ${previewFilter === f ? "is-active" : ""}`}
                    onClick={() => { setPreviewFilter(f); setPreviewPage(0); }}
                  >
                    {f === "all" ? "Tất cả" : f === "valid" ? "Hợp lệ" : f === "warning" ? "Cảnh báo" : "Lỗi"}
                  </button>
                ))}
              </div>

              <div className="admin-catalog-table-wrap" style={{ marginTop: 16 }}>
                <table className="admin-catalog-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Loại</th>
                      <th>Định danh</th>
                      <th>SKU / optionValues</th>
                      <th>Hành động</th>
                      <th>Thông báo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.rowIndex} className={!r.isValid ? "is-invalid" : ""}>
                        <td>{r.rowIndex + 1}</td>
                        <td>{r.entityType ?? "product"}</td>
                        <td>
                          <div>{r.productName || r.productCode || r.matchedProductCode || "—"}</div>
                          <span className="admin-field-hint">{r.normalizedCategory}</span>
                        </td>
                        <td>
                          <code className="admin-catalog-code">{r.generatedSku || r.sku || "—"}</code>
                          {r.optionValues && <div className="admin-field-hint">{r.optionValues}</div>}
                          {r.entityType === "variant" && r.variantStatus && (
                            <div className="admin-field-hint">
                              Trạng thái: {mapImportVariantStatusForDisplay(r.variantStatus)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`admin-kb-badge ${FINAL_ACTION_CLS[r.finalAction] ?? ""}`}>
                            {FINAL_ACTION_LABELS[r.finalAction] ?? r.finalAction}
                          </span>
                        </td>
                        <td>
                          {r.validationErrors.map((e) => (
                            <span key={`${r.rowIndex}-${e.field}-${e.message}`} className={`admin-kb-badge ${e.severity === "warning" ? "admin-kb-badge--medium" : "admin-kb-badge--low"}`}>
                              {e.message}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <button type="button" className="btn-secondary btn-sm" disabled={previewPage <= 0} onClick={() => setPreviewPage((p) => p - 1)}>← Trước</button>
                  <span className="admin-field-hint">Trang {previewPage + 1}/{pageCount} ({filteredPreviewRows.length} dòng)</span>
                  <button type="button" className="btn-secondary btn-sm" disabled={previewPage >= pageCount - 1} onClick={() => setPreviewPage((p) => p + 1)}>Sau →</button>
                </div>
              )}

              {feedbackLinks(jobId, feedbackDownloadUrl)}

              <div className="admin-catalog-import-options" style={{ marginTop: 12 }}>
                <label className="admin-catalog-toggle">
                  <input type="checkbox" checked={importValidRowsOnly} onChange={(e) => setImportValidRowsOnly(e.target.checked)} />
                  Chỉ nhập các dòng hợp lệ ({preview.summary.valid} dòng)
                </label>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => void handleExecute()} disabled={executing || (preview.summary.invalid > 0 && !importValidRowsOnly)}>
                  {executing ? "Đang nhập…" : "Thực hiện nhập"}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={reset}>Nhập tệp khác</button>
              </div>
            </div>
          )}

          {step === "done" && executeResult && (
            <div className="admin-catalog-fieldset">
              <h3 className="admin-subtitle">Hoàn tất nhập dữ liệu</h3>
              <p style={{ color: "var(--admin-success, green)", marginBottom: 12 }}>{executeResult.message}</p>
              <div className="admin-catalog-kpi-bar">
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{executeResult.createdProducts}</strong><span>Tạo SP</span></div>
                <div className="admin-catalog-kpi"><strong>{executeResult.updatedProducts}</strong><span>Cập nhật SP</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{executeResult.createdVariants}</strong><span>Tạo BT</span></div>
                <div className="admin-catalog-kpi"><strong>{executeResult.updatedVariants ?? 0}</strong><span>Cập nhật BT</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--warn"><strong>{executeResult.skippedRows}</strong><span>Bỏ qua</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--danger"><strong>{(executeResult.invalidRows ?? 0) + (executeResult.failedRows ?? 0)}</strong><span>Lỗi</span></div>
              </div>
              <p className="admin-field-hint">Các dòng lỗi không được áp dụng. Kiểm tra tệp báo lỗi trước khi nhập lại.</p>
              {(executeResult.invalidRows > 0 || (executeResult.failedRows ?? 0) > 0) && feedbackLinks(jobId, feedbackDownloadUrl)}
              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <Link href="/admin/products" className="admin-btn admin-btn--primary">Quay lại danh sách sản phẩm</Link>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={reset}>Nhập tệp khác</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
