import type {
  ContentPerformanceSummary,
  ContentRefreshStatus,
  PerformanceOpportunity,
  PerformanceOpportunityKind,
} from "@/features/content/performance/content-performance.types";
import { topicWorkspaceHref } from "@/features/content/editorial/editorial-ux";

export type RefreshEngineConfig = {
  /** Days after publish before search-based rules apply. */
  minObservationDays: number;
  /** Days without update before stale signal. */
  staleUpdateDays: number;
  /** Days without update for urgent stale signal. */
  urgentStaleDays: number;
};

export const DEFAULT_REFRESH_ENGINE_CONFIG: RefreshEngineConfig = {
  minObservationDays: 14,
  staleUpdateDays: 90,
  urgentStaleDays: 180,
};

type RefreshInput = {
  publishedAt: string | null;
  updatedAt: string;
  hasCta: boolean | null;
  internalLinkCount: number | null;
  imageCount: number | null;
  wordCount: number | null;
  search: ContentPerformanceSummary["search"];
  engagement: ContentPerformanceSummary["engagement"];
  conversion: ContentPerformanceSummary["conversion"];
  now?: Date;
  config?: RefreshEngineConfig;
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Deterministic refresh assessment — no AI.
 * Search/engagement rules only fire when measured values are non-null.
 */
export function assessContentRefresh(input: RefreshInput): {
  refreshStatus: ContentRefreshStatus;
  refreshReasons: string[];
} {
  const config = input.config ?? DEFAULT_REFRESH_ENGINE_CONFIG;
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const daysSincePublish =
    input.publishedAt != null ? daysBetween(new Date(input.publishedAt), now) : null;
  const daysSinceUpdate = daysBetween(new Date(input.updatedAt), now);

  const searchConnected = input.search.sourceStatus === "CONNECTED";
  const engagementConnected = input.engagement.sourceStatus === "CONNECTED";
  const conversionConnected =
    input.conversion.sourceStatus === "CONNECTED" ||
    input.conversion.sourceStatus === "PARTIAL";

  if (daysSincePublish != null && daysSincePublish < config.minObservationDays) {
    return {
      refreshStatus: "NEW",
      refreshReasons: [
        `Bài mới xuất bản ${daysSincePublish} ngày — chưa đủ cửa sổ quan sát (${config.minObservationDays} ngày).`,
      ],
    };
  }

  let severity: ContentRefreshStatus = "HEALTHY";

  const raise = (next: ContentRefreshStatus) => {
    const order: ContentRefreshStatus[] = [
      "HEALTHY",
      "WATCH",
      "UPDATE_RECOMMENDED",
      "URGENT",
      "INSUFFICIENT_DATA",
    ];
    if (order.indexOf(next) > order.indexOf(severity)) severity = next;
  };

  if (daysSinceUpdate >= config.urgentStaleDays) {
    reasons.push(`Nội dung chưa cập nhật ${daysSinceUpdate} ngày (ngưỡng khẩn ${config.urgentStaleDays}).`);
    raise("URGENT");
  } else if (daysSinceUpdate >= config.staleUpdateDays) {
    reasons.push(`Nội dung chưa cập nhật ${daysSinceUpdate} ngày (ngưỡng ${config.staleUpdateDays}).`);
    raise("UPDATE_RECOMMENDED");
  }

  if (input.hasCta === false) {
    reasons.push("Bài chưa có CTA rõ ràng (liên hệ / báo giá).");
    raise("UPDATE_RECOMMENDED");
  }

  if (input.internalLinkCount != null && input.internalLinkCount === 0) {
    reasons.push("Chưa có internal link biên tập gắn với chủ đề.");
    raise("WATCH");
  }

  if (input.imageCount != null && input.imageCount === 0) {
    reasons.push("Chưa phát hiện hình ảnh trong bài.");
    raise("WATCH");
  }

  if (input.wordCount != null && input.wordCount < 300) {
    reasons.push(`Độ dài bài thấp (~${input.wordCount} từ).`);
    raise("WATCH");
  }

  // Search-based rules — only with measured data
  if (searchConnected) {
    const impressions = input.search.impressions;
    const clicks = input.search.clicks;
    const ctr = input.search.ctr;
    const position = input.search.averagePosition;
    const clickDelta = input.search.previousPeriodDelta.clicks;
    const positionDelta = input.search.previousPeriodDelta.averagePosition;

    if (impressions != null && impressions === 0 && daysSincePublish != null && daysSincePublish >= config.minObservationDays) {
      reasons.push("Đã xuất bản đủ lâu nhưng chưa có impression Search Console.");
      raise("WATCH");
    }

    if (impressions != null && impressions >= 100 && ctr != null && ctr < 0.02) {
      reasons.push(`Có ${impressions} impression nhưng CTR thấp (${(ctr * 100).toFixed(1)}%).`);
      raise("UPDATE_RECOMMENDED");
    }

    if (position != null && position >= 4 && position <= 15 && impressions != null && impressions >= 50) {
      reasons.push(`Vị trí trung bình ${position.toFixed(1)} (4–15) với ${impressions} impression — cơ hội cải thiện.`);
      raise("UPDATE_RECOMMENDED");
    }

    if (clickDelta != null && clickDelta < 0 && clicks != null) {
      reasons.push(`Click giảm ${Math.abs(clickDelta)} so với kỳ trước.`);
      raise("WATCH");
    }

    if (positionDelta != null && positionDelta > 0.5) {
      reasons.push(`Vị trí trung bình xấu đi +${positionDelta.toFixed(1)} so với kỳ trước.`);
      raise("WATCH");
    }
  }

  if (engagementConnected) {
    const views = input.engagement.pageViews;
    if (
      views != null &&
      views >= 50 &&
      conversionConnected &&
      input.conversion.attributedLeads === 0 &&
      input.hasCta === false
    ) {
      reasons.push(`Có ${views} page view nhưng chưa có lead gắn và thiếu CTA.`);
      raise("UPDATE_RECOMMENDED");
    }
  }

  if (
    conversionConnected &&
    input.conversion.attributedLeads != null &&
    input.conversion.attributedLeads === 0 &&
    engagementConnected &&
    input.engagement.pageViews != null &&
    input.engagement.pageViews >= 100
  ) {
    reasons.push("Traffic cao nhưng chưa ghi nhận lead gắn landing URL.");
    raise("WATCH");
  }

  const measured =
    searchConnected ||
    engagementConnected ||
    (conversionConnected && input.conversion.attributedLeads != null);

  if (!measured && reasons.length === 0) {
    return {
      refreshStatus: "INSUFFICIENT_DATA",
      refreshReasons: [
        "Chưa có Search Console / Analytics đo được. Chỉ dựa được vào tín hiệu biên tập nội bộ khi có.",
      ],
    };
  }

  if (reasons.length === 0) {
    return {
      refreshStatus: "HEALTHY",
      refreshReasons: ["Không có tín hiệu cảnh báo trong cửa sổ quan sát hiện tại."],
    };
  }

  return { refreshStatus: severity === "HEALTHY" ? "WATCH" : severity, refreshReasons: reasons };
}

export function buildOpportunitiesFromSummaries(
  rows: ContentPerformanceSummary[],
): PerformanceOpportunity[] {
  const opportunities: PerformanceOpportunity[] = [];

  for (const row of rows) {
    const href = row.topicId
      ? topicWorkspaceHref(row.topicId)
      : `/admin/content/performance/${row.contentId}`;

    if (row.search.sourceStatus === "NOT_CONNECTED" || row.engagement.sourceStatus === "NOT_CONNECTED") {
      opportunities.push({
        id: `${row.contentId}-measurement`,
        kind: "missing_measurement",
        contentId: row.contentId,
        title: row.title,
        slug: row.slug,
        evidence: [
          `Search: ${row.search.sourceStatus}`,
          `Engagement: ${row.engagement.sourceStatus}`,
        ],
        reason: "Thiếu nguồn đo lường bên ngoài cho bài đã xuất bản.",
        impactSignal: "MEDIUM",
        confidence: "HIGH",
        nextActionLabel: "Xem kết nối nguồn",
        nextActionHref: "/admin/content/performance/settings",
        refreshStatus: row.editorial.refreshStatus,
      });
    }

    if (row.editorial.hasCta === false) {
      opportunities.push({
        id: `${row.contentId}-cta`,
        kind: "conversion_improvement",
        contentId: row.contentId,
        title: row.title,
        slug: row.slug,
        evidence: ["Không phát hiện CTA liên hệ / báo giá trong nội dung."],
        reason: "Thiếu CTA giảm khả năng chuyển đổi.",
        impactSignal: "HIGH",
        confidence: "MEDIUM",
        nextActionLabel: "Open Topic Workspace",
        nextActionHref: href,
        refreshStatus: row.editorial.refreshStatus,
      });
    }

    if (row.editorial.internalLinkCount === 0) {
      opportunities.push({
        id: `${row.contentId}-links`,
        kind: "internal_linking",
        contentId: row.contentId,
        title: row.title,
        slug: row.slug,
        evidence: ["0 internal link biên tập gắn chủ đề."],
        reason: "Cần bổ sung internal linking.",
        impactSignal: "MEDIUM",
        confidence: "MEDIUM",
        nextActionLabel: "Open Topic Workspace",
        nextActionHref: href,
        refreshStatus: row.editorial.refreshStatus,
      });
    }

    if (
      row.editorial.refreshStatus === "UPDATE_RECOMMENDED" ||
      row.editorial.refreshStatus === "URGENT"
    ) {
      opportunities.push({
        id: `${row.contentId}-refresh`,
        kind: "content_refresh",
        contentId: row.contentId,
        title: row.title,
        slug: row.slug,
        evidence: row.editorial.refreshReasons.slice(0, 3),
        reason: "Máy quy tắc biên tập đề xuất cập nhật bài.",
        impactSignal: row.editorial.refreshStatus === "URGENT" ? "HIGH" : "MEDIUM",
        confidence: "HIGH",
        nextActionLabel: "Tạo việc cập nhật",
        nextActionHref: href,
        refreshStatus: row.editorial.refreshStatus,
      });
    }

    if (
      row.search.impressions != null &&
      row.search.impressions >= 100 &&
      row.search.ctr != null &&
      row.search.ctr < 0.02
    ) {
      opportunities.push({
        id: `${row.contentId}-ctr`,
        kind: "ctr_improvement",
        contentId: row.contentId,
        title: row.title,
        slug: row.slug,
        evidence: [
          `Impressions ${row.search.impressions}`,
          `CTR ${(row.search.ctr * 100).toFixed(1)}%`,
        ],
        reason: "Impression cao nhưng CTR thấp.",
        impactSignal: "HIGH",
        confidence: "HIGH",
        nextActionLabel: "Xem hiệu quả bài",
        nextActionHref: `/admin/content/performance/${row.contentId}`,
        refreshStatus: row.editorial.refreshStatus,
      });
    }

    if (
      row.search.averagePosition != null &&
      row.search.averagePosition >= 4 &&
      row.search.averagePosition <= 15 &&
      row.search.impressions != null &&
      row.search.impressions >= 50
    ) {
      opportunities.push({
        id: `${row.contentId}-rank`,
        kind: "ranking_improvement",
        contentId: row.contentId,
        title: row.title,
        slug: row.slug,
        evidence: [
          `Position ${row.search.averagePosition.toFixed(1)}`,
          `Impressions ${row.search.impressions}`,
        ],
        reason: "Vị trí 4–15 với impression đủ lớn (không phải đảm bảo xếp hạng).",
        impactSignal: "MEDIUM",
        confidence: "MEDIUM",
        nextActionLabel: "Xem hiệu quả bài",
        nextActionHref: `/admin/content/performance/${row.contentId}`,
        refreshStatus: row.editorial.refreshStatus,
      });
    }
  }

  // Deduplicate measurement opportunities — keep one global if many
  const measurement = opportunities.filter((o) => o.kind === "missing_measurement");
  const others = opportunities.filter((o) => o.kind !== "missing_measurement");
  const kinds = new Set<PerformanceOpportunityKind>();
  const deduped: PerformanceOpportunity[] = [];
  if (measurement.length > 0) {
    deduped.push({
      ...measurement[0],
      id: "workspace-missing-measurement",
      title: `${measurement.length} bài thiếu nguồn đo`,
      evidence: [`${measurement.length} bài published thiếu Search Console và/hoặc Analytics.`],
      reason: "Kết nối nguồn đo để mở quick wins / CTR / ranking.",
      nextActionLabel: "Kết nối nguồn dữ liệu",
      nextActionHref: "/admin/content/performance/settings",
    });
  }
  for (const row of others) {
    if (row.kind === "missing_measurement") continue;
    // keep article-level opportunities; cap per kind later in API
    deduped.push(row);
    kinds.add(row.kind);
  }
  return deduped;
}
