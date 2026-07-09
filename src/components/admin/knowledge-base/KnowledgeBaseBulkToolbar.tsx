"use client";

import { useEffect, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import type { KnowledgeBaseCategoryRecord } from "@/features/knowledge-base/knowledge-base-types";
import {
  getEntryStatusLabel,
  getPriorityLabel,
} from "@/features/knowledge-base/knowledge-base-utils";

type Props = {
  selectedIds: string[];
  onChanged: () => void;
  onClear: () => void;
};

export default function KnowledgeBaseBulkToolbar({ selectedIds, onChanged, onClear }: Props) {
  const [categories, setCategories] = useState<KnowledgeBaseCategoryRecord[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/knowledge-base/categories")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data.categories) ? data.categories : []));
  }, []);

  if (selectedIds.length === 0) return null;

  async function runBulk(
    action: "verify" | "unverify" | "archive" | "delete" | "changeCategory" | "changeStatus" | "changePriority",
    extra?: Record<string, string>
  ) {
    if (action === "delete" && !window.confirm(`Xóa ${selectedIds.length} mục đã chọn?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge-base/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: selectedIds, action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Thao tác thất bại");
      }
      onChanged();
      onClear();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-kb-bulk-toolbar">
      <p className="admin-field-hint">Đã chọn {selectedIds.length} mục</p>
      <div className="admin-kb-bulk-toolbar-actions">
        {loading && <AdminInlineLoader message="Đang xử lý hàng loạt…" />}
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={loading} onClick={() => void runBulk("verify")}>
          Kiểm chứng
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={loading} onClick={() => void runBulk("unverify")}>
          Bỏ kiểm chứng
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={loading} onClick={() => void runBulk("archive")}>
          Lưu trữ
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={loading} onClick={() => void runBulk("delete")}>
          Xóa
        </button>
        <select className="admin-input admin-input--inline" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Đổi danh mục…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading || !categoryId}
          onClick={() => void runBulk("changeCategory", { categoryId })}
        >
          Áp dụng danh mục
        </button>
        <select className="admin-input admin-input--inline" value={status} onChange={(e) => setStatus(e.target.value)}>
          {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((s) => (
            <option key={s} value={s}>{getEntryStatusLabel(s)}</option>
          ))}
        </select>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading}
          onClick={() => void runBulk("changeStatus", { status })}
        >
          Đổi trạng thái
        </button>
        <select className="admin-input admin-input--inline" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
            <option key={p} value={p}>{getPriorityLabel(p)}</option>
          ))}
        </select>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading}
          onClick={() => void runBulk("changePriority", { priority })}
        >
          Đổi ưu tiên
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onClear}>
          Bỏ chọn
        </button>
      </div>
    </div>
  );
}
