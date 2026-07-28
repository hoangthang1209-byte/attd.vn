import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  ContentPerformancePeriod,
  ContentPerformanceSummary,
  PerformanceOpportunity,
  PerformanceSourceReport,
  PerformanceWorkspaceSummary,
} from "@/features/content/performance/content-performance.types";
import {
  assessContentRefresh,
  buildOpportunitiesFromSummaries,
} from "@/features/content/performance/content-refresh-engine";
import { parsePerformancePeriod } from "@/features/content/performance/performance-period";

export { parsePerformancePeriod };

const MEMORY_CACHE = new Map<string, { expiresAt: number; value: unknown }>();
const CACHE_TTL_MS = 60_000;

function cacheGet<T>(key: string): T | null {
  const hit = MEMORY_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown) {
  MEMORY_CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

function getSearchConsoleConnectionDiagnostics(): {
  status: PerformanceSourceReport["status"];
  freshness: PerformanceSourceReport["freshness"];
  propertyIdentifier: string | null;
  lastErrorSummary: string | null;
  dataCoverage: string;
  notes: string[];
} {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || null;
  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim() || null;
  const privateKeyConfigured = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.trim());
  const configuredCount = [siteUrl, clientEmail, privateKeyConfigured].filter(Boolean).length;

  if (configuredCount === 0) {
    return {
      status: "NOT_CONNECTED",
      freshness: "UNAVAILABLE",
      propertyIdentifier: null,
      lastErrorSummary: null,
      dataCoverage: "Chưa cấu hình GOOGLE_SEARCH_CONSOLE_* — không gọi API.",
      notes: [
        "Xem docs/operations/google-search-console.md",
        "Không dùng dữ liệu demo cho impressions/clicks/position.",
      ],
    };
  }

  if (configuredCount < 3) {
    return {
      status: "PARTIAL",
      freshness: "UNAVAILABLE",
      propertyIdentifier: siteUrl,
      lastErrorSummary: "Thiếu một phần cấu hình GSC (site URL / client email / private key).",
      dataCoverage: "Chưa đủ credential để query Search Console an toàn.",
      notes: ["Không gọi GSC API khi cấu hình chưa đủ.", "Không trả secret trong response."],
    };
  }

  return {
    status: "PARTIAL",
    freshness: "UNAVAILABLE",
    propertyIdentifier: siteUrl,
    lastErrorSummary:
      "Credential env có mặt nhưng CMS chưa bật GSC Data API query trong sprint này.",
    dataCoverage: "Connection-ready diagnostics only — chưa đọc impressions/clicks.",
    notes: [
      `Service account email configured: ${clientEmail ? `${clientEmail.split("@")[0]}@…` : "yes"}`,
      "Private key presence checked as boolean only.",
    ],
  };
}

export function getPerformanceSourceReports(): PerformanceSourceReport[] {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || null;
  const gsc = getSearchConsoleConnectionDiagnostics();
  return [
    {
      id: "search_console",
      label: "Google Search Console",
      status: gsc.status,
      freshness: gsc.freshness,
      propertyIdentifier: gsc.propertyIdentifier,
      lastSuccessAt: null,
      lastErrorSummary: gsc.lastErrorSummary,
      dataCoverage: gsc.dataCoverage,
      notes: gsc.notes,
    },
    {
      id: "analytics",
      label: "Google Analytics 4",
      status: gaId ? "PARTIAL" : "NOT_CONNECTED",
      freshness: gaId ? "DELAYED" : "UNAVAILABLE",
      propertyIdentifier: gaId ? `${gaId.slice(0, 6)}…` : null,
      lastSuccessAt: null,
      lastErrorSummary: gaId
        ? "Measurement ID có trong env nhưng chưa có GA Data API server-side để đọc số liệu vào CMS."
        : null,
      dataCoverage: gaId
        ? "Client-side page_view/CTA events gửi lên GA4 — CMS không truy vấn được số liệu."
        : "Thiếu NEXT_PUBLIC_GA_MEASUREMENT_ID.",
      notes: [
        "Không suy diễn page views từ GA vào bảng CMS.",
        "Null giữ nguyên cho engagement metrics.",
      ],
    },
    {
      id: "internal_events",
      label: "Internal content events",
      status: "PARTIAL",
      freshness: "FRESH",
      propertyIdentifier: "BlogPost + ContentPublishEvent + SeoTopic",
      lastSuccessAt: new Date().toISOString(),
      lastErrorSummary: null,
      dataCoverage: "Publish dates, content age, CTA detection, internal links, word/image counts.",
      notes: ["Không có bộ đếm page view nội bộ trong DB."],
    },
    {
      id: "crm_attribution",
      label: "CRM / Dealer lead attribution",
      status: "PARTIAL",
      freshness: "FRESH",
      propertyIdentifier: "DealerLead.landingPage + Lead.landingPage",
      lastSuccessAt: new Date().toISOString(),
      lastErrorSummary: null,
      dataCoverage:
        "Chỉ gắn lead khi landingPage chứa đường dẫn /blog/{slug} (deterministic). Không dùng timestamp-only.",
      notes: ["Không mutate CRM.", "Không suy diễn từ UTM nếu thiếu landing URL khớp slug."],
    },
  ];
}

