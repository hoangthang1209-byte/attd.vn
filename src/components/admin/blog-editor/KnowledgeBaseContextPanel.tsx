"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import type { KnowledgeContextEntry, KnowledgeContextResult } from "@/features/ai/ai-knowledge-context-builder";
import KnowledgeBaseAiReadinessBadge from "@/components/admin/knowledge-base/KnowledgeBaseAiReadinessBadge";
import type { KnowledgeAuditSnapshot } from "@/features/ai/ai-prompt-composer";
import { buildKnowledgeAuditSnapshot } from "@/features/ai/ai-prompt-composer";

export type KnowledgeContextSelection = {
  contextText: string;
  entryIds: string[];
  entries: KnowledgeContextEntry[];
  warnings: string[];
  averageReadinessScore: number;
  auditSnapshot: KnowledgeAuditSnapshot;
};

type Props = {
  keyword: string;
  onContextChange: (ctx: KnowledgeContextSelection | null) => void;
};

export default function KnowledgeBaseContextPanel({ keyword, onContextChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<KnowledgeContextResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const lastAppliedRef = useRef<string>("");

  // Pre-populate search box when keyword changes
  useEffect(() => {
    if (keyword.trim() && searchQuery === "") {
      setSearchQuery(keyword.trim());
    }
  }, [keyword, searchQuery]);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setLoading(true);
    setApplied(false);
    setResults(null);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/admin/ai/knowledge-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 8 }),
      });
      const data = await res.json() as KnowledgeContextResult & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Tìm kiếm thất bại");
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tìm được ngữ cảnh.");
    } finally {
      setLoading(false);
    }
  }, []);

  function toggleEntry(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setApplied(false);
    onContextChange(null);
  }

  function selectAll() {
    if (!results) return;
    setSelectedIds(new Set(results.entries.map((e) => e.id)));
    setApplied(false);
    onContextChange(null);
  }

  function selectVerified() {
    if (!results) return;
    const ids = results.entries.filter((e) => e.isVerified).map((e) => e.id);
    setSelectedIds(new Set(ids));
    setApplied(false);
    onContextChange(null);
  }

  function selectHighReadiness() {
    if (!results) return;
    const ids = results.entries
      .filter((e) => e.aiReadiness.level === "HIGH" || e.aiReadiness.level === "VERIFIED")
      .map((e) => e.id);
    setSelectedIds(new Set(ids));
    setApplied(false);
    onContextChange(null);
  }

  function applyContext() {
    if (!results) return;
    const selected = results.entries.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) {
      onContextChange(null);
      setApplied(false);
      return;
    }

    const snapshot = buildKnowledgeAuditSnapshot({
      query: results.query,
      entries: selected,
      averageReadinessScore: results.averageReadinessScore,
      warnings: results.warnings,
    });

    const contextLines = selected
      .map((e, i) => {
        const lines = [
          `[Dữ liệu Knowledge Base ${i + 1}]`,
          `Tiêu đề: ${e.title}`,
        ];
        if (e.category) lines.push(`Danh mục: ${e.category}`);
        if (e.tags?.length) lines.push(`Tags: ${e.tags.join(", ")}`);
        lines.push(`Điểm sẵn sàng AI: ${e.aiReadiness.score}/100 — ${e.aiReadiness.label}`);
        if (e.source?.name) {
          const src = e.source.url ? `${e.source.name} (${e.source.url})` : e.source.name;
          lines.push(`Nguồn tham khảo: ${src}`);
        }
        if (!e.isVerified) lines.push("⚠ Chưa được kiểm chứng");
        lines.push("Nội dung:");
        const body = (e.content || e.summary || "").trim();
        lines.push(body.slice(0, 1000) + (body.length > 1000 ? "…" : ""));
        return lines.join("\n");
      })
      .join("\n\n---\n\n");

    const avgScore =
      selected.length > 0
        ? Math.round(selected.reduce((s, e) => s + e.aiReadiness.score, 0) / selected.length)
        : 0;

    const warnings: string[] = [];
    const unverified = selected.filter((e) => !e.isVerified);
    if (unverified.length > 0) warnings.push(`${unverified.length}/${selected.length} mục chưa được kiểm chứng.`);
    const noSource = selected.filter((e) => !e.source?.name && !e.source?.url);
    if (noSource.length > 0) warnings.push(`${noSource.length}/${selected.length} mục thiếu nguồn tham khảo.`);
    if (avgScore < 40) warnings.push("Điểm sẵn sàng AI trung bình thấp — nội dung có thể kém chính xác.");

    const selection: KnowledgeContextSelection = {
      contextText: contextLines,
      entryIds: selected.map((e) => e.id),
      entries: selected,
      warnings,
      averageReadinessScore: avgScore,
      auditSnapshot: snapshot,
    };

    const token = JSON.stringify(selection.entryIds);
    lastAppliedRef.current = token;
    onContextChange(selection);
    setApplied(true);
  }

  function clearContext() {
    setSelectedIds(new Set());
    setApplied(false);
    onContextChange(null);
  }

  const hasResults = results && results.entries.length > 0;
  const selectedCount = selectedIds.size;

  return (
    <div className="admin-kb-factory-panel">
      <p className="admin-kb-factory-title">Ngữ cảnh từ Knowledge Base</p>

      <div className="admin-kb-factory-search-row">
        <input
          className="admin-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Nhập chủ đề để tìm ngữ cảnh…"
          onKeyDown={(e) => { if (e.key === "Enter") void search(searchQuery); }}
        />
        <AdminLoadingButton
          size="small"
          variant="secondary"
          pending={loading}
          pendingLabel="Đang tìm ngữ cảnh…"
          disabled={!searchQuery.trim()}
          onClick={() => void search(searchQuery)}
        >
          Tìm ngữ cảnh
        </AdminLoadingButton>
      </div>

      {error && <p className="admin-kb-warning">{error}</p>}

      {results && results.entries.length === 0 && !loading && (
        <p className="admin-kb-warning">Không tìm thấy ngữ cảnh phù hợp.</p>
      )}

      {hasResults && (
        <>
          {/* Selection helper toolbar */}
          <div className="admin-kb-selection-toolbar">
            <div className="admin-kb-selection-toolbar-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={selectAll}
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={clearContext}
                disabled={selectedCount === 0}
              >
                Bỏ chọn tất cả
              </button>
              {results.entries.some((e) => e.isVerified) && (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={selectVerified}
                >
                  Chọn mục đã kiểm chứng
                </button>
              )}
              {results.entries.some(
                (e) => e.aiReadiness.level === "HIGH" || e.aiReadiness.level === "VERIFIED"
              ) && (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={selectHighReadiness}
                >
                  Chọn mục AI tốt
                </button>
              )}
            </div>
            <span className="admin-kb-selection-count">
              Đã chọn: <strong>{selectedCount}</strong> / {results.entries.length} mục
            </span>
          </div>

          <div className="admin-kb-factory-results">
            {results.entries.map((entry) => {
              const isSelected = selectedIds.has(entry.id);
              return (
                <label
                  key={entry.id}
                  className={`admin-kb-factory-entry ${isSelected ? "is-selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleEntry(entry.id)}
                  />
                  <div className="admin-kb-factory-entry-body">
                    <div className="admin-kb-factory-entry-header">
                      <span className="admin-kb-factory-entry-title">{entry.title}</span>
                      {entry.aiReadiness && (
                        <KnowledgeBaseAiReadinessBadge readiness={entry.aiReadiness} showScore={false} />
                      )}
                      {entry.isVerified && (
                        <span className="admin-kb-badge admin-kb-badge--verified">✓ Đã kiểm chứng</span>
                      )}
                    </div>
                    {entry.category && (
                      <p className="admin-field-hint">{entry.category}</p>
                    )}
                    {entry.matchReasons && entry.matchReasons.length > 0 && (
                      <p className="admin-field-hint admin-kb-factory-match-reasons">
                        Lý do khớp: {entry.matchReasons.join(", ")}
                      </p>
                    )}
                    {(entry.source?.name || entry.source?.url) && (
                      <p className="admin-field-hint">
                        Nguồn tham khảo:{" "}
                        {entry.source.url ? (
                          <a href={entry.source.url} target="_blank" rel="noopener noreferrer">
                            {entry.source.name ?? entry.source.url}
                          </a>
                        ) : (
                          entry.source.name
                        )}
                      </p>
                    )}
                    <p className="admin-kb-factory-preview-text">
                      {(entry.summary ?? entry.content ?? "").slice(0, 180)}
                      {((entry.summary ?? entry.content ?? "").length > 180 ? "…" : "")}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="admin-kb-factory-actions">
            {selectedCount > 0 ? (
              <>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--small"
                  onClick={applyContext}
                >
                  {applied
                    ? `✓ Đã áp dụng ${selectedCount} mục`
                    : `Dùng làm ngữ cảnh (${selectedCount})`}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={clearContext}
                >
                  Bỏ chọn tất cả
                </button>
              </>
            ) : (
              <p className="admin-kb-warning">
                Chưa chọn ngữ cảnh Knowledge Base. Nội dung có thể chưa sát dữ liệu nội bộ ATTD.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Hook for silently loading KB context when keyword changes.
 * Used by the factory to auto-load context without user interaction.
 * Returns null until user explicitly applies; falls back to auto-loaded for handoff.
 */
export function useKnowledgeContextForAi(
  keyword: string,
  _blueprintId?: string
): { contextText: string; entryIds: string[] } | null {
  const [context, setContext] = useState<{ contextText: string; entryIds: string[] } | null>(null);

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setContext(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetch("/api/admin/ai/knowledge-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, limit: 6 }),
      })
        .then((res) => res.json())
        .then((data: KnowledgeContextResult) => {
          if (!data?.contextText) {
            setContext(null);
            return;
          }
          setContext({
            contextText: data.contextText,
            entryIds: data.entries.map((e) => e.id),
          });
        })
        .catch(() => setContext(null));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [keyword]);

  return context;
}
