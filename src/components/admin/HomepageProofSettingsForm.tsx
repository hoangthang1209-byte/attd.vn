"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HomepageProofItemConfig } from "@/features/home/homepage.types";
import { PROOF_ICON_LABELS } from "@/features/home/homepage-cms-defaults";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  initial: HomepageProofItemConfig[];
};

export default function HomepageProofSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  function updateItem(index: number, patch: Partial<HomepageProofItemConfig>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/homepage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panel: "proof", items }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    const data = (await res.json()) as { proofStrip?: { items: HomepageProofItemConfig[] } };
    if (data.proofStrip?.items) setItems(data.proofStrip.items);
    setMessage({ type: "success", text: "Đã lưu thanh lợi ích." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <fieldset className="admin-catalog-fieldset">
        <legend>Thanh lợi ích nhanh</legend>
        <p className="admin-field-hint">Bốn điểm mạnh B2B hiển thị ngay dưới hero. Chọn biểu tượng từ danh sách có sẵn.</p>

        {items.map((item, index) => (
          <div key={item.itemKey} className="admin-card" style={{ marginBottom: 12, padding: 12 }}>
            <p className="admin-subtitle" style={{ marginBottom: 8 }}>Mục {index + 1}</p>
            <div className="admin-form-group">
              <label>Tiêu đề</label>
              <input className="admin-input" value={item.title} onChange={(e) => updateItem(index, { title: e.target.value })} required />
            </div>
            <div className="admin-form-group">
              <label>Biểu tượng</label>
              <select
                className="admin-input"
                value={item.iconKey}
                onChange={(e) => updateItem(index, { iconKey: e.target.value as HomepageProofItemConfig["iconKey"] })}
              >
                {Object.entries(PROOF_ICON_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Thứ tự</label>
              <input className="admin-input" type="number" min={1} max={4} value={item.sortOrder} onChange={(e) => updateItem(index, { sortOrder: Number(e.target.value) })} />
            </div>
            <label className="admin-checkbox">
              <input type="checkbox" checked={item.enabled} onChange={(e) => updateItem(index, { enabled: e.target.checked })} />
              Hiển thị
            </label>
          </div>
        ))}
      </fieldset>

      {message && <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>}

      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu thanh lợi ích...">
        Lưu thanh lợi ích
      </AdminLoadingButton>
    </form>
  );
}
