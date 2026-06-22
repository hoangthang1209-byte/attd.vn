"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminBackLink from "@/components/admin/AdminBackLink";
import MaterialSupplierSelect from "@/components/admin/materials/MaterialSupplierSelect";
import { buildListBackHref } from "@/lib/admin/list-return";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

export default function PurchaseRequestNewForm() {
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const listBackHref = buildListBackHref("/admin/purchase-requests", searchParams);
  const [supplierId, setSupplierId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await mutate({
      loadingMessage: "Đang tạo yêu cầu…",
      successMessage: "Đã tạo yêu cầu mua hàng.",
      action: async () => {
        const res = await fetch("/api/purchase-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: supplierId || null,
            items: [
              {
                materialNameSnapshot: materialName,
                unitSnapshot: unit,
                requestedQuantity: quantity,
              },
            ],
          }),
        });
        return parseAdminJsonResponse(res, (body) => ({
          id: (body.request as { id: string }).id,
        }));
      },
      onSuccess: (data) => setCreatedId(data.id),
    });
  }

  if (createdId) {
    const detailHref = `/admin/purchase-requests/${createdId}?from=list${searchParams.get("qs") ? `&qs=${encodeURIComponent(searchParams.get("qs")!)}` : ""}`;
    return (
      <div className="admin-panel">
        <p>Đã tạo yêu cầu mua hàng thành công.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Link href={detailHref} className="admin-btn admin-btn--primary">Xem chi tiết</Link>
          <Link href={listBackHref} className="admin-btn admin-btn--secondary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminBackLink href={listBackHref} label="Quay lại danh sách yêu cầu mua hàng" />
      <form className="admin-form" style={{ marginTop: 12 }} onSubmit={(e) => void submit(e)}>
        <MaterialSupplierSelect value={supplierId} onChange={(id) => setSupplierId(id)} />
        <div className="admin-field">
          <label className="admin-label">Tên vật tư *</label>
          <input className="admin-input" value={materialName} onChange={(e) => setMaterialName(e.target.value)} required />
        </div>
        <div className="admin-field">
          <label className="admin-label">Đơn vị *</label>
          <input className="admin-input" value={unit} onChange={(e) => setUnit(e.target.value)} required />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số lượng yêu cầu *</label>
          <input className="admin-input" type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="admin-btn admin-btn--primary">Tạo yêu cầu</button>
          <Link href={listBackHref} className="admin-btn admin-btn--secondary">Quay lại danh sách</Link>
        </div>
      </form>
    </>
  );
}
