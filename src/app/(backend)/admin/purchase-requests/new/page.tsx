"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

export default function AdminPurchaseRequestNewPage() {
  const router = useRouter();
  const mutate = useAdminMutation();
  const [supplierName, setSupplierName] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");

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
            supplierName,
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
      onSuccess: (data) => router.push(`/admin/purchase-requests/${data.id}`),
    });
  }

  return (
    <>
      <AdminPageTitle title="Tạo yêu cầu mua hàng" />
      <form className="admin-form" onSubmit={(e) => void submit(e)}>
        <div className="admin-field">
          <label className="admin-label">Nhà cung cấp</label>
          <input className="admin-input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </div>
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
        <button type="submit" className="admin-btn admin-btn--primary">Tạo yêu cầu</button>
      </form>
    </>
  );
}
