"use client";

import { useCallback, useEffect, useState } from "react";

type ProductImportJobSummary = {
  id: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedBy: string | null;
  preset: string | null;
  duplicateStrategy: string | null;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  updatedVariants: number;
  skippedRows: number;
  duplicateRows: number;
  createdCategories: number;
  errorCount: number;
  warningCount: number;
  originalFileUrl: string | null;
  feedbackFileUrl: string | null;
  hasOriginalFile: boolean;
  hasFeedbackFile: boolean;
  createdAt: string;
  updatedAt: string;
  summaryJson?: unknown;
  errorsJson?: unknown;
};

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Đã tải lên",
  PREVIEWED: "Đang xem trước",
  VALIDATED: "Không có lỗi",
  COMPLETED: "Thành công",
  PARTIAL: "Một phần thành công",
  FAILED: "Thất bại",
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang xử lý",
  DONE: "Hoàn tất",
};

const STATUS_CLS: Record<string, string> = {
  COMPLETED: "admin-kb-badge--verified",
  VALIDATED: "admin-kb-badge--verified",
  DONE: "admin-kb-badge--verified",
  PARTIAL: "admin-kb-badge--medium",
  PREVIEWED: "admin-kb-badge--ai",
  UPLOADED: "admin-kb-badge--ai",
  FAILED: "admin-kb-badge--low",
  PROCESSING: "admin-kb-badge--medium",
};

type JobDetail = ProductImportJobSummary & {
  errorsJson?: unknown;
  warningsJson?: unknown;
  errors?: unknown;
};

type Props = {
  onRetryUpload?: () => void;
  refreshKey?: number;
};

