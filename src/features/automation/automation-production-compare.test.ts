import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { compareCommitsSafe } from "@/features/automation/automation-github.loader";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("automation production compare API", () => {
  beforeEach(() => {
    process.env.GITHUB_AUTOMATION_READ_TOKEN = "test-token";
    process.env.GITHUB_AUTOMATION_REPO = "hoangthang1209-byte/attd.vn";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
    delete process.env.GITHUB_AUTOMATION_REPO;
  });

  it("returns compare status from GitHub", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("/compare/merge111...prod999")) {
        return jsonResponse({ status: "ahead" });
      }
      return jsonResponse({ message: "not found" }, 404);
    };

    const status = await compareCommitsSafe("merge111", "prod999");
    assert.equal(status, "ahead");
  });

  it("returns null when compare lookup fails recoverably", async () => {
    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("/compare/merge111...prod999")) {
        return jsonResponse({ message: "rate limit" }, 429);
      }
      return jsonResponse({ message: "not found" }, 404);
    };

    const status = await compareCommitsSafe("merge111", "prod999");
    assert.equal(status, null);
  });
});
