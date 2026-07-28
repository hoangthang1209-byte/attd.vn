/** Normalized editorial performance contract. Null = unavailable (never coerce to 0). */

export type PerformanceSourceStatus = "CONNECTED" | "NOT_CONNECTED" | "PARTIAL" | "ERROR";

export type PerformanceFreshness = "FRESH" | "DELAYED" | "STALE" | "UNAVAILABLE";

export type ContentRefreshStatus =
  | "NEW"
  | "HEALTHY"
  | "WATCH"
  | "UPDATE_RECOMMENDED"
  | "URGENT"
  | "INSUFFICIENT_DATA";

export type ContentPerformancePeriod = {
  from: string;
  to: string;
  label: string;
};

export type ContentPerformanceSummary = {
  contentId: string;
  contentType: "BLOG";
  title: string;
  slug: string;
  publicUrl: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string;

  strategyId: string | null;
  strategyName: string | null;
  clusterId: string | null;
  clusterName: string | null;
  topicId: string | null;
  topicTitle: string | null;

  search: {
    impressions: number | null;
    clicks: number | null;
    ctr: number | null;
    averagePosition: number | null;
    previousPeriodDelta: {
      impressions: number | null;
      clicks: number | null;
      ctr: number | null;
      averagePosition: number | null;
    };
    sourceStatus: PerformanceSourceStatus;
  };

  engagement: {
    pageViews: number | null;
    users: number | null;
    engagedSessions: number | null;
    averageEngagementSeconds: number | null;
    sourceStatus: PerformanceSourceStatus;
  };

  conversion: {
    ctaClicks: number | null;
    quoteRequests: number | null;
    dealerLeads: number | null;
    attributedLeads: number | null;
    conversionRate: number | null;
    sourceStatus: PerformanceSourceStatus;
  };

  editorial: {
    daysSincePublish: number | null;
    daysSinceUpdate: number;
    wordCount: number | null;
    internalLinkCount: number | null;
    imageCount: number | null;
    qaScore: number | null;
    hasCta: boolean | null;
    refreshStatus: ContentRefreshStatus;
    refreshReasons: string[];
  };
};

export type PerformanceSourceReport = {
  id: "search_console" | "analytics" | "internal_events" | "crm_attribution";
  label: string;
  status: PerformanceSourceStatus;
  freshness: PerformanceFreshness;
  propertyIdentifier: string | null;
  lastSuccessAt: string | null;
  lastErrorSummary: string | null;
  dataCoverage: string;
  notes: string[];
};

export type PerformanceOpportunityKind =
  | "quick_wins"
  | "ctr_improvement"
  | "ranking_improvement"
  | "conversion_improvement"
  | "content_refresh"
  | "internal_linking"
  | "missing_measurement";

export type PerformanceOpportunity = {
  id: string;
  kind: PerformanceOpportunityKind;
  contentId: string;
  title: string;
  slug: string;
  evidence: string[];
  reason: string;
  impactSignal: "LOW" | "MEDIUM" | "HIGH";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  nextActionLabel: string;
  nextActionHref: string;
  refreshStatus: ContentRefreshStatus;
};

export type PerformanceWorkspaceSummary = {
  period: ContentPerformancePeriod;
  comparisonPeriod: ContentPerformancePeriod | null;
  publishedArticles: number;
  searchClicks: number | null;
  searchImpressions: number | null;
  organicCtr: number | null;
  averagePosition: number | null;
  pageViews: number | null;
  ctaClicks: number | null;
  qualifiedLeads: number | null;
  articlesNeedingUpdate: number;
  sources: PerformanceSourceReport[];
  deltas: {
    searchClicks: number | null;
    searchImpressions: number | null;
    organicCtr: number | null;
    averagePosition: number | null;
    pageViews: number | null;
    qualifiedLeads: number | null;
  };
};

export const REFRESH_STATUS_LABELS: Record<ContentRefreshStatus, string> = {
  NEW: "Mới xuất bản",
  HEALTHY: "Ổn định",
  WATCH: "Theo dõi",
  UPDATE_RECOMMENDED: "Nên cập nhật",
  URGENT: "Ưu tiên cập nhật",
  INSUFFICIENT_DATA: "Thiếu dữ liệu",
};

export const OPPORTUNITY_KIND_LABELS: Record<PerformanceOpportunityKind, string> = {
  quick_wins: "Quick wins",
  ctr_improvement: "CTR improvement",
  ranking_improvement: "Ranking improvement",
  conversion_improvement: "Conversion improvement",
  content_refresh: "Content refresh",
  internal_linking: "Internal linking",
  missing_measurement: "Missing measurement",
};
