"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { MaterialType } from "@prisma/client";
import AdminBackLink from "@/components/admin/AdminBackLink";
import MaterialSupplierSection from "@/components/admin/materials/MaterialSupplierSection";
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPES } from "@/features/materials/material-labels";
import { buildListBackHref } from "@/lib/admin/list-return";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  materialId?: string;
  initial?: {
    name: string;
    materialType: MaterialType;
    unit: string;
    description: string | null;
    specification: string | null;
    defaultSupplierName: string | null;
    reorderPoint: string | null;
    isActive: boolean;
  };
};

export default function MaterialForm({ materialId, initial }: Props) {
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const listBackHref = buildListBackHref("/admin/materials", searchParams);
  const [name, setName] = useState(initial?.name ?? "");
  const [materialType, setMaterialType] = useState<MaterialType>(initial?.materialType ?? "MAIN_FABRIC");
  const [unit, setUnit] = useState(initial?.unit ?? "kg");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [specification, setSpecification] = useState(initial?.specification ?? "");
  const [defaultSupplierName, setDefaultSupplierName] = useState(initial?.defaultSupplierName ?? "");
  const [reorderPoint, setReorderPoint] = useState(initial?.reorderPoint ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await mutate({
      loadingMessage: materialId ? "Đang lưu vật tư…" : "Đang tạo vật tư…",
      successMessage: materialId ? "Đã cập nhật vật tư." : "Đã tạo vật tư.",
      action: async () => {
        const res = await fetch(materialId ? `/api/materials/${materialId}` : "/api/materials", {
          method: materialId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            materialType,
            unit,
            description,
            specification,
            defaultSupplierName,
            reorderPoint: reorderPoint || null,
            isActive,
          }),
        });
        return parseAdminJsonResponse(res, (body) => ({
          id: (body.material as { id: string }).id,
        }));
      },
      onSuccess: (data) => {
        if (!materialId) {
          setCreatedId(data.id);
        }
      },
    });
  }

  if (createdId) {
    const detailHref = `/admin/materials/${createdId}/edit?from=list${searchParams.get("qs") ? `&qs=${encodeURIComponent(searchParams.get("qs")!)}` : ""}`;
    return (
      <div className="admin-panel">
        <p>Đã tạo vật tư thành công.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Link href={detailHref} className="admin-btn admin-btn--primary">Xem chi tiết</Link>
          <Link href={listBackHref} className="admin-btn admin-btn--secondary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminBackLink href={listBackHref} label="Quay lại danh sách vật tư" />
      <form className="admin-form" style={{ marginTop: 12 }} onSubmit={(e) => void submit(e)}>
        <div className="admin-field">
          <label className="admin-label">Tên vật tư *</label>
          <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="admin-field">
          <label className="admin-label">Loại *</label>
          <select className="admin-select" value={materialType} onChange={(e) => setMaterialType(e.target.value as MaterialType)}>
            {MATERIAL_TYPES.map((t) => (
              <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Đơn vị *</label>
          <input className="admin-input" value={unit} onChange={(e) => setUnit(e.target.value)} required />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả</label>
          <textarea className="admin-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Quy cách</label>
          <input className="admin-input" value={specification} onChange={(e) => setSpecification(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">NCC mặc định (văn bản)</label>
          <input className="admin-input" value={defaultSupplierName} onChange={(e) => setDefaultSupplierName(e.target.value)} />
          <p className="admin-field-hint">Giữ tương thích với dữ liệu cũ. Ưu tiên liên kết nhà cung cấp bên dưới.</p>
        </div>
        <div className="admin-field">
          <label className="admin-label">Mức tồn tối thiểu</label>
          <input className="admin-input" type="number" step="0.001" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
          <p className="admin-field-hint">Kho sẽ cảnh báo khi tồn khả dụng thấp hơn mức này.</p>
        </div>
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Đang sử dụng
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="submit" className="admin-btn admin-btn--primary">
            {materialId ? "Lưu vật tư" : "Tạo vật tư"}
          </button>
          <Link href={listBackHref} className="admin-btn admin-btn--secondary">Quay lại danh sách</Link>
        </div>
      </form>
      {materialId && <MaterialSupplierSection materialId={materialId} />}
    </>
  );
}
