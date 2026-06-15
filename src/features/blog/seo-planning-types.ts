import type { BlogPostStatus } from "@prisma/client";
import type { ClusterType } from "@/features/blog/content-clusters-types";

export type SeoPlanStatus =
  | "IDEA"
  | "CLUSTERED"
  | "WRITING"
  | "REVIEW"
  | "PUBLISHED"
  | "OPTIMIZING"
  | "TOP_10"
  | "TOP_3";

export type SeoPlanPriority = "HIGH" | "MEDIUM" | "LOW";

export type SeoPlanArticleType = "pillar" | "supporting";

export type SeoPlanMatchedPost = {
  id: string;
  slug: string;
  title: string;
  status: BlogPostStatus;
};

export type SeoPlanItem = {
  id: string;
  campaignId: string;
  clusterArticleId: string;
  title: string;
  keyword: string;
  articleType: SeoPlanArticleType;
  intent: string;
  priority: SeoPlanPriority;
  status: SeoPlanStatus;
  suggestedPublishWeek: number;
  suggestedLinks: string[];
  matchedPost?: SeoPlanMatchedPost;
};

export type SeoCampaign = {
  id: string;
  name: string;
  mainKeyword: string;
  clusterType: ClusterType;
  clusterScore: number;
  clusterScoreLabel: string;
  items: SeoPlanItem[];
  createdAt: string;
};

export type SeoPlanStatusCounts = Record<SeoPlanStatus, number>;

export type SeoCampaignProgress = {
  totalArticles: number;
  publishedCount: number;
  draftCount: number;
  reviewCount: number;
  notCreatedCount: number;
  progressPercent: number;
  pillarPublished: boolean;
  supportingPublished: number;
  supportingTotal: number;
};

export type SeoPlanCalendarWeek = {
  week: number;
  label: string;
  items: SeoPlanItem[];
};

export type SeoPlanCalendar = {
  weeks: SeoPlanCalendarWeek[];
};

export type SeoPlanningRecommendation = {
  id: string;
  type: "create" | "link" | "refresh" | "cluster" | "priority";
  severity: "high" | "medium" | "low";
  message: string;
  relatedItemId?: string;
};

export type SeoPlanningKpis = {
  campaigns: number;
  clusters: number;
  articlesPlanned: number;
  articlesPublished: number;
  readyToPublish: number;
  overallProgressPercent: number;
};

export type SeoInternalLinkCoverageItem = {
  articleId: string;
  title: string;
  linksToPillar: boolean;
  linkTargets: { id: string; title: string }[];
  warnings: string[];
};

export type SeoInternalLinkCoverage = {
  pillarTitle: string;
  items: SeoInternalLinkCoverageItem[];
  supportingLinkedToPillar: number;
  supportingTotal: number;
  warnings: string[];
};
