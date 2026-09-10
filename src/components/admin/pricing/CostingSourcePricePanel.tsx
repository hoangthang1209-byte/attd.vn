"use client";

import { useCallback, useEffect, useState } from "react";
import type { PricingCalculationType } from "@prisma/client";
import ProductionMasterSearchSelect from "@/components/admin/production-master/ProductionMasterSearchSelect";
import { SectionCard, StatusBadge } from "@/components/admin/AdminUi";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { formatPricingCurrency } from "@/features/pricing/format";
import { PRICING_CALCULATION_TYPE_LABELS } from "@/features/pricing/labels";
import type { CostingSourcePriceRecord } from "@/features/pricing/costing-source-price";
import { COSTING_PURCHASE_UNITS } from "@/features/pricing/costing-source-price";

type Props = {
  title?: string;
  pricesApiPath: string;
  defaultUnit: string;
  showCalculationType?: boolean;
  suggestedUnits?: readonly string[];
};

const CALC_TYPES: PricingCalculationType[] = ["PER_ITEM", "PER_ORDER", "PER_POSITION", "MANUAL"];

export default function CostingSourcePricePanel({
  title = "Giá nhà cung cấp",
  pricesApiPath,
  defaultUnit,
  showCalculationType = false,
  suggestedUnits = COSTING_PURCHASE_UNITS,
}: Props) {
  const [items, setItems] = useState<CostingSourcePriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierLabel, setSupplierLabel] = useState<string | null>(null);
  const [unitPrice, setUnitPrice] = useState("");
  const [unit, setUnit] = useState(defaultUnit);
  const [calculationType, setCalculationType] = useState<PricingCalculationType>("PER_ITEM");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(pricesApiPath);
      const data = (await res.json()) as { items?: CostingSourcePriceRecord[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải giá nhà cung cấp");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải giá nhà cung cấp");
    } finally {
      setLoading(false);
    }
  }, [pricesApiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setSupplierId(null);
    setSupplierLabel(null);
    setUnitPrice("");
    setUnit(defaultUnit);
    setCalculationType("PER_ITEM");
    setNote("");
  }

  function startEdit(row: CostingSourcePriceRecord) {
    setEditingId(row.id);
    setSupplierId(row.supplierId);
    setSupplierLabel(`${row.supplierCode} — ${row.supplierName}`);
    setUnitPrice(String(row.unitPrice));
    setUnit(row.unit);
    setCalculationType(row.calculationType ?? "PER_ITEM");
    setNote(row.note ?? "");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        supplierId,
        unitPrice,
        unit,
        note: note.trim() || null,
        isActive: true,
      };
      if (showCalculationType) payload.calculationType = calculationType;
      const url = editingId ? `${pricesApiPath}/${editingId}` : pricesApiPath;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu giá");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu giá");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(row: CostingSourcePriceRecord) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${pricesApiPath}/${row.id}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể ngưng giá");
      if (editingId === row.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi ngưng giá");
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate(row: CostingSourcePriceRecord) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${pricesApiPath}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể kích hoạt lại");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kích hoạt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title={title}>
      <p className="admin-muted" style={{ marginTop: 0, fontSize: 13 }}>
        Giá tham chiếu hiện tại theo nhà cung cấp / xưởng. Không tự chọn giá rẻ nhất.
      </p>
      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-muted">Đang tải giá nhà cung cấp…</p>
      ) : items.length === 0 ? (
        <p className="admin-muted">Chưa có giá nhà cung cấp.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{showCalculationType ? "NCC / Xưởng" : "Nhà cung cấp"}</th>
                <th>Giá</th>
                <th>Đơn vị</th>
                {showCalculationType && <th>Cách tính</th>}
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.supplierName}
                    <div className="admin-muted" style={{ fontSize: 12 }}>
                      {row.supplierCode}
                    </div>
                  </td>
                  <td>{formatPricingCurrency(row.unitPrice)}</td>
                  <td>{row.unit}</td>
                  {showCalculationType && (
                    <td>
                      {row.calculationType
                        ? PRICING_CALCULATION_TYPE_LABELS[row.calculationType]
                        : "—"}
                    </td>
                  )}
                  <td>
                    <StatusBadge tone={row.isActive ? "success" : "danger"}>
                      {row.isActive ? "Đang dùng" : "Đã vô hiệu hóa"}
                    </StatusBadge>
                  </td>
                  <td>{row.note ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="admin-btn admin-btn--xs" onClick={() => startEdit(row)}>
                        Sửa
                      </button>
                      {row.isActive ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs admin-btn--danger"
                          onClick={() => void handleDeactivate(row)}
                        >
                          Vô hiệu hóa
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs"
                          onClick={() => void handleReactivate(row)}
                        >
                          Dùng lại
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-form-grid" style={{ marginTop: 16 }}>
        <label className="admin-field">
          <span>{showCalculationType ? "NCC / Xưởng" : "Nhà cung cấp"}</span>
          <ProductionMasterSearchSelect
            apiPath="/api/production-suppliers"
            value={supplierId}
            displayLabel={supplierLabel}
            placeholder="Tìm nhà cung cấp / xưởng..."
            onSelect={(picked) => {
              setSupplierId(picked?.id ?? null);
              setSupplierLabel(picked ? `${picked.code} — ${picked.name}` : null);
            }}
          />
        </label>
        <label className="admin-field">
          <span>Giá</span>
          <input
            className="admin-input"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="95000"
          />
        </label>
        <label className="admin-field">
          <span>Đơn vị</span>
          <input
            className="admin-input"
            list="costing-source-price-units"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <datalist id="costing-source-price-units">
            {suggestedUnits.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
        {showCalculationType && (
          <label className="admin-field">
            <span>Cách tính</span>
            <select
              className="admin-select"
              value={calculationType}
              onChange={(e) => setCalculationType(e.target.value as PricingCalculationType)}
            >
              {CALC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PRICING_CALCULATION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="admin-field admin-field--full">
          <span>Ghi chú</span>
          <input className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <AdminLoadingButton
          type="button"
          variant="primary"
          pending={saving}
          pendingLabel="Đang lưu…"
          disabled={saving || !supplierId || !unitPrice.trim()}
          onClick={() => void handleSave()}
        >
          {editingId ? "Cập nhật giá" : "Thêm giá"}
        </AdminLoadingButton>
        {editingId && (
          <button type="button" className="admin-btn" onClick={resetForm}>
            Hủy
          </button>
        )}
      </div>
    </SectionCard>
  );
}
