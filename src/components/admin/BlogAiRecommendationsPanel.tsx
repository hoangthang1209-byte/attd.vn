"use client";

import type { SeoRecommendations } from "@/features/blog/seo-recommendations";
import type { BlogCategoryRecord } from "@/features/blog/types";

type BlogAiRecommendationsPanelProps = {
  recommendations: SeoRecommendations | null;
  categories: BlogCategoryRecord[];
  selectedCategoryIds: string[];
  onApplyTags: (tags: string[]) => void;
  onApplyFaqs: () => void;
  onApplyCategories: (ids: string[]) => void;
};

export default function BlogAiRecommendationsPanel({
  recommendations,
  categories,
  selectedCategoryIds,
  onApplyTags,
  onApplyFaqs,
  onApplyCategories,
}: BlogAiRecommendationsPanelProps) {
  if (!recommendations) {
    return (
      <div className="admin-sidebar-card admin-ai-recommendations">
        <h3 className="admin-sidebar-title">SEO Recommendations</h3>
        <p className="admin-field-hint">
          Nhập keyword trong AI Content Factory để xem gợi ý.
        </p>
      </div>
    );
  }

  const suggestedCategoryNames = categories
    .filter((cat) => recommendations.suggestedCategoryIds.includes(cat.id))
    .map((cat) => cat.name);

  return (
    <div className="admin-sidebar-card admin-ai-recommendations">
      <h3 className="admin-sidebar-title">SEO Recommendations</h3>

      <div className="admin-ai-rec-block">
        <p className="admin-ai-rec-label">Related Keywords</p>
        <ul className="admin-ai-rec-list">
          {recommendations.relatedKeywords.map((kw) => (
            <li key={kw}>{kw}</li>
          ))}
        </ul>
      </div>

      <div className="admin-ai-rec-block">
        <div className="admin-ai-rec-header">
          <p className="admin-ai-rec-label">Suggested Tags</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            onClick={() => onApplyTags(recommendations.suggestedTags)}
          >
            Apply
          </button>
        </div>
        <ul className="admin-ai-rec-chips">
          {recommendations.suggestedTags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>

      <div className="admin-ai-rec-block">
        <div className="admin-ai-rec-header">
          <p className="admin-ai-rec-label">Suggested FAQs</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            onClick={onApplyFaqs}
          >
            Apply
          </button>
        </div>
        <ul className="admin-ai-rec-list admin-ai-rec-list--faqs">
          {recommendations.suggestedFaqs.map((faq) => (
            <li key={faq.question}>
              <strong>{faq.question}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-ai-rec-block">
        <p className="admin-ai-rec-label">Suggested Internal Links</p>
        <ul className="admin-ai-rec-list">
          {recommendations.suggestedInternalLinks.map((link) => (
            <li key={link.href}>
              {link.keyword} → {link.href}
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-ai-rec-block">
        <div className="admin-ai-rec-header">
          <p className="admin-ai-rec-label">Suggested Categories</p>
          {recommendations.suggestedCategoryIds.length > 0 && (
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() =>
                onApplyCategories([
                  ...new Set([
                    ...selectedCategoryIds,
                    ...recommendations.suggestedCategoryIds,
                  ]),
                ])
              }
            >
              Apply
            </button>
          )}
        </div>
        {suggestedCategoryNames.length > 0 ? (
          <ul className="admin-ai-rec-chips">
            {suggestedCategoryNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="admin-field-hint">Chưa khớp danh mục — tạo danh mục phù hợp.</p>
        )}
      </div>
    </div>
  );
}
