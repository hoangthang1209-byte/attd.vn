import type { ContentCluster, InternalLinkMap } from "@/features/blog/content-clusters";

export type ClusterScoreResult = {
  score: number;
  level: "red" | "yellow" | "green";
  label: string;
  articleCount: number;
  internalLinkCount: number;
  pillarCoverage: number;
  keywordCoverage: number;
};

export function calculateClusterScore(
  cluster: ContentCluster,
  linkMap: InternalLinkMap
): ClusterScoreResult {
  const articleCount = 1 + cluster.supporting.length;
  const internalLinkCount = linkMap.edges.length;
  const supportingWithPillarLink = cluster.supporting.filter((article) =>
    article.suggestedLinks.includes(cluster.pillar.id)
  ).length;
  const pillarCoverage =
    cluster.supporting.length > 0
      ? Math.round((supportingWithPillarLink / cluster.supporting.length) * 100)
      : 0;

  const uniqueKeywords = new Set(
    [cluster.pillar.keyword, ...cluster.supporting.map((a) => a.keyword)].map((k) =>
      k.trim().toLowerCase()
    )
  );
  const keywordCoverage = Math.min(100, uniqueKeywords.size * 8);

  let score = 0;
  score += Math.min(40, articleCount * 2.5);
  score += Math.min(25, internalLinkCount * 1.5);
  score += Math.round(pillarCoverage * 0.2);
  score += Math.round(keywordCoverage * 0.15);

  score = Math.min(100, Math.round(score));

  let level: "red" | "yellow" | "green" = "red";
  let label = "Cần mở rộng";
  if (score >= 90) {
    level = "green";
    label = "Cụm SEO mạnh";
  } else if (score >= 60) {
    level = "yellow";
    label = "Khá tốt";
  }

  return {
    score,
    level,
    label,
    articleCount,
    internalLinkCount,
    pillarCoverage,
    keywordCoverage,
  };
}
