"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useAdminToast } from "@/hooks/useAdminToast";
import type {
  CustomerImportPreview,
  CustomerImportResult,
  CustomerImportRow,
  CustomerImportStatus,
} from "@/features/crm/services/customer-import.service";

const STATUS_LABELS: Record<CustomerImportStatus, string> = {
  OK: "OK",
  Duplicate: "Trùng",
  "Missing Name": "Thiếu tên",
  Invalid: "Không hợp lệ",
};

function statusClass(status: CustomerImportStatus) {
  if (status === "OK") return "admin-status-badge admin-status-badge--success";
  if (status === "Duplicate") return "admin-status-badge admin-status-badge--warning";
  return "admin-status-badge admin-status-badge--danger";
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error?.message === "string"
          ? data.error.message
          : "Yêu cầu không thành công.";
    throw new Error(message);
  }
  return data as T;
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-section-card" style={{ padding: 12, minWidth: 140, gap: 2 }}>
      <p className="admin-field-hint" style={{ margin: 0 }}>
        {label}
      </p>
      <strong style={{ fontSize: 22 }}>{value}</strong>
    </div>
  );
}

export default function CustomerImportClient() {
  const toast = useAdminToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CustomerImportPreview | null>(null);
  const [result, setResult] = useState<CustomerImportResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canImport = useMemo(() => (preview?.summary.ok ?? 0) > 0 && !!file, [file, preview]);

  async function previewFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setResult(null);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Chỉ hỗ trợ file .xlsx.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", nextFile);
      const res = await fetch("/api/admin/crm/customers/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = await readJsonResponse<CustomerImportPreview>(res);
      setPreview(data);
      toast.success("Đã kiểm tra file Excel.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể kiểm tra file Excel.");
    } finally {
      setUploading(false);
    }
  }

  async function importFile() {
    if (!file) return;
    setConfirmOpen(false);
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/crm/customers/import", {
        method: "POST",
        body: formData,
      });
      const data = await readJsonResponse<CustomerImportResult>(res);
      setResult(data);
      toast.success(`Đã import ${data.summary.imported} khách hàng.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể import khách hàng.");
    } finally {
      setImporting(false);
    }
  }

  const rows: CustomerImportRow[] = preview?.rows ?? [];

  return (
    <div className="admin-panel">
      <div className="admin-page-header">
        <div className="admin-page-header__copy">
          <h1 className="admin-page-header__title">Import khách hàng từ Excel</h1>
          <p className="admin-page-header__description">
            File mẫu gồm các trường khách hàng đang quản lý trong CRM. Chỉ cần nhập Company Name;
            các cột còn lại có thể để trống. Khách hàng trùng Tax Code hoặc Company Name sẽ được
            bỏ qua, không cập nhật đè.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/crm/customers" className="admin-btn admin-btn--secondary">
            Quay lại khách hàng
          </Link>
        </div>
      </div>

      <section className="admin-section-card" style={{ padding: 16 }}>
        <div className="admin-section-card__header">
          <div>
            <h2>File Excel</h2>
            <p className="admin-section-card__description">
              Tải file mẫu mới để có đầy đủ trường CRM; file mẫu MVP cũ vẫn được hỗ trợ.
            </p>
          </div>
          <a
            href="/api/admin/crm/customers/import/template"
            className="admin-btn admin-btn--secondary"
          >
            <Download size={16} aria-hidden="true" /> Tải file mẫu
          </a>
        </div>

        <div className="admin-toolbar" style={{ alignItems: "stretch" }}>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || importing}
          >
            <FileSpreadsheet size={16} aria-hidden="true" />
            {file ? file.name : "Chọn file .xlsx"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: "none" }}
            onChange={(event) => void previewFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="admin-btn"
            disabled={!file || uploading || importing}
            onClick={() => void previewFile(file)}
          >
            <Upload size={16} aria-hidden="true" />
            {uploading ? "Đang kiểm tra file..." : "Kiểm tra lại"}
          </button>
        </div>
      </section>

      {preview && (
        <section className="admin-section-card" style={{ padding: 16 }}>
          <div className="admin-section-card__header">
            <div>
              <h2>Preview</h2>
              <p className="admin-section-card__description">
                Chỉ các dòng OK sẽ được import. Dòng trùng sẽ bị bỏ qua.
              </p>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={!canImport || importing || uploading}
              onClick={() => setConfirmOpen(true)}
            >
              {importing ? "Đang import khách hàng..." : "Import khách hàng"}
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <SummaryPill label="Tổng" value={preview.summary.total} />
            <SummaryPill label="OK" value={preview.summary.ok} />
            <SummaryPill label="Trùng" value={preview.summary.duplicates} />
            <SummaryPill label="Thiếu tên" value={preview.summary.missingName} />
            <SummaryPill label="Không hợp lệ" value={preview.summary.invalid} />
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Company</th>
                  <th>Tax Code</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Notes / Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.companyName || "—"}</td>
                    <td>{row.taxCode || "—"}</td>
                    <td>{row.phone || "—"}</td>
                    <td>{row.contactEmail || row.email || "—"}</td>
                    <td>
                      <span className={statusClass(row.status)}>{STATUS_LABELS[row.status]}</span>
                    </td>
                    <td>{row.errors.length > 0 ? row.errors.join(" ") : row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <section className="admin-section-card" style={{ padding: 16 }}>
          <div className="admin-section-card__header">
            <div>
              <h2>Kết quả import</h2>
              <p className="admin-section-card__description">Tổng hợp sau khi ghi dữ liệu.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <SummaryPill label="Đã import" value={result.summary.imported} />
            <SummaryPill label="Bỏ qua" value={result.summary.skipped} />
            <SummaryPill label="Lỗi" value={result.summary.errors} />
          </div>
          {result.errors.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Company</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((error) => (
                    <tr key={`${error.rowNumber}-${error.reason}`}>
                      <td>{error.rowNumber}</td>
                      <td>{error.companyName || "—"}</td>
                      <td>{error.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {confirmOpen && (
        <div className="admin-modal-overlay" role="presentation" onClick={() => setConfirmOpen(false)}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-import-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="customer-import-confirm-title">Xác nhận import</h2>
            <p>
              Hệ thống sẽ import {preview?.summary.ok ?? 0} dòng OK và bỏ qua các dòng trùng hoặc lỗi.
            </p>
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setConfirmOpen(false)}>
                Hủy
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void importFile()}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
