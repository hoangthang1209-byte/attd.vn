import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  buildDeepLink,
  buildEditorWorkload,
  buildPublishInbox,
  buildPublishOpsStats,
  buildQueueHealth,
  buildRefreshCampaigns,
  buildRefreshInbox,
  buildReviewInbox,
  buildReviewerWorkload,
  filterOpsTopicsByDateRange,
  mapToOpsTopicCards,
} from "@/features/content/operations/content-operations.mapping";
import {
  groupOpsActivityEvents,
  mapPublishEvent,
  mapReviewDecisionEvent,
  mergeOpsActivityEvents,
  sortOpsActivityEventsChronological,
} from "@/features/content/operations/content-operations-activity.mapping";
import type {
  OperationsTopicInput,
  OpsActivityEvent,
  PublishInboxItem,
  ReviewInboxItem,
} from "@/features/content/operations/content-operations.types";

function sampleTopic(overrides: Partial<OperationsTopicInput> = {}): OperationsTopicInput {
  return {
    id: "t1",
    title: "Đồng phục polo cotton",
    primaryKeyword: "đồng phục polo",
    slug: "dong-phuc-polo",
    status: "PUBLISHED",
    priority: "HIGH",
    assignedTo: "editor-a",
    dueDate: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
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
    internalLinkCount: 2,
    ...overrides,
  };
}

function sampleReviewItem(overrides: Partial<ReviewInboxItem> = {}): ReviewInboxItem {
  return {
    id: "r1",
    status: "IN_REVIEW",
    topicId: "t1",
    topicTitle: "Đồng phục polo cotton",
    blockingIssues: 0,
    assignedReviewerId: "reviewer-a",
    updatedAt: "2026-08-05T00:00:00.000Z",
    startedAt: "2026-08-03T00:00:00.000Z",
    createdAt: "2026-08-02T00:00:00.000Z",
    readyForHandoff: false,
    priority: "HIGH",
    owner: "editor-a",
    campaign: "Q3 Lead",
    cluster: "Uniform",
    qaScore: 82,
    waitingDays: 2,
    ...overrides,
  };
}

function samplePublishItem(overrides: Partial<PublishInboxItem> = {}): PublishInboxItem {
  return {
    id: "p1",
    title: "Bài viết A",
    slug: "bai-viet-a",
    status: "READY",
    scheduledAt: null,
    publishedAt: null,
    updatedAt: "2026-08-05T00:00:00.000Z",
    errorMessage: null,
    modified: false,
    ...overrides,
  };
}