function countWords(htmlOrText: string): number {
  const text = htmlOrText
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").filter(Boolean).length;
}

function countImages(html: string): number {
  const matches = html.match(/<img\b/gi);
  return matches?.length ?? 0;
}

function detectCta(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("blog-cta") ||
    lower.includes("/lien-he") ||
    lower.includes("báo giá") ||
    lower.includes("bao gia") ||
    lower.includes("đăng ký đại lý") ||
    lower.includes("href=\"/dai-ly\"") ||
    lower.includes("href='/dai-ly'")
  );
}

function publicBlogUrl(slug: string): string {
  return `/blog/${slug}`;
}

function landingMatchesSlug(landingPage: string | null | undefined, slug: string): boolean {
  if (!landingPage) return false;
  const normalized = landingPage.trim().toLowerCase();
  const needle = `/blog/${slug.toLowerCase()}`;
  if (normalized.includes(needle)) return true;
  // Exact path variants
  if (normalized === needle || normalized.endsWith(`${needle}/`)) return true;
  return false;
}

type LeadBucket = { dealerLeads: number; quoteRequests: number; attributedLeads: number };

async function loadLeadBucketsBySlug(
  slugs: string[],
  period: ContentPerformancePeriod,
): Promise<Map<string, LeadBucket>> {
  const map = new Map<string, LeadBucket>();
  for (const slug of slugs) map.set(slug, { dealerLeads: 0, quoteRequests: 0, attributedLeads: 0 });
  if (slugs.length === 0) return map;

  const from = new Date(period.from);
  const to = new Date(period.to);

  const [dealerLeads, crmLeads] = await Promise.all([
    prisma.dealerLead.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { landingPage: true, source: true },
      take: 5000,
    }),
    prisma.lead.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { landingPage: true, source: true },
      take: 5000,
    }),
  ]);

  for (const slug of slugs) {
    const bucket = map.get(slug)!;
    for (const row of dealerLeads) {
      if (!landingMatchesSlug(row.landingPage, slug)) continue;
      bucket.dealerLeads += 1;
      bucket.attributedLeads += 1;
    }
    for (const row of crmLeads) {
      if (!landingMatchesSlug(row.landingPage, slug)) continue;
      bucket.quoteRequests += 1;
      bucket.attributedLeads += 1;
    }
  }

  return map;
}

