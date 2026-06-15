import type { ContentCluster } from "@/features/blog/content-clusters";
import {
  generateInternalLinkMap,
  getAllClusterArticles,
} from "@/features/blog/content-clusters";
import type {
  SeoCampaign,
  SeoInternalLinkCoverage,
  SeoPlanningRecommendation,
} from "@/features/blog/seo-planning-types";

export function buildInternalLinkCoverage(cluster: ContentCluster): SeoInternalLinkCoverage {
  const linkMap = generateInternalLinkMap(cluster);
  const articles = getAllClusterArticles(cluster);
  const articleById = new Map(articles.map((a) => [a.id, a]));
  const warnings: string[] = [];

  const items = cluster.supporting.map((article) => {
    const linksToPillar = article.suggestedLinks.includes(cluster.pillar.id);
    const linkTargets = article.suggestedLinks
      .map((id) => articleById.get(id))
      .filter(Boolean)
      .map((a) => ({ id: a!.id, title: a!.title }));

    const itemWarnings: string[] = [];
    if (!linksToPillar) {
      itemWarnings.push("Thiếu link về pillar");
    }
    if (article.suggestedLinks.length < 1) {
      itemWarnings.push("Quá ít internal links");
    }

    return {
      articleId: article.id,
      title: article.title,
      linksToPillar,
      linkTargets,
      warnings: itemWarnings,
    };
  });

  const supportingLinkedToPillar = items.filter((item) => item.linksToPillar).length;
  const supportingTotal = items.length;

  if (supportingLinkedToPillar < supportingTotal) {
    warnings.push(
      `${supportingTotal - supportingLinkedToPillar} bài supporting chưa có link về pillar.`
    );
  }

  const reciprocalPairs = linkMap.edges.length;
  if (reciprocalPairs < supportingTotal) {
    warnings.push("Một số bài chưa có liên kết chéo giữa supporting articles.");
  }

  return {
    pillarTitle: cluster.pillar.title,
    items,
    supportingLinkedToPillar,
    supportingTotal,
    warnings,
  };
}

export function generateSeoRecommendations(
  campaign: SeoCampaign,
  cluster: ContentCluster
): SeoPlanningRecommendation[] {
  const recommendations: SeoPlanningRecommendation[] = [];
  const linkCoverage = buildInternalLinkCoverage(cluster);
  const progress = campaign.items;

  const notCreated = progress.filter(
    (item) => !item.matchedPost && item.status !== "PUBLISHED"
  );
  if (notCreated.length > 0) {
    const next = notCreated.sort((a, b) => a.suggestedPublishWeek - b.suggestedPublishWeek)[0];
    recommendations.push({
      id: `rec-create-${next.id}`,
      type: "create",
      severity: next.articleType === "pillar" ? "high" : "medium",
      message: `Nên tạo bài "${next.title}" trước (tuần ${next.suggestedPublishWeek}).`,
      relatedItemId: next.id,
    });
  }

  const missingComparison = campaign.items.find(
    (item) =>
      item.keyword.toLowerCase().includes("so sánh") && !item.matchedPost
  );
  if (missingComparison) {
    recommendations.push({
      id: `rec-missing-${missingComparison.id}`,
      type: "create",
      severity: "high",
      message: `Cluster ${campaign.mainKeyword} thiếu bài so sánh nhà cung cấp.`,
      relatedItemId: missingComparison.id,
    });
  }

  const missingPricing = campaign.items.find(
    (item) =>
      (item.keyword.toLowerCase().includes("bảng giá") ||
        item.keyword.toLowerCase().includes("báo giá")) &&
      !item.matchedPost
  );
  if (missingPricing) {
    recommendations.push({
      id: `rec-pricing-${missingPricing.id}`,
      type: "priority",
      severity: "medium",
      message: `Nên tạo bài "${missingPricing.title}" trước khi mở rộng sang cluster liên quan.`,
      relatedItemId: missingPricing.id,
    });
  }

  if (linkCoverage.supportingTotal - linkCoverage.supportingLinkedToPillar > 0) {
    recommendations.push({
      id: "rec-pillar-links",
      type: "link",
      severity: "high",
      message: `${linkCoverage.supportingTotal - linkCoverage.supportingLinkedToPillar} bài supporting chưa có link về pillar.`,
    });
  }

  for (const item of linkCoverage.items.filter((i) => i.warnings.length > 0).slice(0, 2)) {
    recommendations.push({
      id: `rec-link-${item.articleId}`,
      type: "link",
      severity: "medium",
      message: `"${item.title}": ${item.warnings.join(", ")}.`,
      relatedItemId: item.articleId,
    });
  }

  const publishedDraft = campaign.items.filter(
    (item) => item.matchedPost?.status === "DRAFT" && item.suggestedPublishWeek <= 2
  );
  if (publishedDraft.length > 0) {
    recommendations.push({
      id: "rec-refresh",
      type: "refresh",
      severity: "low",
      message: `${publishedDraft.length} bài ưu tiên cao đang ở trạng thái draft — nên hoàn thiện và xuất bản.`,
    });
  }

  const relatedClusterTypes: Record<string, string> = {
    "source-supplier": "OEM",
    oem: "Nguồn hàng",
    "dealer-recruitment": "Nguồn hàng",
    "corporate-uniform": "Quà tặng doanh nghiệp",
    "corporate-gift": "Đồng phục công ty",
  };
  const related = relatedClusterTypes[campaign.clusterType];
  if (related && campaign.clusterScore >= 60) {
    recommendations.push({
      id: "rec-cluster-expand",
      type: "cluster",
      severity: "low",
      message: `Cluster ${campaign.mainKeyword} khá tốt — cân nhắc mở rộng sang cluster "${related}".`,
    });
  }

  return recommendations.slice(0, 8);
}
