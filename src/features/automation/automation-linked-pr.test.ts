import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fetchLinkedPullRequestSafe } from "@/features/automation/automation-github.loader";

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

  it("returns null when linked PR timeline lookup fails with 403", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/issues/42/timeline")) {
        return jsonResponse({ message: "forbidden" }, 403);
      }

      return jsonResponse({}, 404);
    };

    const linkedPullRequest = await fetchLinkedPullRequestSafe(42);
    assert.equal(linkedPullRequest, null);
  });

  it("returns null when linked PR timeline lookup fails with 429", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/issues/43/timeline")) {
        return jsonResponse({ message: "rate limit" }, 429);
      }

      return jsonResponse({}, 404);
    };

    const linkedPullRequest = await fetchLinkedPullRequestSafe(43);
    assert.equal(linkedPullRequest, null);
  });

  const timelineWithLinkedPull = [
    {
      event: "cross-referenced",
      source: {
        issue: {
          number: 99,
          title: "Linked automation PR",
          html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/99",
          state: "open",
          updated_at: "2026-09-21T00:00:00.000Z",
          pull_request: { url: "https://api.github.com/repos/hoangthang1209-byte/attd.vn/pulls/99" },
        },
      },
    },
  ];

  for (const status of [404, 429, 503] as const) {
    it(`returns timeline candidate without merge metadata when pull detail fails with ${status}`, async () => {
      globalThis.fetch = async (input) => {
        const url = decodeURIComponent(String(input));

        if (url.includes("/issues/44/timeline")) {
          return jsonResponse(timelineWithLinkedPull);
        }

        if (url.includes("/pulls/99")) {
          return jsonResponse({ message: "pull detail unavailable" }, status);
        }

        return jsonResponse({}, 404);
      };

      const linkedPullRequest = await fetchLinkedPullRequestSafe(44);
      assert.notEqual(linkedPullRequest, null);
      assert.equal(linkedPullRequest?.number, 99);
      assert.equal(linkedPullRequest?.title, "Linked automation PR");
      assert.equal(
        linkedPullRequest?.url,
        "https://github.com/hoangthang1209-byte/attd.vn/pull/99",
      );
      assert.equal(linkedPullRequest?.mergedAt, null);
    });
  }
});