export default function ProductImportHistory({ onRetryUpload, refreshKey = 0 }: Props) {
  const [jobs, setJobs] = useState<ProductImportJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/import/jobs");
      const data = await res.json() as { jobs?: ProductImportJobSummary[] };
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs, refreshKey]);

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/products/import/jobs/${id}`);
      const data = await res.json() as { job?: JobDetail };
      setDetail(data.job ?? null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa lịch sử import này?")) return;
    const res = await fetch(`/api/admin/products/import/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
      }
      void loadJobs();
    }
  }

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleString("vi-VN");
  }

  if (loading) {
    return <p className="admin-field-hint">Đang tải lịch sử…</p>;
  }

  if (jobs.length === 0) {
    return <p className="admin-field-hint">Chưa có lịch sử nhập file.</p>;
  }

  return (
    <div className="admin-import-history">
      <div className="admin-catalog-table-wrap">
        <table className="admin-catalog-table">
          <thead>
            <tr>
              <th>Ngày tải lên</th>
              <th>Tên file</th>
              <th>Preset</th>
              <th>Trạng thái</th>
              <th>Tổng dòng</th>
              <th>Hợp lệ</th>
              <th>Lỗi</th>
              <th>Đã tạo</th>
              <th>Đã cập nhật</th>
              <th>Đã bỏ qua</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{formatDate(job.createdAt)}</td>
                <td>{job.fileName}</td>
                <td>{job.preset ?? "—"}</td>
                <td>
                  <span className={`admin-kb-badge ${STATUS_CLS[job.status] ?? ""}`}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </td>
                <td>{job.totalRows}</td>
                <td>{job.validRows}</td>
                <td>{job.invalidRows || job.errorCount}</td>
                <td>{job.createdProducts}</td>
                <td>{job.updatedProducts}</td>
                <td>{job.skippedRows}</td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" className="admin-link-button" onClick={() => void loadDetail(job.id)}>
                      Xem chi tiết
                    </button>
                    {job.hasOriginalFile && (
                      <a
                        href={`/api/admin/products/import/jobs/${job.id}/download-original`}
                        className="admin-link-button"
                        download
                      >
                        Tải file gốc
                      </a>
                    )}
                    {(job.hasFeedbackFile || job.errorCount > 0 || job.invalidRows > 0) && (
                      <>
                        <a
                          href={`/api/admin/products/import/jobs/${job.id}/download-feedback`}
                          className="admin-link-button"
                          download
                        >
                          Tải file lỗi Excel
                        </a>
                        <a
                          href={`/api/admin/products/import/jobs/${job.id}/download-feedback?format=csv`}
                          className="admin-link-button"
                          download
                        >
                          Tải CSV
                        </a>
                      </>
                    )}
                    {onRetryUpload && (
                      <button type="button" className="admin-link-button" onClick={onRetryUpload}>
                        Nhập lại
                      </button>
                    )}
                    {job.status !== "PROCESSING" && (
                      <button type="button" className="admin-link-button" onClick={() => void handleDelete(job.id)}>
                        Xóa
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <div className="admin-catalog-fieldset" style={{ marginTop: 20 }}>
          <h3 className="admin-subtitle">Chi tiết import</h3>
          {detailLoading && <p className="admin-field-hint">Đang tải…</p>}
          {!detailLoading && detail && (
            <>
              <div className="admin-catalog-kpi-bar">
                <div className="admin-catalog-kpi"><strong>{detail.totalRows}</strong><span>Tổng dòng</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{detail.validRows}</strong><span>Hợp lệ</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--danger"><strong>{detail.invalidRows}</strong><span>Lỗi</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{detail.createdProducts}</strong><span>Sản phẩm tạo</span></div>
                <div className="admin-catalog-kpi"><strong>{detail.updatedProducts}</strong><span>Cập nhật</span></div>
                <div className="admin-catalog-kpi admin-catalog-kpi--warn"><strong>{detail.skippedRows}</strong><span>Bỏ qua</span></div>
                <div className="admin-catalog-kpi"><strong>{detail.duplicateRows}</strong><span>Trùng lặp</span></div>
                <div className="admin-catalog-kpi"><strong>{detail.warningCount}</strong><span>Cảnh báo</span></div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                {detail.hasOriginalFile && (
                  <a
                    href={`/api/admin/products/import/jobs/${detail.id}/download-original`}
                    className="admin-btn admin-btn--secondary"
                    download
                  >
                    Tải file gốc
                  </a>
                )}
                {(detail.hasFeedbackFile || detail.errorCount > 0 || detail.invalidRows > 0) && (
                  <>
                    <a
                      href={`/api/admin/products/import/jobs/${detail.id}/download-feedback`}
                      className="admin-btn admin-btn--secondary"
                      download
                    >
                      Tải file lỗi Excel
                    </a>
                    <a
                      href={`/api/admin/products/import/jobs/${detail.id}/download-feedback?format=csv`}
                      className="admin-link-button"
                      download
                    >
                      Tải CSV
                    </a>
                  </>
                )}
                {(detail.hasFeedbackFile || detail.errorCount > 0) && (
                  <p className="admin-field-hint">File feedback Excel có sẵn — ô đỏ là lỗi, ô vàng là cảnh báo.</p>
                )}
              </div>

              {Array.isArray(detail.errorsJson) && detail.errorsJson.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 className="admin-subtitle">Dòng lỗi</h4>
                  <ul className="admin-kb-warning-list">
                    {(detail.errorsJson as { row: number; errors: { message: string }[]; productName?: string }[]).slice(0, 50).map((e) => (
                      <li key={e.row}>
                        Dòng {e.row}: {e.productName ?? "—"} — {e.errors.map((err) => err.message).join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(detail.warningsJson) && detail.warningsJson.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 className="admin-subtitle">Cảnh báo</h4>
                  <ul className="admin-kb-warning-list">
                    {(detail.warningsJson as { row: number; duplicate?: unknown; productName?: string }[]).slice(0, 30).map((w) => (
                      <li key={w.row}>
                        Dòng {w.row}: {w.productName ?? "—"} — trùng lặp
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(detail.errors) && detail.errors.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 className="admin-subtitle">Lỗi thực thi</h4>
                  <ul className="admin-kb-warning-list">
                    {(detail.errors as string[]).slice(0, 30).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
