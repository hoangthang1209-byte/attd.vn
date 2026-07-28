import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { adminNavigationSections } from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";
import {
  buildMonthGrid,
  computeWeekCapacity,
  filterCalendarTopics,
  getAgendaGroup,
  getCalendarPipelineColumn,
  getDeadlineTone,
  groupTopicsByPipeline,
  type EditorialCalendarTopic,
} from "@/features/content/editorial/editorial-calendar";

function sampleTopic(
  overrides: Partial<EditorialCalendarTopic> = {},
): EditorialCalendarTopic {
  return {
    id: "t1",
    title: "Polo guide",
    primaryKeyword: "áo polo",
    status: "DRAFTING",
    priority: "HIGH",
    assignedTo: "editor-a",
    dueDate: "2026-07-28T00:00:00.000Z",
    publishedAt: null,
    targetUrl: null,
    wordCountMax: 1200,
    clusterId: "c1",
    clusterName: "Uniform",
    strategyId: "s1",
    strategyName: "Q3 Lead",
    ...overrides,
  };
}

describe("Sprint editorial calendar planning", () => {
  it("registers Lịch biên tập under NỘI DUNG", () => {
    const content = adminNavigationSections.find((s) => s.label === "NỘI DUNG");
    assert.ok(content);
    const item = content.platforms[0].items.find((i) => i.href === "/admin/content/calendar");
    assert.equal(item?.label, "Lịch biên tập");
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/calendar").breadcrumbs, [
      "NỘI DUNG",
      "Lịch biên tập",
    ]);
  });

  it("maps statuses into pipeline columns without inventing workflow", () => {
    assert.equal(getCalendarPipelineColumn(sampleTopic({ status: "IDEA" })), "ideas");
    assert.equal(getCalendarPipelineColumn(sampleTopic({ status: "BRIEF_READY" })), "brief");
    assert.equal(getCalendarPipelineColumn(sampleTopic({ status: "DRAFTING" })), "writing");
    assert.equal(getCalendarPipelineColumn(sampleTopic({ status: "REVIEW" })), "review");
    assert.equal(
      getCalendarPipelineColumn(sampleTopic({ status: "REVIEW", targetUrl: "/blog/x" })),
      "ready",
    );
    assert.equal(getCalendarPipelineColumn(sampleTopic({ status: "PUBLISHED" })), "published");
  });

  it("deadline tones use late/today/completed families only", () => {
    const today = new Date("2026-07-28T12:00:00.000Z");
    assert.equal(getDeadlineTone("2026-07-20T00:00:00.000Z", "DRAFTING", today), "late");
    assert.equal(getDeadlineTone("2026-07-28T00:00:00.000Z", "DRAFTING", today), "today");
    assert.equal(getDeadlineTone("2026-07-20T00:00:00.000Z", "PUBLISHED", today), "completed");
  });

  it("agenda groups and capacity are planning-only aggregates", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    assert.equal(getAgendaGroup("2026-07-28T00:00:00.000Z", now), "today");
    assert.equal(getAgendaGroup("2026-07-29T00:00:00.000Z", now), "tomorrow");
    const topics = [
      sampleTopic({ id: "a", dueDate: "2026-07-29T00:00:00.000Z", status: "DRAFTING" }),
      sampleTopic({ id: "b", dueDate: "2026-07-20T00:00:00.000Z", status: "REVIEW" }),
      sampleTopic({
        id: "c",
        status: "PUBLISHED",
        publishedAt: "2026-07-27T00:00:00.000Z",
        dueDate: "2026-07-27T00:00:00.000Z",
      }),
      sampleTopic({ id: "d", status: "REVIEW", targetUrl: "/blog/y", dueDate: "2026-07-30T00:00:00.000Z" }),
    ];
    const capacity = computeWeekCapacity(topics, now);
    assert.ok(capacity.planned >= 1);
    assert.ok(capacity.overdue >= 1);
    assert.ok(capacity.ready >= 1);
    assert.ok(capacity.published >= 1);
    const pipeline = groupTopicsByPipeline(topics);
    assert.ok(pipeline.writing.length >= 1);
    assert.ok(pipeline.ready.length >= 1);
  });

  it("month grid and filters stay display-only", () => {
    const topics = [
      sampleTopic({ id: "m1", dueDate: "2026-07-15T00:00:00.000Z" }),
      sampleTopic({ id: "m2", strategyId: "other", dueDate: "2026-07-15T00:00:00.000Z" }),
    ];
    const grid = buildMonthGrid(2026, 6, topics);
    assert.equal(grid.length, 42);
    assert.ok(grid.some((c) => c.topics.length > 0));
    const filtered = filterCalendarTopics(topics, { strategyId: "s1" });
    assert.equal(filtered.length, 1);
  });

  it("calendar page/client/api exist without scheduling language", () => {
    const page = readFileSync("src/app/(backend)/admin/content/calendar/page.tsx", "utf8");
    const client = readFileSync(
      "src/components/admin/seo-content/EditorialCalendarClient.tsx",
      "utf8",
    );
    const route = readFileSync("src/app/api/content/seo/calendar/route.ts", "utf8");
    assert.match(page, /EditorialCalendarClient/);
    assert.match(client, /Pipeline/);
    assert.match(client, /Open Workspace/);
    assert.match(client, /Current Campaigns/);
    assert.doesNotMatch(client, /cron|scheduler|automation/i);
    assert.match(route, /getEditorialCalendarPlan/);
  });
});
