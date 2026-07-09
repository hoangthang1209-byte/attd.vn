"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import type { HomepageCmsConfig } from "@/features/home/homepage.types";

type Props = {
  cms: HomepageCmsConfig;
};

export default function HomepageSectionsSettingsForm({ cms }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    proofStripEnabled: cms.proofStrip.enabled,
    proofStripOrder: cms.proofStrip.order,
    sourcingPathwaysEnabled: cms.sourcingPathways.enabled,
    sourcingPathwaysOrder: cms.sourcingPathways.order,
    oemSectionOrder: cms.oemBanner.sectionOrder,
  });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/homepage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel: "sections",
        ...form,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    setMessage({ type: "success", text: "Đã lưu hiển thị trang chủ." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 24, marginBottom: 32 }}>
      <fieldset className="admin-catalog-fieldset">
        <legend>Hiển thị &amp; thứ tự section</legend>
        <p className="admin-field-hint">
          Thứ tự áp dụng cho thanh lợi ích và lộ trình nguồn hàng (giữa hero và danh mục). Banner OEM luôn hiển thị sau khu vực sản phẩm theo bố cục hiện tại — bật/tắt trong panel Banner OEM.
        </p>

        <label className="admin-checkbox">
          <input type="checkbox" checked={form.proofStripEnabled} onChange={(e) => setForm((p) => ({ ...p, proofStripEnabled: e.target.checked }))} />
          Hiển thị thanh lợi ích
        </label>
        <div className="admin-form-group">
          <label>Thứ tự thanh lợi ích</label>
          <input className="admin-input" type="number" min={1} max={99} value={form.proofStripOrder} onChange={(e) => setForm((p) => ({ ...p, proofStripOrder: Number(e.target.value) }))} />
        </div>

        <label className="admin-checkbox">
          <input type="checkbox" checked={form.sourcingPathwaysEnabled} onChange={(e) => setForm((p) => ({ ...p, sourcingPathwaysEnabled: e.target.checked }))} />
          Hiển thị lộ trình nguồn hàng
        </label>
        <div className="admin-form-group">
          <label>Thứ tự lộ trình nguồn hàng</label>
          <input className="admin-input" type="number" min={1} max={99} value={form.sourcingPathwaysOrder} onChange={(e) => setForm((p) => ({ ...p, sourcingPathwaysOrder: Number(e.target.value) }))} />
        </div>

        <div className="admin-form-group">
          <label>Thứ tự banner OEM (tham chiếu)</label>
          <input className="admin-input" type="number" min={1} max={99} value={form.oemSectionOrder} onChange={(e) => setForm((p) => ({ ...p, oemSectionOrder: Number(e.target.value) }))} />
          <p className="admin-field-hint">Vị trí thực tế sau khu vực sản phẩm — trường này lưu để tham chiếu sprint sau.</p>
        </div>
      </fieldset>

      {message && <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>}

      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu hiển thị trang chủ...">
        Lưu hiển thị trang chủ
      </AdminLoadingButton>
    </form>
  );
}
