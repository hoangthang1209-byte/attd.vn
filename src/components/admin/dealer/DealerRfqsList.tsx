"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  DEALER_RFQ_PRIORITIES,
  DEALER_RFQ_PRIORITY_LABELS,
  DEALER_RFQ_PROJECT_TYPES,
  DEALER_RFQ_PROJECT_TYPE_LABELS,
  DEALER_RFQ_STATUSES,
  DEALER_RFQ_STATUS_LABELS,
  type DealerRFQRecord,
} from "@/features/dealer/dealer-rfq.types";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import { formatCrmDateTime } from "@/features/crm/format";

export default function DealerRfqsList() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<DealerRFQRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [projectType, setProjectType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (projectType) params.set("projectType", projectType);

      const res = await fetch(`/api/dealer/rfqs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể tải RFQ");
        setRfqs([]);
        return;
      }
      setRfqs(Array.isArray(data.rfqs) ? data.rfqs : []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Không thể tải RFQ");
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, projectType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <h2>Yêu cầu báo giá B2B (RFQ)</h2>
        <p>Tổng: {total} RFQ</p>
      </div>

      <form
        className="admin-crm-filters"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="admin-input"
          placeholder="Tìm mã RFQ, tiêu đề, đại lý..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {DEALER_RFQ_STATUSES.map((s) => (
            <option key={s} value={s}>{DEALER_RFQ_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select className="admin-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Ưu tiên</option>
          {DEALER_RFQ_PRIORITIES.map((p) => (
            <option key={p} value={p}>{DEALER_RFQ_PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        <select className="admin-input" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
          <option value="">Loại dự án</option>
          {DEALER_RFQ_PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>{DEALER_RFQ_PROJECT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <button type="submit" className="admin-btn">Lọc</button>
      </form>

      {loading && <AdminLoadingState label="Đang tải danh sách RFQ…" />}
      {error && <p className="admin-error">{error}</p>}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã RFQ</th>
                <th>Đại lý</th>
                <th>Dự án</th>
                <th>SL</th>
                <th>Deadline</th>
                <th>Trạng thái</th>
                <th>Ưu tiên</th>
                <th>Cập nhật</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.length === 0 ? (
                <tr><td colSpan={9}>Chưa có RFQ</td></tr>
              ) : (
                rfqs.map((rfq) => (
                  <tr key={rfq.id}>
                    <td>
                      <Link href={`/admin/dealer/rfqs/${rfq.id}`} className="admin-link">
                        {rfq.code}
                      </Link>
                    </td>
                    <td>{rfq.dealerCompany?.name ?? "—"}</td>
                    <td>{DEALER_RFQ_PROJECT_TYPE_LABELS[rfq.projectType]}</td>
                    <td>{rfq.quantity ?? "—"}</td>
                    <td>{rfq.deadline ? formatCrmDateTime(rfq.deadline) : "—"}</td>
                    <td>{DEALER_RFQ_STATUS_LABELS[rfq.status]}</td>
                    <td>{DEALER_RFQ_PRIORITY_LABELS[rfq.priority]}</td>
                    <td>{formatCrmDateTime(rfq.updatedAt)}</td>
                    <td>
                      <button type="button" className="admin-btn admin-btn--sm" onClick={() => router.push(`/admin/dealer/rfqs/${rfq.id}`)}>
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
