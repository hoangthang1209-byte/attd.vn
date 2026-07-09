"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import type { HomepageHeroConfig } from "@/features/home/homepage.types";

type Props = {
  initial: HomepageHeroConfig;
};

export default function HomepageHeroSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof HomepageHeroConfig>(field: K, value: HomepageHeroConfig[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/homepage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panel: "hero", ...form }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    const data = (await res.json()) as { hero?: HomepageHeroConfig };
    if (data.hero) setForm(data.hero);
    setMessage({ type: "success", text: "Đã lưu nội dung hero." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <fieldset className="admin-catalog-fieldset">
        <legend>Hero trang chủ</legend>

        <div className="admin-form-group">
          <label htmlFor="heroEyebrow">Nhãn giới thiệu</label>
          <input id="heroEyebrow" value={form.eyebrow} onChange={(e) => update("eyebrow", e.target.value)} className="admin-input" />
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroHeading">Tiêu đề chính</label>
          <input id="heroHeading" value={form.heading} onChange={(e) => update("heading", e.target.value)} className="admin-input" required />
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroDescription">Mô tả</label>
          <textarea id="heroDescription" value={form.description} onChange={(e) => update("description", e.target.value)} className="admin-textarea" rows={4} />
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroPrimaryCtaLabel">Nhãn nút chính</label>
          <input id="heroPrimaryCtaLabel" value={form.primaryCtaLabel} onChange={(e) => update("primaryCtaLabel", e.target.value)} className="admin-input" required />
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroPrimaryCtaUrl">Liên kết nút chính</label>
          <input id="heroPrimaryCtaUrl" value={form.primaryCtaUrl} onChange={(e) => update("primaryCtaUrl", e.target.value)} className="admin-input" required />
          <p className="admin-field-hint">Có thể dùng đường dẫn nội bộ như /lien-he hoặc anchor như #home-categories.</p>
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroSecondaryCtaLabel">Nhãn nút phụ</label>
          <input id="heroSecondaryCtaLabel" value={form.secondaryCtaLabel} onChange={(e) => update("secondaryCtaLabel", e.target.value)} className="admin-input" required />
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroSecondaryCtaUrl">Liên kết nút phụ</label>
          <input id="heroSecondaryCtaUrl" value={form.secondaryCtaUrl} onChange={(e) => update("secondaryCtaUrl", e.target.value)} className="admin-input" required />
        </div>
      </fieldset>

      {message && <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>}

      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu hero...">
        Lưu hero
      </AdminLoadingButton>
    </form>
  );
}
