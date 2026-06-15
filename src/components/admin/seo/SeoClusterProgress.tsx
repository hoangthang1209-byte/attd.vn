import type { SeoCampaignProgress } from "@/features/blog/seo-planning-types";

type SeoClusterProgressProps = {
  progress: SeoCampaignProgress;
  internalLinkCoverage: { linked: number; total: number };
};

export default function SeoClusterProgress({
  progress,
  internalLinkCoverage,
}: SeoClusterProgressProps) {
  return (
    <div className="admin-seo-cluster-progress">
      <div className="admin-seo-progress-stats">
        <div className="admin-seo-progress-stat">
          <p className="admin-dashboard-label">Total articles</p>
          <p className="admin-dashboard-value">{progress.totalArticles}</p>
        </div>
        <div className="admin-seo-progress-stat">
          <p className="admin-dashboard-label">Published</p>
          <p className="admin-dashboard-value">{progress.publishedCount}</p>
        </div>
        <div className="admin-seo-progress-stat">
          <p className="admin-dashboard-label">Draft / Writing</p>
          <p className="admin-dashboard-value">{progress.draftCount}</p>
        </div>
        <div className="admin-seo-progress-stat">
          <p className="admin-dashboard-label">Not created</p>
          <p className="admin-dashboard-value">{progress.notCreatedCount}</p>
        </div>
      </div>

      <div className="admin-seo-progress-bar-wrap">
        <p className="admin-field-hint">Progress: {progress.progressPercent}%</p>
        <div className="admin-seo-progress-bar" aria-hidden>
          <div
            className="admin-seo-progress-bar-fill"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>

      <ul className="admin-seo-progress-details">
        <li>
          Pillar: {progress.pillarPublished ? "✓ Đã xuất bản" : "Chưa xuất bản"}
        </li>
        <li>
          Supporting: {progress.supportingPublished} / {progress.supportingTotal} published
        </li>
        <li>
          Internal link coverage: {internalLinkCoverage.linked} / {internalLinkCoverage.total}{" "}
          supporting articles link to pillar
        </li>
      </ul>
    </div>
  );
}
