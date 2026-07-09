"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  initial: {
    clientsCount: number | null;
    partnerCount: number | null;
    provinceCount: number | null;
    experienceYears: number | null;
    sectionTitle: string;
  };
};

export default function TrustSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  function updateNumber(
    field: "clientsCount" | "partnerCount" | "provinceCount" | "experienceYears",
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value === "" ? null : Number(value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/trust", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }
    setMessage({ type: "success", text: "Đã lưu chỉ số tin cậy — trang chủ sẽ cập nhật" });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-group">
        <label htmlFor="sectionTitle">Tiêu đề section</label>
        <input
          id="sectionTitle"
          value={form.sectionTitle}
          onChange={(e) => setForm((p) => ({ ...p, sectionTitle: e.target.value }))}
          className="admin-input"
        />
      </div>
      {(
        [
          ["clientsCount", "Số khách hàng"],
          ["partnerCount", "Số đối tác"],
          ["provinceCount", "Số tỉnh thành"],
          ["experienceYears", "Số năm kinh nghiệm"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="admin-form-group">
          <label htmlFor={key}>{label}</label>
          <input
            id={key}
            type="number"
            min={0}
            value={form[key] ?? ""}
            onChange={(e) => updateNumber(key, e.target.value)}
            className="admin-input"
            placeholder="Để trống = ẩn metric"
          />
        </div>
      ))}
      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}
      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu...">
        Lưu thay đổi
      </AdminLoadingButton>
    </form>
  );
}
