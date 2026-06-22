"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialSupplierRecord } from "@/features/materials/material-supplier.service";
import type { MaterialSupplierLinkRecord } from "@/features/materials/material-supplier-link.service";
import QuickAddMaterialSupplierModal from "@/components/admin/materials/QuickAddMaterialSupplierModal";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  materialId: string;
};

export default function MaterialSupplierSection({ materialId }: Props) {
  const mutate = useAdminMutation();
  const [links, setLinks] = useState<MaterialSupplierLinkRecord[]>([]);
  const [suppliers, setSuppliers] = useState<MaterialSupplierRecord[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierMaterialCode, setSupplierMaterialCode] = useState("");
  const [supplierMaterialName, setSupplierMaterialName] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLinks = useCallback(async () => {
    const res = await fetch(`/api/materials/${materialId}/suppliers`);
    const data = (await res.json()) as { links?: MaterialSupplierLinkRecord[] };
    setLinks(data.links ?? []);
    setLoading(false);
  }, [materialId]);

  const loadSuppliers = useCallback(async (search?: string) => {
    const params = new URLSearchParams({ active: "1" });
    if (search?.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/material-suppliers?${params}`);
    const data = (await res.json()) as { suppliers?: MaterialSupplierRecord[] };
    setSuppliers(data.suppliers ?? []);
  }, []);

  useEffect(() => {
    void loadLinks();
    void loadSuppliers();
  }, [loadLinks, loadSuppliers]);

  async function linkSupplier(supplierId?: string) {
    const id = supplierId ?? selectedSupplierId;
    if (!id) return;
    await mutate({
      loadingMessage: "Đang liên kết nhà cung cấp…",
      successMessage: "Đã liên kết nhà cung cấp.",
      action: async () => {
        const res = await fetch(`/api/materials/${materialId}/suppliers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: id,
            supplierMaterialCode: supplierMaterialCode || null,
            supplierMaterialName: supplierMaterialName || null,
            note: linkNote || null,
            isPreferred: links.length === 0,
          }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => {
        setSelectedSupplierId("");
        setSupplierMaterialCode("");
        setSupplierMaterialName("");
        setLinkNote("");
        void loadLinks();
      },
    });
  }

  async function setPreferred(linkId: string) {
    await mutate({
      loadingMessage: "Đang cập nhật…",
      successMessage: "Đã đặt nhà cung cấp ưu tiên.",
      action: async () => {
        const res = await fetch(`/api/materials/${materialId}/suppliers/${linkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPreferred: true }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void loadLinks(),
    });
  }

  async function removeLink(linkId: string) {
    await mutate({
      loadingMessage: "Đang xóa liên kết…",
      successMessage: "Đã xóa liên kết nhà cung cấp.",
      action: async () => {
        const res = await fetch(`/api/materials/${materialId}/suppliers/${linkId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string };
          return { ok: false as const, message: body.message ?? "Không thể xóa" };
        }
        return { ok: true as const, data: true };
      },
      onSuccess: () => void loadLinks(),
    });
  }

  async function handleQuickCreated(supplier: MaterialSupplierRecord) {
    setSuppliers((prev) => (prev.some((s) => s.id === supplier.id) ? prev : [...prev, supplier]));
    await linkSupplier(supplier.id);
  }

  const filteredSuppliers = suppliers.filter((s) => {
    if (!supplierSearch.trim()) return true;
    const q = supplierSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.supplierCode.toLowerCase().includes(q) ||
      (s.shortName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
      <legend>Nhà cung cấp</legend>
      {loading ? (
        <p className="admin-field-hint">Đang tải…</p>
      ) : (
        <>
          {links.length === 0 ? (
            <p className="admin-field-hint">Chưa liên kết nhà cung cấp nào.</p>
          ) : (
            <div className="admin-table-wrap" style={{ marginBottom: 12 }}>
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Nhà cung cấp</th>
                    <th>Mã NCC vật tư</th>
                    <th>Liên hệ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr key={link.id}>
                      <td>
                        {link.isPreferred && <span className="ops-urgency-badge ops-urgency--ok">Ưu tiên</span>}{" "}
                        {link.supplierName}
                        {link.supplierShortName ? ` (${link.supplierShortName})` : ""}
                      </td>
                      <td>{link.supplierMaterialCode ?? "—"}</td>
                      <td>{link.phone ?? link.contactName ?? "—"}</td>
                      <td>
                        {!link.isPreferred && (
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost admin-btn--small"
                            onClick={() => void setPreferred(link.id)}
                          >
                            Đặt ưu tiên
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--small"
                          onClick={() => void removeLink(link.id)}
                        >
                          Gỡ liên kết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-catalog-variant-fields">
            <div className="admin-field">
              <label className="admin-label">Tìm nhà cung cấp</label>
              <input
                className="admin-input"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc mã NCC"
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Chọn nhà cung cấp</label>
              <select
                className="admin-input"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
              >
                <option value="">— Chọn —</option>
                {filteredSuppliers
                  .filter((s) => !links.some((l) => l.supplierId === s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplierCode} · {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã vật tư theo NCC</label>
              <input className="admin-input" value={supplierMaterialCode} onChange={(e) => setSupplierMaterialCode(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tên vật tư theo NCC</label>
              <input className="admin-input" value={supplierMaterialName} onChange={(e) => setSupplierMaterialName(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <input className="admin-input" value={linkNote} onChange={(e) => setLinkNote(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              disabled={!selectedSupplierId}
              onClick={() => void linkSupplier()}
            >
              Liên kết nhà cung cấp
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--small"
              onClick={() => setQuickOpen(true)}
            >
              Thêm nhà cung cấp
            </button>
          </div>
        </>
      )}
      <QuickAddMaterialSupplierModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(supplier) => void handleQuickCreated(supplier)}
      />
    </fieldset>
  );
}
