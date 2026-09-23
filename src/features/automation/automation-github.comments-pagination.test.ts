import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AUTOMATION_STATUS_GITHUB_LABELS } from "@/features/automation/automation-status.parser";
import { fetchAutomationIssues } from "@/features/automation/automation-github.loader";
import { mapIssueToTask } from "@/features/automation/automation-task.aggregation";
import type { GitHubIssuePayload } from "@/features/automation/automation-github.types";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("automation GitHub read-path BUILD_APPROVED pagination", () => {
  beforeEach(() => {
    process.env.GITHUB_AUTOMATION_READ_TOKEN = "test-token";
    process.env.GITHUB_AUTOMATION_REPO = "hoangthang1209-byte/attd.vn";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
    delete process.env.GITHUB_AUTOMATION_REPO;
  });

  it("detects BUILD_APPROVED beyond the first 100 comments on the read path", async () => {
    let commentPageRequests = 0;

    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({
          total_count: 1,
          items: [
            {
              number: 118,
              title: "Long comment thread task",
              state: "open" as const,
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/118",
              updated_at: "2026-09-20T12:00:00.000Z",
              closed_at: null,
              labels: [{ name: "status:backlog" }],
            },
          ],
        });
      }

      if (url.includes("/search/issues")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/issues/118/comments")) {
        commentPageRequests += 1;
        const page = Number(new URL(url).searchParams.get("page") ?? "1");
        if (page === 1) {
          return jsonResponse(
            Array.from({ length: 100 }, (_, index) => ({
              user: { login: "owner" },
              body: `comment-${index}`,
              created_at: "2026-01-01T00:00:00Z",
            })),
          );
        }
        return jsonResponse([
          {
            user: { login: "owner" },
            body: "BUILD_APPROVED",
            created_at: "2026-01-02T00:00:00Z",
          },
        ]);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0]?.number, 118);
    assert.equal(result.issues[0]?.comments.some((comment) => comment.body === "BUILD_APPROVED"), true);
    assert.equal(commentPageRequests, 2);

    const task = mapIssueToTask(result.issues[0] as GitHubIssuePayload);
    assert.equal(task.hasBuildApproved, true);
  });

  it("stops paginating read-path comments once BUILD_APPROVED is found", async () => {
    let commentPageRequests = 0;

    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/search/issues") && url.includes("is:open")) {
        return jsonResponse({
          total_count: 1,
          items: [
            {
              number: 200,
              title: "Early approval task",
              state: "open" as const,
              html_url: "https://github.com/hoangthang1209-byte/attd.vn/issues/200",
              updated_at: "2026-09-20T12:00:00.000Z",
              closed_at: null,
              labels: [{ name: "status:backlog" }],
            },
          ],
        });
      }

      if (url.includes("/search/issues")) {
        return jsonResponse({ total_count: 0, items: [] });
      }

      if (url.includes("/issues/200/comments")) {
        commentPageRequests += 1;
        const page = Number(new URL(url).searchParams.get("page") ?? "1");
        if (page === 1) {
          return jsonResponse([
            {
              user: { login: "owner" },
              body: "TASK_AREA: Automation Platform",
              created_at: "2026-01-01T00:00:00Z",
            },
            {
              user: { login: "owner" },
              body: "BUILD_APPROVED",
              created_at: "2026-01-02T00:00:00Z",
            },
          ]);
        }
        throw new Error(`unexpected comment page ${page}`);
      }

      return jsonResponse({}, 404);
    };

    const result = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);
    assert.equal(result.issues[0]?.comments.some((comment) => comment.body === "BUILD_APPROVED"), true);
    assert.equal(commentPageRequests, 1);
  });
});
