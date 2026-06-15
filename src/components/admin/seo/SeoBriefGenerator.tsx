"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import KnowledgeBaseContextPanel, {
  type KnowledgeContextSelection,
} from "@/components/admin/blog-editor/KnowledgeBaseContextPanel";
import SeoBriefResult from "@/components/admin/seo/SeoBriefResult";
import type { SeoBriefResponse } from "@/features/seo/seo-brief-types";
import { SEARCH_INTENT_LABELS } from "@/features/seo/seo-brief-types";
import type { SearchIntent } from "@/features/seo/seo-brief-types";

const SEARCH_INTENTS = Object.keys(SEARCH_INTENT_LABELS) as SearchIntent[];

const EXAMPLE_KEYWORDS = [
  "in áo thun theo yêu cầu",
  "đồng phục công ty",
  "khăn bandana theo yêu cầu",
  "nguồn hàng áo thun trơn",
  "quà tặng doanh nghiệp",
];

export default function SeoBriefGenerator() {
  const router = useRouter();

  const [targetKeyword, setTargetKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [searchIntent, setSearchIntent] = useState<SearchIntent | "">("");
  const [audience, setAudience] = useState("");
  const [contentGoal, setContentGoal] = useState("");
  const [kbContext, setKbContext] = useState<KnowledgeContextSelection | null>(null);
  const [result, setResult] = useState<SeoBriefResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!targetKeyword.trim()) {
      setError("Vui lòng nhập từ khóa chính.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seo/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetKeyword: targetKeyword.trim(),
          secondaryKeywords: secondaryKeywords
            .split(/[,\n]/)
            .map((k) => k.trim())
            .filter(Boolean),
          searchIntent: searchIntent || undefined,
          audience: audience.trim() || undefined,
          contentGoal: contentGoal.trim() || undefined,
          knowledgeContext: kbContext
            ? {
                selectedEntryIds: kbContext.entryIds,
                contextText: kbContext.contextText,
                averageReadinessScore: kbContext.averageReadinessScore,
                warnings: kbContext.warnings,
              }
            : undefined,
        }),
      });
      const data = await res.json() as SeoBriefResponse & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Tạo brief thất bại.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo brief thất bại.");
    } finally {
      setLoading(false);
    }
  }

  function handleUseForArticle() {
    if (!result) return;
    const params = new URLSearchParams({
      keyword: result.brief.targetKeyword,
      goal: "seo-traffic",
      blueprint: "source-supplier",
      source: "seo-brief",
    });
    router.push(`/admin/blog/new?${params.toString()}`);
  }

  return (
    <div className="admin-seo-brief-page">
      <div className="admin-kb-import-header">
        <Link href="/admin/seo-planning" className="admin-kb-back-link">
          ← SEO Planning
        </Link>
      </div>

      <div className="admin-seo-brief-form-panel">
        <h2 className="admin-subtitle">Trình tạo SEO Brief</h2>
        <p className="admin-field-hint">
          Nhập từ khóa, chọn ngữ cảnh Knowledge Base và tạo SEO Brief chi tiết cho đội ngũ content.
        </p>

        {/* Keyword examples */}
        <div className="admin-kb-context-samples">
          <span className="admin-field-hint">Ví dụ:</span>
          {EXAMPLE_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => setTargetKeyword(kw)}
            >
              {kw}
            </button>
          ))}
        </div>

        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label" htmlFor="brief-keyword">
              Từ khóa chính <span className="admin-required">*</span>
            </label>
            <input
              id="brief-keyword"
              className="admin-input"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="Ví dụ: in áo thun theo yêu cầu"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="brief-secondary">
              Từ khóa phụ
            </label>
            <textarea
              id="brief-secondary"
              className="admin-textarea"
              rows={2}
              value={secondaryKeywords}
              onChange={(e) => setSecondaryKeywords(e.target.value)}
              placeholder="Mỗi từ khóa một dòng hoặc cách nhau bởi dấu phẩy"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="brief-intent">
              Search intent
            </label>
            <select
              id="brief-intent"
              className="admin-input"
              value={searchIntent}
              onChange={(e) => setSearchIntent(e.target.value as SearchIntent | "")}
            >
              <option value="">Tự động phát hiện</option>
              {SEARCH_INTENTS.map((intent) => (
                <option key={intent} value={intent}>
                  {SEARCH_INTENT_LABELS[intent]}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="brief-audience">
              Đối tượng đọc
            </label>
            <input
              id="brief-audience"
              className="admin-input"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Ví dụ: Chủ xưởng in, đại lý áo thun, doanh nghiệp vừa"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="brief-goal">
              Mục tiêu nội dung
            </label>
            <input
              id="brief-goal"
              className="admin-input"
              value={contentGoal}
              onChange={(e) => setContentGoal(e.target.value)}
              placeholder="Ví dụ: Tăng organic traffic, generate OEM leads"
            />
          </div>
        </div>

        {/* KB Context Panel */}
        <KnowledgeBaseContextPanel
          keyword={targetKeyword}
          onContextChange={setKbContext}
        />

        {!kbContext && targetKeyword.trim() && (
          <p className="admin-kb-warning admin-kb-warning--no-context">
            Chưa chọn ngữ cảnh Knowledge Base. Brief có thể chưa sát dữ liệu nội bộ ATTD.
          </p>
        )}

        {error && <p className="admin-error">{error}</p>}

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={loading || !targetKeyword.trim()}
          onClick={() => void generate()}
        >
          {loading ? "Đang tạo brief…" : "Tạo SEO Brief"}
        </button>
      </div>

      {result && (
        <SeoBriefResult
          brief={result.brief}
          metadata={result.metadata}
          prompt={result.prompt}
          onUseForArticle={handleUseForArticle}
        />
      )}
    </div>
  );
}
