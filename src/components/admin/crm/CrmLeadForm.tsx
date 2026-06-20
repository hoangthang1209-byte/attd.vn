"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import type { LeadPriority, LeadSource, LeadStatus } from "@prisma/client";
import CrmProductInterestFields, {
  useCrmProducts,
} from "@/components/admin/crm/CrmProductInterestFields";
import {
  createEmptyProductInterestRow,
  rowHasProductInterestData,
  type CrmProductInterestRowState,
} from "@/features/crm/product-interest-utils";
import {
  CRM_PRIORITY_LABELS,
  CRM_SOURCE_LABELS,
  CRM_STATUS_LABELS,
} from "@/features/crm/labels";
import {
  CRM_LEAD_PRIORITIES,
  CRM_LEAD_SOURCES,
  CRM_LEAD_STATUSES,
} from "@/features/crm/types";

export default function CrmLeadForm() {
  const router = useRouter();
  const mutate = useAdminMutation();
  const products = useCrmProducts();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zalo, setZalo] = useState("");
  const [source, setSource] = useState<LeadSource>("WEBSITE");
  const [sourceDetail, setSourceDetail] = useState("");
  const [demand, setDemand] = useState("");
  const [status, setStatus] = useState<LeadStatus>("NEW");
  const [priority, setPriority] = useState<LeadPriority>("NORMAL");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [note, setNote] = useState("");
  const [interestRows, setInterestRows] = useState<CrmProductInterestRowState[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addInterestRow() {
    setInterestRows((rows) => [...rows, createEmptyProductInterestRow()]);
  }

  function updateInterestRow(index: number, row: CrmProductInterestRowState) {
    setInterestRows((rows) => rows.map((item, i) => (i === index ? row : item)));
  }

  function removeInterestRow(index: number) {
    setInterestRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const productInterests = interestRows
      .filter(rowHasProductInterestData)
      .map((row) => {
        const selected = products.find((p) => p.id === row.productId);
        return {
          productId: row.productId || null,
          variantId: row.variantId || null,
          productNameSnapshot: row.productNameSnapshot || selected?.name || null,
          quantity: row.quantity ? Number(row.quantity) : null,
          unit: row.unit,
          requirementNote: row.requirementNote || null,
          serviceNeeds: row.serviceNeeds,
        };
      });

    const lead = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin.",
      action: async () => {
        const res = await fetch("/api/crm/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminMode: true,
            companyName,
            contactName,
            phone,
            email,
            zalo,
            source,
            sourceDetail,
            demand,
            status,
            priority,
            estimatedValue: estimatedValue ? Number(estimatedValue.replace(/[^\d]/g, "")) : null,
            nextFollowUpAt: nextFollowUpAt || null,
            note,
            productInterests,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.lead as { id: string });
      },
      onSuccess: (savedLead) => {
        router.push(`/admin/crm/leads/${savedLead.id}`);
      },
    });

    if (!lead) {
      setError("Không thể tạo lead");
    }
    setSaving(false);
  }

  return (
    <form className="admin-form admin-form--wide" onSubmit={handleSubmit}>
      <section className="admin-section-card">
        <h2>Thông tin liên hệ</h2>
        <div className="admin-form-grid">
          <label>
            Tên công ty
            <input className="admin-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </label>
          <label>
            Người liên hệ
            <input className="admin-input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </label>
          <label>
            SĐT
            <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Zalo
            <input className="admin-input" value={zalo} onChange={(e) => setZalo(e.target.value)} />
          </label>
          <label>
            Nguồn
            <select className="admin-input" value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
              {CRM_LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {CRM_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form-grid-span-2">
            Chi tiết nguồn
            <input className="admin-input" value={sourceDetail} onChange={(e) => setSourceDetail(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="admin-section-card">
        <h2>Nhu cầu</h2>
        <div className="admin-form-grid">
          <label className="admin-form-grid-span-2">
            Mô tả nhu cầu
            <textarea className="admin-input" rows={4} value={demand} onChange={(e) => setDemand(e.target.value)} />
          </label>
          <label>
            Trạng thái
            <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
              {CRM_LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CRM_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ưu tiên
            <select
              className="admin-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as LeadPriority)}
            >
              {CRM_LEAD_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {CRM_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giá trị ước tính (VNĐ)
            <input className="admin-input" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
          </label>
          <label>
            Follow-up
            <input
              type="datetime-local"
              className="admin-input"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="admin-section-card">
        <div className="admin-section-header">
          <h2>Sản phẩm quan tâm</h2>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={addInterestRow}>
            Thêm sản phẩm quan tâm
          </button>
        </div>

        {interestRows.length === 0 ? (
          <p className="admin-empty-hint">Chưa thêm sản phẩm quan tâm. Nhấn &quot;Thêm sản phẩm quan tâm&quot; nếu cần.</p>
        ) : (
          <div className="admin-crm-interest-rows">
            {interestRows.map((row, index) => (
              <div key={row.key} className="admin-crm-interest-row">
                <div className="admin-section-header">
                  <strong>Dòng {index + 1}</strong>
                  <button
                    type="button"
                    className="admin-link-button admin-link-button--danger"
                    onClick={() => removeInterestRow(index)}
                  >
                    Xóa dòng
                  </button>
                </div>
                <CrmProductInterestFields
                  row={row}
                  products={products}
                  onChange={(next) => updateInterestRow(index, next)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section-card">
        <h2>Ghi chú nội bộ</h2>
        <textarea className="admin-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </section>

      {error && <p className="admin-message admin-message--error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? "Đang lưu..." : "Tạo lead"}
        </button>
      </div>
    </form>
  );
}
