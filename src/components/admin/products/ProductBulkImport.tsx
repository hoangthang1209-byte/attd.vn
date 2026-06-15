"use client";

import { useRef, useState } from "react";
import { PRODUCT_IMPORT_PRESETS } from "@/features/products/product-import-presets";
import type { ProductImportPresetId } from "@/features/products/product-import-types";
import { mapRawRowToImportRow } from "@/features/products/product-import-utils";

type ImportRow = Record<string, unknown>;
type PreviewRow = {
  rowIndex: number;
  productName: string;
  category: string;
  normalizedCategory: string;
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
  rows: PreviewRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    newProducts: number;
    newVariants: number;
  };
};

type ExecuteResult = {
  ok: boolean;
  message: string;
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  skippedRows: number;
  invalidRows: number;
  createdCategories: number;
};

type Step = "upload" | "map" | "preview" | "execute" | "done";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [presetId, setPresetId] = useState<ProductImportPresetId>("blank-apparel");
  const [rawRows, setRawRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "copy">("skip");
  const [autoCreateCats, setAutoCreateCats] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preset = PRODUCT_IMPORT_PRESETS.find((p) => p.id === presetId) ?? PRODUCT_IMPORT_PRESETS[0];

  async function handleFile(file: File) {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) { setError("File CSV trống."); return; }
      const hdr = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(hdr);
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        return Object.fromEntries(hdr.map((h, i) => [h, vals[i] ?? ""]));
      });
      setRawRows(rows);
      initMapping(hdr);
      setStep("map");
    } else if (ext === "xlsx" || ext === "xls") {
      try {
        const xlsx = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = xlsx.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (!data.length) { setError("File XLSX trống."); return; }
        const hdr = Object.keys(data[0]);
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
    const map: Record<string, string> = {};
    const targetFields = Object.keys(preset.columnMapping) as (keyof typeof preset.columnMapping)[];
    for (const field of targetFields) {
      const expectedCol = preset.columnMapping[field] ?? field;
      const found = hdr.find((h) => h.toLowerCase() === expectedCol.toLowerCase() || h.toLowerCase() === field.toLowerCase());
      map[field] = found ?? "";
    }
    setColumnMapping(map);
  }

  async function handlePreview() {
    setError(null);
    const mappedRows = rawRows.map((raw, i) =>
      mapRawRowToImportRow(raw, columnMapping as Parameters<typeof mapRawRowToImportRow>[1], i, preset.defaults as Record<string, unknown>)
    );
    try {
      const res = await fetch("/api/admin/products/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: mappedRows,
          options: {
            presetId,
            columnMapping,
            defaultDuplicateStrategy: duplicateStrategy,
            autoCreateCategories: autoCreateCats,
          },
        }),
      });
      const data = await res.json() as PreviewResult;
      setPreview(data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xem trước.");
    }
  }

  async function handleExecute() {
    if (!preview) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          fileName,
          options: {
            presetId,
            columnMapping,
            defaultDuplicateStrategy: duplicateStrategy,
            autoCreateCategories: autoCreateCats,
          },
        }),
      });
      const data = await res.json() as ExecuteResult;
      setExecuteResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi thực hiện import.");
    } finally {
      setExecuting(false);
    }
  }

  function reset() {
    setStep("upload");
    setRawRows([]);
    setHeaders([]);
    setFileName("");
    setPreview(null);
    setExecuteResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="admin-bulk-import-page">
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

      {error && <p className="admin-error">{error}</p>}

      {/* Step 1: Upload */}
      {step === "upload" && (
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
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => void handlePreview()}>Xem trước →</button>
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

          <div className="admin-catalog-table-wrap" style={{ marginTop: 16 }}>
            <table className="admin-catalog-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Màu</th>
                  <th>Size</th>
                  <th>SKU gợi ý</th>
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
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <a href="/admin/products" className="admin-btn admin-btn--primary">Xem danh sách sản phẩm</a>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={reset}>Import thêm</button>
          </div>
        </div>
      )}
    </div>
  );
}
