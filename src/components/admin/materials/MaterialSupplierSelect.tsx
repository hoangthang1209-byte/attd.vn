"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialSupplierRecord } from "@/features/materials/material-supplier.service";

type Props = {
  value: string;
  onChange: (supplierId: string, supplier?: MaterialSupplierRecord | null) => void;
  disabled?: boolean;
};

export default function MaterialSupplierSelect({ value, onChange, disabled }: Props) {
  const [suppliers, setSuppliers] = useState<MaterialSupplierRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ active: "1" });
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/material-suppliers?${params}`);
    const data = (await res.json()) as { suppliers?: MaterialSupplierRecord[] };
    setSuppliers(data.suppliers ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = suppliers.find((s) => s.id === value);

  return (
    <div>
      <div className="admin-field">
        <label className="admin-label">Tìm nhà cung cấp</label>
        <input
          className="admin-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          placeholder="Tìm theo tên, mã, SĐT..."
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Nhà cung cấp</label>
        <select
          className="admin-input"
          value={value}
          disabled={disabled || loading}
          onChange={(e) => {
            const id = e.target.value;
            onChange(id, suppliers.find((s) => s.id === id) ?? null);
          }}
        >
          <option value="">— Chọn nhà cung cấp —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.supplierCode} · {s.name}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="admin-field-hint">
          {selected.contactName && <p>Liên hệ: {selected.contactName}</p>}
          {selected.phone && <p>SĐT: {selected.phone}</p>}
          {selected.email && <p>Email: {selected.email}</p>}
        </div>
      )}
    </div>
  );
}
