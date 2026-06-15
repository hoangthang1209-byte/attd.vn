"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AiPromptInput, AiContentLength } from "@/features/blog/ai-prompts";
import type { BusinessGoal } from "@/features/blog/ai-factory-types";
import { BUSINESS_GOAL_OPTIONS, getBusinessGoalConfig } from "@/features/blog/ai-factory-types";
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
import type { ClusterHandoffRequest } from "@/features/blog/cluster-handoff";
import type { BlogCategoryRecord } from "@/features/blog/types";

export type { BusinessGoal } from "@/features/blog/ai-factory-types";

type AiContentFactoryProps = {
  categories: BlogCategoryRecord[];
  onApplyArticle: (result: GeneratedArticle) => boolean;
  onApplySeo: (result: AiSeoResult) => void;
  onApplyFaq: (result: AiFaqResult) => void;
  onApplyTags: (result: AiTagsResult) => void;
  onRecommendationsChange: (rec: SeoRecommendations | null) => void;
  onMessage: (text: string, type: "success" | "error") => void;
  onScrollToEditor?: () => void;
  handoff?: ClusterHandoffRequest | null;
  onHandoffConsumed?: () => void;
};

export default function AiContentFactory({
  categories,
  onApplyArticle,
  onApplySeo,
  onApplyFaq,
  onApplyTags,
  onRecommendationsChange,
  onMessage,
  onScrollToEditor,
  handoff,
  onHandoffConsumed,
}: AiContentFactoryProps) {
  const [keyword, setKeyword] = useState("");
  const [businessGoal, setBusinessGoal] = useState<BusinessGoal>("seo-traffic");
  const [length, setLength] = useState<AiContentLength>(1800);
  const [blueprintId, setBlueprintId] = useState<ContentBlueprintId>(CONTENT_BLUEPRINTS[0].id);
  const [loading, setLoading] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const handoffProcessedRef = useRef<string | null>(null);

  const goalConfig = getBusinessGoalConfig(businessGoal);

  const promptInput: AiPromptInput = useMemo(
    () => ({
      keyword: keyword.trim(),
      searchIntent: goalConfig.searchIntent,
      audiences: goalConfig.audiences,
      length,
    }),
    [goalConfig.audiences, goalConfig.searchIntent, keyword, length]
  );

  const isBusy = loading !== null;

  function refreshRecommendations(nextKeyword?: string) {
    const kw = (nextKeyword ?? keyword).trim();
    if (!kw) {
      onRecommendationsChange(null);
      return;
    }
    onRecommendationsChange(
      generateSeoRecommendations({ ...promptInput, keyword: kw }, categories)
    );
  }

  function buildPromptInput(
    kw: string,
    goal: BusinessGoal,
    wordLength: AiContentLength = length
  ): AiPromptInput {
    const config = getBusinessGoalConfig(goal);
    return {
      keyword: kw.trim(),
      searchIntent: config.searchIntent,
      audiences: config.audiences,
      length: wordLength,
    };
  }

  async function runCompleteGeneration(input: AiPromptInput) {
    refreshRecommendations(input.keyword);
    const result = await aiContentProvider.generateArticle(input);
    const applied = onApplyArticle(result);
    if (applied) {
      onMessage("Đã tạo bài viết hoàn chỉnh — xem và chỉnh sửa bên dưới.", "success");
      onScrollToEditor?.();
    }
    return applied;
  }

  async function handleGenerateComplete() {
    if (!keyword.trim()) {
      onMessage("Vui lòng nhập từ khóa chính.", "error");
      return;
    }

    setLoading("complete");
    try {
      await runCompleteGeneration(promptInput);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo bài viết thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateSeo() {
    if (!keyword.trim()) {
      onMessage("Vui lòng nhập từ khóa chính.", "error");
      return;
    }
    setLoading("seo");
    try {
      refreshRecommendations();
      const result = await aiContentProvider.generateSeo(promptInput);
      onApplySeo(result);
      onMessage("Đã cập nhật SEO.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo SEO thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateFaq() {
    if (!keyword.trim()) {
      onMessage("Vui lòng nhập từ khóa chính.", "error");
      return;
    }
    setLoading("faq");
    try {
      refreshRecommendations();
      const result = await aiContentProvider.generateFaq(promptInput);
      onApplyFaq(result);
      onMessage("Đã cập nhật FAQ.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo FAQ thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateTags() {
    if (!keyword.trim()) {
      onMessage("Vui lòng nhập từ khóa chính.", "error");
      return;
    }
    setLoading("tags");
    try {
      refreshRecommendations();
      const result = await aiContentProvider.generateTags(promptInput);
      onApplyTags(result);
      onMessage("Đã cập nhật tags.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Tạo tags thất bại.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function copyPrompt(type: "article" | "faq" | "seo" | "tags") {
    if (!keyword.trim()) {
      onMessage("Nhập từ khóa trước khi copy prompt.", "error");
      return;
    }
    const prompts = aiContentProvider.getPrompts(promptInput);
    const text = prompts[type];
    try {
      await navigator.clipboard.writeText(text);
      setPromptPreview(text);
      onMessage("Đã copy prompt — dán vào ChatGPT/Cursor.", "success");
    } catch {
      setPromptPreview(text);
      onMessage("Không copy được — xem prompt bên dưới.", "error");
    }
  }

  function applyBlueprintExample() {
    const blueprint = CONTENT_BLUEPRINTS.find((b) => b.id === blueprintId);
    if (!blueprint) return;
    setKeyword(blueprint.exampleKeyword);
    const matchedGoal = BUSINESS_GOAL_OPTIONS.find((g) => {
      if (blueprint.audienceOption === "oem") return g.id === "oem-leads";
      if (blueprint.audienceOption === "corporate-uniform") return g.id === "corporate-uniform";
      if (blueprint.audienceOption === "corporate-gift") return g.id === "corporate-gift";
      if (blueprint.id === "dealer-recruitment") return g.id === "dealer-recruitment";
      return g.id === "seo-traffic";
    });
    if (matchedGoal) setBusinessGoal(matchedGoal.id);
    refreshRecommendations(blueprint.exampleKeyword);
  }

  useEffect(() => {
    if (!handoff) return;
    const token = `${handoff.keyword}:${handoff.businessGoal}:${handoff.blueprintId}:${handoff.autoGenerate}`;
    if (handoffProcessedRef.current === token) return;
    handoffProcessedRef.current = token;

    setKeyword(handoff.keyword);
    setBusinessGoal(handoff.businessGoal);
    setBlueprintId(handoff.blueprintId);

    const input = buildPromptInput(handoff.keyword, handoff.businessGoal);

    if (handoff.autoGenerate) {
      setLoading("complete");
      void runCompleteGeneration(input)
        .catch((error) => {
          onMessage(error instanceof Error ? error.message : "Tạo bài viết thất bại.", "error");
        })
        .finally(() => {
          setLoading(null);
          onHandoffConsumed?.();
        });
      return;
    }

    refreshRecommendations(handoff.keyword);
    onHandoffConsumed?.();
  }, [handoff, onHandoffConsumed, onMessage]);

  return (
    <div className={`admin-ai-factory ${isBusy ? "admin-ai-factory--busy" : ""}`}>
      <div className="admin-ai-factory-header">
        <h3 className="admin-ai-factory-title">AI Content Factory</h3>
        <p className="admin-ai-factory-helper">
          Nhập từ khóa chính, chọn mục tiêu bài viết và nhấn &lsquo;Tạo bài viết hoàn chỉnh&rsquo;.
          Hệ thống sẽ tự tạo tiêu đề, nội dung, SEO, FAQ và tags.
        </p>
      </div>

      <fieldset className="admin-ai-factory-form" disabled={isBusy}>
        <div className="admin-field">
          <label className="admin-label" htmlFor="ai-keyword">
            Từ khóa chính <span className="admin-required">*</span>
          </label>
          <input
            id="ai-keyword"
            className="admin-input"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              if (e.target.value.trim()) {
                refreshRecommendations(e.target.value);
              } else {
                onRecommendationsChange(null);
              }
            }}
            placeholder="Ví dụ: Nguồn hàng áo thun trơn"
          />
        </div>

        <div className="admin-field">
          <p className="admin-label">Mục tiêu bài viết</p>
          <div className="admin-ai-factory-goals">
            {BUSINESS_GOAL_OPTIONS.map((goal) => (
              <label key={goal.id} className="admin-radio-item admin-ai-factory-goal">
                <input
                  type="radio"
                  name="business-goal"
                  checked={businessGoal === goal.id}
                  onChange={() => setBusinessGoal(goal.id)}
                />
                <span>{goal.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="admin-ai-factory-primary-action">
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-ai-factory-cta"
            disabled={isBusy}
            onClick={() => void handleGenerateComplete()}
          >
            {loading === "complete" ? "Đang tạo bài viết…" : "🚀 Tạo bài viết hoàn chỉnh"}
          </button>
        </div>
      </fieldset>

      {loading === "complete" && (
        <div className="admin-ai-factory-loading" role="status" aria-live="polite">
          <span className="admin-ai-factory-spinner" aria-hidden />
          <span>Đang tạo bài viết…</span>
        </div>
      )}

      <details className="admin-ai-factory-advanced">
        <summary>Tùy chọn nâng cao</summary>

        <fieldset className="admin-ai-factory-advanced-inner" disabled={isBusy}>
          <div className="admin-ai-factory-length">
            <p className="admin-ai-factory-label">Độ dài bài viết</p>
            {([1200, 1800, 2500] as AiContentLength[]).map((option) => (
              <label key={option} className="admin-radio-item">
                <input
                  type="radio"
                  name="ai-length"
                  checked={length === option}
                  onChange={() => setLength(option)}
                />
                <span>{option.toLocaleString("vi-VN")} từ</span>
              </label>
            ))}
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

          <div className="admin-ai-factory-advanced-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={isBusy}
              onClick={() => void handleGenerateSeo()}
            >
              {loading === "seo" ? "Đang tạo…" : "Generate SEO"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={isBusy}
              onClick={() => void handleGenerateFaq()}
            >
              {loading === "faq" ? "Đang tạo…" : "Generate FAQ"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={isBusy}
              onClick={() => void handleGenerateTags()}
            >
              {loading === "tags" ? "Đang tạo…" : "Generate Tags"}
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
        </fieldset>
      </details>
    </div>
  );
}
