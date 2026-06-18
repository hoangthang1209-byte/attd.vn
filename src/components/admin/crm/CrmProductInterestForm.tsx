"use client";

import { useState } from "react";
import type { CrmProductInterestRecord } from "@/features/crm/types";
import { CRM_PRODUCT_SERVICE_OPTIONS } from "@/features/crm/product-interest-utils";
import CrmProductInterestFields, {
  useCrmProducts,
} from "@/components/admin/crm/CrmProductInterestFields";
import {
  createEmptyProductInterestRow,
  type CrmProductInterestRowState,
} from "@/features/crm/product-interest-utils";

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
              {CRM_PRODUCT_SERVICE_OPTIONS.filter((s) => item.serviceNeeds?.[s.key])
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
  const products = useCrmProducts();
  const [row, setRow] = useState<CrmProductInterestRowState>(createEmptyProductInterestRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const selected = products.find((p) => p.id === row.productId);

    try {
      const res = await fetch("/api/crm/product-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          customerId,
          productId: row.productId || null,
          variantId: row.variantId || null,
          productNameSnapshot: row.productNameSnapshot || selected?.name || null,
          quantity: row.quantity ? Number(row.quantity) : null,
          unit: row.unit,
          requirementNote: row.requirementNote || null,
          serviceNeeds: row.serviceNeeds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể thêm sản phẩm quan tâm");
        return;
      }
      setRow(createEmptyProductInterestRow());
      onCreated();
    } catch {
      setError("Không thể thêm sản phẩm quan tâm");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-form--compact" onSubmit={handleSubmit}>
      <CrmProductInterestFields row={row} products={products} onChange={setRow} />
      {error && <p className="admin-message admin-message--error">{error}</p>}
      <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
        {saving ? "Đang lưu..." : "Thêm sản phẩm quan tâm"}
      </button>
    </form>
  );
}
