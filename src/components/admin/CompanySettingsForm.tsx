"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  initial: {
    brandName: string;
    legalName: string;
    tagline: string;
    hotlineRaw: string;
    hotlineDisplay: string;
    zaloPhone: string;
    zaloUrl: string;
    email: string;
    address: string;
    taxCode: string;
    workingHours: string;
  };
};

export default function CompanySettingsForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/company", {
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
    setMessage({ type: "success", text: "Đã lưu thông tin công ty" });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      {(
        [
          ["brandName", "Tên thương hiệu"],
          ["legalName", "Tên pháp lý"],
          ["tagline", "Tagline"],
          ["hotlineRaw", "Hotline (số)"],
          ["hotlineDisplay", "Hotline (hiển thị)"],
          ["zaloPhone", "Zalo (SĐT)"],
          ["zaloUrl", "Zalo URL"],
          ["email", "Email"],
          ["address", "Địa chỉ"],
          ["taxCode", "Mã số thuế"],
          ["workingHours", "Giờ làm việc"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="admin-form-group">
          <label htmlFor={key}>{label}</label>
          <input
            id={key}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
            className="admin-input"
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
