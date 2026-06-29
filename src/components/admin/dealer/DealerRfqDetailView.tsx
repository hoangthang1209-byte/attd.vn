"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DEALER_RFQ_PRIORITIES,
  DEALER_RFQ_PRIORITY_LABELS,
  DEALER_RFQ_PROJECT_TYPE_LABELS,
  DEALER_RFQ_STATUS_LABELS,
  DEALER_RFQ_STATUSES,
  type DealerRFQRecord,
} from "@/features/dealer/dealer-rfq.types";
import { formatCrmDateTime } from "@/features/crm/format";
import type { CrmCustomerRecord } from "@/features/crm/types";

const ADMIN_STATUS_OPTIONS = DEALER_RFQ_STATUSES.filter((s) => s !== "DRAFT" && s !== "SUBMITTED");

type DealerRfqDetailViewProps = {
  rfqId: string;
};

export default function DealerRfqDetailView({ rfqId }: DealerRfqDetailViewProps) {
  const [rfq, setRfq] = useState<DealerRFQRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [status, setStatus] = useState("");
  const [crmSearch, setCrmSearch] = useState("");
  const [crmResults, setCrmResults] = useState<CrmCustomerRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dealer/rfqs/${rfqId}`);
      const data = await res.json();
      if (res.ok && data.rfq) {
        setRfq(data.rfq);
        setInternalNote(data.rfq.internalNote ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(url: string, method: string, body?: Record<string, unknown>) {
    setMessage(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    setMessage(res.ok ? (data.message ?? "Đã cập nhật") : (data.message ?? "Thao tác thất bại"));
    if (res.ok) await load();
  }

  async function searchCrm() {
    const params = new URLSearchParams();
    if (crmSearch.trim()) params.set("search", crmSearch.trim());
    const res = await fetch(`/api/crm/customers?${params.toString()}`);
    const data = await res.json();
    if (res.ok) setCrmResults(Array.isArray(data.customers) ? data.customers : []);
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;
  if (!rfq) return <p>Không tìm thấy RFQ.</p>;

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <Link href="/admin/dealer/rfqs" className="admin-btn">← Danh sách RFQ</Link>
          <h2 style={{ marginTop: 12 }}>{rfq.code} — {rfq.title}</h2>
          <p>
            {DEALER_RFQ_STATUS_LABELS[rfq.status]} · {DEALER_RFQ_PRIORITY_LABELS[rfq.priority]} ·{" "}
            {DEALER_RFQ_PROJECT_TYPE_LABELS[rfq.projectType]}
          </p>
        </div>
      </div>

      {message && <p className="admin-hint">{message}</p>}

      <div className="admin-form-grid" style={{ marginTop: 16 }}>
        <section className="admin-card">
          <h3>Tổng quan</h3>
          <dl className="admin-dl">
            <dt>Số lượng</dt><dd>{rfq.quantity ?? "—"}</dd>
            <dt>Deadline</dt><dd>{rfq.deadline ? formatCrmDateTime(rfq.deadline) : "—"}</dd>
            <dt>Ngân sách</dt><dd>{rfq.targetBudget ? `${Number(rfq.targetBudget).toLocaleString("vi-VN")} VND` : "—"}</dd>
            <dt>Gửi lúc</dt><dd>{rfq.submittedAt ? formatCrmDateTime(rfq.submittedAt) : "—"}</dd>
          </dl>
        </section>

        <section className="admin-card">
          <h3>Đại lý</h3>
          {rfq.dealerCompany && (
            <p>
              <Link href={`/admin/dealer/${rfq.dealerCompany.id}`}>{rfq.dealerCompany.name}</Link>
            </p>
          )}
          {rfq.dealerUser && <p>{rfq.dealerUser.name} — {rfq.dealerUser.email}</p>}
        </section>

        <section className="admin-card">
          <h3>Liên hệ</h3>
          <dl className="admin-dl">
            <dt>Họ tên</dt><dd>{rfq.contactName ?? "—"}</dd>
            <dt>Email</dt><dd>{rfq.contactEmail ?? "—"}</dd>
            <dt>SĐT</dt><dd>{rfq.contactPhone ?? "—"}</dd>
          </dl>
        </section>

        <section className="admin-card">
          <h3>CRM</h3>
          {rfq.customer ? (
            <p>CRM: <Link href={`/admin/crm/customers/${rfq.customer.id}`}>{rfq.customer.code} — {rfq.customer.name}</Link></p>
          ) : (
            <p>Chưa liên kết khách hàng CRM</p>
          )}
          {rfq.lead ? (
            <p>Lead: <Link href={`/admin/crm/leads/${rfq.lead.id}`}>{rfq.lead.code ?? rfq.lead.id}</Link></p>
          ) : (
            <button type="button" className="admin-btn admin-btn--primary" style={{ marginTop: 8 }} onClick={() => void runAction(`/api/dealer/rfqs/${rfqId}/convert-lead`, "POST")}>
              Chuyển sang Lead CRM
            </button>
          )}
        </section>
      </div>

      {rfq.productSummary && (
        <section className="admin-card" style={{ marginTop: 16 }}>
          <h3>Mô tả sản phẩm</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{rfq.productSummary}</p>
        </section>
      )}

      {rfq.items.length > 0 && (
        <section className="admin-card" style={{ marginTop: 16 }}>
          <h3>Dòng hàng</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>SL</th>
                <th>In/thêu</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rfq.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{item.skuSnapshot ?? "—"}</td>
                  <td>{item.quantity}</td>
                  <td>{item.decorationType ?? "—"}</td>
                  <td>{item.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="admin-card" style={{ marginTop: 16 }}>
        <h3>Hành động</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Đổi trạng thái</span>
            <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Chọn trạng thái</option>
              {ADMIN_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{DEALER_RFQ_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="admin-btn"
            disabled={!status}
            onClick={() => void runAction(`/api/dealer/rfqs/${rfqId}/status`, "POST", { status })}
          >
            Cập nhật trạng thái
          </button>
        </div>

        <label className="admin-field" style={{ marginTop: 12 }}>
          <span>Ghi chú nội bộ</span>
          <textarea className="admin-input" rows={3} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
        </label>
        <button type="button" className="admin-btn" onClick={() => void runAction(`/api/dealer/rfqs/${rfqId}`, "PATCH", { internalNote })}>
          Lưu ghi chú
        </button>

        <button type="button" className="admin-btn" disabled title="Sprint sau">
          Tạo báo giá (sắp ra mắt)
        </button>
      </section>

      <section className="admin-card" style={{ marginTop: 16 }}>
        <h3>Liên kết khách hàng CRM</h3>
        <div className="admin-crm-filters">
          <input className="admin-input" placeholder="Tìm khách hàng..." value={crmSearch} onChange={(e) => setCrmSearch(e.target.value)} />
          <button type="button" className="admin-btn" onClick={() => void searchCrm()}>Tìm</button>
        </div>
        {crmResults.length > 0 && (
          <ul className="admin-list" style={{ marginTop: 12 }}>
            {crmResults.map((customer) => (
              <li key={customer.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0" }}>
                <span>{customer.code} — {customer.name}</span>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  onClick={() => void runAction(`/api/dealer/rfqs/${rfqId}/link-customer`, "POST", { customerId: customer.id })}
                >
                  Liên kết
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
