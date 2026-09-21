import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fetchLinkedPullRequestSafe } from "@/features/automation/automation-github.loader";
import { resolveProductionDeploymentStatus } from "@/features/automation/automation-production";

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
      assert.equal(linkedPullRequest?.merged, false);
      assert.equal(linkedPullRequest?.mergedAt, null);
    });
  }

  it("does not infer merged from a closed timeline PR when pull detail fails", async () => {
    const closedUnmergedTimeline = [
      {
        event: "cross-referenced",
        source: {
          issue: {
            number: 100,
            title: "Closed but unmerged PR",
            html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/100",
            state: "closed",
            updated_at: "2026-09-21T00:00:00.000Z",
            pull_request: {
              url: "https://api.github.com/repos/hoangthang1209-byte/attd.vn/pulls/100",
            },
          },
        },
      },
    ];

    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/issues/45/timeline")) {
        return jsonResponse(closedUnmergedTimeline);
      }

      if (url.includes("/pulls/100")) {
        return jsonResponse({ message: "pull detail unavailable" }, 404);
      }

      return jsonResponse({}, 404);
    };

    const linkedPullRequest = await fetchLinkedPullRequestSafe(45);
    assert.notEqual(linkedPullRequest, null);
    assert.equal(linkedPullRequest?.state, "CLOSED");
    assert.equal(linkedPullRequest?.merged, false);
    assert.equal(linkedPullRequest?.mergedAt, null);
  });
});

describe("automation canonical linked PR resolution", () => {
  beforeEach(() => {
    process.env.GITHUB_AUTOMATION_READ_TOKEN = "test-token";
    process.env.GITHUB_AUTOMATION_REPO = "hoangthang1209-byte/attd.vn";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
    delete process.env.GITHUB_AUTOMATION_REPO;
  });

  it("prefers canonical merged PR over later open cross-reference for issue #85", async () => {
    const timeline = [
      {
        event: "closed",
        commit_id: "merge86sha0000000000000000000000000000",
      },
      {
        event: "cross-referenced",
        source: {
          issue: {
            number: 86,
            title: "Implement production status",
            html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/86",
            state: "closed",
            updated_at: "2026-09-19T10:00:00.000Z",
            pull_request: {
              url: "https://api.github.com/repos/hoangthang1209-byte/attd.vn/pulls/86",
            },
          },
        },
      },
      {
        event: "cross-referenced",
        source: {
          issue: {
            number: 88,
            title: "Repair follow-up",
            html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/88",
            state: "open",
            updated_at: "2026-09-21T12:00:00.000Z",
            pull_request: {
              url: "https://api.github.com/repos/hoangthang1209-byte/attd.vn/pulls/88",
            },
          },
        },
      },
    ];

    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/issues/85/timeline")) {
        return jsonResponse(timeline);
      }

      if (url.includes("/pulls/86")) {
        return jsonResponse({
          number: 86,
          title: "Implement production status",
          body: "Closes #85",
          html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/86",
          state: "closed",
          merged_at: "2026-09-19T10:00:00.000Z",
          updated_at: "2026-09-19T10:00:00.000Z",
          merge_commit_sha: "merge86sha0000000000000000000000000000",
          head: { sha: "head86sha" },
        });
      }

      if (url.includes("/pulls/88")) {
        return jsonResponse({
          number: 88,
          title: "Repair follow-up",
          body: "Follow-up for #85",
          html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/88",
          state: "open",
          merged_at: null,
          updated_at: "2026-09-21T12:00:00.000Z",
          merge_commit_sha: null,
          head: { sha: "head88sha" },
        });
      }

      return jsonResponse({}, 404);
    };

    const linkedPullRequest = await fetchLinkedPullRequestSafe(85);
    assert.notEqual(linkedPullRequest, null);
    assert.equal(linkedPullRequest?.number, 86);
    assert.equal(linkedPullRequest?.merged, true);
    assert.equal(
      linkedPullRequest?.mergeCommitSha,
      "merge86sha0000000000000000000000000000",
    );
  });

  it("uses canonical PR merge SHA for production status, not unrelated open PR", () => {
    const resolution = resolveProductionDeploymentStatus({
      productionCommitSha: "merge86sha0000000000000000000000000000",
      linkedPullRequest: {
        merged: true,
        mergeCommitSha: "merge86sha0000000000000000000000000000",
      },
      compareStatus: null,
    });

    assert.deepEqual(resolution, { status: "live", reason: null });
  });

  it("falls back to generic cross-reference when no closing PR exists", async () => {
    const timeline = [
      {
        event: "cross-referenced",
        source: {
          issue: {
            number: 90,
            title: "Generic reference",
            html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/90",
            state: "open",
            updated_at: "2026-09-21T12:00:00.000Z",
            pull_request: {
              url: "https://api.github.com/repos/hoangthang1209-byte/attd.vn/pulls/90",
            },
          },
        },
      },
    ];

    globalThis.fetch = async (input) => {
      const url = decodeURIComponent(String(input));

      if (url.includes("/issues/85/timeline")) {
        return jsonResponse(timeline);
      }

      if (url.includes("/pulls/90")) {
        return jsonResponse({
          number: 90,
          title: "Generic reference",
          body: "Related work",
          html_url: "https://github.com/hoangthang1209-byte/attd.vn/pull/90",
          state: "open",
          merged_at: null,
          updated_at: "2026-09-21T12:00:00.000Z",
          merge_commit_sha: null,
          head: { sha: "head90sha" },
        });
      }

      return jsonResponse({}, 404);
    };

    const linkedPullRequest = await fetchLinkedPullRequestSafe(85);
    assert.notEqual(linkedPullRequest, null);
    assert.equal(linkedPullRequest?.number, 90);
  });
});
