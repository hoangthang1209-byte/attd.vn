import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { adminNavigationSections } from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";
import {
  aggregateByCampaign,
  aggregateByOwner,
  buildClusterTree,
  buildContentHealthMetrics,
  buildMediaCoverageSummary,
  buildOperationsPipelineSummary,
  buildPublishQueueSummary,
  buildRefreshQueue,
  buildReviewQueueSummary,
  buildSeoOpsSummary,
  filterOperationsTopics,
  getOperationsPipelineColumn,
  groupCalendarByPublishTarget,
  groupOperationsActivity,
  groupTopicsByOperationsPipeline,
  mapToOpsTopicCards,
  searchOperationsTopics,
} from "@/features/content/operations/content-operations.mapping";
import type { OperationsTopicInput } from "@/features/content/operations/content-operations.types";

function sampleTopic(overrides: Partial<OperationsTopicInput> = {}): OperationsTopicInput {
  return {
    id: "t1",
    title: "Đồng phục polo cotton",
    primaryKeyword: "đồng phục polo",
    slug: "dong-phuc-polo",
    status: "DRAFTING",
    priority: "HIGH",
    assignedTo: "editor-a",
    dueDate: "2026-08-10T00:00:00.000Z",
    publishedAt: null,
    updatedAt: "2026-08-01T00:00:00.000Z",
    targetUrl: null,
    existingUrl: null,
    mediaBundleId: "mb1",
    mediaPlanScore: 80,
    mediaPlanStatus: "OK",
    clusterId: "c1",
    clusterName: "Uniform",
    strategyId: "s1",
    strategyName: "Q3 Lead",
    briefApprovedAt: "2026-07-01T00:00:00.000Z",
    ctaText: "Liên hệ báo giá",
    ctaType: "CONTACT",
    metaTitle: "Meta title",
    metaDescription: "Meta description",
    outlineCount: 5,
    questionsCount: 3,
    wordCountMax: 1200,
    qaFailed: null,
    ...overrides,
  };
}

