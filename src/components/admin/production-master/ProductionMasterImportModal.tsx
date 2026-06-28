"use client";

import { useState } from "react";

type ImportPreviewAction = "CREATE" | "UPDATE" | "SKIP" | "ERROR";

type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  message?: string;
};

type PreviewRow = {
  rowNumber: number;
  action: ImportPreviewAction;
  code: string | null;
  name: string | null;
  errors: string[];
};

type PreviewResult = {
  rows: PreviewRow[];
  summary: { create: number; update: number; skip: number; error: number };
};

type Props = {
  importPath: string;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const ACTION_LABELS: Record<ImportPreviewAction, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  SKIP: "Bỏ qua",
  ERROR: "Lỗi",
};

type Step = "upload" | "preview" | "done";

export default function ProductionMasterImportModal({ importPath, open, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  if (!open) return null;

  function reset() {
    setStep("upload");
    setFile(null);
    setError(null);
    setPreview(null);
    setSummary(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${importPath}?mode=preview`, { method: "POST", body: form });
      const data = (await res.json()) as PreviewResult & { message?: string };
      if (!res.ok) {
        setError(data.message ?? "File CSV không hợp lệ.");
        return;
      }
      setPreview(data);
      setStep("preview");
    } catch {
      setError("File CSV không hợp lệ.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${importPath}?mode=commit`, { method: "POST", body: form });
      const data = (await res.json()) as ImportSummary & { message?: string };
      if (!res.ok) {
        setError(data.message ?? "File CSV không hợp lệ.");
        return;
      }
      setSummary(data);
      setStep("done");
      onComplete();
    } catch {
      setError("File CSV không hợp lệ.");
    } finally {
      setUploading(false);
    }
  }

  const allErrors = preview?.summary.error === preview?.rows.length;

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={handleClose}>
      <div className="admin-modal admin-modal--wide" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Nhập CSV</h3>

        {step === "upload" && (
          <form onSubmit={(e) => void handlePreview(e)}>
            <label className="admin-field admin-field--full">
              <span>Chọn file CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={handleClose}>
                Đóng
              </button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={!file || uploading}>
                {uploading ? "Đang xử lý..." : "Xem trước dữ liệu"}
              </button>
            </div>
          </form>
        )}

        {step === "preview" && preview && (
          <>
            <div className="admin-import-summary" style={{ marginBottom: 12 }}>
              <ul>
                <li>Sẽ tạo mới: {preview.summary.create}</li>
                <li>Sẽ cập nhật: {preview.summary.update}</li>
                <li>Bỏ qua: {preview.summary.skip}</li>
                <li>Lỗi: {preview.summary.error}</li>
              </ul>
            </div>
            <div className="admin-table-wrap" style={{ maxHeight: 320, overflow: "auto" }}>
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Dòng</th>
                    <th>Hành động</th>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className={row.action === "ERROR" ? "is-error" : undefined}>
                      <td>{row.rowNumber}</td>
                      <td>{ACTION_LABELS[row.action]}</td>
                      <td>{row.code ?? "—"}</td>
                      <td>{row.name ?? "—"}</td>
                      <td>{row.errors.join("; ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setStep("upload")}>
                Quay lại
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={allErrors || uploading}
                onClick={() => void handleCommit()}
              >
                {uploading ? "Đang nhập..." : "Xác nhận nhập"}
              </button>
            </div>
          </>
        )}

        {step === "done" && summary && (
          <>
            <div className="admin-import-summary">
              <p>{summary.message ?? "Nhập dữ liệu hoàn tất."}</p>
              <ul>
                <li>Tạo mới: {summary.created}</li>
                <li>Cập nhật: {summary.updated}</li>
                <li>Bỏ qua: {summary.skipped}</li>
              </ul>
              {summary.errors.length > 0 && (
                <ul className="admin-error-list">
                  {summary.errors.map((err) => (
                    <li key={`${err.row}-${err.message}`}>
                      Dòng {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn admin-btn--primary" onClick={handleClose}>
                Đóng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