async function resolveTopicLinks(blogIds: string[]) {
  const empty = {
    byEntity: new Map<
      string,
      {
        topicId: string;
        topicTitle: string;
        clusterId: string;
        clusterName: string;
        strategyId: string;
        strategyName: string;
        internalLinkCount: number;
      }
    >(),
    byUrl: [] as Array<{
      id: string;
      title: string;
      targetEntityId: string | null;
      targetUrl: string | null;
      existingUrl: string | null;
      cluster: {
        id: string;
        name: string;
        strategyId: string;
        strategy: { id: string; name: string };
      };
      _count: { internalLinksFrom: number; internalLinksTo: number };
    }>,
  };

  if (blogIds.length === 0) return empty;

  const [byEntityRows, byUrl] = await Promise.all([
    prisma.seoTopic.findMany({
      where: { targetEntityType: "BLOG_POST", targetEntityId: { in: blogIds } },
      select: {
        id: true,
        title: true,
        targetEntityId: true,
        targetUrl: true,
        existingUrl: true,
        cluster: {
          select: {
            id: true,
            name: true,
            strategyId: true,
            strategy: { select: { id: true, name: true } },
          },
        },
        _count: { select: { internalLinksFrom: true, internalLinksTo: true } },
      },
      take: 500,
    }),
    prisma.seoTopic.findMany({
      where: {
        OR: [{ targetUrl: { contains: "/blog/" } }, { existingUrl: { contains: "/blog/" } }],
      },
      select: {
        id: true,
        title: true,
        targetEntityId: true,
        targetUrl: true,
        existingUrl: true,
        cluster: {
          select: {
            id: true,
            name: true,
            strategyId: true,
            strategy: { select: { id: true, name: true } },
          },
        },
        _count: { select: { internalLinksFrom: true, internalLinksTo: true } },
      },
      take: 500,
    }),
  ]);

  const byEntity = empty.byEntity;
  for (const row of byEntityRows) {
    if (!row.targetEntityId) continue;
    byEntity.set(row.targetEntityId, {
      topicId: row.id,
      topicTitle: row.title,
      clusterId: row.cluster.id,
      clusterName: row.cluster.name,
      strategyId: row.cluster.strategyId,
      strategyName: row.cluster.strategy.name,
      internalLinkCount: row._count.internalLinksFrom + row._count.internalLinksTo,
    });
  }

  return { byEntity, byUrl };
}

