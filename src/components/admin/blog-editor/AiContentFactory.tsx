"use client";

import { useMemo, useState } from "react";
import type { AiPromptInput, AiContentLength } from "@/features/blog/ai-prompts";
import type { ContentBlueprintId } from "@/features/blog/content-blueprints";
import { CONTENT_BLUEPRINTS } from "@/features/blog/content-blueprints";
import {
  aiContentProvider,
  type AiFaqResult,
  type AiSeoResult,
  type AiTagsResult,
} from "@/features/blog/ai-provider";
import type { GeneratedArticle } from "@/features/blog/ai-article-generator";
import type { SeoRecommendations } from "@/features/blog/seo-recommendations";
import { generateSeoRecommendations } from "@/features/blog/seo-recommendations";
import type { BlogCategoryRecord } from "@/features/blog/types";

type AiContentFactoryProps = {
  categories: BlogCategoryRecord[];
  onApplyArticle: (result: GeneratedArticle) => void;
  onApplySeo: (result: AiSeoResult) => void;
  onApplyFaq: (result: AiFaqResult) => void;
  onApplyTags: (result: AiTagsResult) => void;
  onRecommendationsChange: (rec: SeoRecommendations | null) => void;
  onMessage: (text: string, type: "success" | "error") => void;
};

const DEFAULT_AUDIENCES = {
  b2bDealer: true,
  oem: false,
  corporateUniform: false,
  corporateGift: false,
};

