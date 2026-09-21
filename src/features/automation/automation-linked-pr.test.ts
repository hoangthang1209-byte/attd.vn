import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getAutomationDashboard } from "@/features/automation/automation-task.service";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("automation linked PR partial failure", () => {
  beforeEach(() => {
    process.env.GITHUB_AUTOMATION_READ_TOKEN = "test-token";
    process.env.GITHUB_AUTOMATION_REPO = "hoangthang1209-byte/attd.vn";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
    delete process.env.GITHUB_AUTOMATION_REPO;
  });

  it("continues loading when linked PR timeline lookup fails with 403", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({
          total_count: 1,
          items: [
            {
              number: 42,
              title: "Open building task",
              state: "open" as const,
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/42",
              updated_at: "2026-09-20T12:00:00.000Z",
              closed_at: null,
              labels: [{ name: "status:building" }],
            },
          ],
        });
      }

      if (url.includes("/search/issues")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/issues/42/comments")) {
        return jsonResponse([]);
      }

      if (url.includes("/issues/42/timeline")) {
        return jsonResponse({ message: "forbidden" }, 403);
      }

      return jsonResponse({}, 404);
    };

    const dashboard = await getAutomationDashboard();
    assert.equal(dashboard.configured, true);
    assert.equal(dashboard.configMessage, null);
    assert.equal(dashboard.tasks.length, 1);
    assert.equal(dashboard.tasks[0]?.issueNumber, 42);
    assert.equal(dashboard.tasks[0]?.linkedPullRequest, null);
  });
});