export async function listContentPerformanceArticles(input: {
  period: ContentPerformancePeriod;
  comparisonPeriod: ContentPerformancePeriod | null;
  strategyId?: string;
  clusterId?: string;
  topicId?: string;
  refreshStatus?: string;
  take?: number;
  skip?: number;
}): Promise<{ articles: ContentPerformanceSummary[]; total: number }> {
  const cacheKey = `articles:${JSON.stringify(input)}`;
  const cached = cacheGet<{ articles: ContentPerformanceSummary[]; total: number }>(cacheKey);
  if (cached) return cached;

  const take = Math.min(Math.max(input.take ?? 50, 1), 100);
  const skip = Math.max(input.skip ?? 0, 0);

  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      content: true,
      sourceWritingDraftId: true,
    },
    take: 300,
  });

  const blogIds = posts.map((p) => p.id);
  const topicLinkResult = await resolveTopicLinks(blogIds);
  const topicByBlog = topicLinkResult.byEntity;

  // Match remaining by URL/slug
  for (const post of posts) {
    if (topicByBlog.has(post.id)) continue;
    const urlHit = topicLinkResult.byUrl.find((t) => {
      const urls = `${t.targetUrl ?? ""} ${t.existingUrl ?? ""}`.toLowerCase();
      return urls.includes(`/blog/${post.slug.toLowerCase()}`) || t.targetEntityId === post.id;
    });
    if (urlHit) {
      topicByBlog.set(post.id, {
        topicId: urlHit.id,
        topicTitle: urlHit.title,
        clusterId: urlHit.cluster.id,
        clusterName: urlHit.cluster.name,
        strategyId: urlHit.cluster.strategyId,
        strategyName: urlHit.cluster.strategy.name,
        internalLinkCount: urlHit._count.internalLinksFrom + urlHit._count.internalLinksTo,
      });
    }
  }

  const leadBuckets = await loadLeadBucketsBySlug(
    posts.map((p) => p.slug),
    input.period,
  );

  const sources = getPerformanceSourceReports();
  const searchStatus = sources.find((s) => s.id === "search_console")!.status;
  const engagementStatus = sources.find((s) => s.id === "analytics")!.status;
  const conversionStatus = sources.find((s) => s.id === "crm_attribution")!.status;

  let articles: ContentPerformanceSummary[] = posts.map((post) => {
    const link = topicByBlog.get(post.id) ?? null;
    const body = post.content ?? "";
    const wordCount = countWords(body);
    const imageCount = countImages(body);
    const hasCta = detectCta(body);
    const leads = leadBuckets.get(post.slug) ?? {
      dealerLeads: 0,
      quoteRequests: 0,
      attributedLeads: 0,
    };
    const daysSincePublish = post.publishedAt
      ? Math.floor((Date.now() - post.publishedAt.getTime()) / 86_400_000)
      : null;
    const daysSinceUpdate = Math.floor((Date.now() - post.updatedAt.getTime()) / 86_400_000);

    const search = {
      impressions: null,
      clicks: null,
      ctr: null,
      averagePosition: null,
      previousPeriodDelta: {
        impressions: null,
        clicks: null,
        ctr: null,
        averagePosition: null,
      },
      sourceStatus: searchStatus,
    } as ContentPerformanceSummary["search"];

    const engagement = {
      pageViews: null,
      users: null,
      engagedSessions: null,
      averageEngagementSeconds: null,
      sourceStatus: engagementStatus,
    } as ContentPerformanceSummary["engagement"];

    const conversion = {
      ctaClicks: null,
      quoteRequests: leads.quoteRequests,
      dealerLeads: leads.dealerLeads,
      attributedLeads: leads.attributedLeads,
      conversionRate: null,
      sourceStatus: conversionStatus,
    } as ContentPerformanceSummary["conversion"];

    const refresh = assessContentRefresh({
      publishedAt: post.publishedAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
      hasCta,
      internalLinkCount: link?.internalLinkCount ?? null,
      imageCount,
      wordCount,
      search,
      engagement,
      conversion,
    });

    return {
      contentId: post.id,
      contentType: "BLOG",
      title: post.title,
      slug: post.slug,
      publicUrl: publicBlogUrl(post.slug),
      status: post.status,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
      strategyId: link?.strategyId ?? null,
      strategyName: link?.strategyName ?? null,
      clusterId: link?.clusterId ?? null,
      clusterName: link?.clusterName ?? null,
      topicId: link?.topicId ?? null,
      topicTitle: link?.topicTitle ?? null,
      search,
      engagement,
      conversion,
      editorial: {
        daysSincePublish,
        daysSinceUpdate,
        wordCount,
        internalLinkCount: link?.internalLinkCount ?? null,
        imageCount,
        qaScore: null,
        hasCta,
        refreshStatus: refresh.refreshStatus,
        refreshReasons: refresh.refreshReasons,
      },
    };
  });

  if (input.strategyId) {
    articles = articles.filter((a) => a.strategyId === input.strategyId);
  }
  if (input.clusterId) {
    articles = articles.filter((a) => a.clusterId === input.clusterId);
  }
  if (input.topicId) {
    articles = articles.filter((a) => a.topicId === input.topicId);
  }
  if (input.refreshStatus) {
    articles = articles.filter((a) => a.editorial.refreshStatus === input.refreshStatus);
  }

  const total = articles.length;
  const page = articles.slice(skip, skip + take);
  const result = { articles: page, total };
  cacheSet(cacheKey, result);
  return result;
}