describe("Sprint 17.0 Content Operations Command Center", () => {
  it("maps each SeoTopicStatus into its pipeline column", () => {
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "IDEA" })), "ideas");
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "RESEARCHING" })), "ideas");
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "PAUSED" })), "ideas");
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "REJECTED" })), "ideas");
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "APPROVED" })), "brief");
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "BRIEF_READY" })), "brief");
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "DRAFTING", qaFailed: false })), "writing");
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "DRAFTING", qaFailed: true })), "qa");
    assert.equal(
      getOperationsPipelineColumn(sampleTopic({ status: "DRAFTING", targetUrl: "/blog/x" })),
      "ready",
    );
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "REVIEW" })), "review");
    assert.equal(
      getOperationsPipelineColumn(sampleTopic({ status: "REVIEW", targetUrl: "/blog/x" })),
      "ready",
    );
    assert.equal(getOperationsPipelineColumn(sampleTopic({ status: "PUBLISHED" })), "published");
  });

  it("pipeline summary counts sum to the non-archived total", () => {
    const topics = [
      sampleTopic({ id: "a", status: "IDEA" }),
      sampleTopic({ id: "b", status: "DRAFTING", qaFailed: false }),
      sampleTopic({ id: "c", status: "PUBLISHED" }),
      sampleTopic({ id: "d", status: "ARCHIVED" }),
    ];
    const kanban = groupTopicsByOperationsPipeline(topics);
    const summary = buildOperationsPipelineSummary(kanban);
    const total = summary.reduce((sum, entry) => sum + entry.count, 0);
    assert.equal(total, 3);
  });

  it("groups cards by pipeline column and excludes ARCHIVED", () => {
    const topics = [
      sampleTopic({ id: "a", status: "REVIEW" }),
      sampleTopic({ id: "b", status: "ARCHIVED" }),
    ];
    const kanban = groupTopicsByOperationsPipeline(topics);
    assert.equal(kanban.review.length, 1);
    assert.equal(kanban.review[0].id, "a");
    const allIds = Object.values(kanban).flat().map((c) => c.id);
    assert.ok(!allIds.includes("b"));
  });

  it("calendar month grid buckets by publishedAt or dueDate (reusing editorial-calendar grid math)", () => {
    const topics = [
      sampleTopic({ id: "a", status: "DRAFTING", qaFailed: false, dueDate: "2026-08-15T00:00:00.000Z", publishedAt: null }),
      sampleTopic({ id: "b", status: "PUBLISHED", dueDate: null, publishedAt: "2026-08-20T00:00:00.000Z" }),
    ];
    const grid = groupCalendarByPublishTarget(topics, "month", new Date("2026-08-01T00:00:00.000Z"));
    assert.equal(grid.length, 42);
    assert.ok(grid.some((cell) => cell.topics.some((t) => t.id === "a")));
    assert.ok(grid.some((cell) => cell.topics.some((t) => t.id === "b")));
  });

  it("refresh queue includes stale publishes and recent-but-incomplete, excludes healthy recent", () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    const staleOld = sampleTopic({ id: "old", status: "PUBLISHED", publishedAt: "2025-10-01T00:00:00.000Z" });
    const recentHealthy = sampleTopic({ id: "healthy", status: "PUBLISHED", publishedAt: "2026-08-01T00:00:00.000Z" });
    const recentMissingCta = sampleTopic({
      id: "missing-cta",
      status: "PUBLISHED",
      publishedAt: "2026-08-01T00:00:00.000Z",
      ctaText: null,
      ctaType: null,
    });
    const queue = buildRefreshQueue([staleOld, recentHealthy, recentMissingCta], now);
    const ids = queue.map((q) => q.id);
    assert.ok(ids.includes("old"));
    assert.ok(ids.includes("missing-cta"));
    assert.ok(!ids.includes("healthy"));
  });

  it("health metrics count missing CTA / media / FAQ topics", () => {
    const cards = mapToOpsTopicCards([
      sampleTopic({ id: "a", ctaText: null, ctaType: null }),
      sampleTopic({ id: "b", mediaBundleId: null }),
      sampleTopic({ id: "c", questionsCount: 0 }),
      sampleTopic({ id: "d" }),
    ]);
    const metrics = buildContentHealthMetrics(cards);
    const byId = Object.fromEntries(metrics.map((m) => [m.id, m]));
    assert.equal(byId.missingCta.count, 1);
    assert.equal(byId.missingMedia.count, 1);
    assert.equal(byId.missingFaq.count, 1);
  });

  it("aggregates workload by owner, including an unassigned bucket", () => {
    const cards = mapToOpsTopicCards([
      sampleTopic({ id: "a", assignedTo: "editor-a", status: "DRAFTING", qaFailed: false }),
      sampleTopic({ id: "b", assignedTo: "editor-a", status: "REVIEW" }),
      sampleTopic({ id: "c", assignedTo: null, status: "IDEA" }),
    ]);
    const owners = aggregateByOwner(cards);
    const a = owners.find((o) => o.owner === "editor-a");
    const unassigned = owners.find((o) => o.owner === "Chưa gán");
    assert.equal(a?.total, 2);
    assert.equal(unassigned?.total, 1);
  });

  it("aggregates campaign publish progress", () => {
    const cards = mapToOpsTopicCards([
      sampleTopic({ id: "a", strategyId: "s1", strategyName: "Q3", status: "PUBLISHED" }),
      sampleTopic({ id: "b", strategyId: "s1", strategyName: "Q3", status: "DRAFTING", qaFailed: false }),
      sampleTopic({ id: "c", strategyId: "s2", strategyName: "Q4", status: "IDEA" }),
    ]);
    const campaigns = aggregateByCampaign(cards);
    const q3 = campaigns.find((c) => c.id === "s1");
    assert.equal(q3?.total, 2);
    assert.equal(q3?.publishedCount, 1);
    assert.equal(q3?.progressPercent, 50);
  });

  it("nests clusters under campaigns with correct topic counts", () => {
    const cards = mapToOpsTopicCards([
      sampleTopic({ id: "a", strategyId: "s1", strategyName: "Q3", clusterId: "c1", clusterName: "Uniform", status: "IDEA" }),
      sampleTopic({ id: "b", strategyId: "s1", strategyName: "Q3", clusterId: "c2", clusterName: "Polo", status: "IDEA" }),
      sampleTopic({ id: "c", strategyId: "s2", strategyName: "Q4", clusterId: "c3", clusterName: "Jacket", status: "IDEA" }),
    ]);
    const tree = buildClusterTree(cards);
    const q3 = tree.find((n) => n.campaignId === "s1");
    assert.equal(q3?.total, 2);
    assert.equal(q3?.clusters.length, 2);
  });

  it("searches by title, keyword, and slug", () => {
    const cards = mapToOpsTopicCards([
      sampleTopic({ id: "a", title: "Áo polo đồng phục", primaryKeyword: "ao polo", slug: "ao-polo" }),
      sampleTopic({ id: "b", title: "Đồng phục bảo hộ", primaryKeyword: "bao ho", slug: "bao-ho" }),
    ]);
    assert.equal(searchOperationsTopics(cards, "polo").length, 1);
    assert.equal(searchOperationsTopics(cards, "bao-ho").length, 1);
    assert.equal(searchOperationsTopics(cards, "").length, 2);
  });

  it("combines filters with AND semantics", () => {
    const cards = mapToOpsTopicCards([
      sampleTopic({ id: "a", status: "DRAFTING", qaFailed: false, priority: "HIGH", assignedTo: "editor-a" }),
      sampleTopic({ id: "b", status: "DRAFTING", qaFailed: false, priority: "LOW", assignedTo: "editor-a" }),
      sampleTopic({ id: "c", status: "REVIEW", priority: "HIGH", assignedTo: "editor-b" }),
    ]);
    const result = filterOperationsTopics(cards, { status: "DRAFTING", priority: "HIGH" });
    assert.deepEqual(result.map((c) => c.id), ["a"]);
  });

  it("summarizes the review queue by status and blocking issues", () => {
    const summary = buildReviewQueueSummary([
      { id: "r1", status: "IN_REVIEW", topicId: "t1", topicTitle: "A", blockingIssues: 2, assignedReviewerId: "u1", updatedAt: "2026-08-01T00:00:00.000Z", readyForHandoff: false },
      { id: "r2", status: "CHANGES_REQUESTED", topicId: "t2", topicTitle: "B", blockingIssues: 1, assignedReviewerId: "u1", updatedAt: "2026-08-02T00:00:00.000Z", readyForHandoff: false },
      { id: "r3", status: "APPROVED", topicId: "t3", topicTitle: "C", blockingIssues: 0, assignedReviewerId: "u1", updatedAt: "2026-08-03T00:00:00.000Z", readyForHandoff: true },
    ]);
    assert.equal(summary.total, 3);
    assert.equal(summary.inReviewCount, 1);
    assert.equal(summary.changesRequestedCount, 1);
    assert.equal(summary.approvedCount, 1);
    assert.equal(summary.blockingIssuesTotal, 3);
  });

  it("builds a publish queue summary shape with ready/scheduled counts", () => {
    const summary = buildPublishQueueSummary({
      ready: [{ id: "p1", title: "A", slug: "a", status: "DRAFT", scheduledAt: null, updatedAt: "2026-08-01T00:00:00.000Z" }],
      scheduled: [{ id: "p2", title: "B", slug: "b", status: "SCHEDULED", scheduledAt: "2026-08-10T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z" }],
    });
    assert.equal(summary.readyCount, 1);
    assert.equal(summary.scheduledCount, 1);
    assert.equal(summary.readyItems[0].id, "p1");
    assert.equal(summary.scheduledItems[0].id, "p2");
  });

  it("counts missing SEO meta across active (non-archived) topics", () => {
    const topics = [
      sampleTopic({ id: "a", metaTitle: null }),
      sampleTopic({ id: "b", metaDescription: null }),
      sampleTopic({ id: "c", status: "ARCHIVED", metaTitle: null }),
    ];
    const summary = buildSeoOpsSummary(topics);
    assert.equal(summary.totalTopics, 2);
    assert.equal(summary.missingMetaTitle, 1);
    assert.equal(summary.missingMetaDescription, 1);
  });

  it("counts missing media bundle and critical media status", () => {
    const topics = [
      sampleTopic({ id: "a", mediaBundleId: null }),
      sampleTopic({ id: "b", mediaPlanStatus: "CRITICAL" }),
      sampleTopic({ id: "c" }),
    ];
    const summary = buildMediaCoverageSummary(topics);
    assert.equal(summary.missingBundle, 1);
    assert.equal(summary.criticalStatus, 1);
    assert.equal(summary.totalTopics, 3);
  });

  it("dedupes repeated activity text and sorts newest-first", () => {
    const groups = groupOperationsActivity([
      { at: "2026-08-01T00:00:00.000Z", text: "Đã xuất bản: A" },
      { at: "2026-08-03T00:00:00.000Z", text: "Đã xuất bản: A" },
      { at: "2026-08-02T00:00:00.000Z", text: "Đang viết: B" },
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].text, "Đã xuất bản: A");
    assert.equal(groups[0].count, 2);
    assert.equal(groups[0].at, "2026-08-03T00:00:00.000Z");
  });

  it("mapping module has no mutation exports (no Prisma, no fetch, no writes)", () => {
    const source = readFileSync("src/features/content/operations/content-operations.mapping.ts", "utf8");
    assert.doesNotMatch(source, /prisma\./);
    assert.doesNotMatch(source, /\.(create|update|delete|upsert)\(/);
    assert.doesNotMatch(source, /fetch\(/);
  });

  it("registers the page, nav item, and a GET-only API route", () => {
    const page = readFileSync("src/app/(backend)/admin/content/operations/page.tsx", "utf8");
    assert.match(page, /ContentOperationsClient/);

    const content = adminNavigationSections.find((s) => s.label === "NỘI DUNG");
    assert.ok(content);
    const item = content.platforms[0].items.find((i) => i.href === "/admin/content/operations");
    assert.equal(item?.label, "Trung tâm vận hành");
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/operations").breadcrumbs, [
      "NỘI DUNG",
      "Trung tâm vận hành",
    ]);

    const route = readFileSync("src/app/api/content/operations/summary/route.ts", "utf8");
    assert.match(route, /export async function GET/);
    assert.doesNotMatch(route, /export\s+(async\s+)?function\s+POST/);
    assert.doesNotMatch(route, /export\s+(async\s+)?function\s+(PUT|PATCH|DELETE)/);
  });

  it("kanban drag is a cursor-grab placeholder and never transitions status", () => {
    const source = readFileSync("src/components/admin/content/operations/OperationsKanban.tsx", "utf8");
    assert.match(source, /preventDefault/);
    assert.match(source, /Kéo thả chưa đổi trạng thái trong sprint này/);
    assert.doesNotMatch(source, /updateSeoTopic/);
    assert.doesNotMatch(source, /fetch\(/);
  });

  it("never enables AI content generation from operations files", () => {
    const files = [
      "src/features/content/operations/content-operations.mapping.ts",
      "src/features/content/operations/content-operations.types.ts",
      "src/features/content/services/content-operations.service.ts",
      "src/app/api/content/operations/summary/route.ts",
      "src/components/admin/content/operations/ContentOperationsClient.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /CONTENT_GENERATION_ENABLED/);
    }
  });
});
