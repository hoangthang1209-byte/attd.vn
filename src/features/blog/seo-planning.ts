import type { ContentCluster } from "@/features/blog/content-clusters";
import {
  CLUSTER_EXAMPLES,
  generateCluster,
  generateInternalLinkMap,
  generatePublishOrder,
} from "@/features/blog/content-clusters";
import { calculateClusterScore } from "@/features/blog/cluster-score";
import { CLUSTER_TYPE_META, type ClusterHandoffRequest } from "@/features/blog/cluster-handoff";
import type { BusinessGoal } from "@/features/blog/ai-factory-types";
import { BUSINESS_GOAL_OPTIONS } from "@/features/blog/ai-factory-types";
import type { ContentBlueprintId } from "@/features/blog/content-blueprints";
import { CONTENT_BLUEPRINTS } from "@/features/blog/content-blueprints";
import type { BlogPostListItem } from "@/features/blog/types";
import { toSlug } from "@/lib/slug";
import type { SeoCampaign, SeoPlanItem, SeoPlanningKpis } from "@/features/blog/seo-planning-types";
import {
  blogPostStatusToPlanStatus,
  clusterPriorityLabelToPlanPriority,
} from "@/features/blog/seo-planning-status";
import { calculateCampaignProgress, calculateOverallProgress } from "@/features/blog/seo-planning-progress";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap += 1;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function titleSimilarity(planTitle: string, postTitle: string): number {
  return keywordSimilarity(planTitle, postTitle);
}

export function matchPlanItemToPost(
  item: SeoPlanItem,
  posts: BlogPostListItem[]
): BlogPostListItem | undefined {
  const itemSlug = toSlug(item.title);
  const keywordSlug = toSlug(item.keyword);

  let best: { post: BlogPostListItem; score: number } | undefined;

  for (const post of posts) {
    let score = 0;
    if (post.slug === itemSlug || post.slug === keywordSlug) score = 1;
    else if (post.slug.includes(keywordSlug) || keywordSlug.includes(post.slug)) score = 0.9;
    else {
      const titleScore = titleSimilarity(item.title, post.title);
      const keywordScore = keywordSimilarity(item.keyword, post.title);
      score = Math.max(titleScore, keywordScore);
    }

    if (score >= 0.7 && (!best || score > best.score)) {
      best = { post, score };
    }
  }

  return best?.post;
}

export function matchPlanItemsToExistingPosts(
  items: SeoPlanItem[],
  posts: BlogPostListItem[]
): SeoPlanItem[] {
  return items.map((item) => {
    const matched = matchPlanItemToPost(item, posts);
    if (!matched) return item;

    return {
      ...item,
      matchedPost: {
        id: matched.id,
        slug: matched.slug,
        title: matched.title,
        status: matched.status,
      },
      status: blogPostStatusToPlanStatus(matched.status),
    };
  });
}

export function createPlanItemsFromCluster(
  cluster: ContentCluster,
  campaignId: string
): SeoPlanItem[] {
  const roadmap = generatePublishOrder(cluster);
  const weekByArticleId = new Map<string, number>();

  for (const week of roadmap.weeks) {
    for (const article of week.articles) {
      weekByArticleId.set(article.id, week.week);
    }
  }

  const allArticles = [cluster.pillar, ...cluster.supporting];

  return allArticles.map((article) => ({
    id: `${campaignId}-${article.id}`,
    campaignId,
    clusterArticleId: article.id,
    title: article.title,
    keyword: article.keyword,
    articleType: article.type,
    intent: article.intent,
    priority: clusterPriorityLabelToPlanPriority(article.priorityLabel),
    status: "CLUSTERED" as const,
    suggestedPublishWeek: weekByArticleId.get(article.id) ?? 1,
    suggestedLinks: article.suggestedLinks,
  }));
}

