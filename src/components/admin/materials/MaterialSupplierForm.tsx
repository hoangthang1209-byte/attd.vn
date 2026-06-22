"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AdminBackLink from "@/components/admin/AdminBackLink";
import { buildListBackHref } from "@/lib/admin/list-return";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  mode: "create" | "edit";
  supplierId?: string;
};

export default function MaterialSupplierForm({ mode, supplierId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const listBackHref = buildListBackHref("/admin/material-suppliers", searchParams);
  const [loading, setLoading] = useState(mode === "edit");
  const [supplierCode, setSupplierCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !supplierId) return;
    void fetch(`/api/material-suppliers/${supplierId}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          supplier?: {
            supplierCode: string;
            name: string;
            shortName: string | null;
            contactName: string | null;
            phone: string | null;
            email: string | null;
            address: string | null;
            taxCode: string | null;
            note: string | null;
            isActive: boolean;
          };
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Không tải được nhà cung cấp");
        const s = data.supplier!;
        setSupplierCode(s.supplierCode);
        setName(s.name);
        setShortName(s.shortName ?? "");
        setContactName(s.contactName ?? "");
        setPhone(s.phone ?? "");
        setEmail(s.email ?? "");
        setAddress(s.address ?? "");
        setTaxCode(s.taxCode ?? "");
        setNote(s.note ?? "");
        setIsActive(s.isActive);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, supplierId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      shortName: shortName || null,
      contactName: contactName || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      taxCode: taxCode || null,
      note: note || null,
      isActive,
    };
    const url = mode === "create" ? "/api/material-suppliers" : `/api/material-suppliers/${supplierId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    await mutate({
      loadingMessage: "Đang lưu…",
      successMessage: mode === "create" ? "Đã thêm nhà cung cấp." : "Đã cập nhật nhà cung cấp.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (data) => data.supplier as { id: string });
      },
      onSuccess: (s) => {
        if (mode === "create") {
          setCreatedId(s.id);
        } else {
          router.push(listBackHref);
        }
      },
    });
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;

  if (createdId) {
    return (
      <div className="admin-panel">
        <p>Đã tạo nhà cung cấp thành công.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Link
            href={`/admin/material-suppliers/${createdId}/edit?from=list${searchParams.get("qs") ? `&qs=${encodeURIComponent(searchParams.get("qs")!)}` : ""}`}
            className="admin-btn admin-btn--primary"
          >
            Xem chi tiết
          </Link>
          <Link href={listBackHref} className="admin-btn admin-btn--secondary">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminBackLink href={listBackHref} label="Quay lại danh sách nhà cung cấp" />
      <form className="admin-panel" style={{ marginTop: 12 }} onSubmit={(e) => void handleSubmit(e)}>
        {error && <p className="admin-error">{error}</p>}
        {mode === "edit" && (
          <div className="admin-field">
            <label className="admin-label">Mã NCC</label>
            <input className="admin-input" value={supplierCode} readOnly disabled />
          </div>
        )}
        <div className="admin-field">
          <label className="admin-label">Tên nhà cung cấp *</label>
          <input className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Tên viết tắt</label>
          <input className="admin-input" value={shortName} onChange={(e) => setShortName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Người liên hệ</label>
          <input className="admin-input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số điện thoại</label>
          <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Email</label>
          <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Địa chỉ</label>
          <textarea className="admin-textarea" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mã số thuế</label>
          <input className="admin-input" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Ghi chú</label>
          <textarea className="admin-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Đang hoạt động
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="submit" className="admin-btn admin-btn--primary">
            {mode === "create" ? "Thêm nhà cung cấp" : "Lưu thay đổi"}
          </button>
          <Link href={listBackHref} className="admin-btn admin-btn--secondary">Quay lại danh sách</Link>
        </div>
      </form>
    </>
  );
}
