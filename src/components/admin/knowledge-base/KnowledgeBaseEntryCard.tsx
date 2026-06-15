"use client";

import Link from "next/link";
import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import {
  getEntryStatusLabel,
  getEntryTypeLabel,
  getPriorityLabel,
} from "@/features/knowledge-base/knowledge-base-utils";
import { KNOWLEDGE_USAGE_SCOPES } from "@/features/knowledge-base/knowledge-base-types";

type Props = {
  entry: KnowledgeBaseEntryRecord;
  onChanged: () => void;
};

function scopeLabel(scope: string): string {
  return KNOWLEDGE_USAGE_SCOPES.find((s) => s.id === scope)?.label ?? scope;
}

export default function KnowledgeBaseEntryCard({ entry, onChanged }: Props) {
  async function archiveEntry() {
    await fetch(`/api/admin/knowledge-base/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    onChanged();
  }

  async function deleteEntry() {
    if (!window.confirm(`Xóa "${entry.title}"?`)) return;
    await fetch(`/api/admin/knowledge-base/${entry.id}`, { method: "DELETE" });
    onChanged();
  }

  async function duplicateEntry() {
    await fetch("/api/admin/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...entry,
        title: `${entry.title} (bản sao)`,
        slug: `${entry.slug}-copy-${Date.now()}`,
        status: "DRAFT",
        isVerified: false,
      }),
    });
    onChanged();
  }

  return (
    <article className="admin-kb-entry-card">
      <div className="admin-kb-entry-card-header">
        <h3>{entry.title}</h3>
        {entry.isVerified && <span className="admin-kb-badge admin-kb-badge--verified">Đã kiểm chứng</span>}
      </div>
      {entry.summary && <p className="admin-field-hint">{entry.summary}</p>}
      <div className="admin-kb-entry-meta">
        <span>{entry.category?.name}</span>
        <span>{getEntryTypeLabel(entry.type)}</span>
        <span>{getEntryStatusLabel(entry.status)}</span>
        <span>{getPriorityLabel(entry.priority)}</span>
      </div>
      {entry.tags.length > 0 && (
        <div className="admin-kb-tags">
          {entry.tags.map((tag) => (
            <span key={tag} className="admin-kb-tag">{tag}</span>
          ))}
        </div>
      )}
      {entry.usageScope.length > 0 && (
        <div className="admin-kb-tags">
          {entry.usageScope.map((scope) => (
            <span key={scope} className="admin-kb-tag admin-kb-tag--scope">{scopeLabel(scope)}</span>
          ))}
        </div>
      )}
      <p className="admin-field-hint">
        Hoàn thiện: {entry.completenessScore ?? 0}/100 — {entry.completenessLabel ?? "Cần bổ sung"}
      </p>
      <p className="admin-field-hint">
        Cập nhật: {new Date(entry.updatedAt).toLocaleDateString("vi-VN")}
      </p>
      <div className="admin-kb-entry-actions">
        <Link href={`/admin/knowledge-base/${entry.id}`} className="admin-btn admin-btn--primary admin-btn--small">
          Sửa
        </Link>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void duplicateEntry()}>
          Duplicate
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void archiveEntry()}>
          Archive
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void deleteEntry()}>
          Delete
        </button>
      </div>
    </article>
  );
}
