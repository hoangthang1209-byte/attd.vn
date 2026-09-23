import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GitHubIssuePayload } from "@/features/automation/automation-github.types";
import { buildSummary, mapIssueToTask } from "@/features/automation/automation-task.aggregation";

function issueFixture(overrides: Partial<GitHubIssuePayload> = {}): GitHubIssuePayload {
  return {
    number: 57,
    title: "Repair dashboard findings",
    state: "CLOSED",
    url: "https://github.com/hoangthang1209-byte/attd.vn/issues/57",
    updatedAt: "2026-09-21T00:00:00.000Z",
    closedAt: "2026-09-20T08:00:00.000Z",
    labels: [{ name: "status:merged" }],
    comments: [],
    ...overrides,
  };
}

describe("automation task service", () => {
  it("counts mergedToday from authoritative merge timing, not issue updated_at", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const mergedYesterdayUpdatedToday = mapIssueToTask(
      issueFixture({
        updatedAt: today.toISOString(),
        closedAt: yesterday.toISOString(),
      }),
    );
    const mergedTodayTask = mapIssueToTask(
      issueFixture({
        number: 58,
        updatedAt: yesterday.toISOString(),
        closedAt: today.toISOString(),
      }),
    );

    const summary = buildSummary([mergedYesterdayUpdatedToday, mergedTodayTask]);
    assert.equal(summary.mergedToday.value, 1);
    assert.equal(summary.mergedToday.isPartial, false);
  });

  it("uses linked PR mergedAt when available for mergedToday", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const task = mapIssueToTask(
      issueFixture({
        updatedAt: yesterday.toISOString(),
        closedAt: yesterday.toISOString(),
      }),
    );
    task.mergedAt = today.toISOString();

    const summary = buildSummary([task]);
    assert.equal(summary.mergedToday.value, 1);
  });

  it("marks hasBuildApproved when an exact approval comment exists", () => {
    const task = mapIssueToTask(
      issueFixture({
        state: "OPEN",
        closedAt: null,
        comments: [
          { author: { login: "owner" }, body: "TASK_AREA: Automation Platform", createdAt: "2026-01-01T00:00:00Z" },
          { author: { login: "owner" }, body: "BUILD_APPROVED", createdAt: "2026-01-01T01:00:00Z" },
        ],
      }),
    );
    assert.equal(task.hasBuildApproved, true);
  });

  it("does not count queued tasks in stalledOrFailed", () => {
    const queuedTask = mapIssueToTask(
      issueFixture({
        state: "OPEN",
        closedAt: null,
        labels: [{ name: "status:queued" }],
      }),
    );
    const blockedTask = mapIssueToTask(
      issueFixture({
        number: 58,
        state: "OPEN",
        closedAt: null,
        labels: [{ name: "status:blocked" }],
      }),
    );

    const summary = buildSummary([queuedTask, blockedTask]);
    assert.equal(summary.stalledOrFailed.value, 1);
  });

  it("marks totalOpen partial when open search pagination is truncated", () => {
    const openTasks = Array.from({ length: 50 }, (_, index) =>
      mapIssueToTask(
        issueFixture({
          number: index + 1,
          state: "OPEN",
          closedAt: null,
          labels: [{ name: "status:building" }],
        }),
      ),
    );

    const summary = buildSummary(openTasks, {
      openTasksTruncated: true,
      openTasksTotalCount: 1205,
      openTasksLoadedCount: 1000,
    });

    assert.equal(summary.totalOpen.value, 50);
    assert.equal(summary.totalOpen.isPartial, true);
    assert.equal(summary.building.value, 50);
    assert.equal(summary.building.isPartial, true);
  });

  it("marks totalOpen partial only when truncated without authoritative total_count", () => {
    const openTasks = Array.from({ length: 50 }, (_, index) =>
      mapIssueToTask(
        issueFixture({
          number: index + 1,
          state: "OPEN",
          closedAt: null,
          labels: [{ name: "status:building" }],
        }),
      ),
    );

    const summary = buildSummary(openTasks, {
      openTasksTruncated: true,
      openTasksTotalCount: null as unknown as number,
      openTasksLoadedCount: 50,
    });

    assert.equal(summary.totalOpen.value, 50);
    assert.equal(summary.totalOpen.isPartial, true);
  });

  it("marks mergedToday partial when closed history is unavailable", () => {
    const summary = buildSummary([], {
      openTasksTruncated: false,
      openTasksTotalCount: 0,
      openTasksLoadedCount: 0,
      closedHistoryUnavailable: true,
    });

    assert.equal(summary.mergedToday.isPartial, true);
  });

  it("maps taskArea from TASK_AREA comments into the task DTO", () => {
    const task = mapIssueToTask(
      issueFixture({
        comments: [
          {
            author: { login: "owner" },
            body: "TASK_AREA: Lead & Sales",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    );

    assert.equal(task.taskArea, "Lead & Sales");
  });

  it("defaults taskArea to Chưa phân loại when marker is missing", () => {
    const task = mapIssueToTask(issueFixture());
    assert.equal(task.taskArea, "Chưa phân loại");
  });
});
