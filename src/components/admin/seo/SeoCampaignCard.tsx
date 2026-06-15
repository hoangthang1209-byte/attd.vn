import type { SeoCampaign } from "@/features/blog/seo-planning-types";
import { getCampaignProgressSummary } from "@/features/blog/seo-planning";
import { CLUSTER_TYPE_META } from "@/features/blog/cluster-handoff";

type SeoCampaignCardProps = {
  campaign: SeoCampaign;
  selected: boolean;
  onSelect: () => void;
};

export default function SeoCampaignCard({ campaign, selected, onSelect }: SeoCampaignCardProps) {
  const progress = getCampaignProgressSummary(campaign);
  const clusterLabel = CLUSTER_TYPE_META[campaign.clusterType].label;

  return (
    <article
      className={`admin-seo-campaign-card ${selected ? "admin-seo-campaign-card--selected" : ""}`}
    >
      <h3 className="admin-seo-campaign-name">{campaign.name}</h3>
      <p className="admin-field-hint">
        Main keyword: <strong>{campaign.mainKeyword}</strong>
      </p>
      <p className="admin-field-hint">Cluster type: {clusterLabel}</p>
      <div className="admin-seo-campaign-stats">
        <span>{campaign.items.length} bài</span>
        <span>
          {progress.publishedCount} / {progress.totalArticles} published
        </span>
        <span>
          Cluster Score: {campaign.clusterScore}/100
        </span>
      </div>
      <div className="admin-seo-progress-bar" aria-hidden>
        <div
          className="admin-seo-progress-bar-fill"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>
      <p className="admin-field-hint">Progress: {progress.progressPercent}%</p>
      <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={onSelect}>
        Xem kế hoạch
      </button>
    </article>
  );
}
