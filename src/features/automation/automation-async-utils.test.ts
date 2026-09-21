import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AUTOMATION_STATUS_GITHUB_LABELS } from "@/features/automation/automation-status.parser";
import {
  AUTOMATION_COMMENT_FETCH_CONCURRENCY,
  isRecoverableGitHubLookupError,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import { AutomationGitHubRequestError } from "@/features/automation/automation-github.types";
import { fetchAutomationIssues } from "@/features/automation/automation-github.loader";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("automation async utilities", () => {
  it("treats 403, 429, and 5xx as recoverable lookup errors", () => {
    assert.equal(isRecoverableGitHubLookupError(new AutomationGitHubRequestError("forbidden", 403)), true);
    assert.equal(isRecoverableGitHubLookupError(new AutomationGitHubRequestError("rate limit", 429)), true);
    assert.equal(isRecoverableGitHubLookupError(new AutomationGitHubRequestError("server", 503)), true);
    assert.equal(isRecoverableGitHubLookupError(new AutomationGitHubRequestError("not found", 404)), false);
  });

  it("limits concurrent workers", async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    assert.equal(maxActive, 2);
  });

  describe("comment lookup partial failure", () => {
    beforeEach(() => {
      process.env.GITHUB_AUTOMATION_READ_TOKEN = "test-token";
      process.env.GITHUB_AUTOMATION_REPO = "hoangthang1209-byte/attd.vn";
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
      delete process.env.GITHUB_AUTOMATION_REPO;
    });

    it("continues loading when a secondary comment lookup fails", async () => {
      let concurrentCommentRequests = 0;
      let maxConcurrentCommentRequests = 0;

      globalThis.fetch = async (input) => {
        const url = decodeURIComponent(String(input));

        if (url.includes("/search/issues")) {
          if (url.includes("is:open")) {
            return jsonResponse({
              total_count: 3,
              items: [11, 12, 13].map((number) => ({
                number,
                title: `Task ${number}`,
                state: "open" as const,
                html_url: `https://github.com/hoangthang1209-byte/attd.vn/issues/${number}`,
                updated_at: "2026-09-20T12:00:00.000Z",
                closed_at: null,
                labels: [{ name: "status:building" }],
              })),
            });
          }
          return jsonResponse({ total_count: 0, items: [] });
        }

        if (url.includes("/comments")) {
          concurrentCommentRequests += 1;
          maxConcurrentCommentRequests = Math.max(
            maxConcurrentCommentRequests,
            concurrentCommentRequests,
          );
          await new Promise((resolve) => setTimeout(resolve, 10));
          concurrentCommentRequests -= 1;

          if (url.includes("/issues/12/comments")) {
            return jsonResponse({ message: "rate limit" }, 403);
          }

          return jsonResponse([{ user: { login: "owner" }, body: "ok", created_at: "2026-09-20T12:00:00.000Z" }]);
        }

        return jsonResponse({}, 404);
      };

      const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
      assert.equal(result.issues.length, 3);
      assert.ok(maxConcurrentCommentRequests <= AUTOMATION_COMMENT_FETCH_CONCURRENCY);
      assert.equal(result.issues.find((issue) => issue.number === 12)?.comments.length, 0);
      assert.equal(result.issues.find((issue) => issue.number === 11)?.comments.length, 1);
    });
  });
});
