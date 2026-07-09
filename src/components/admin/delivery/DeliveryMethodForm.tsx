"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";

type Props = {
  mode: "create" | "edit";
  methodId?: string;
};

export default function DeliveryMethodForm({ mode, methodId }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const [loading, setLoading] = useState(mode === "edit");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !methodId) return;
    void fetch(`/api/delivery-methods/${methodId}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          deliveryMethod?: {
            code: string;
            name: string;
            description: string | null;
            sortOrder: number;
            isActive: boolean;
          };
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Không tải được hình thức giao hàng");
        const m = data.deliveryMethod!;
        setCode(m.code);
        setName(m.name);
        setDescription(m.description ?? "");
        setSortOrder(String(m.sortOrder));
        setIsActive(m.isActive);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, methodId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      description: description || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
    };
    const url = mode === "create" ? "/api/delivery-methods" : `/api/delivery-methods/${methodId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    await mutate({
      loadingMessage: "Đang lưu…",
      successMessage: "Đã lưu hình thức giao hàng.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (data) => data.deliveryMethod as { id: string });
      },
      onSuccess: (m) => {
        router.push(`/admin/delivery-methods/${m.id}/edit`);
      },
    });
  }

  if (loading) return <AdminPageSkeleton message="Đang tải phương thức giao hàng…" />;

  return (
    <form className="admin-panel" onSubmit={(e) => void handleSubmit(e)}>
      {error && <p className="admin-error">{error}</p>}
      {mode === "edit" && (
        <div className="admin-field">
          <label className="admin-label">Mã</label>
          <input className="admin-input" value={code} readOnly disabled />
        </div>
      )}
      <div className="admin-field">
        <label className="admin-label">Tên hình thức *</label>
        <input className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Mô tả</label>
        <textarea className="admin-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Thứ tự hiển thị</label>
        <input className="admin-input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Đang hoạt động
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="submit" className="admin-btn admin-btn--primary">
          {mode === "create" ? "Tạo hình thức" : "Lưu thay đổi"}
        </button>
        <Link href="/admin/delivery-methods" className="admin-btn admin-btn--secondary">Quay lại</Link>
      </div>
    </form>
  );
}