export async function getContentPerformanceSummary(input: {
  period: ContentPerformancePeriod;
  comparisonPeriod: ContentPerformancePeriod | null;
}): Promise<PerformanceWorkspaceSummary> {
  const { articles } = await listContentPerformanceArticles({
    ...input,
    take: 300,
    skip: 0,
  });
  const sources = getPerformanceSourceReports();
  const needingUpdate = articles.filter((a) =>
    ["UPDATE_RECOMMENDED", "URGENT"].includes(a.editorial.refreshStatus),
  ).length;

  let qualifiedLeads: number | null = 0;
  for (const a of articles) {
    if (a.conversion.attributedLeads != null) qualifiedLeads += a.conversion.attributedLeads;
  }
  // If CRM attribution source is not connected, keep null — we are PARTIAL so counts are real
  const crm = sources.find((s) => s.id === "crm_attribution");
  if (crm?.status === "NOT_CONNECTED") qualifiedLeads = null;

  return {
    period: input.period,
    comparisonPeriod: input.comparisonPeriod,
    publishedArticles: articles.length,
    searchClicks: null,
    searchImpressions: null,
    organicCtr: null,
    averagePosition: null,
    pageViews: null,
    ctaClicks: null,
    qualifiedLeads,
    articlesNeedingUpdate: needingUpdate,
    sources,
    deltas: {
      searchClicks: null,
      searchImpressions: null,
      organicCtr: null,
      averagePosition: null,
      pageViews: null,
      qualifiedLeads: null,
    },
  };
}

export async function getContentPerformanceArticle(
  blogId: string,
  period: ContentPerformancePeriod,
  comparisonPeriod: ContentPerformancePeriod | null,
): Promise<ContentPerformanceSummary | null> {
  const { articles } = await listContentPerformanceArticles({
    period,
    comparisonPeriod,
    take: 300,
  });
  return articles.find((a) => a.contentId === blogId) ?? null;
}

export async function listContentPerformanceOpportunities(input: {
  period: ContentPerformancePeriod;
  comparisonPeriod: ContentPerformancePeriod | null;
}): Promise<PerformanceOpportunity[]> {
  const { articles } = await listContentPerformanceArticles({
    ...input,
    take: 300,
  });
  return buildOpportunitiesFromSummaries(articles).slice(0, 80);
}

export async function getStrategyPerformanceRows(input: {
  period: ContentPerformancePeriod;
  comparisonPeriod: ContentPerformancePeriod | null;
}) {
  const { articles } = await listContentPerformanceArticles({
    ...input,
    take: 300,
  });
  const byStrategy = new Map<
    string,
    {
      strategyId: string;
      strategyName: string;
      published: number;
      leads: number;
      needingUpdate: number;
      clusters: Map<
        string,
        { clusterId: string; clusterName: string; published: number; leads: number; needingUpdate: number }
      >;
    }
  >();

  for (const article of articles) {
    if (!article.strategyId) continue;
    let row = byStrategy.get(article.strategyId);
    if (!row) {
      row = {
        strategyId: article.strategyId,
        strategyName: article.strategyName ?? article.strategyId,
        published: 0,
        leads: 0,
        needingUpdate: 0,
        clusters: new Map(),
      };
      byStrategy.set(article.strategyId, row);
    }
    row.published += 1;
    row.leads += article.conversion.attributedLeads ?? 0;
    if (["UPDATE_RECOMMENDED", "URGENT"].includes(article.editorial.refreshStatus)) {
      row.needingUpdate += 1;
    }
    if (article.clusterId) {
      let cluster = row.clusters.get(article.clusterId);
      if (!cluster) {
        cluster = {
          clusterId: article.clusterId,
          clusterName: article.clusterName ?? article.clusterId,
          published: 0,
          leads: 0,
          needingUpdate: 0,
        };
        row.clusters.set(article.clusterId, cluster);
      }
      cluster.published += 1;
      cluster.leads += article.conversion.attributedLeads ?? 0;
      if (["UPDATE_RECOMMENDED", "URGENT"].includes(article.editorial.refreshStatus)) {
        cluster.needingUpdate += 1;
      }
    }
  }

  return [...byStrategy.values()].map((row) => ({
    strategyId: row.strategyId,
    strategyName: row.strategyName,
    published: row.published,
    clicks: null as number | null,
    impressions: null as number | null,
    leads: row.leads,
    articlesNeedingUpdate: row.needingUpdate,
    clusters: [...row.clusters.values()].map((c) => ({
      ...c,
      searchVisibility: null as number | null,
      engagement: null as number | null,
      conversion: c.leads,
    })),
  }));
}
