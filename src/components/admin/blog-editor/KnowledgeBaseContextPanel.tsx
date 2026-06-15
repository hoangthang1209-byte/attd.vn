"use client";

import { useEffect, useState } from "react";
import type { KnowledgeBaseContextPreviewResult } from "@/features/knowledge-base/knowledge-base-types";

type Props = {
  keyword: string;
  blueprintId?: string;
};

export default function KnowledgeBaseContextPanel({ keyword, blueprintId }: Props) {
  const [preview, setPreview] = useState<KnowledgeBaseContextPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setPreview(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch("/api/admin/knowledge-base/context/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: trimmed,
          blueprintId,
          usageScope: "BLOG_AI",
          maxEntries: 6,
          verifiedOnly: false,
        }),
      })
        .then((res) => res.json())
        .then((data) => setPreview(data))
        .catch(() => setPreview(null))
        .finally(() => setLoading(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [keyword, blueprintId]);

  if (!keyword.trim()) return null;

  return (
    <div className="admin-kb-factory-panel">
      <p className="admin-kb-factory-title">Business context available</p>
      {loading && <p className="admin-field-hint">Đang tải Knowledge Base…</p>}
      {!loading && preview && (
        <>
          <p className="admin-field-hint">
            Knowledge readiness: {preview.completenessScore}/100 — {preview.completenessLabel}
          </p>
          <p className="admin-field-hint">
            {preview.selectedEntries.length} entry được chọn cho AI Factory
          </p>
          {preview.warnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {preview.warnings.slice(0, 3).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <details>
            <summary>Xem context preview</summary>
            <textarea className="admin-textarea" readOnly rows={8} value={preview.contextText} />
          </details>
        </>
      )}
      {!loading && preview?.selectedEntries.length === 0 && (
        <p className="admin-kb-warning">Chưa có dữ liệu Knowledge Base phù hợp — bài viết sẽ dùng template mặc định.</p>
      )}
    </div>
  );
}

export function useKnowledgeContextForAi(keyword: string, blueprintId?: string) {
  const [context, setContext] = useState<{ contextText: string; entryIds: string[] } | null>(null);

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setContext(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetch("/api/admin/knowledge-base/context/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: trimmed,
          blueprintId,
          usageScope: "BLOG_AI",
          maxEntries: 6,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data?.contextText) {
            setContext(null);
            return;
          }
          setContext({
            contextText: data.contextText as string,
            entryIds: Array.isArray(data.selectedEntries)
              ? data.selectedEntries.map((entry: { id: string }) => entry.id)
              : [],
          });
        })
        .catch(() => setContext(null));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [keyword, blueprintId]);

  return context;
}
