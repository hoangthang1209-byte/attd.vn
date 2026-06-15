import type {
  SeoCampaign,
  SeoCampaignProgress,
  SeoPlanItem,
  SeoPlanStatusCounts,
} from "@/features/blog/seo-planning-types";
import { SEO_PLAN_STATUSES } from "@/features/blog/seo-planning-status";

export function calculateStatusCounts(items: SeoPlanItem[]): SeoPlanStatusCounts {
  const counts = Object.fromEntries(
    SEO_PLAN_STATUSES.map((status) => [status, 0])
  ) as SeoPlanStatusCounts;

  for (const item of items) {
    counts[item.status] += 1;
  }

  return counts;
}

export function calculateCampaignProgress(campaign: SeoCampaign): SeoCampaignProgress {
  const items = campaign.items;
  const totalArticles = items.length;
  const publishedCount = items.filter((item) => item.status === "PUBLISHED").length;
  const reviewCount = items.filter((item) => item.status === "REVIEW").length;
  const draftCount = items.filter(
    (item) => item.status === "WRITING" || item.status === "OPTIMIZING"
  ).length;
  const notCreatedCount = items.filter(
    (item) => !item.matchedPost && (item.status === "IDEA" || item.status === "CLUSTERED")
  ).length;

  const pillar = items.find((item) => item.articleType === "pillar");
  const supporting = items.filter((item) => item.articleType === "supporting");
  const pillarPublished = pillar?.status === "PUBLISHED";
  const supportingPublished = supporting.filter((item) => item.status === "PUBLISHED").length;

  const progressPercent =
    totalArticles > 0 ? Math.round((publishedCount / totalArticles) * 100) : 0;

  return {
    totalArticles,
    publishedCount,
    draftCount,
    reviewCount,
    notCreatedCount,
    progressPercent,
    pillarPublished,
    supportingPublished,
    supportingTotal: supporting.length,
  };
}

export function calculateOverallProgress(campaigns: SeoCampaign[]): number {
  if (campaigns.length === 0) return 0;
  const total = campaigns.reduce((sum, c) => sum + calculateCampaignProgress(c).progressPercent, 0);
  return Math.round(total / campaigns.length);
}
