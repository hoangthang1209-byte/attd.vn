"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HomepageOemBannerConfig } from "@/features/home/homepage.types";
import HomepageMediaAssetField from "@/components/admin/HomepageMediaAssetField";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  initial: HomepageOemBannerConfig;
};

export default function HomepageOemSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof HomepageOemBannerConfig>(field: K, value: HomepageOemBannerConfig[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/homepage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panel: "oem", oemBanner: form }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    const data = (await res.json()) as { oemBanner?: HomepageOemBannerConfig };
    if (data.oemBanner) setForm(data.oemBanner);
    setMessage({ type: "success", text: "Đã lưu banner OEM." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <fieldset className="admin-catalog-fieldset">
        <legend>Banner OEM &amp; Private Label</legend>
        <p className="admin-field-hint">Banner chiến lược OEM sau khu vực sản phẩm. Ảnh tùy chọn — không có ảnh vẫn hiển thị minh họa quy trình.</p>

        <div className="admin-form-group">
          <label>Nhãn giới thiệu</label>
          <input className="admin-input" value={form.eyebrow} onChange={(e) => update("eyebrow", e.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Tiêu đề</label>
          <input className="admin-input" value={form.heading} onChange={(e) => update("heading", e.target.value)} required />
        </div>
        <div className="admin-form-group">
          <label>Mô tả</label>
          <textarea className="admin-textarea" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Nhãn nút</label>
          <input className="admin-input" value={form.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} required />
        </div>
        <div className="admin-form-group">
          <label>Liên kết nút</label>
          <input className="admin-input" value={form.ctaUrl} onChange={(e) => update("ctaUrl", e.target.value)} required />
        </div>

        <HomepageMediaAssetField
          folder="branding"
          value={{
            mediaAssetId: form.mediaAssetId,
            imageUrl: form.imageUrl,
            imageAlt: form.imageAlt,
          }}
          onChange={(media) =>
            setForm((prev) => ({
              ...prev,
              mediaAssetId: media.mediaAssetId,
              imageUrl: media.imageUrl,
              imageAlt: media.imageAlt,
            }))
          }
          onAltChange={(alt) => update("imageAlt", alt)}
        />

        <label className="admin-checkbox">
          <input type="checkbox" checked={form.enabled} onChange={(e) => update("enabled", e.target.checked)} />
          Hiển thị banner
        </label>
      </fieldset>

      {message && <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>}

      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu banner OEM...">
        Lưu banner OEM
      </AdminLoadingButton>
    </form>
  );
}
