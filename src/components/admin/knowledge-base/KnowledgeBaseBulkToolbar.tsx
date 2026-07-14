"use client";

import { useEffect, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import type { KnowledgeBaseCategoryRecord } from "@/features/knowledge-base/knowledge-base-types";
import {
  getEntryStatusLabel,
  getPriorityLabel,
} from "@/features/knowledge-base/knowledge-base-utils";
import { KNOWLEDGE_VISIBILITY_OPTIONS } from "@/features/knowledge-base/knowledge-base-visibility";

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
  const [visibility, setVisibility] = useState("INTERNAL");
  const [domain, setDomain] = useState("");
  const [reviewIntervalDays, setReviewIntervalDays] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [seoTopicId, setSeoTopicId] = useState("");
  const [mediaBundleId, setMediaBundleId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/knowledge-base/categories")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data.categories) ? data.categories : []));
  }, []);

  if (selectedIds.length === 0) return null;

  async function runBulk(
    action: string,
    extra?: Record<string, string | number | null>
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
      <p className="admin-field-hint">
        Đã chọn {selectedIds.length} mục · Không hỗ trợ phê duyệt hàng loạt (giữ trách nhiệm từng mục).
      </p>
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

        <select
          className="admin-input admin-input--inline"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          {KNOWLEDGE_VISIBILITY_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading}
          onClick={() => void runBulk("setVisibility", { visibility })}
        >
          Đặt visibility
        </button>
        <input
          className="admin-input admin-input--inline"
          placeholder="Domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading || !domain.trim()}
          onClick={() => void runBulk("setDomain", { domain: domain.trim() })}
        >
          Đặt domain
        </button>
        <input
          className="admin-input admin-input--inline"
          type="number"
          min={0}
          placeholder="Chu kỳ rà soát (ngày)"
          value={reviewIntervalDays}
          onChange={(e) => setReviewIntervalDays(e.target.value)}
        />
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading || !reviewIntervalDays}
          onClick={() =>
            void runBulk("setReviewInterval", {
              reviewIntervalDays: Number(reviewIntervalDays),
            })
          }
        >
          Đặt chu kỳ rà soát
        </button>
        <input
          className="admin-input admin-input--inline"
          placeholder="Owner ID"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
        />
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading || !ownerId.trim()}
          onClick={() => void runBulk("setOwner", { ownerId: ownerId.trim() })}
        >
          Gán owner
        </button>
        <input
          className="admin-input admin-input--inline"
          placeholder="SEO Topic ID"
          value={seoTopicId}
          onChange={(e) => setSeoTopicId(e.target.value)}
        />
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading || !seoTopicId.trim()}
          onClick={() => void runBulk("linkSeoTopic", { seoTopicId: seoTopicId.trim() })}
        >
          Link SEO Topic
        </button>
        <input
          className="admin-input admin-input--inline"
          placeholder="Media Bundle ID"
          value={mediaBundleId}
          onChange={(e) => setMediaBundleId(e.target.value)}
        />
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          disabled={loading || !mediaBundleId.trim()}
          onClick={() => void runBulk("linkMediaBundle", { mediaBundleId: mediaBundleId.trim() })}
        >
          Link Media Bundle
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onClear}>
          Bỏ chọn
        </button>
      </div>
    </div>
  );
}
