"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialType } from "@prisma/client";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPES } from "@/features/orders/production-pack-labels";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import type { ProductMaterialRecord } from "@/features/products/product-material.types";

type Props = {
  productId: string;
};

const emptyForm = () => ({
  materialType: "MAIN_FABRIC" as MaterialType,
  materialName: "",
  materialCode: "",
  unit: "",
  consumptionPerUnit: "",
  wastagePercent: "0",
  note: "",
});

export default function ProductMaterialSection({ productId }: Props) {
  const mutate = useAdminMutation();
  const [materials, setMaterials] = useState<ProductMaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/materials`);
      const data = await res.json();
      setMaterials(Array.isArray(data.materials) ? data.materials : []);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(row: ProductMaterialRecord) {
    setEditId(row.id);
    setForm({
      materialType: row.materialType,
      materialName: row.materialName,
      materialCode: row.materialCode ?? "",
      unit: row.unit,
      consumptionPerUnit: row.consumptionPerUnit,
      wastagePercent: row.wastagePercent,
      note: row.note ?? "",
    });
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      materialType: form.materialType,
      materialName: form.materialName,
      materialCode: form.materialCode || null,
      unit: form.unit,
      consumptionPerUnit: form.consumptionPerUnit,
      wastagePercent: form.wastagePercent,
      note: form.note || null,
    };

    await mutate({
      loadingMessage: editId ? "Đang cập nhật…" : "Đang thêm…",
      successMessage: editId ? "Đã cập nhật định mức." : "Đã thêm định mức.",
      action: async () => {
        const url = editId
          ? `/api/admin/products/${productId}/materials/${editId}`
          : `/api/admin/products/${productId}/materials`;
        const res = await fetch(url, {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => {
        setFormOpen(false);
        void load();
      },
    });
  }

  async function toggleActive(row: ProductMaterialRecord) {
    await mutate({
      loadingMessage: "Đang cập nhật…",
      successMessage: row.isActive ? "Đã tắt định mức." : "Đã kích hoạt định mức.",
      action: async () => {
        const res = await fetch(`/api/admin/products/${productId}/materials/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !row.isActive }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void load(),
    });
  }

  async function remove(row: ProductMaterialRecord) {
    if (!confirm("Xóa hoặc vô hiệu hóa dòng định mức này?")) return;
    await mutate({
      loadingMessage: "Đang xử lý…",
      successMessage: "Đã xử lý.",
      action: async () => {
        const res = await fetch(`/api/admin/products/${productId}/materials/${row.id}`, {
          method: "DELETE",
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void load(),
    });
  }

  return (
    <fieldset className="admin-catalog-fieldset" style={{ marginTop: 24 }}>
      <legend>Định mức nguyên phụ liệu</legend>
      <p className="admin-field-hint">
        Định mức được sao chép sang đơn hàng khi tạo đơn. Chỉnh sửa tại đơn hàng không ảnh hưởng catalog.
      </p>

      <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={openAdd} style={{ marginBottom: 12 }}>
        Thêm dòng định mức
      </button>

      {formOpen && (
        <form onSubmit={(e) => void submit(e)} className="product-material-form" style={{ marginBottom: 16 }}>
          <div className="admin-field">
            <label className="admin-label">Loại nguyên phụ liệu *</label>
            <select
              className="admin-input"
              value={form.materialType}
              onChange={(e) => setForm((f) => ({ ...f, materialType: e.target.value as MaterialType }))}
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên nguyên phụ liệu *</label>
            <input className="admin-input" required value={form.materialName} onChange={(e) => setForm((f) => ({ ...f, materialName: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã vật tư</label>
            <input className="admin-input" value={form.materialCode} onChange={(e) => setForm((f) => ({ ...f, materialCode: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Đơn vị *</label>
            <input className="admin-input" required value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="kg, cái, m…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Định mức / sản phẩm *</label>
            <input className="admin-input" required type="number" min={0} step="0.0001" value={form.consumptionPerUnit} onChange={(e) => setForm((f) => ({ ...f, consumptionPerUnit: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Hao hụt %</label>
            <input className="admin-input" type="number" min={0} max={100} step="0.01" value={form.wastagePercent} onChange={(e) => setForm((f) => ({ ...f, wastagePercent: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Ghi chú</label>
            <textarea className="admin-textarea" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="admin-btn admin-btn--primary admin-btn--small">Lưu</button>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setFormOpen(false)}>Hủy</button>
          </div>
        </form>
      )}

      {loading ? (
        <TableLoading
          title="Đang tải định mức..."
          description="Hệ thống đang tải nguyên phụ liệu của sản phẩm."
          tone="admin"
        />
      ) : materials.length === 0 ? (
        <p className="admin-field-hint">Chưa có định mức nguyên phụ liệu.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>Loại</th>
                <th>Tên</th>
                <th>Mã</th>
                <th>ĐVT</th>
                <th>Định mức</th>
                <th>Hao hụt</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((row) => (
                <tr key={row.id} className={!row.isActive ? "is-muted" : undefined}>
                  <td>{MATERIAL_TYPE_LABELS[row.materialType]}</td>
                  <td>{row.materialName}</td>
                  <td>{row.materialCode ?? "—"}</td>
                  <td>{row.unit}</td>
                  <td>{row.consumptionPerUnit}</td>
                  <td>{row.wastagePercent}%</td>
                  <td>{row.isActive ? "Đang dùng" : "Đã tắt"}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => openEdit(row)}>Sửa</button>{" "}
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void toggleActive(row)}>
                      {row.isActive ? "Tắt" : "Bật"}
                    </button>{" "}
                    <button type="button" className="admin-btn admin-btn--danger admin-btn--xs" onClick={() => void remove(row)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </fieldset>
  );
}
