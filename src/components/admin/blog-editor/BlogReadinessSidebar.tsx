"use client";

import { useState } from "react";
import BlogCtaPreview from "@/components/admin/blog-editor/BlogCtaPreview";
import PanelSkeleton from "@/components/ui/loading/PanelSkeleton";
import type { BlogReadinessResult, ReadinessSignal } from "@/features/blog/blog-readiness";

type BlogReadinessSidebarProps = {
  readiness: BlogReadinessResult;
  loading: boolean;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  /** Article body, used for the live CTA preview. */
  content: string;
  onOpenSeo: () => void;
  onOpenPublishing: () => void;
  onRefresh?: () => void;
};

const GROUP_ORDER: Array<{ group: ReadinessSignal["group"]; label: string }> = [
  { group: "CONTENT", label: "Content" },
  { group: "SEO", label: "SEO" },
  { group: "MEDIA", label: "Media" },
];

function statusTone(readiness: BlogReadinessResult): "green" | "red" | "yellow" {
  if (!readiness.serverChecked) return "yellow";
  return readiness.status === "READY" ? "green" : "red";
}

/**
 * One card, three numbers. Everything else lives behind Details so the sidebar
 * stops competing with the editor for attention.
 */
export default function BlogReadinessSidebar({
  readiness,
  loading,
  metaTitle,
  metaDescription,
  slug,
  content,
  onOpenSeo,
  onOpenPublishing,
  onRefresh,
}: BlogReadinessSidebarProps) {
  const [showDetails, setShowDetails] = useState(false);
  const tone = statusTone(readiness);
  const indicators = readiness.signals.filter(
    (item) => item.severity === "WARNING" && item.group !== "EDITORIAL",
  );

  if (loading) {
    return (
      <div className="blog-readiness-sidebar">
        <section className="admin-sidebar-card blog-status-card">
          <PanelSkeleton label="Đang kiểm tra điều kiện xuất bản…" lines={3} withTitle={false} />
        </section>
      </div>
    );
  }

  return (
    <div className="blog-readiness-sidebar">
      <section className="admin-sidebar-card blog-status-card">
        <div className="blog-status-card__row">
          <span className={`blog-status-chip blog-status-chip--${tone}`}>
            {readiness.statusLabel}
          </span>
          <span className={`blog-status-score blog-status-score--${readiness.quality.level}`}>
            SEO {readiness.quality.score}
          </span>
        </div>

        <button
          type="button"
          className="blog-status-card__summary"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((value) => !value)}
        >
          <span>
            {readiness.blockers.length > 0
              ? `Blockers (${readiness.blockers.length})`
              : `Warnings (${readiness.warnings.length})`}
          </span>
          <span aria-hidden="true">{showDetails ? "▲" : "▼"} Details</span>
        </button>

        {showDetails && (
          <div className="blog-status-card__details">
            {readiness.blockers.length > 0 && (
              <ul className="blog-readiness-issues">
                {readiness.blockers.map((item) => (
                  <li key={item.code} className="is-blocker">
                    <span className="blog-readiness-issues__tag">Blocker</span> {item.label}
                  </li>
                ))}
              </ul>
            )}

            {readiness.warnings.length > 0 && (
              <ul className="blog-readiness-issues">
                {readiness.warnings.map((item) => (
                  <li key={item.code} className="is-warning">
                    <span className="blog-readiness-issues__tag">Warning</span> {item.label}
                    {item.display ? ` — ${item.display}` : ""}
                  </li>
                ))}
              </ul>
            )}

            {GROUP_ORDER.map((group) => {
              const rows = indicators.filter((item) => item.group === group.group);
              if (rows.length === 0) return null;
              return (
                <div key={group.group} className="blog-readiness-group">
                  <p className="blog-readiness-group__title">{group.label}</p>
                  <ul className="blog-readiness-list">
                    {rows.map((item) => (
                      <li key={item.code} className={item.ok ? "is-ok" : ""}>
                        <span className="blog-readiness-list__label">{item.label}</span>
                        <span className="blog-readiness-list__value">{item.display}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <div className="blog-readiness-group">
              <p className="blog-readiness-group__title">Metadata</p>
              <ul className="blog-readiness-list">
                <li className={metaTitle.trim() ? "is-ok" : ""}>
                  <span className="blog-readiness-list__label">Meta title</span>
                  <span className="blog-readiness-list__value">
                    {metaTitle.trim() ? `${metaTitle.trim().length} ký tự` : "Missing"}
                  </span>
                </li>
                <li className={metaDescription.trim() ? "is-ok" : ""}>
                  <span className="blog-readiness-list__label">Meta description</span>
                  <span className="blog-readiness-list__value">
                    {metaDescription.trim() ? `${metaDescription.trim().length} ký tự` : "Missing"}
                  </span>
                </li>
                <li className={slug.trim() ? "is-ok" : ""}>
                  <span className="blog-readiness-list__label">Slug</span>
                  <span className="blog-readiness-list__value">{slug.trim() || "Missing"}</span>
                </li>
              </ul>
            </div>

            <BlogCtaPreview content={content} />

            <div className="blog-readiness-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={onOpenPublishing}
              >
                Publishing
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={onOpenSeo}
              >
                SEO
              </button>
              {onRefresh && (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={onRefresh}
                >
                  Kiểm tra lại
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
