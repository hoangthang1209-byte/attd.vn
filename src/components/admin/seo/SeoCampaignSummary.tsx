import type { SeoCampaign } from "@/features/blog/seo-planning-types";
import type { KnowledgeBaseEntryRecord, KnowledgeReadinessResult } from "@/features/knowledge-base/knowledge-base-types";
import { getCampaignProgressSummary } from "@/features/blog/seo-planning";
import { CLUSTER_TYPE_META } from "@/features/blog/cluster-handoff";
import { calculateKnowledgeReadinessForCampaign } from "@/features/knowledge-base/knowledge-base-context-builder";

type SeoCampaignSummaryProps = {
  campaign: SeoCampaign;
  knowledgeEntries?: KnowledgeBaseEntryRecord[];
};

export default function SeoCampaignSummary({
  campaign,
  knowledgeEntries = [],
}: SeoCampaignSummaryProps) {
  const progress = getCampaignProgressSummary(campaign);
  const clusterLabel = CLUSTER_TYPE_META[campaign.clusterType].label;
  const readiness: KnowledgeReadinessResult | null =
    knowledgeEntries.length > 0
      ? calculateKnowledgeReadinessForCampaign(campaign, knowledgeEntries)
      : null;

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

      {readiness && (
        <div className="admin-kb-readiness">
          <p className="admin-field-hint">Knowledge readiness</p>
          <p>
            Product: {readiness.productData} · OEM: {readiness.oemData} · Dealer:{" "}
            {readiness.dealerData} · Policies: {readiness.policyData}
          </p>
          <p>
            Score: {readiness.score}% — {readiness.label}
          </p>
          {readiness.warnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {readiness.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
