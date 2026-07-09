"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HomepageSourcingPathwayConfig } from "@/features/home/homepage.types";
import HomepageMediaAssetField from "@/components/admin/HomepageMediaAssetField";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

const SLOT_LABELS: Record<HomepageSourcingPathwayConfig["slot"], string> = {
  STOCK: "Hàng sẵn kho",
  OEM: "Đặt hàng OEM",
  DEALER: "Nguồn hàng cho đại lý",
};

type Props = {
  initial: HomepageSourcingPathwayConfig[];
};

export default function HomepagePathwaysSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  function updateItem(index: number, patch: Partial<HomepageSourcingPathwayConfig>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/homepage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panel: "pathways", items }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    const data = (await res.json()) as { sourcingPathways?: { items: HomepageSourcingPathwayConfig[] } };
    if (data.sourcingPathways?.items) setItems(data.sourcingPathways.items);
    setMessage({ type: "success", text: "Đã lưu lộ trình nguồn hàng." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <fieldset className="admin-catalog-fieldset">
        <legend>Lộ trình nguồn hàng</legend>
        <p className="admin-field-hint">
          Ba hướng nguồn hàng B2B. Ảnh minh họa tùy chọn — nếu không chọn, trang chủ dùng minh họa CSS mặc định.
        </p>

        {items.map((item, index) => (
          <div key={item.slot} className="admin-card" style={{ marginBottom: 16, padding: 12 }}>
            <p className="admin-subtitle" style={{ marginBottom: 8 }}>{SLOT_LABELS[item.slot]}</p>

            <div className="admin-form-group">
              <label>Nhãn ngắn</label>
              <input className="admin-input" value={item.microLabel} onChange={(e) => updateItem(index, { microLabel: e.target.value })} required />
            </div>
            <div className="admin-form-group">
              <label>Tiêu đề</label>
              <input className="admin-input" value={item.title} onChange={(e) => updateItem(index, { title: e.target.value })} required />
            </div>
            <div className="admin-form-group">
              <label>Mô tả</label>
              <textarea className="admin-textarea" rows={3} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} required />
            </div>
            <div className="admin-form-group">
              <label>Nhãn nút</label>
              <input className="admin-input" value={item.ctaLabel} onChange={(e) => updateItem(index, { ctaLabel: e.target.value })} required />
            </div>
            <div className="admin-form-group">
              <label>Liên kết nút</label>
              <input className="admin-input" value={item.ctaUrl} onChange={(e) => updateItem(index, { ctaUrl: e.target.value })} required />
            </div>

            <HomepageMediaAssetField
              folder="branding"
              value={{
                mediaAssetId: item.mediaAssetId,
                imageUrl: item.imageUrl,
                imageAlt: item.imageAlt,
              }}
              onChange={(media) =>
                updateItem(index, {
                  mediaAssetId: media.mediaAssetId,
                  imageUrl: media.imageUrl,
                  imageAlt: media.imageAlt,
                })
              }
              onAltChange={(alt) => updateItem(index, { imageAlt: alt })}
            />

            <div className="admin-form-group">
              <label>Thứ tự</label>
              <input className="admin-input" type="number" min={1} max={3} value={item.sortOrder} onChange={(e) => updateItem(index, { sortOrder: Number(e.target.value) })} />
            </div>
            <label className="admin-checkbox">
              <input type="checkbox" checked={item.enabled} onChange={(e) => updateItem(index, { enabled: e.target.checked })} />
              Hiển thị
            </label>
          </div>
        ))}
      </fieldset>

      {message && <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>}

      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu lộ trình nguồn hàng...">
        Lưu lộ trình nguồn hàng
      </AdminLoadingButton>
    </form>
  );
}
