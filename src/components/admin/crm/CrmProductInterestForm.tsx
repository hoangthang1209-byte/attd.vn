"use client";

import { useEffect, useState } from "react";
import type { CrmProductInterestRecord } from "@/features/crm/types";

const SERVICE_OPTIONS = [
  { key: "inLogo", label: "In logo" },
  { key: "embroidery", label: "Thêu" },
  { key: "customSewing", label: "May theo yêu cầu" },
  { key: "packaging", label: "Đóng gói" },
  { key: "sample", label: "Cần mẫu" },
] as const;

type ProductOption = { id: string; name: string; productCode: string | null };

export function CrmProductInterestList({
  interests,
}: {
  interests: CrmProductInterestRecord[];
}) {
  if (interests.length === 0) {
    return <p className="admin-empty-hint">Chưa có sản phẩm quan tâm</p>;
  }

  return (
    <ul className="admin-crm-interest-list">
      {interests.map((item) => (
        <li key={item.id} className="admin-crm-interest-item">
          <strong>{item.productNameSnapshot || "Sản phẩm tùy chỉnh"}</strong>
          {item.quantity != null && (
            <span>
              {" "}
              — {item.quantity} {item.unit || "cái"}
            </span>
          )}
          {item.requirementNote && <p>{item.requirementNote}</p>}
          {item.serviceNeeds && (
            <p className="admin-crm-interest-services">
              {SERVICE_OPTIONS.filter((s) => item.serviceNeeds?.[s.key])
                .map((s) => s.label)
                .join(", ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CrmProductInterestForm({
  leadId,
  customerId,
  onCreated,
}: {
  leadId?: string;
  customerId?: string;
  onCreated: () => void;
}) {
  const [products, setProducts] = useState<ProductOption[]>([]);
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

    try {
      const res = await fetch("/api/crm/product-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          customerId,
          productId: productId || null,
          productNameSnapshot: productNameSnapshot || selected?.name || null,
          quantity: quantity ? Number(quantity) : null,
          unit,
          requirementNote: requirementNote || null,
          serviceNeeds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể thêm sản phẩm quan tâm");
        return;
      }
      setProductId("");
      setProductNameSnapshot("");
      setQuantity("");
      setRequirementNote("");
      setServiceNeeds({});
      onCreated();
    } catch {
      setError("Không thể thêm sản phẩm quan tâm");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-form--compact" onSubmit={handleSubmit}>
      <label>
        Sản phẩm trong catalog
        <select
          className="admin-input"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
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
          placeholder="VD: Áo polo cao cấp in logo"
        />
      </label>
      <div className="admin-form-grid">
        <label>
          Số lượng
          <input
            type="number"
            min={1}
            className="admin-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <label>
          Đơn vị
          <input
            className="admin-input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </label>
      </div>
      <label>
        Ghi chú yêu cầu
        <textarea
          className="admin-input"
          rows={2}
          value={requirementNote}
          onChange={(e) => setRequirementNote(e.target.value)}
        />
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
      {error && <p className="admin-message admin-message--error">{error}</p>}
      <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
        {saving ? "Đang lưu..." : "Thêm sản phẩm quan tâm"}
      </button>
    </form>
  );
}
