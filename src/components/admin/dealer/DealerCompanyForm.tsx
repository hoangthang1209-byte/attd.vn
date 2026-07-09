"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DealerCompanyType, DealerLevel } from "@prisma/client";
import {
  DEALER_COMPANY_TYPE_LABELS,
  DEALER_LEVEL_LABELS,
} from "@/features/dealer/labels";
import { DEALER_COMPANY_TYPES, DEALER_LEVELS } from "@/features/dealer/types";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type DealerCompanyFormProps = {
  mode: "create" | "edit";
  initial?: {
    name?: string;
    legalName?: string | null;
    taxCode?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string;
    type?: DealerCompanyType;
    level?: DealerLevel;
    notes?: string | null;
  };
  companyId?: string;
};

export default function DealerCompanyForm({ mode, initial, companyId }: DealerCompanyFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    legalName: initial?.legalName ?? "",
    taxCode: initial?.taxCode ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    website: initial?.website ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "Vietnam",
    type: (initial?.type ?? "DEALER") as DealerCompanyType,
    level: (initial?.level ?? "STANDARD") as DealerLevel,
    notes: initial?.notes ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      legalName: form.legalName || null,
      taxCode: form.taxCode || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || "Vietnam",
      type: form.type,
      level: form.level,
      notes: form.notes || null,
    };

    try {
      const url = mode === "create" ? "/api/dealer/companies" : `/api/dealer/companies/${companyId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể lưu đại lý");
        return;
      }
      const id = data.company?.id ?? companyId;
      router.push(id ? `/admin/dealer/${id}` : "/admin/dealer");
      router.refresh();
    } catch {
      setError("Không thể lưu đại lý");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-panel" onSubmit={(e) => void handleSubmit(e)}>
      {error && <p className="admin-form-error">{error}</p>}

      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Tên công ty *</span>
          <input
            className="admin-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          <span>Tên pháp lý</span>
          <input
            className="admin-input"
            value={form.legalName}
            onChange={(e) => setForm({ ...form, legalName: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Mã số thuế</span>
          <input
            className="admin-input"
            value={form.taxCode}
            onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Email</span>
          <input
            type="email"
            className="admin-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Số điện thoại</span>
          <input
            className="admin-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Website</span>
          <input
            className="admin-input"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Loại đại lý</span>
          <select
            className="admin-input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as DealerCompanyType })}
          >
            {DEALER_COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>
                {DEALER_COMPANY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Cấp đại lý</span>
          <select
            className="admin-input"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value as DealerLevel })}
          >
            {DEALER_LEVELS.map((l) => (
              <option key={l} value={l}>
                {DEALER_LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-field--full">
          <span>Địa chỉ</span>
          <input
            className="admin-input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Thành phố</span>
          <input
            className="admin-input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Quốc gia</span>
          <input
            className="admin-input"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
        </label>
        <label className="admin-field admin-field--full">
          <span>Ghi chú nội bộ</span>
          <textarea
            className="admin-input"
            rows={4}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-form-actions">
        <AdminLoadingButton
          type="submit"
          variant="primary"
          pending={saving}
          pendingLabel={mode === "create" ? "Đang tạo đại lý…" : "Đang cập nhật đại lý…"}
        >
          {mode === "create" ? "Tạo đại lý" : "Cập nhật"}
        </AdminLoadingButton>
      </div>
    </form>
  );
}
