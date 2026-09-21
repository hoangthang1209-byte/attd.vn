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

  it("uses authoritative openTasksTotalCount for totalOpen when truncated", () => {
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
      openTasksLoadedCount: 50,
    });

    assert.equal(summary.totalOpen.value, 1205);
    assert.equal(summary.totalOpen.isPartial, true);
    assert.equal(summary.building.value, 50);
    assert.equal(summary.building.isPartial, true);
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
});
