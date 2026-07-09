"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";

type Props = {
  mode: "create" | "edit";
  carrierId?: string;
};

export default function DeliveryCarrierForm({ mode, carrierId }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const [loading, setLoading] = useState(mode === "edit");
  const [carrierCode, setCarrierCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [apiEnabled, setApiEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !carrierId) return;
    void fetch(`/api/delivery-carriers/${carrierId}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          deliveryCarrier?: {
            carrierCode: string;
            name: string;
            shortName: string | null;
            description: string | null;
            sortOrder: number;
            isActive: boolean;
            apiEnabled: boolean;
          };
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Không tải được đơn vị vận chuyển");
        const c = data.deliveryCarrier!;
        setCarrierCode(c.carrierCode);
        setName(c.name);
        setShortName(c.shortName ?? "");
        setDescription(c.description ?? "");
        setSortOrder(String(c.sortOrder));
        setIsActive(c.isActive);
        setApiEnabled(c.apiEnabled);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, carrierId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      shortName: shortName || null,
      description: description || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
      apiEnabled,
    };
    const url = mode === "create" ? "/api/delivery-carriers" : `/api/delivery-carriers/${carrierId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    await mutate({
      loadingMessage: "Đang lưu…",
      successMessage: "Đã lưu đơn vị vận chuyển.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (data) => data.deliveryCarrier as { id: string });
      },
      onSuccess: (c) => {
        router.push(`/admin/delivery-carriers/${c.id}/edit`);
      },
    });
  }

  if (loading) return <AdminPageSkeleton message="Đang tải đơn vị vận chuyển…" />;

  return (
    <form className="admin-panel" onSubmit={(e) => void handleSubmit(e)}>
      {error && <p className="admin-error">{error}</p>}
      {mode === "edit" && (
        <div className="admin-field">
          <label className="admin-label">Mã đơn vị</label>
          <input className="admin-input" value={carrierCode} readOnly disabled />
        </div>
      )}
      <div className="admin-field">
        <label className="admin-label">Tên đơn vị *</label>
        <input className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Tên viết tắt</label>
        <input className="admin-input" value={shortName} onChange={(e) => setShortName(e.target.value)} />
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
      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={apiEnabled} onChange={(e) => setApiEnabled(e.target.checked)} />
          Sẵn sàng kết nối API
        </label>
        <p className="admin-field-hint">Chỉ đánh dấu sẵn sàng — chưa có tích hợp API thực tế.</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="submit" className="admin-btn admin-btn--primary">
          {mode === "create" ? "Thêm đơn vị vận chuyển" : "Lưu thay đổi"}
        </button>
        <Link href="/admin/delivery-carriers" className="admin-btn admin-btn--secondary">Quay lại</Link>
      </div>
    </form>
  );
}
