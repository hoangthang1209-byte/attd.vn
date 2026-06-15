import type { SeoCampaign } from "@/features/blog/seo-planning-types";
import { getCampaignProgressSummary } from "@/features/blog/seo-planning";
import { CLUSTER_TYPE_META } from "@/features/blog/cluster-handoff";

type SeoCampaignSummaryProps = {
  campaign: SeoCampaign;
};

export default function SeoCampaignSummary({ campaign }: SeoCampaignSummaryProps) {
  const progress = getCampaignProgressSummary(campaign);
  const clusterLabel = CLUSTER_TYPE_META[campaign.clusterType].label;

  return (
    <div className="admin-seo-campaign-summary">
      <h2 className="admin-subtitle">{campaign.name}</h2>
      <div className="admin-seo-campaign-summary-grid">
        <div>
          <p className="admin-field-hint">Main keyword</p>
          <p>{campaign.mainKeyword}</p>
        </div>
        <div>
          <p className="admin-field-hint">Cluster type</p>
          <p>{clusterLabel}</p>
        </div>
        <div>
          <p className="admin-field-hint">Articles</p>
          <p>
            {progress.publishedCount} / {progress.totalArticles} published
          </p>
        </div>
        <div>
          <p className="admin-field-hint">Cluster Score</p>
          <p>
            {campaign.clusterScore}/100 — {campaign.clusterScoreLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
