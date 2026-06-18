"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadPriority, LeadSource, LeadStatus } from "@prisma/client";
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

const SERVICE_OPTIONS = [
  { key: "inLogo", label: "In logo" },
  { key: "embroidery", label: "Thêu" },
  { key: "customSewing", label: "May theo yêu cầu" },
  { key: "packaging", label: "Đóng gói" },
  { key: "sample", label: "Cần mẫu" },
] as const;

type ProductOption = { id: string; name: string; productCode: string | null };

export default function CrmLeadForm() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
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
  const [productId, setProductId] = useState("");
  const [productNameSnapshot, setProductNameSnapshot] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("cái");
  const [requirementNote, setRequirementNote] = useState("");
  const [serviceNeeds, setServiceNeeds] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/products?pageSize=200")
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data.products) ? data.products : [];
        setProducts(
          items.map((p: { id: string; name: string; productCode?: string | null }) => ({
            id: p.id,
            name: p.name,
            productCode: p.productCode ?? null,
          }))
        );
      })
      .catch(() => setProducts([]));
  }, []);

  function toggleService(key: string) {
    setServiceNeeds((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const selected = products.find((p) => p.id === productId);
    const hasInterest =
      productId || productNameSnapshot || quantity || requirementNote;

    try {
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
          productInterest: hasInterest
            ? {
                productId: productId || null,
                productNameSnapshot: productNameSnapshot || selected?.name || null,
                quantity: quantity ? Number(quantity) : null,
                unit,
                requirementNote: requirementNote || null,
                serviceNeeds,
              }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể tạo lead");
        return;
      }
      router.push(`/admin/crm/leads/${data.lead.id}`);
    } catch {
      setError("Không thể tạo lead");
    } finally {
      setSaving(false);
    }
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
        <h2>Sản phẩm quan tâm</h2>
        <label>
          Sản phẩm trong catalog
          <select className="admin-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">— Chọn sản phẩm hoặc nhập tên bên dưới —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productCode ? `${p.productCode} — ` : ""}
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tên sản phẩm (nếu chưa có trong catalog)
          <input
            className="admin-input"
            value={productNameSnapshot}
            onChange={(e) => setProductNameSnapshot(e.target.value)}
          />
        </label>
        <div className="admin-form-grid">
          <label>
            Số lượng
            <input type="number" min={1} className="admin-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label>
            Đơn vị
            <input className="admin-input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
        </div>
        <label>
          Ghi chú yêu cầu
          <textarea className="admin-input" rows={2} value={requirementNote} onChange={(e) => setRequirementNote(e.target.value)} />
        </label>
        <fieldset className="admin-checkbox-group">
          <legend>Dịch vụ kèm theo</legend>
          {SERVICE_OPTIONS.map((opt) => (
            <label key={opt.key} className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={Boolean(serviceNeeds[opt.key])}
                onChange={() => toggleService(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>
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