export default function AiContentFactory({
  categories,
  onApplyArticle,
  onApplySeo,
  onApplyFaq,
  onApplyTags,
  onRecommendationsChange,
  onMessage,
}: AiContentFactoryProps) {
  const [keyword, setKeyword] = useState("");
  const [primaryTopic, setPrimaryTopic] = useState("");
  const [searchIntent, setSearchIntent] = useState("");
  const [audiences, setAudiences] = useState(DEFAULT_AUDIENCES);
  const [length, setLength] = useState<AiContentLength>(1800);
  const [blueprintId, setBlueprintId] = useState<ContentBlueprintId>(CONTENT_BLUEPRINTS[0].id);
  const [loading, setLoading] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);

  const promptInput: AiPromptInput = useMemo(
    () => ({
      keyword: keyword.trim(),
      primaryTopic: primaryTopic.trim() || undefined,
      searchIntent: searchIntent.trim() || undefined,
      audiences,
      length,
    }),
    [audiences, keyword, length, primaryTopic, searchIntent]
  );

  function refreshRecommendations() {
    if (!keyword.trim()) {
      onRecommendationsChange(null);
      return;
    }
    onRecommendationsChange(generateSeoRecommendations(promptInput, categories));
  }

  function toggleAudience(key: keyof typeof audiences) {
    setAudiences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleGenerateArticle() {
    if (!keyword.trim()) {
      onMessage("Keyword là bắt buộc.", "error");
      return;
    }
    setLoading("article");
    try {
      refreshRecommendations();
      const result = await aiContentProvider.generateArticle(promptInput);
      onApplyArticle(result);
      onMessage("Đã tạo bài viết — xem preview bên dưới.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo nội dung thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateSeo() {
    if (!keyword.trim()) {
      onMessage("Keyword là bắt buộc.", "error");
      return;
    }
    setLoading("seo");
    try {
      refreshRecommendations();
      const result = await aiContentProvider.generateSeo(promptInput);
      onApplySeo(result);
      onMessage("Đã tạo SEO — kiểm tra các trường đã cập nhật.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo nội dung thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateFaq() {
    if (!keyword.trim()) {
      onMessage("Keyword là bắt buộc.", "error");
      return;
    }
    setLoading("faq");
    try {
      refreshRecommendations();
      const result = await aiContentProvider.generateFaq(promptInput);
      onApplyFaq(result);
      onMessage("Đã tạo FAQ — kiểm tra các trường đã cập nhật.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo nội dung thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateTags() {
    if (!keyword.trim()) {
      onMessage("Keyword là bắt buộc.", "error");
      return;
    }
    setLoading("tags");
    try {
      refreshRecommendations();
      const result = await aiContentProvider.generateTags(promptInput);
      onApplyTags(result);
      onMessage("Đã tạo Tags — kiểm tra các trường đã cập nhật.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo nội dung thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function copyPrompt(type: "article" | "faq" | "seo" | "tags") {
    if (!keyword.trim()) {
      onMessage("Nhập keyword trước khi copy prompt.", "error");
      return;
    }
    const prompts = aiContentProvider.getPrompts(promptInput);
    const text = prompts[type];
    try {
      await navigator.clipboard.writeText(text);
      setPromptPreview(text);
      onMessage("Đã copy prompt vào clipboard — dán vào ChatGPT/Cursor.", "success");
    } catch {
      setPromptPreview(text);
      onMessage("Không copy được — xem prompt bên dưới.", "error");
    }
  }

  function applyBlueprintExample() {
    const blueprint = CONTENT_BLUEPRINTS.find((b) => b.id === blueprintId);
    if (!blueprint) return;
    setKeyword(blueprint.exampleKeyword);
    setPrimaryTopic(blueprint.label);
    setAudiences({
      b2bDealer: blueprint.audienceOption === "b2b-dealer",
      oem: blueprint.audienceOption === "oem",
      corporateUniform: blueprint.audienceOption === "corporate-uniform",
      corporateGift: blueprint.audienceOption === "corporate-gift",
    });
    refreshRecommendations();
  }

  return (
    <div className="admin-ai-factory">
      <div className="admin-ai-factory-header">
        <h3 className="admin-ai-factory-title">AI Content Factory</h3>
        <p className="admin-field-hint">
          Keyword → Generate → Review → Publish. Mock provider — chưa kết nối OpenAI.
        </p>
      </div>

      <div className="admin-ai-factory-grid">
        <div className="admin-field">
          <label className="admin-label">
            Keyword <span className="admin-required">*</span>
          </label>
          <input
            className="admin-input"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              if (e.target.value.trim()) {
                onRecommendationsChange(
                  generateSeoRecommendations(
                    { ...promptInput, keyword: e.target.value.trim() },
                    categories
                  )
                );
              }
            }}
            placeholder="Ví dụ: Nguồn hàng áo thun trơn"
          />
        </div>

        <div className="admin-field">
          <label className="admin-label">Primary Topic</label>
          <input
            className="admin-input"
            value={primaryTopic}
            onChange={(e) => setPrimaryTopic(e.target.value)}
            placeholder="Chủ đề chính của bài viết"
          />
        </div>

        <div className="admin-field admin-ai-factory-field--full">
          <label className="admin-label">Search Intent</label>
          <input
            className="admin-input"
            value={searchIntent}
            onChange={(e) => setSearchIntent(e.target.value)}
            placeholder="informational, commercial, B2B sourcing..."
          />
        </div>
      </div>

      <div className="admin-ai-factory-row">
        <div className="admin-ai-factory-options">
          <p className="admin-ai-factory-label">Audience</p>
          <label className="admin-checkbox-item">
            <input
              type="checkbox"
              checked={audiences.b2bDealer}
              onChange={() => toggleAudience("b2bDealer")}
            />
            <span>B2B Dealer</span>
          </label>
          <label className="admin-checkbox-item">
            <input
              type="checkbox"
              checked={audiences.oem}
              onChange={() => toggleAudience("oem")}
            />
            <span>OEM</span>
          </label>
          <label className="admin-checkbox-item">
            <input
              type="checkbox"
              checked={audiences.corporateUniform}
              onChange={() => toggleAudience("corporateUniform")}
            />
            <span>Corporate Uniform</span>
          </label>
          <label className="admin-checkbox-item">
            <input
              type="checkbox"
              checked={audiences.corporateGift}
              onChange={() => toggleAudience("corporateGift")}
            />
            <span>Corporate Gift</span>
          </label>
        </div>

        <div className="admin-ai-factory-length">
          <p className="admin-ai-factory-label">Length</p>
          {([1200, 1800, 2500] as AiContentLength[]).map((option) => (
            <label key={option} className="admin-radio-item">
              <input
                type="radio"
                name="ai-length"
                checked={length === option}
                onChange={() => setLength(option)}
              />
              <span>{option.toLocaleString("vi-VN")} words</span>
            </label>
          ))}
        </div>
      </div>

      <div className="admin-ai-factory-blueprint">
        <label className="admin-label" htmlFor="ai-blueprint-select">
          Content Blueprint
        </label>
        <div className="admin-ai-factory-blueprint-row">
          <select
            id="ai-blueprint-select"
            className="admin-input"
            value={blueprintId}
            onChange={(e) => setBlueprintId(e.target.value as ContentBlueprintId)}
          >
            {CONTENT_BLUEPRINTS.map((bp) => (
              <option key={bp.id} value={bp.id}>
                {bp.label} — {bp.exampleKeyword}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            onClick={applyBlueprintExample}
          >
            Dùng ví dụ
          </button>
        </div>
      </div>

      <div className="admin-ai-factory-actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={loading !== null}
          onClick={() => void handleGenerateArticle()}
        >
          {loading === "article" ? "Đang tạo..." : "Generate Article"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={loading !== null}
          onClick={() => void handleGenerateSeo()}
        >
          {loading === "seo" ? "..." : "Generate SEO"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={loading !== null}
          onClick={() => void handleGenerateFaq()}
        >
          {loading === "faq" ? "..." : "Generate FAQ"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={loading !== null}
          onClick={() => void handleGenerateTags()}
        >
          {loading === "tags" ? "..." : "Generate Tags"}
        </button>
      </div>

      <details className="admin-ai-factory-prompts">
        <summary>Copy prompts (ChatGPT / Cursor)</summary>
        <div className="admin-ai-factory-prompt-buttons">
          {(["article", "seo", "faq", "tags"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => void copyPrompt(type)}
            >
              Copy {type} prompt
            </button>
          ))}
        </div>
        {promptPreview && (
          <textarea
            className="admin-textarea admin-ai-factory-prompt-preview"
            readOnly
            rows={8}
            value={promptPreview}
          />
        )}
      </details>
    </div>
  );
}
