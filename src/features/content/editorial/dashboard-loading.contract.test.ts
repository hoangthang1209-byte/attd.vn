import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { readFileSync } from "node:fs";
import {
  DashboardFetchError,
  fetchDashboardJson,
  isDashboardLoadingSettled,
  sectionFromFetchResult,
  type DashboardFetchResult,
  type SectionLoadState,
} from "@/features/content/editorial/dashboard-fetch";

describe("Sprint 13.1.1 content dashboard loading recovery", () => {
  it("maps successful fetch to ready and empty correctly", () => {
    const ready = sectionFromFetchResult(
      { ok: true, data: { counts: { totalTopics: 0 } }, durationMs: 10 },
      () => false,
    );
    assert.equal(ready.status, "ready");

    const empty = sectionFromFetchResult(
      { ok: true, data: [] as string[], durationMs: 5 },
      (rows) => rows.length === 0,
    );
    assert.equal(empty.status, "empty");
  });

  it("maps HTTP/timeout failures to error and never leaves loading", () => {
    const httpFail: DashboardFetchResult<unknown> = {
      ok: false,
      error: new DashboardFetchError("server", "http", 500),
      durationMs: 12,
    };
    const timeoutFail: DashboardFetchResult<unknown> = {
      ok: false,
      error: new DashboardFetchError("timeout", "timeout"),
      durationMs: 12_001,
    };
    assert.equal(sectionFromFetchResult(httpFail, () => false).status, "error");
    assert.equal(sectionFromFetchResult(timeoutFail, () => false).status, "error");
  });

  it("treats zero counts as settled ready, not loading", () => {
    const core: SectionLoadState<{ counts: { totalTopics: number } }> = {
      status: "ready",
      data: { counts: { totalTopics: 0 } },
    };
    const reviews: SectionLoadState<unknown[]> = { status: "empty" };
    const publishing: SectionLoadState<unknown> = { status: "empty" };
    assert.equal(isDashboardLoadingSettled(core, reviews, publishing), true);
  });

  it("optional section error does not keep overall loading unsettled once others ready", () => {
    const core: SectionLoadState<unknown> = { status: "ready", data: {} };
    const reviews: SectionLoadState<unknown> = {
      status: "error",
      message: "Chưa tải được dữ liệu kiểm duyệt.",
    };
    const publishing: SectionLoadState<unknown> = { status: "ready", data: {} };
    assert.equal(isDashboardLoadingSettled(core, reviews, publishing), true);
  });

  it("schema mismatch becomes parse error, not infinite loading", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () =>
      new Response(JSON.stringify({ dashboard: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    try {
      const result = await fetchDashboardJson("/api/content/seo/dashboard", {
        timeoutMs: 1000,
        validate: (json) => {
          const body = json as { dashboard?: unknown };
          if (!body.dashboard) throw new Error("Thiếu dữ liệu dashboard.");
          return body.dashboard;
        },
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error.kind, "parse");
        assert.match(result.error.message, /dashboard/i);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("HTTP 500 clears into explicit error result", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () =>
      new Response(JSON.stringify({ message: "boom" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    try {
      const result = await fetchDashboardJson("/api/content/seo/dashboard", { timeoutMs: 1000 });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error.kind, "http");
        assert.equal(result.error.status, 500);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("timeout returns timeout kind", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      return await new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(
            new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }, 200);
        init?.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }) as typeof fetch;

    try {
      const result = await fetchDashboardJson("/api/content/seo/dashboard", { timeoutMs: 20 });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.kind, "timeout");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("auth 401/403 becomes explicit http error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () =>
      new Response(JSON.stringify({ message: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    try {
      const result = await fetchDashboardJson("/api/content/seo/dashboard", { timeoutMs: 1000 });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error.kind, "http");
        assert.equal(result.error.status, 403);
        assert.match(result.error.message, /quyền/i);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("abort on signal does not throw and returns abort kind", async () => {
    const controller = new AbortController();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          setTimeout(() => {
            controller.abort();
            reject(new DOMException("Aborted", "AbortError"));
          }, 5);
        }),
    ) as typeof fetch;

    try {
      const result = await fetchDashboardJson("/api/content/seo/dashboard", {
        signal: controller.signal,
        timeoutMs: 1000,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.kind, "abort");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("dashboard client no longer keys load effect on unstable toast identity", () => {
    const source = readFileSync("src/components/admin/seo-content/SeoDashboardClient.tsx", "utf8");
    assert.doesNotMatch(source, /\}, \[toast\]\);/);
    assert.match(source, /AbortController/);
    assert.match(source, /fetchDashboardJson/);
    assert.match(source, /Không tải được Content Dashboard/);
    assert.match(source, /Một số dữ liệu chưa tải được/);
    assert.match(source, /Chưa tải được dữ liệu kiểm duyệt/);
  });

  it("useAdminToast returns memoized stable identity", () => {
    const source = readFileSync("src/components/admin/AdminToastProvider.tsx", "utf8");
    assert.match(source, /useMemo/);
    assert.match(source, /stable toast API identity/i);
  });

  it("dashboard/reviews/publishing logs avoid content bodies and secrets", () => {
    const dash = readFileSync("src/app/api/content/seo/dashboard/route.ts", "utf8");
    const reviews = readFileSync("src/app/api/content/reviews/route.ts", "utf8");
    const publishing = readFileSync("src/app/api/content/publishing/route.ts", "utf8");
    for (const source of [dash, reviews, publishing]) {
      assert.match(source, /durationMs/);
      assert.doesNotMatch(source, /qaReport|articleBody|contentHtml|apiKey|secret/i);
    }
  });

  it("publishing queue summary selects card fields only (no full body)", () => {
    const source = readFileSync(
      "src/features/content/services/content-publishing.service.ts",
      "utf8",
    );
    assert.match(source, /listPublishingQueue/);
    // default/ready path must select title/slug, not omit select (which loads body)
    const defaultCase = source.slice(source.indexOf('default:'));
    assert.match(defaultCase, /select:\s*\{[\s\S]*title:\s*true/);
    assert.doesNotMatch(defaultCase.slice(0, 500), /contentHtml|bodyHtml|markdown/);
  });

  it("preserves editorial navigation dashboard entry", () => {
    const nav = readFileSync("src/lib/admin/admin-navigation.ts", "utf8");
    assert.match(nav, /href: "\/admin\/content\/seo"/);
    assert.match(nav, /label: "Dashboard"/);
  });
});
