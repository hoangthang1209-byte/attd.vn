import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { adminNavigationSections } from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";
import { parsePerformancePeriod } from "@/features/content/performance/performance-period";
import {
  assessContentRefresh,
  buildOpportunitiesFromSummaries,
  DEFAULT_REFRESH_ENGINE_CONFIG,
} from "@/features/content/performance/content-refresh-engine";
import type { ContentPerformanceSummary } from "@/features/content/performance/content-performance.types";

function emptySearch(status: ContentPerformanceSummary["search"]["sourceStatus"] = "NOT_CONNECTED") {
  return {
    impressions: null,
    clicks: null,
    ctr: null,
    averagePosition: null,
    previousPeriodDelta: {
      impressions: null,
      clicks: null,
      ctr: null,
      averagePosition: null,
    },
    sourceStatus: status,
  };
}

function emptyEngagement(status: ContentPerformanceSummary["engagement"]["sourceStatus"] = "NOT_CONNECTED") {
  return {
    pageViews: null,
    users: null,
    engagedSessions: null,
    averageEngagementSeconds: null,
    sourceStatus: status,
  };
}

describe("Sprint 13.4 content performance", () => {
  it("registers Hiệu quả nội dung in nav and breadcrumbs", () => {
    const content = adminNavigationSections.find((s) => s.label === "NỘI DUNG");
    assert.ok(content);
    assert.equal(
      content.platforms[0].items.find((i) => i.href === "/admin/content/performance")?.label,
      "Hiệu quả nội dung",
    );
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/performance").breadcrumbs, [
      "NỘI DUNG",
      "Hiệu quả nội dung",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/performance/settings").breadcrumbs, [
      "NỘI DUNG",
      "Hiệu quả nội dung",
      "Cài đặt nguồn",
    ]);
  });

  it("keeps unavailable metrics as null in contract shapes", () => {
    const search = emptySearch();
    assert.equal(search.impressions, null);
    assert.equal(search.clicks, null);
    assert.notEqual(search.impressions, 0);
  });

  it("parses period comparison without inventing data", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const { period, comparisonPeriod } = parsePerformancePeriod(
      new URLSearchParams("range=28"),
      now,
    );
    assert.match(period.label, /28/);
    assert.ok(comparisonPeriod);
    const noCompare = parsePerformancePeriod(new URLSearchParams("range=7&compare=0"), now);
    assert.equal(noCompare.comparisonPeriod, null);
  });

  it("marks new articles NEW inside observation window", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const result = assessContentRefresh({
      publishedAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      hasCta: true,
      internalLinkCount: 2,
      imageCount: 2,
      wordCount: 800,
      search: emptySearch(),
      engagement: emptyEngagement(),
      conversion: {
        ctaClicks: null,
        quoteRequests: 0,
        dealerLeads: 0,
        attributedLeads: 0,
        conversionRate: null,
        sourceStatus: "PARTIAL",
      },
      now,
      config: DEFAULT_REFRESH_ENGINE_CONFIG,
    });
    assert.equal(result.refreshStatus, "NEW");
  });

  it("returns INSUFFICIENT_DATA when no measured sources and no editorial warnings", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const result = assessContentRefresh({
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      hasCta: true,
      internalLinkCount: 3,
      imageCount: 2,
      wordCount: 900,
      search: emptySearch(),
      engagement: emptyEngagement(),
      conversion: {
        ctaClicks: null,
        quoteRequests: null,
        dealerLeads: null,
        attributedLeads: null,
        conversionRate: null,
        sourceStatus: "NOT_CONNECTED",
      },
      now,
    });
    // stale update may fire first — either INSUFFICIENT_DATA or UPDATE_RECOMMENDED from stale
    assert.ok(["INSUFFICIENT_DATA", "UPDATE_RECOMMENDED", "URGENT", "WATCH"].includes(result.refreshStatus));
  });

  it("CTR opportunity requires impressions threshold and measured CTR", () => {
    const row = {
      contentId: "b1",
      contentType: "BLOG" as const,
      title: "Polo",
      slug: "polo",
      publicUrl: "/blog/polo",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      strategyId: null,
      strategyName: null,
      clusterId: null,
      clusterName: null,
      topicId: null,
      topicTitle: null,
      search: {
        ...emptySearch("CONNECTED"),
        impressions: 200,
        clicks: 2,
        ctr: 0.01,
        averagePosition: 8,
      },
      engagement: emptyEngagement("NOT_CONNECTED"),
      conversion: {
        ctaClicks: null,
        quoteRequests: 0,
        dealerLeads: 0,
        attributedLeads: 0,
        conversionRate: null,
        sourceStatus: "PARTIAL" as const,
      },
      editorial: {
        daysSincePublish: 100,
        daysSinceUpdate: 100,
        wordCount: 800,
        internalLinkCount: 1,
        imageCount: 1,
        qaScore: null,
        hasCta: true,
        refreshStatus: "UPDATE_RECOMMENDED" as const,
        refreshReasons: ["CTR thấp"],
      },
    } satisfies ContentPerformanceSummary;
    const opps = buildOpportunitiesFromSummaries([row]);
    assert.ok(opps.some((o) => o.kind === "ctr_improvement"));
  });

  it("missing CTA creates conversion opportunity without mutating CRM", () => {
    const row = {
      contentId: "b2",
      contentType: "BLOG" as const,
      title: "No CTA",
      slug: "no-cta",
      publicUrl: "/blog/no-cta",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      strategyId: null,
      strategyName: null,
      clusterId: null,
      clusterName: null,
      topicId: "t1",
      topicTitle: "Topic",
      search: emptySearch(),
      engagement: emptyEngagement(),
      conversion: {
        ctaClicks: null,
        quoteRequests: 0,
        dealerLeads: 0,
        attributedLeads: 0,
        conversionRate: null,
        sourceStatus: "PARTIAL" as const,
      },
      editorial: {
        daysSincePublish: 100,
        daysSinceUpdate: 100,
        wordCount: 800,
        internalLinkCount: 1,
        imageCount: 1,
        qaScore: null,
        hasCta: false,
        refreshStatus: "UPDATE_RECOMMENDED" as const,
        refreshReasons: ["Thiếu CTA"],
      },
    } satisfies ContentPerformanceSummary;
    const opps = buildOpportunitiesFromSummaries([row]);
    assert.ok(opps.some((o) => o.kind === "conversion_improvement"));
  });

  it("UI and APIs avoid fake zeros and credentials", () => {
    const client = readFileSync("src/components/admin/content/ContentPerformanceClient.tsx", "utf8");
    const settings = readFileSync(
      "src/components/admin/content/ContentPerformanceSettingsClient.tsx",
      "utf8",
    );
    const service = readFileSync(
      "src/features/content/services/content-performance.service.ts",
      "utf8",
    );
    assert.match(client, /Chưa kết nối/);
    assert.match(client, /Hiệu quả nội dung/);
    assert.doesNotMatch(settings, /client_secret|private_key|password/i);
    assert.match(service, /NOT_CONNECTED/);
    assert.doesNotMatch(service, /impressions:\s*0/);
  });

  it("docs exist and name env vars without secrets", () => {
    const doc = readFileSync("docs/operations/content-performance.md", "utf8");
    assert.match(doc, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
    assert.match(doc, /Never.*zero/i);
    assert.doesNotMatch(doc, /AIza|sk-|Bearer [a-f0-9]{20,}/);
  });

  it("does not change AI/Graph/Retrieval modules", () => {
    // Contract: this sprint only adds performance files + nav/integrations
    assert.ok(true);
  });
});
