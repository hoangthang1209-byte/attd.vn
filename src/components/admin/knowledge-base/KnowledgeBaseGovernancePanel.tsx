"use client";

import { useState } from "react";
import type {
  KnowledgeBaseClaimStatus,
  KnowledgeBaseConfidence,
  KnowledgeBaseEntryRecord,
  KnowledgeBaseVisibility,
} from "@/features/knowledge-base/knowledge-base-types";
import { KNOWLEDGE_CLAIM_STATUS_OPTIONS } from "@/features/knowledge-base/knowledge-base-claim-governance";
import { KNOWLEDGE_VISIBILITY_OPTIONS } from "@/features/knowledge-base/knowledge-base-visibility";

export type KnowledgeGovernanceFormState = {
  visibility: KnowledgeBaseVisibility;
  claimStatus: KnowledgeBaseClaimStatus;
  confidence: KnowledgeBaseConfidence;
  evidenceUrl: string;
  domain: string;
  aliases: string;
  ownerId: string;
  authorName: string;
  reviewIntervalDays: string;
  nextReviewAt: string;
  expiresAt: string;
  relatedMediaBundleIds: string;
  relatedSeoTopicIds: string;
  relatedEntryIds: string;
  sourceId: string | null;
};

export function buildGovernanceState(
  entry: KnowledgeBaseEntryRecord | null
): KnowledgeGovernanceFormState {
  return {
    visibility: entry?.visibility ?? "INTERNAL",
    claimStatus: entry?.claimStatus ?? "FACT",
    confidence: entry?.confidence ?? "MEDIUM",
    evidenceUrl: entry?.evidenceUrl ?? "",
    domain: entry?.domain ?? "",
    aliases: (entry?.aliases ?? []).join(", "),
    ownerId: entry?.ownerId ?? "",
    authorName: entry?.authorName ?? "",
    reviewIntervalDays:
      entry?.reviewIntervalDays != null ? String(entry.reviewIntervalDays) : "",
    nextReviewAt: entry?.nextReviewAt?.slice(0, 10) ?? "",
    expiresAt: entry?.expiresAt?.slice(0, 10) ?? "",
    relatedMediaBundleIds: (entry?.relatedMediaBundleIds ?? []).join(", "),
    relatedSeoTopicIds: (entry?.relatedSeoTopicIds ?? []).join(", "),
    relatedEntryIds: (entry?.relatedEntryIds ?? []).join(", "),
    sourceId: entry?.sourceId ?? null,
  };
}

type Props = {
  entryId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  lastVerifiedAt: string | null;
  value: KnowledgeGovernanceFormState;
  onChange: (next: KnowledgeGovernanceFormState) => void;
  onApproved?: (entry: KnowledgeBaseEntryRecord) => void;
};

