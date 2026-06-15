"use client";

import { useState } from "react";
import type { KnowledgeBaseContextPreviewResult } from "@/features/knowledge-base/knowledge-base-types";
import { KNOWLEDGE_USAGE_SCOPES } from "@/features/knowledge-base/knowledge-base-types";
import type { ContentBlueprintId } from "@/features/blog/content-blueprints";
import { CONTENT_BLUEPRINTS } from "@/features/blog/content-blueprints";

export default function KnowledgeBaseContextPreview() {
  const [keyword, setKeyword] = useState("nguồn hàng áo thun trơn");
  const [blueprintId, setBlueprintId] = useState<ContentBlueprintId>(CONTENT_BLUEPRINTS[0].id);
  const [usageScope, setUsageScope] = useState("BLOG_AI");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [maxEntries, setMaxEntries] = useState(8);
  const [preview, setPreview] = useState<KnowledgeBaseContextPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runPreview() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge-base/context/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, blueprintId, usageScope, verifiedOnly, maxEntries }),
      });
      const data = await res.json();
      setPreview(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-kb-context-preview">
      <div className="admin-kb-context-form">
        <input className="admin-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Từ khóa" />
        <select className="admin-input" value={blueprintId} onChange={(e) => setBlueprintId(e.target.value as ContentBlueprintId)}>
          {CONTENT_BLUEPRINTS.map((bp) => (
            <option key={bp.id} value={bp.id}>{bp.label}</option>
          ))}
        </select>
        <select className="admin-input" value={usageScope} onChange={(e) => setUsageScope(e.target.value)}>
          {KNOWLEDGE_USAGE_SCOPES.map((scope) => (
            <option key={scope.id} value={scope.id}>{scope.label}</option>
          ))}
        </select>
        <input
          className="admin-input"
          type="number"
          min={1}
          max={20}
          value={maxEntries}
          onChange={(e) => setMaxEntries(Number(e.target.value))}
        />
        <label className="admin-radio-item">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          <span>Chỉ entry đã kiểm chứng</span>
        </label>
        <button type="button" className="admin-btn admin-btn--primary" disabled={loading} onClick={() => void runPreview()}>
          {loading ? "Đang tạo preview…" : "Preview context"}
        </button>
      </div>

      {preview && (
        <div className="admin-kb-context-result">
          <p className="admin-field-hint">
            Completeness: {preview.completenessScore}/100 — {preview.completenessLabel}
          </p>
          {preview.warnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <div className="admin-kb-context-selected">
            <h4 className="admin-subtitle">Selected entries</h4>
            <ul>
              {preview.selectedEntries.map((entry) => (
                <li key={entry.id}>{entry.title}</li>
              ))}
            </ul>
          </div>
          <textarea className="admin-textarea admin-kb-context-text" readOnly rows={16} value={preview.contextText} />
        </div>
      )}
    </div>
  );
}
