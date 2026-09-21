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
});