export function createSeoCampaignFromCluster(
  keyword: string,
  clusterType?: ContentCluster["clusterType"],
  campaignId?: string
): { campaign: SeoCampaign; cluster: ContentCluster } {
  const cluster = generateCluster(keyword, clusterType);
  const linkMap = generateInternalLinkMap(cluster);
  const score = calculateClusterScore(cluster, linkMap);
  const id = campaignId ?? `campaign-${cluster.clusterType}-${toSlug(keyword).slice(0, 40)}`;

  const campaign: SeoCampaign = {
    id,
    name: `${capitalizeFirst(keyword)} ${new Date().getFullYear()}`,
    mainKeyword: cluster.topic,
    clusterType: cluster.clusterType,
    clusterScore: score.score,
    clusterScoreLabel: score.label,
    items: createPlanItemsFromCluster(cluster, id),
    createdAt: new Date().toISOString(),
  };

  return { campaign, cluster };
}

function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "SEO Campaign";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function generateDemoSeoCampaigns(): {
  campaigns: SeoCampaign[];
  clusters: Map<string, ContentCluster>;
} {
  const campaigns: SeoCampaign[] = [];
  const clusters = new Map<string, ContentCluster>();

  for (const example of CLUSTER_EXAMPLES) {
    const { campaign, cluster } = createSeoCampaignFromCluster(
      example.keyword,
      example.type,
      `demo-${example.type}`
    );
    campaigns.push(campaign);
    clusters.set(campaign.id, cluster);
  }

  return { campaigns, clusters };
}

export function enrichCampaignsWithPosts(
  campaigns: SeoCampaign[],
  posts: BlogPostListItem[]
): SeoCampaign[] {
  return campaigns.map((campaign) => ({
    ...campaign,
    items: matchPlanItemsToExistingPosts(campaign.items, posts),
  }));
}

export function calculatePlanningKpis(campaigns: SeoCampaign[]): SeoPlanningKpis {
  const articlesPlanned = campaigns.reduce((sum, c) => sum + c.items.length, 0);
  const articlesPublished = campaigns.reduce(
    (sum, c) => sum + c.items.filter((i) => i.status === "PUBLISHED").length,
    0
  );
  const readyToPublish = campaigns.reduce(
    (sum, c) => sum + c.items.filter((i) => i.status === "REVIEW").length,
    0
  );

  return {
    campaigns: campaigns.length,
    clusters: campaigns.length,
    articlesPlanned,
    articlesPublished,
    readyToPublish,
    overallProgressPercent: calculateOverallProgress(campaigns),
  };
}

export function getCampaignProgressSummary(campaign: SeoCampaign) {
  return calculateCampaignProgress(campaign);
}

export function buildSeoPlanningHandoffUrl(
  item: SeoPlanItem,
  campaign: SeoCampaign,
  options?: { autoGenerate?: boolean }
): string {
  const meta = CLUSTER_TYPE_META[campaign.clusterType];
  const params = new URLSearchParams({
    keyword: item.keyword,
    goal: meta.businessGoal,
    blueprint: meta.blueprintId,
    source: "seo-planning",
  });
  if (options?.autoGenerate) {
    params.set("autoGenerate", "true");
  }
  return `/admin/blog/new?${params.toString()}`;
}

export function parseSeoPlanningQueryParams(searchParams: URLSearchParams): {
  keyword: string | null;
  goal: string | null;
  blueprint: string | null;
  autoGenerate: boolean;
  source: string | null;
} {
  return {
    keyword: searchParams.get("keyword"),
    goal: searchParams.get("goal"),
    blueprint: searchParams.get("blueprint"),
    autoGenerate: searchParams.get("autoGenerate") === "true",
    source: searchParams.get("source"),
  };
}

function parseBusinessGoal(raw: string | null): BusinessGoal {
  const normalized = (raw ?? "").replace(/_/g, "-") as BusinessGoal;
  return BUSINESS_GOAL_OPTIONS.some((g) => g.id === normalized) ? normalized : "seo-traffic";
}

function parseBlueprintId(raw: string | null): ContentBlueprintId {
  const id = raw as ContentBlueprintId;
  return CONTENT_BLUEPRINTS.some((b) => b.id === id) ? id : "source-supplier";
}

export function parseHandoffFromSearchParams(
  searchParams: URLSearchParams
): ClusterHandoffRequest | null {
  const params = parseSeoPlanningQueryParams(searchParams);
  if (!params.keyword?.trim()) return null;

  return {
    keyword: params.keyword.trim(),
    businessGoal: parseBusinessGoal(params.goal),
    blueprintId: parseBlueprintId(params.blueprint),
    autoGenerate: params.autoGenerate,
  };
}
