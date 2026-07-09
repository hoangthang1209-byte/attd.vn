"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { KnowledgeBaseCategoryRecord } from "@/features/knowledge-base/knowledge-base-types";
import { KNOWLEDGE_USAGE_SCOPES } from "@/features/knowledge-base/knowledge-base-types";
import type { ContextPreviewRankedResult } from "@/features/knowledge-base/knowledge-base-context-preview";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import KnowledgeBaseAiReadinessBadge from "@/components/admin/knowledge-base/KnowledgeBaseAiReadinessBadge";

const SAMPLE_QUERIES = [
  "in áo thun theo yêu cầu",
  "đồng phục công ty",
  "khăn bandana theo yêu cầu",
  "quà tặng doanh nghiệp",
];

export default function KnowledgeBaseContextSearch() {
  const [query, setQuery] = useState("");
  const [usageScope, setUsageScope] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<KnowledgeBaseCategoryRecord[]>([]);
  const [results, setResults] = useState<ContextPreviewRankedResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/knowledge-base/categories")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data.categories) ? data.categories : []));
  }, []);

  async function runSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim();
    if (!q) {
      setError("Vui lòng nhập chủ đề cần kiểm tra.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge-base/context-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          usageScope: usageScope.length > 0 ? usageScope : undefined,
          categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
          limit: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Tìm kiếm thất bại");
      setResults(Array.isArray(data.results) ? data.results : []);
      setSearchedQuery(data.query ?? q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tìm kiếm thất bại");
    } finally {
      setLoading(false);
    }
  }

  function toggleScope(scopeId: string) {
    setUsageScope((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  }

  function toggleCategory(categoryId: string) {
    setCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }

  return (
    <div className="admin-kb-context-search">
      <div className="admin-kb-import-header">
        <Link href="/admin/knowledge-base" className="admin-kb-back-link">
          ← Quay về Knowledge Base
        </Link>
      </div>

      <h2 className="admin-subtitle">Xem trước ngữ cảnh AI</h2>
      <p className="admin-field-hint">
        Công cụ nội bộ giúp kiểm tra mục Knowledge Base phù hợp với chủ đề — không dùng OpenAI hay vector DB.
      </p>

      <div className="admin-kb-context-form">
        <label className="admin-label" htmlFor="context-query">
          Nhập chủ đề cần kiểm tra
        </label>
        <div className="admin-kb-context-query-row">
          <input
            id="context-query"
            className="admin-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ví dụ: in áo thun theo yêu cầu"
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
          />
          <AdminLoadingButton variant="primary" pending={loading} pendingLabel="Đang tìm ngữ cảnh…" onClick={() => void runSearch()}>
            Tìm kiếm
          </AdminLoadingButton>
        </div>

        <div className="admin-kb-context-samples">
          <span className="admin-field-hint">Gợi ý:</span>
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => {
                setQuery(sample);
                void runSearch(sample);
              }}
            >
              {sample}
            </button>
          ))}
        </div>

        <details className="admin-kb-context-filters">
          <summary>Bộ lọc tùy chọn</summary>
          <div className="admin-kb-context-filter-group">
            <span className="admin-label">Mục đích sử dụng</span>
            <div className="admin-kb-tags">
              {KNOWLEDGE_USAGE_SCOPES.map((scope) => (
                <label key={scope.id} className="admin-kb-tag admin-kb-tag--scope">
                  <input
                    type="checkbox"
                    checked={usageScope.includes(scope.id)}
                    onChange={() => toggleScope(scope.id)}
                  />
                  {scope.label}
                </label>
              ))}
            </div>
          </div>
          <div className="admin-kb-context-filter-group">
            <span className="admin-label">Danh mục</span>
            <div className="admin-kb-tags">
              {categories.map((cat) => (
                <label key={cat.id} className="admin-kb-tag">
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>
        </details>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {searchedQuery && !loading && (
        <div className="admin-kb-context-results">
          <h3 className="admin-subtitle">
            Kết quả phù hợp ({results.length}) — &ldquo;{searchedQuery}&rdquo;
          </h3>

          {results.length === 0 ? (
            <p className="admin-field-hint">Không tìm thấy mục phù hợp.</p>
          ) : (
            <div className="admin-kb-context-result-list">
              {results.map((item) => (
                <article key={item.entry.id} className="admin-kb-context-result-card">
                  <div className="admin-kb-context-result-header">
                    <h4>{item.entry.title}</h4>
                    <span className="admin-kb-context-score">Điểm khớp: {item.score}</span>
                    {item.aiReadiness && (
                      <KnowledgeBaseAiReadinessBadge readiness={item.aiReadiness} />
                    )}
                  </div>
                  <p className="admin-field-hint">
                    {item.entry.category?.name} · {item.entry.type}
                  </p>
                  {item.matchReasons.length > 0 && (
                    <div className="admin-kb-context-reasons">
                      <strong>Lý do khớp:</strong> {item.matchReasons.join(", ")}
                    </div>
                  )}
                  {item.aiReadiness?.missing.length ? (
                    <p className="admin-field-hint">
                      <strong>Thiếu dữ liệu:</strong> {item.aiReadiness.missing.join(", ")}
                    </p>
                  ) : null}
                  {(item.sourceName || item.sourceUrl) && (
                    <p className="admin-field-hint">
                      <strong>Nguồn tham khảo:</strong>{" "}
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {item.sourceName ?? item.sourceUrl}
                        </a>
                      ) : (
                        item.sourceName
                      )}
                    </p>
                  )}
                  <p className="admin-kb-context-preview-text">
                    {(item.entry.summary ?? item.entry.content ?? "").slice(0, 280)}
                    {(item.entry.content?.length ?? 0) > 280 ? "…" : ""}
                  </p>
                  <Link
                    href={`/admin/knowledge-base/${item.entry.id}`}
                    className="admin-btn admin-btn--secondary admin-btn--small"
                  >
                    Xem chi tiết
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
