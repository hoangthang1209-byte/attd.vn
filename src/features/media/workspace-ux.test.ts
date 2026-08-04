import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHealthGroups,
  buildMetadataChecklist,
  buildWarningChecklist,
  healthColor,
  healthExplanation,
  healthLetterFromScore,
  humanAiStatus,
  humanField,
  humanLifecycle,
  humanModule,
  humanSimilarRelation,
  metadataCompletionPercent,
  qualityStars,
  resolvePrimaryTab,
  rightsHealthScore,
  toUsageCard,
} from "@/features/media/workspace-ux";

describe("Sprint 15.0 workspace UX helpers", () => {
  it("humanizes technical AI statuses", () => {
    assert.equal(humanAiStatus("NOT_PROCESSED"), "Chưa phân tích");
    assert.equal(humanAiStatus("COMPLETED"), "Đã phân tích");
  });

  it("maps modules and fields for usage cards", () => {
    assert.equal(humanModule("PRODUCT"), "Product");
    assert.equal(humanField("gallery"), "Gallery");
    assert.equal(humanField("oemMediaAssetId"), "OEM Hero");
  });

  it("builds usage cards from dependencies", () => {
    const card = toUsageCard({
      referenceType: "BLOG",
      referenceId: "p1",
      referenceLabel: "Polo guide",
      referenceUrl: "/admin/blog/p1",
      field: "content.data-media-id",
      relationMode: "STRUCTURED_MEDIA_ID",
      contentStatus: "PUBLISHED",
      publicImpact: true,
      blocking: true,
      replaceable: true,
    });
    assert.equal(card.moduleLabel, "Blog");
    assert.equal(card.placement, "Inline");
    assert.equal(card.statusLabel, "Published");
    assert.equal(card.statusTone, "published");
  });

  it("color-codes health and stars", () => {
    assert.equal(healthColor(90), "#15803d");
    assert.equal(healthColor(30), "#b91c1c");
    assert.equal(qualityStars(92), "★★★★★");
    assert.equal(qualityStars(40), "★★☆☆☆");
  });
});

describe("Sprint 15.1 workspace IA polish", () => {
  it("maps legacy sections to five primary tabs", () => {
    assert.equal(resolvePrimaryTab("overview"), "overview");
    assert.equal(resolvePrimaryTab("health"), "overview");
    assert.equal(resolvePrimaryTab("ai"), "overview");
    assert.equal(resolvePrimaryTab("usage"), "usage");
    assert.equal(resolvePrimaryTab("metadata"), "metadata");
    assert.equal(resolvePrimaryTab("similar"), "insights");
    assert.equal(resolvePrimaryTab("replacement"), "lifecycle");
    assert.equal(resolvePrimaryTab("rights"), "lifecycle");
    assert.equal(resolvePrimaryTab("timeline"), "lifecycle");
  });

  it("uses Vietnamese lifecycle labels", () => {
    assert.equal(humanLifecycle("ACTIVE"), "Đang sử dụng");
    assert.equal(humanLifecycle("REVIEW_REQUIRED"), "Cần xem lại");
    assert.equal(humanLifecycle("DEPRECATED"), "Không khuyến nghị");
    assert.equal(humanLifecycle("ARCHIVED"), "Đã lưu trữ");
  });

  it("explains letter grades and groups health", () => {
    assert.equal(healthLetterFromScore(92), "A+");
    assert.equal(healthLetterFromScore(48), "C");
    assert.match(
      healthExplanation({
        score: 48,
        letter: "C",
        issues: ["missing_alt"],
        missingAlt: true,
        missingCaption: true,
      }),
      /Quality C because/,
    );
    const groups = buildHealthGroups(
      {
        seo: 40,
        accessibility: 0,
        resolution: 80,
        crop: 70,
        alt: 0,
        caption: 0,
        duplicate: 100,
        visibility: 80,
        bundle: 50,
        suitability: 60,
        usage: 70,
        total: 48,
        grade: "poor",
        issues: ["missing_alt"],
      },
      rightsHealthScore("UNKNOWN", "PUBLIC"),
    );
    assert.equal(groups.length, 5);
    assert.equal(groups[0]?.label, "SEO");
    assert.equal(groups[0]?.tone, "red");
  });

  it("builds metadata completion checklist", () => {
    const items = buildMetadataChecklist({
      title: "Polo",
      altText: null,
      caption: "",
      keywords: [],
    });
    assert.equal(metadataCompletionPercent(items), 25);
    assert.equal(items.find((i) => i.id === "alt")?.done, false);
  });

  it("builds clickable warning checklist", () => {
    const warnings = buildWarningChecklist({
      missingAlt: true,
      missingCaption: true,
      unknownRightsPublic: true,
      seoBelow: true,
    });
    assert.equal(warnings.length, 4);
    assert.equal(warnings[0]?.tab, "metadata");
    assert.equal(warnings.find((w) => w.id === "rights")?.tab, "lifecycle");
  });

  it("relabels similar relations for editors", () => {
    assert.equal(humanSimilarRelation("SAME_PRODUCT"), "Same Product");
    assert.equal(humanSimilarRelation("SAME_ROLE"), "Same Angle");
    assert.equal(humanSimilarRelation("SAME_HASH"), "Same Session");
  });
});