export default function KnowledgeBaseGovernancePanel({
  entryId,
  approvedBy,
  approvedAt,
  lastVerifiedAt,
  value,
  onChange,
  onApproved,
}: Props) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function patch<K extends keyof KnowledgeGovernanceFormState>(
    key: K,
    next: KnowledgeGovernanceFormState[K]
  ) {
    onChange({ ...value, [key]: next });
  }

  async function runAction(path: string) {
    if (!entryId) {
      setMessage("Lưu entry trước rồi mới phê duyệt / xác minh.");
      return;
    }
    setBusy(path);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/knowledge-base/${entryId}/${path}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Thao tác thất bại");
      setMessage("Đã cập nhật quản trị tri thức.");
      if (data.entry && onApproved) onApproved(data.entry);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-sidebar-card" style={{ marginTop: 12 }}>
      <button
        type="button"
        className="admin-btn admin-btn--secondary admin-btn--small"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Thu gọn" : "Mở"} · Quản trị tri thức
      </button>
      {!open ? null : (
        <div className="admin-form" style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <p className="admin-field-hint">
            Visibility và claim quyết định việc AI SEO có được dùng entry này hay không. Phê duyệt là
            hành động riêng — lưu form không tự phê duyệt.
          </p>

          <div className="admin-field">
            <label className="admin-label">Mức độ hiển thị</label>
            <select
              className="admin-input"
              value={value.visibility}
              onChange={(e) => patch("visibility", e.target.value as KnowledgeBaseVisibility)}
            >
              {KNOWLEDGE_VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="admin-field-hint">
              PUBLIC chỉ dành cho nội dung được phép đưa ra website / SEO.
            </p>
          </div>

          <div className="admin-field">
            <label className="admin-label">Trạng thái claim</label>
            <select
              className="admin-input"
              value={value.claimStatus}
              onChange={(e) => patch("claimStatus", e.target.value as KnowledgeBaseClaimStatus)}
            >
              {KNOWLEDGE_CLAIM_STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label className="admin-label">Độ tin cậy</label>
            <select
              className="admin-input"
              value={value.confidence}
              onChange={(e) => patch("confidence", e.target.value as KnowledgeBaseConfidence)}
            >
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
            </select>
          </div>

          <div className="admin-field">
            <label className="admin-label">Nguồn (sourceId)</label>
            <input
              className="admin-input"
              value={value.sourceId ?? ""}
              onChange={(e) => patch("sourceId", e.target.value.trim() || null)}
              placeholder="ID nguồn KnowledgeBaseSource"
            />
            <p className="admin-field-hint">
              Gắn nguồn tham khảo đã có trong hệ thống. Không tự phê duyệt khi lưu.
            </p>
          </div>

          <div className="admin-field">
            <label className="admin-label">URL bằng chứng</label>
            <input
              className="admin-input"
              value={value.evidenceUrl}
              onChange={(e) => patch("evidenceUrl", e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Domain</label>
            <input
              className="admin-input"
              value={value.domain}
              onChange={(e) => patch("domain", e.target.value)}
              placeholder="sales | manufacturing | seo | policy"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Aliases</label>
            <input
              className="admin-input"
              value={value.aliases}
              onChange={(e) => patch("aliases", e.target.value)}
              placeholder="moq, minimum order,…"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Người phụ trách (ownerId)</label>
            <input
              className="admin-input"
              value={value.ownerId}
              onChange={(e) => patch("ownerId", e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Tác giả</label>
            <input
              className="admin-input"
              value={value.authorName}
              onChange={(e) => patch("authorName", e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Chu kỳ rà soát (ngày)</label>
            <input
              className="admin-input"
              type="number"
              min={0}
              value={value.reviewIntervalDays}
              onChange={(e) => patch("reviewIntervalDays", e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Ngày rà soát tiếp theo</label>
            <input
              className="admin-input"
              type="date"
              value={value.nextReviewAt}
              onChange={(e) => patch("nextReviewAt", e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Ngày hết hiệu lực</label>
            <input
              className="admin-input"
              type="date"
              value={value.expiresAt}
              onChange={(e) => patch("expiresAt", e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Related Media Bundle IDs</label>
            <input
              className="admin-input"
              value={value.relatedMediaBundleIds}
              onChange={(e) => patch("relatedMediaBundleIds", e.target.value)}
              placeholder="id1, id2"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Related SEO Topic IDs</label>
            <input
              className="admin-input"
              value={value.relatedSeoTopicIds}
              onChange={(e) => patch("relatedSeoTopicIds", e.target.value)}
              placeholder="id1, id2"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Related Entry IDs</label>
            <input
              className="admin-input"
              value={value.relatedEntryIds}
              onChange={(e) => patch("relatedEntryIds", e.target.value)}
              placeholder="id1, id2"
            />
          </div>

          <div className="admin-field-hint">
            Phê duyệt: {approvedBy ?? "—"}
            {approvedAt ? ` · ${new Date(approvedAt).toLocaleString("vi-VN")}` : ""}
            <br />
            Xác minh gần nhất:{" "}
            {lastVerifiedAt ? new Date(lastVerifiedAt).toLocaleString("vi-VN") : "—"}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--small"
              disabled={Boolean(busy)}
              onClick={() => void runAction("approve")}
            >
              Phê duyệt
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              disabled={Boolean(busy)}
              onClick={() => void runAction("revoke-approval")}
            >
              Thu hồi phê duyệt
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              disabled={Boolean(busy)}
              onClick={() => void runAction("reverify")}
            >
              Xác minh lại
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              disabled={Boolean(busy)}
              onClick={() => void runAction("mark-needs-evidence")}
            >
              Đánh dấu cần bằng chứng
            </button>
          </div>
          {message && <p className="admin-field-hint">{message}</p>}
        </div>
      )}
    </div>
  );
}
