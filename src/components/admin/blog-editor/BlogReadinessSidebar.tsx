"use client";

import PanelSkeleton from "@/components/ui/loading/PanelSkeleton";
import type { BlogReadinessResult, ReadinessSignal } from "@/features/blog/blog-readiness";

type BlogReadinessSidebarProps = {
  readiness: BlogReadinessResult;
  loading: boolean;
  /** Compact metadata summary shown under the score. */
  metaTitle: string;
  metaDescription: string;
  slug: string;
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

export default function BlogReadinessSidebar({
  readiness,
  loading,
  metaTitle,
  metaDescription,
  slug,
  onOpenSeo,
  onOpenPublishing,
  onRefresh,
}: BlogReadinessSidebarProps) {
  const tone = statusTone(readiness);
  const indicators = readiness.signals.filter(
    (item) => item.severity === "WARNING" && item.group !== "EDITORIAL"
  );

  return (
    <div className="blog-readiness-sidebar">
      <section className="admin-sidebar-card">
        <h3 className="admin-sidebar-title">Publishing Readiness</h3>
        {loading ? (
          <PanelSkeleton label="Đang kiểm tra điều kiện xuất bản…" lines={2} withTitle={false} />
        ) : (
          <>
            <p className={`admin-publish-readiness admin-publish-readiness--${tone}`}>
              {readiness.statusLabel}
            </p>
            <p className="admin-field-hint">
              {readiness.blockers.length} blocker · {readiness.warnings.length} warning
            </p>
            {readiness.blockers.slice(0, 3).map((item) => (
              <p key={item.code} className="blog-readiness-blocker">
                {item.label}
              </p>
            ))}
            <div className="blog-readiness-actions">
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onOpenPublishing}>
                Mở Publishing
              </button>
              {onRefresh && (
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onRefresh}>
                  Kiểm tra lại
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <section className="admin-sidebar-card">
        <h3 className="admin-sidebar-title">SEO Score</h3>
        <p className={`admin-seo-score admin-seo-score--${readiness.quality.level}`}>
          {readiness.quality.score}/100
        </p>
        <p className="admin-field-hint">{readiness.quality.label}</p>

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
        <p className="admin-field-hint">Các chỉ số này là khuyến nghị, không chặn xuất bản.</p>
      </section>

      <section className="admin-sidebar-card">
        <h3 className="admin-sidebar-title">Metadata</h3>
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
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onOpenSeo}>
          Chỉnh SEO
        </button>
      </section>
    </div>
  );
}
