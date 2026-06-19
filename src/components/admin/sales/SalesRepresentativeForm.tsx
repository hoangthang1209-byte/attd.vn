"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  mode: "create" | "edit";
  salesRepId?: string;
};

export default function SalesRepresentativeForm({ mode, salesRepId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zalo, setZalo] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !salesRepId) return;
    void fetch(`/api/admin/sales/${salesRepId}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          salesRep?: {
            code: string;
            fullName: string;
            title: string | null;
            phone: string | null;
            email: string | null;
            zalo: string | null;
            address: string | null;
            note: string | null;
            isActive: boolean;
            isDefault: boolean;
          };
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Không tải được nhân viên");
        const rep = data.salesRep!;
        setCode(rep.code);
        setFullName(rep.fullName);
        setTitle(rep.title ?? "");
        setPhone(rep.phone ?? "");
        setEmail(rep.email ?? "");
        setZalo(rep.zalo ?? "");
        setAddress(rep.address ?? "");
        setNote(rep.note ?? "");
        setIsActive(rep.isActive);
        setIsDefault(rep.isDefault);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, salesRepId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        fullName,
        title: title || null,
        phone: phone || null,
        email: email || null,
        zalo: zalo || null,
        address: address || null,
        note: note || null,
        isActive,
        isDefault,
      };
      const url =
        mode === "edit" && salesRepId
          ? `/api/admin/sales/${salesRepId}`
          : "/api/admin/sales";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu");
      router.push("/admin/crm/sales");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;

  return (
    <form className="admin-panel admin-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="admin-section-header">
        <Link href="/admin/crm/sales" className="admin-btn admin-btn--secondary">
          Quay lại
        </Link>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu nhân viên"}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {code && (
        <div className="admin-field">
          <label className="admin-label">Mã nhân viên</label>
          <input className="admin-input" value={code} readOnly disabled />
        </div>
      )}

      <div className="admin-seo-brief-form-grid">
        <div className="admin-field">
          <label className="admin-label">Tên nhân viên *</label>
          <input
            className="admin-input"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Chức vụ</label>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số điện thoại</label>
          <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Email</label>
          <input
            className="admin-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Zalo</label>
          <input className="admin-input" value={zalo} onChange={(e) => setZalo(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Địa chỉ</label>
          <input
            className="admin-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-label">Ghi chú</label>
        <textarea className="admin-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <label className="admin-checkbox-row">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Đang hoạt động
      </label>
      <label className="admin-checkbox-row">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Nhân viên mặc định
      </label>
    </form>
  );
}
