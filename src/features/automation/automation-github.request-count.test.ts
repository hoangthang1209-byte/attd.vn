import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AUTOMATION_STATUS_GITHUB_LABELS } from "@/features/automation/automation-status.parser";
import { fetchAutomationIssues } from "@/features/automation/automation-github.loader";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSearchItems(count: number, startNumber = 1) {
  return Array.from({ length: count }, (_, index) => ({
    number: startNumber + index,
    title: `Task ${startNumber + index}`,
    state: "open" as const,
    html_url: `https://github.com/hoangthang1209-byte/attd.vn/issues/${startNumber + index}`,
    updated_at: "2026-09-20T12:00:00.000Z",
    closed_at: null,
    labels: [{ name: "status:building" }],
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
    assert.ok(
      searchCallCount >= 3,
      "expected grouped open-query pagination plus one closed history query",
    );
    assert.ok(searchCallCount < result.issues.length);
    assert.equal(result.openTasksTruncated, false);
    assert.notEqual(result.openTasksTotalCount, null);
    assert.ok((result.openTasksTotalCount ?? 0) >= 120);
    assert.equal(result.openTasksLoadedCount, 120);
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
    assert.notEqual(result.openTasksTotalCount, null);
    assert.ok((result.openTasksTotalCount ?? 0) >= 1205);
    assert.equal(result.openTasksLoadedCount, 1000);
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