describe("Sprint 17.1 Operational Queues & Audit Foundation", () => {
  it("1. review inbox groups high priority / overdue / today", () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    const items = [
      sampleReviewItem({ id: "high", priority: "CRITICAL", waitingDays: 1 }),
      sampleReviewItem({ id: "overdue", priority: "LOW", waitingDays: 5 }),
      sampleReviewItem({ id: "today", priority: "LOW", waitingDays: 0 }),
      sampleReviewItem({ id: "plain", priority: "NORMAL", waitingDays: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const inbox = buildReviewInbox(items, now);
    assert.deepEqual(
      inbox.groups.high_priority.map((i) => i.id),
      ["high"],
    );
    assert.deepEqual(
      inbox.groups.overdue.map((i) => i.id),
      ["overdue"],
    );
    assert.deepEqual(
      inbox.groups.waiting_today.map((i) => i.id),
      ["today"],
    );
    assert.equal(inbox.items.length, 4);
  });

  it("2. publish inbox groups ready/scheduled/failed/waiting/published-today", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    const items = [
      samplePublishItem({ id: "ready", status: "READY", modified: false }),
      samplePublishItem({ id: "scheduled", status: "SCHEDULED", scheduledAt: "2026-08-10T00:00:00.000Z" }),
      samplePublishItem({ id: "failed", status: "FAILED", errorMessage: "boom" }),
      samplePublishItem({ id: "waiting", status: "READY", modified: true }),
      samplePublishItem({ id: "published", status: "PUBLISHED", publishedAt: "2026-08-05T08:00:00.000Z" }),
    ];
    const inbox = buildPublishInbox(items, now);
    assert.deepEqual(inbox.groups.ready_today.map((i) => i.id), ["ready"]);
    assert.deepEqual(inbox.groups.scheduled.map((i) => i.id), ["scheduled"]);
    assert.deepEqual(inbox.groups.failed.map((i) => i.id), ["failed"]);
    assert.deepEqual(inbox.groups.waiting.map((i) => i.id), ["waiting"]);
    assert.deepEqual(inbox.groups.published_today.map((i) => i.id), ["published"]);
  });

  it("3. refresh inbox computes reason keys and sorts worst-first", () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    const mild = sampleTopic({ id: "mild", publishedAt: "2026-07-01T00:00:00.000Z", ctaText: null, ctaType: null });
    const severe = sampleTopic({
      id: "severe",
      publishedAt: "2024-01-01T00:00:00.000Z",
      ctaText: null,
      ctaType: null,
      questionsCount: 0,
      mediaBundleId: null,
      internalLinkCount: 0,
      metaTitle: null,
    });
    const healthy = sampleTopic({ id: "healthy", publishedAt: "2026-07-01T00:00:00.000Z" });
    const inbox = buildRefreshInbox([mild, severe, healthy], now);
    const ids = inbox.items.map((i) => i.id);
    assert.ok(!ids.includes("healthy"));
    assert.deepEqual(ids, ["severe", "mild"]);
    assert.ok(inbox.items[0].severity > inbox.items[1].severity);
    assert.ok(inbox.items.find((i) => i.id === "severe")!.reasons.includes("outdated"));
    assert.ok(inbox.items.find((i) => i.id === "severe")!.reasons.includes("missing_links"));
  });

  it("4. calendar range helper filters topics by from/to (inclusive)", () => {
    const topics = [
      sampleTopic({ id: "in-range", publishedAt: "2026-08-05T00:00:00.000Z", dueDate: null }),
      sampleTopic({ id: "before", publishedAt: "2026-07-01T00:00:00.000Z", dueDate: null }),
      sampleTopic({ id: "after", publishedAt: "2026-09-01T00:00:00.000Z", dueDate: null }),
      sampleTopic({ id: "no-anchor", publishedAt: null, dueDate: null }),
    ];
    const result = filterOpsTopicsByDateRange(topics, { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T00:00:00.000Z" });
    assert.deepEqual(result.map((t) => t.id), ["in-range"]);
  });

  it("5. activity merge sorts newest-first and caps take", () => {
    const events: OpsActivityEvent[] = [
      { id: "a", at: "2026-08-01T00:00:00.000Z", kind: "PUBLISHED", actorId: null, topicId: null, entityType: "BlogPost", entityId: "1", href: null, text: "a", sourceTable: "ContentPublishEvent" },
      { id: "b", at: "2026-08-03T00:00:00.000Z", kind: "PUBLISHED", actorId: null, topicId: null, entityType: "BlogPost", entityId: "2", href: null, text: "b", sourceTable: "ContentPublishEvent" },
      { id: "c", at: "2026-08-02T00:00:00.000Z", kind: "PUBLISHED", actorId: null, topicId: null, entityType: "BlogPost", entityId: "3", href: null, text: "c", sourceTable: "ContentPublishEvent" },
    ];
    const merged = mergeOpsActivityEvents(events, { take: 2 });
    assert.deepEqual(merged.map((e) => e.id), ["b", "c"]);
  });

  it("6. named views: defaults are always present and custom views save/load via mocked localStorage", async () => {
    const store = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    (globalThis as { localStorage?: Storage }).localStorage = fakeStorage;

    const mod = await import("@/features/content/operations/content-operations-views");
    const before = mod.listNamedViews();
    assert.ok(before.length >= mod.DEFAULT_NAMED_VIEWS.length);
    assert.ok(before.some((v) => v.id === "default-todays-reviews"));

    const created = mod.saveNamedView({ name: "Của tôi", inbox: "review", filters: {}, group: "overdue" });
    const after = mod.listNamedViews();
    assert.ok(after.some((v) => v.id === created.id && v.name === "Của tôi"));

    mod.deleteNamedView(created.id);
    const afterDelete = mod.listNamedViews();
    assert.ok(!afterDelete.some((v) => v.id === created.id));

    // Built-in defaults can never be deleted.
    mod.deleteNamedView("default-todays-reviews");
    assert.ok(mod.listNamedViews().some((v) => v.id === "default-todays-reviews"));

    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it("7. deep link builder maps inbox/group and health-filter keys", () => {
    assert.deepEqual(buildDeepLink("review:overdue"), {
      path: "/admin/content/operations",
      query: { inbox: "review", group: "overdue" },
    });
    assert.deepEqual(buildDeepLink("publish"), {
      path: "/admin/content/operations",
      query: { inbox: "publish" },
    });
    assert.deepEqual(buildDeepLink("missingCta"), {
      path: "/admin/content/operations",
      query: { inbox: "kanban", filter: "missingCta" },
    });
    assert.deepEqual(buildDeepLink("unknownKey"), {
      path: "/admin/content/operations",
      query: { inbox: "kanban" },
    });
  });

  it("8. queue health shape carries all five counters", () => {
    const health = buildQueueHealth({ total: 10, blocked: 1, overdue: 2, waiting: 3, completedToday: 4 });
    assert.deepEqual(health, { total: 10, blocked: 1, overdue: 2, waiting: 3, completedToday: 4 });
  });

  it("9. reviewer workload aggregates per reviewer, with an unassigned bucket", () => {
    const workload = buildReviewerWorkload([
      { assignedReviewerId: "u1", status: "IN_REVIEW", blockingIssues: 2 },
      { assignedReviewerId: "u1", status: "CHANGES_REQUESTED", blockingIssues: 1 },
      { assignedReviewerId: null, status: "APPROVED", blockingIssues: 0 },
    ]);
    const u1 = workload.find((w) => w.reviewerId === "u1");
    const unassigned = workload.find((w) => w.reviewerId === "Chưa gán");
    assert.equal(u1?.total, 2);
    assert.equal(u1?.blockingIssuesTotal, 3);
    assert.equal(unassigned?.approvedCount, 1);
  });

  it("10. publish ops stats mirror group sizes", () => {
    const inbox = buildPublishInbox([
      samplePublishItem({ id: "r1", status: "READY" }),
      samplePublishItem({ id: "s1", status: "SCHEDULED", scheduledAt: "2026-08-10T00:00:00.000Z" }),
      samplePublishItem({ id: "f1", status: "FAILED", errorMessage: "x" }),
    ]);
    const stats = buildPublishOpsStats(inbox.groups);
    assert.equal(stats.readyCount, 1);
    assert.equal(stats.scheduledCount, 1);
    assert.equal(stats.failedCount, 1);
    assert.equal(stats.publishedTodayCount, 0);
    assert.equal(stats.waitingCount, 0);
  });

  it("11. refresh campaigns aggregate by campaign with reason counts", () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    const inbox = buildRefreshInbox(
      [
        sampleTopic({ id: "a", strategyId: "s1", strategyName: "Q3", ctaText: null, ctaType: null }),
        sampleTopic({ id: "b", strategyId: "s1", strategyName: "Q3", questionsCount: 0 }),
        sampleTopic({ id: "c", strategyId: "s2", strategyName: "Q4", metaTitle: null }),
      ],
      now,
    );
    const campaigns = buildRefreshCampaigns(inbox.items);
    const q3 = campaigns.find((c) => c.campaignId === "s1");
    assert.equal(q3?.total, 2);
    assert.ok((q3?.reasonCounts.missing_cta ?? 0) >= 1);
  });

  it("12. editor workload combines topic drafting/review load with reviewer assignments", () => {
    const cards = mapToOpsTopicCards([
      sampleTopic({ id: "a", assignedTo: "editor-a", status: "DRAFTING", qaFailed: false, dueDate: "2020-01-01T00:00:00.000Z" }),
      sampleTopic({ id: "b", assignedTo: "editor-a", status: "REVIEW" }),
    ]);
    const workload = buildEditorWorkload(cards, [{ assignedReviewerId: "editor-b" }]);
    const editorA = workload.find((w) => w.owner === "editor-a");
    const editorB = workload.find((w) => w.owner === "editor-b");
    assert.equal(editorA?.draftingCount, 1);
    assert.equal(editorA?.reviewCount, 1);
    assert.ok((editorA?.overdueCount ?? 0) >= 1);
    assert.equal(editorB?.reviewCount, 1);
  });

  it("13. new operations API routes are GET-only (no POST/PUT/PATCH/DELETE export)", () => {
    const routes = [
      "src/app/api/content/operations/reviews/route.ts",
      "src/app/api/content/operations/publish/route.ts",
      "src/app/api/content/operations/refresh/route.ts",
      "src/app/api/content/operations/calendar/route.ts",
      "src/app/api/content/operations/activity/route.ts",
      "src/app/api/content/operations/topic/[id]/timeline/route.ts",
    ];
    for (const route of routes) {
      const source = readFileSync(route, "utf8");
      assert.match(source, /export async function GET/);
      assert.doesNotMatch(source, /export\s+(async\s+)?function\s+POST/);
      assert.doesNotMatch(source, /export\s+(async\s+)?function\s+(PUT|PATCH|DELETE)/);
    }
  });

  it("14. operations service never creates/updates/deletes a review, publish, or topic", () => {
    const source = readFileSync("src/features/content/services/content-operations.service.ts", "utf8");
    assert.doesNotMatch(source, /updateSeoTopic/);
    assert.doesNotMatch(source, /publishBlog/);
    assert.doesNotMatch(source, /approveReview/);
    assert.doesNotMatch(source, /\.(create|update|upsert|delete)\(/);
  });

  it("15. activity mapper maps a review decision and a publish event", () => {
    const decisionEvent = mapReviewDecisionEvent({
      id: "d1",
      reviewSessionId: "rs1",
      decisionType: "APPROVE_DRAFT",
      actorId: "u1",
      createdAt: "2026-08-01T00:00:00.000Z",
      topicId: "t1",
      topicTitle: "Đồng phục polo",
    });
    assert.equal(decisionEvent.kind, "REVIEW_DECISION");
    assert.equal(decisionEvent.sourceTable, "ContentReviewDecision");
    assert.match(decisionEvent.text, /Duyệt bản thảo/);

    const publishEvent = mapPublishEvent({
      id: "p1",
      blogPostId: "b1",
      blogTitle: "Đồng phục polo",
      action: "PUBLISH_NOW",
      status: "SUCCESS",
      requestedBy: "u1",
      createdAt: "2026-08-02T00:00:00.000Z",
      topicId: "t1",
    });
    assert.equal(publishEvent.kind, "PUBLISHED");
    assert.equal(publishEvent.sourceTable, "ContentPublishEvent");

    const failedPublish = mapPublishEvent({
      id: "p2",
      blogPostId: "b1",
      blogTitle: "Đồng phục polo",
      action: "PUBLISH_NOW",
      status: "FAILED",
      requestedBy: "u1",
      createdAt: "2026-08-02T00:00:00.000Z",
      topicId: "t1",
    });
    assert.equal(failedPublish.kind, "PUBLISH_FAILED");
  });

  it("16. topic timeline orders events chronologically (oldest first) and rollup groups by kind", () => {
    const events: OpsActivityEvent[] = [
      { id: "a", at: "2026-08-03T00:00:00.000Z", kind: "PUBLISHED", actorId: null, topicId: "t1", entityType: "BlogPost", entityId: "1", href: null, text: "a", sourceTable: "ContentPublishEvent" },
      { id: "b", at: "2026-08-01T00:00:00.000Z", kind: "DRAFT_CREATED", actorId: null, topicId: "t1", entityType: "WritingDraftRecord", entityId: "2", href: null, text: "b", sourceTable: "WritingDraftVersion" },
      { id: "c", at: "2026-08-02T00:00:00.000Z", kind: "REVIEW_DECISION", actorId: null, topicId: "t1", entityType: "ContentReviewSession", entityId: "3", href: null, text: "c", sourceTable: "ContentReviewDecision" },
    ];
    const chronological = sortOpsActivityEventsChronological(events);
    assert.deepEqual(chronological.map((e) => e.id), ["b", "c", "a"]);

    const grouped = groupOpsActivityEvents(events);
    assert.equal(grouped.length, 3);
    assert.ok(grouped.every((g) => g.count === 1));
  });

  it("17. kanban stays non-mutating (17.0 regression)", () => {
    const source = readFileSync("src/components/admin/content/operations/OperationsKanban.tsx", "utf8");
    assert.match(source, /Kéo thả chưa đổi trạng thái trong sprint này/);
    assert.doesNotMatch(source, /updateSeoTopic/);

    const clientSource = readFileSync("src/components/admin/content/operations/ContentOperationsClient.tsx", "utf8");
    assert.doesNotMatch(clientSource, /method:\s*["']POST["']/);
    assert.doesNotMatch(clientSource, /method:\s*["']PATCH["']/);
    assert.doesNotMatch(clientSource, /method:\s*["']DELETE["']/);
  });

  it("18. CONTENT_GENERATION is not enabled anywhere in the operations feature/API/UI files", () => {
    const files = [
      "src/features/content/operations/content-operations.mapping.ts",
      "src/features/content/operations/content-operations-activity.mapping.ts",
      "src/features/content/operations/content-operations-views.ts",
      "src/features/content/operations/content-operations.types.ts",
      "src/features/content/services/content-operations.service.ts",
      "src/app/api/content/operations/reviews/route.ts",
      "src/app/api/content/operations/publish/route.ts",
      "src/app/api/content/operations/refresh/route.ts",
      "src/app/api/content/operations/calendar/route.ts",
      "src/app/api/content/operations/activity/route.ts",
      "src/app/api/content/operations/topic/[id]/timeline/route.ts",
      "src/components/admin/content/operations/ContentOperationsClient.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /CONTENT_GENERATION_ENABLED/);
    }
  });
});
