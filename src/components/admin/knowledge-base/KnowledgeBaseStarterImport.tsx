"use client";

import { useState } from "react";

import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = { onImported: () => void };

export default function KnowledgeBaseStarterImport({ onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function importStarter() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/knowledge-base/starter", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Import thất bại");
      setMessage(data.message ?? "Đã import dữ liệu mẫu.");
      onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-kb-starter">
      <h3 className="admin-subtitle">Tạo dữ liệu mẫu ATTD</h3>
      <p className="admin-field-hint">
        Tạo 12 entry mẫu về thương hiệu, sản phẩm, OEM, đại lý, logistics, brand voice và SEO clusters.
        Dữ liệu mẫu được đánh dấu nháp / chưa verified — cần kiểm chứng trước khi dùng cho AI.
      </p>
      <AdminLoadingButton variant="primary" pending={loading} pendingLabel="Đang tạo dữ liệu mẫu…" onClick={() => void importStarter()}>
        Tạo dữ liệu mẫu ATTD
      </AdminLoadingButton>
      {message && <p className="admin-field-hint">{message}</p>}
    </div>
  );
}
