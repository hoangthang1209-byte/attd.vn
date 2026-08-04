import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  healthColor,
  humanAiStatus,
  humanField,
  humanModule,
  qualityStars,
  toUsageCard,
} from "@/features/media/workspace-ux";

describe("Sprint 15.0 workspace UX helpers", () => {
  it("humanizes technical AI statuses", () => {
    assert.equal(humanAiStatus("NOT_PROCESSED"), "Chưa phân tích");
    assert.equal(humanAiStatus("COMPLETED"), "Đã phân tích");
  });

  it("maps modules and fields for usage cards", () => {
    assert.equal(humanModule("PRODUCT"), "Sản phẩm");
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
    assert.equal(card.statusLabel, "PUBLISHED");
  });

  it("color-codes health and stars", () => {
    assert.equal(healthColor(90), "#15803d");
    assert.equal(healthColor(30), "#b91c1c");
    assert.equal(qualityStars(92), "★★★★★");
    assert.equal(qualityStars(40), "★★☆☆☆");
  });
});
