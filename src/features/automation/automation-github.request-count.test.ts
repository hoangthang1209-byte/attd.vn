import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AUTOMATION_STATUS_GITHUB_LABELS } from "@/features/automation/automation-status.parser";
import { DEVELOPMENT_TASK_GITHUB_LABEL } from "@/features/automation/automation-task.recognition";
import {
  fetchAutomationIssues,
  fetchAutomationIssuesForView,
  listRepoIssuesPaginated,
  MAX_UNLABELED_HISTORICAL_COMMENT_CHECKS,
  MAX_UNLABELED_OPEN_COMMENT_CHECKS,
} from "@/features/automation/automation-github.loader";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSearchItems(
  count: number,
  startNumber = 1,
  label = "status:building",
) {
  return Array.from({ length: count }, (_, index) => ({
    number: startNumber + index,
    title: `Task ${startNumber + index}`,
    state: "open" as const,
    html_url: `https://github.com/hoangthang1209-byte/attd.vn/issues/${startNumber + index}`,
    updated_at: "2026-09-20T12:00:00.000Z",
    closed_at: null,
    labels: [{ name: label }],
  }));
}

describe("automation GitHub request-count regression", () => {
  beforeEach(() => {
    process.env.GITHUB_AUTOMATION_READ_TOKEN = "test-token";
    process.env.GITHUB_AUTOMATION_REPO = "hoangthang1209-byte/attd.vn";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
    delete process.env.GITHUB_AUTOMATION_REPO;
  });

  it("does not issue one Search API call per task on cache miss", async () => {
    let searchCallCount = 0;

    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues")) {
        searchCallCount += 1;
        const page = Number(new URL(String(input)).searchParams.get("page") ?? "1");
        if (url.includes("is:open")) {
          return jsonResponse({
            total_count: 120,
            items: page === 1 ? buildSearchItems(100) : buildSearchItems(20, 101),
          });
        }
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(result.issues.length, 120);
    assert.equal(searchCallCount, 3, "expected 2 open-query pages + 1 closed history query");
    assert.ok(searchCallCount < result.issues.length);
    assert.equal(result.openTasksTruncated, false);
    assert.equal(result.openTasksTotalCount, 120);
    assert.equal(result.openTasksLoadedCount, 120);
  });

  it("filters non-automation open issues after the label-free search", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({
          total_count: 4,
          items: [
            ...buildSearchItems(2, 71, "status:pr-open"),
            ...buildSearchItems(1, 100, "enhancement"),
            ...buildSearchItems(1, 200, "bug"),
          ],
        });
      }

      if (url.includes("/search/issues")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.deepEqual(
      result.issues.map((issue) => issue.number).sort((left, right) => left - right),
      [71, 72],
    );
    assert.equal(result.openTasksTotalCount, 4);
    assert.equal(result.openTasksLoadedCount, 4);
  });

  it("retains recent closed merged issues and filters unrelated closed issues", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/search/issues") && url.includes("is:closed")) {
        return jsonResponse({
          total_count: 3,
          items: [
            {
              number: 50,
              title: "Merged automation task",
              state: "closed" as const,
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/50",
              updated_at: "2026-09-20T12:00:00.000Z",
              closed_at: "2026-09-19T12:00:00.000Z",
              labels: [{ name: "status:merged" }],
            },
            {
              number: 99,
              title: "Closed bug",
              state: "closed" as const,
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/99",
              updated_at: "2026-09-20T12:00:00.000Z",
              closed_at: "2026-09-19T12:00:00.000Z",
              labels: [{ name: "bug" }],
            },
          ],
        });
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0]?.number, 50);
  });

  it("surfaces truncation when open tasks exceed GitHub Search page limit", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        const page = Number(new URL(String(input)).searchParams.get("page") ?? "1");
        return jsonResponse({
          total_count: 1205,
          items: buildSearchItems(100, (page - 1) * 100 + 1),
        });
      }

      if (url.includes("/search/issues")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(result.issues.length, 1000);
    assert.equal(result.openTasksTruncated, true);
    assert.equal(result.openTasksTotalCount, 1205);
    assert.equal(result.openTasksLoadedCount, 1000);
  });

  it("discovers TASK_AREA-only open tasks outside status labels", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({
          total_count: 2,
          items: [
            ...buildSearchItems(1, 300, "enhancement"),
            {
              number: 301,
              title: "Task area only",
              state: "open" as const,
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/301",
              updated_at: "2026-09-20T12:00:00.000Z",
              closed_at: null,
              labels: [{ name: "documentation" }],
            },
          ],
        });
      }

      if (url.includes("/search/issues")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/issues/301/comments")) {
        return jsonResponse([{ user: { login: "owner" }, body: "TASK_AREA: Automation Platform", created_at: "2026-01-01T00:00:00Z" }]);
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.deepEqual(
      result.issues.map((issue) => issue.number),
      [301],
    );
  });

  it("loads full repo history for the all-tasks view via REST pagination", async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url.includes("/repos/") && url.includes("/issues?")) {
        const page = Number(new URL(url).searchParams.get("page") ?? "1");
        if (page === 1) {
          return jsonResponse([
            {
              number: 10,
              title: "Old merged task",
              state: "closed",
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/10",
              updated_at: "2026-01-15T12:00:00.000Z",
              closed_at: "2026-01-10T12:00:00.000Z",
              labels: [{ name: "status:merged" }],
            },
            {
              number: 11,
              title: "Random closed bug",
              state: "closed",
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/11",
              updated_at: "2026-01-14T12:00:00.000Z",
              closed_at: "2026-01-12T12:00:00.000Z",
              labels: [{ name: "bug" }],
            },
          ]);
        }
        return jsonResponse([]);
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssuesForView("all", AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0]?.number, 10);
    assert.equal(result.historyTruncated, false);
  });

  it("surfaces history truncation metadata when REST pagination hits the cap", async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url.includes("/repos/") && url.includes("/issues?")) {
        const page = Number(new URL(url).searchParams.get("page") ?? "1");
        return jsonResponse(
          Array.from({ length: 100 }, (_, index) => ({
            number: (page - 1) * 100 + index + 1,
            title: `Issue ${(page - 1) * 100 + index + 1}`,
            state: "closed",
            html_url: `https://github.com/hoangthang1209-byte/attd.vn/issues/${(page - 1) * 100 + index + 1}`,
            updated_at: "2026-01-01T12:00:00.000Z",
            closed_at: "2026-01-01T12:00:00.000Z",
            labels: [{ name: "status:merged" }],
          })),
        );
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const listing = await listRepoIssuesPaginated("closed");
    assert.equal(listing.truncated, true);
    assert.equal(listing.loadedCount, 100 * 100);
  });

  it("bounds historical TASK_AREA comment lookups on all-tasks view", async () => {
    let commentRequestCount = 0;
    const unlabeledCount = MAX_UNLABELED_HISTORICAL_COMMENT_CHECKS + 25;

    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url.includes("/repos/") && url.includes("/issues?")) {
        return jsonResponse(
          Array.from({ length: unlabeledCount }, (_, index) => ({
            number: index + 1,
            title: `Unlabeled issue ${index + 1}`,
            state: "open",
            html_url: `https://github.com/hoangthang1209-byte/attd.vn/issues/${index + 1}`,
            updated_at: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
            closed_at: null,
            labels: [{ name: "bug" }],
          })),
        );
      }

      if (url.includes("/comments")) {
        commentRequestCount += 1;
        const issueNumber = Number(url.match(/\/issues\/(\d+)\/comments/)?.[1]);
        if (issueNumber === 1) {
          return jsonResponse([
            { user: { login: "owner" }, body: "TASK_AREA: Automation Platform", created_at: "2026-01-01T00:00:00Z" },
          ]);
        }
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssuesForView("all", AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(commentRequestCount, MAX_UNLABELED_HISTORICAL_COMMENT_CHECKS);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0]?.number, 1);
    assert.equal(result.taskAreaRecognitionTruncated, true);
    assert.equal(result.unlabeledCommentChecksSkipped, 25);
    assert.equal(result.unlabeledCommentChecksPerformed, MAX_UNLABELED_HISTORICAL_COMMENT_CHECKS);
    assert.equal(result.recognitionDegraded, true);
  });

  it("short-circuits development-task label before comment lookup", async () => {
    let commentRequestCount = 0;

    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url.includes("/repos/") && url.includes("/issues?")) {
        return jsonResponse([
          {
            number: 501,
            title: "Development task label only",
            state: "open",
            html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/501",
            updated_at: "2026-09-20T12:00:00.000Z",
            closed_at: null,
            labels: [{ name: DEVELOPMENT_TASK_GITHUB_LABEL }],
          },
        ]);
      }

      if (url.includes("/comments")) {
        commentRequestCount += 1;
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssuesForView("all", AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(commentRequestCount, 0);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0]?.number, 501);
  });

  it("caps active open TASK_AREA discovery at the configured limit", async () => {
    let commentRequestCount = 0;
    const unlabeledCount = MAX_UNLABELED_OPEN_COMMENT_CHECKS + 10;

    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({
          total_count: unlabeledCount,
          items: Array.from({ length: unlabeledCount }, (_, index) => ({
            number: index + 1,
            title: `Open unlabeled ${index + 1}`,
            state: "open" as const,
            html_url: `https://github.com/hoangthang1209-byte/attd.vn/issues/${index + 1}`,
            updated_at: `2026-09-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
            closed_at: null,
            labels: [{ name: "documentation" }],
          })),
        });
      }

      if (url.includes("/search/issues")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/comments")) {
        commentRequestCount += 1;
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(commentRequestCount, MAX_UNLABELED_OPEN_COMMENT_CHECKS);
    assert.equal(result.taskAreaRecognitionTruncated, true);
    assert.equal(result.unlabeledCommentChecksSkipped, 10);
  });

  it("continues with open operational data when closed history search fails", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({
          total_count: 2,
          items: buildSearchItems(2),
        });
      }

      if (url.includes("/search/issues") && url.includes("is:closed")) {
        return jsonResponse({ message: "secondary search failed" }, 503);
      }

      if (url.includes("/comments")) {
        return jsonResponse([]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(result.issues.length, 2);
    assert.equal(result.closedHistoryUnavailable, true);
    assert.equal(result.openTasksTruncated, false);
  });
});
