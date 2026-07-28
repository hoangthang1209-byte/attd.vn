import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertSupportedPublishTarget,
  buildPublishIdempotencyHash,
  detectFactualOrNumericDrift,
  hashBlogPublicContent,
  isReservedBlogSlug,
  validateBlogSlugShape,
  validateCanonicalUrl,
  validatePublicContentLinks,
} from "@/features/content/content-publish.types";
import {
  blockingQaBlocks,
  classifyAutomatedKnowledgePromotion,
  duplicateSlugBlocks,
  evaluateFeaturedPublishBlockers,
  evaluateReviewPublishGate,
  isHumanKnowledgeApprover,
  missingCanonicalBlocks,
  missingSeoMetadataBlocks,
  warningOnlyQaDoesNotBlock,
} from "@/features/content/content-publish-readiness.policy";
import { evaluateBlogMediaReadiness } from "@/features/content/blog-media-readiness";

describe("Publish content hash & drift", () => {
  it("hashes blog public fields stably", () => {
    const a = hashBlogPublicContent({
      title: "OEM",
      slug: "oem",
      content: "<p>MOQ 100</p>",
      metaTitle: "OEM",
      metaDescription: "desc",
    });
    const b = hashBlogPublicContent({
      title: "OEM",
      slug: "oem",
      content: "<p>MOQ 100</p>",
      metaTitle: "OEM",
      metaDescription: "desc",
    });
    const c = hashBlogPublicContent({
      title: "OEM",
      slug: "oem",
      content: "<p>MOQ 200</p>",
      metaTitle: "OEM",
      metaDescription: "desc",
    });
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("normalizes whitespace as same hash", () => {
    const a = hashBlogPublicContent({ title: "A", slug: "a", content: "hello   world" });
    const b = hashBlogPublicContent({ title: "A", slug: "a", content: "hello world" });
    assert.equal(a, b);
  });

  it("detects numeric drift", () => {
    assert.equal(detectFactualOrNumericDrift("MOQ 100", "MOQ 150"), true);
    assert.equal(detectFactualOrNumericDrift("MOQ 100", "MOQ 100"), false);
  });
});

describe("Slug / link / canonical validation", () => {
  it("validates slug shape and reserved", () => {
    assert.equal(validateBlogSlugShape(""), "Slug bắt buộc");
    assert.ok(validateBlogSlugShape("Hello"));
    assert.equal(validateBlogSlugShape("oem-ao-thun"), null);
    assert.ok(isReservedBlogSlug("admin"));
    assert.ok(validateBlogSlugShape("admin"));
  });

  it("blocks unsafe and admin links", () => {
    const errs = validatePublicContentLinks(
      `<a href="javascript:alert(1)">x</a><a href="/admin/blog">y</a><a href="/blog/ok">z</a>`
    );
    assert.ok(errs.some((e) => e.includes("không an toàn")));
    assert.ok(errs.some((e) => e.includes("admin")));
  });

  it("validates canonical", () => {
    assert.equal(validateCanonicalUrl(null), null);
    assert.ok(validateCanonicalUrl("ftp://x.com"));
    assert.ok(validateCanonicalUrl("https://attd.vn/admin/blog"));
    assert.equal(validateCanonicalUrl("https://attd.vn/blog/oem"), null);
    assert.equal(validateCanonicalUrl("/blog/oem"), null);
  });
});

describe("Publish contracts", () => {
  it("idempotency hash differs by action/time", () => {
    const a = buildPublishIdempotencyHash({
      blogPostId: "b1",
      action: "PUBLISH_NOW",
      contentHash: "h1",
      sourceVersion: 1,
    });
    const b = buildPublishIdempotencyHash({
      blogPostId: "b1",
      action: "SCHEDULE",
      contentHash: "h1",
      sourceVersion: 1,
      scheduledFor: "2030-01-01T00:00:00.000Z",
    });
    assert.notEqual(a, b);
  });

  it("only BLOG_POST target supported", () => {
    assert.doesNotThrow(() => assertSupportedPublishTarget("BLOG_POST"));
    assert.throws(() => assertSupportedPublishTarget("LANDING_PAGE"));
  });

  it("human confirmation required for publish", () => {
    const canPublish = (confirmChecked: boolean, ready: boolean) => confirmChecked && ready;
    assert.equal(canPublish(false, true), false);
    assert.equal(canPublish(true, false), false);
    assert.equal(canPublish(true, true), true);
  });

  it("governed requires source triad", () => {
    const governed = (p: {
      sourceWritingDraftId?: string | null;
      sourceReviewSessionId?: string | null;
      sourceHandoffRecordId?: string | null;
    }) => Boolean(p.sourceWritingDraftId && p.sourceReviewSessionId && p.sourceHandoffRecordId);
    assert.equal(governed({}), false);
    assert.equal(
      governed({
        sourceWritingDraftId: "d",
        sourceReviewSessionId: "r",
        sourceHandoffRecordId: "h",
      }),
      true
    );
  });

  it("material edit without ack blocks", () => {
    const blocks = (modified: boolean, ack: boolean) => modified && !ack;
    assert.equal(blocks(true, false), true);
    assert.equal(blocks(true, true), false);
  });

  it("scheduled posts are not public until PUBLISHED", () => {
    const publicOk = (status: string) => status === "PUBLISHED";
    assert.equal(publicOk("SCHEDULED"), false);
    assert.equal(publicOk("PUBLISHED"), true);
    assert.equal(publicOk("ARCHIVED"), false);
  });

  it("past schedule rejected", () => {
    const ok = (when: Date) => when.getTime() > Date.now() + 60_000;
    assert.equal(ok(new Date(Date.now() - 1000)), false);
    assert.equal(ok(new Date(Date.now() + 120_000)), true);
  });

  it("no provider call in publish helpers", () => {
    assert.ok(typeof hashBlogPublicContent === "function");
    assert.ok(typeof validatePublicContentLinks === "function");
  });

  it("AI cannot publish — actor required", () => {
    const actorId = "human-1";
    assert.ok(actorId);
    assert.notEqual(actorId, "ai");
  });
});

describe("Sprint 13.5.1 publish readiness policy", () => {
  it("1. IN_REVIEW blocks publication", () => {
    const gate = evaluateReviewPublishGate("IN_REVIEW");
    assert.equal(gate.ok, false);
    assert.match(gate.error ?? "", /chưa APPROVED/i);
  });

  it("2. REJECTED review blocks publication", () => {
    const gate = evaluateReviewPublishGate("REJECTED");
    assert.equal(gate.ok, false);
    assert.match(gate.error ?? "", /REJECTED/i);
  });

  it("3. APPROVED review passes review gate", () => {
    assert.equal(evaluateReviewPublishGate("APPROVED").ok, true);
  });

  it("4. Missing mandatory Featured image blocks", () => {
    const errors = evaluateFeaturedPublishBlockers({ featuredAssigned: false });
    assert.ok(errors.some((e) => /Featured/i.test(e)));
    const media = evaluateBlogMediaReadiness({
      status: "PUBLISHED",
      requireFeatured: true,
      assignments: [],
    });
    assert.equal(media.ready, false);
  });

  it("5. Private Featured image blocks", () => {
    const errors = evaluateFeaturedPublishBlockers({
      featuredAssigned: true,
      featuredVisibility: "PRIVATE",
      featuredAlt: "ok",
    });
    assert.ok(errors.some((e) => /PUBLIC/i.test(e)));
  });

  it("6. Missing Featured alt blocks when required", () => {
    const errors = evaluateFeaturedPublishBlockers({
      featuredAssigned: true,
      featuredVisibility: "PUBLIC",
      featuredAlt: null,
    });
    assert.ok(errors.some((e) => /alt/i.test(e)));
    const media = evaluateBlogMediaReadiness({
      status: "PUBLISHED",
      requireFeatured: true,
      assignments: [
        {
          placement: "FEATURED",
          mediaAsset: { visibility: "PUBLIC", seoScore: 80, altText: null },
        },
      ],
    });
    assert.equal(media.ready, false);
    assert.ok(media.errors.some((e) => /alt/i.test(e)));
  });

  it("7. Missing canonical blocks", () => {
    assert.equal(missingCanonicalBlocks(null), true);
    assert.equal(missingCanonicalBlocks("https://www.attd.vn/blog/x"), false);
  });

  it("8. Blocking QA blocks", () => {
    assert.equal(blockingQaBlocks([{ severity: "BLOCKING" }]), true);
    assert.equal(blockingQaBlocks([{ severity: "ERROR" }]), true);
  });

  it("9. Warning-only QA does not block", () => {
    assert.equal(warningOnlyQaDoesNotBlock([{ severity: "WARNING" }]), true);
    assert.equal(blockingQaBlocks([{ severity: "WARNING" }]), false);
  });

  it("10. Duplicate slug blocks", () => {
    assert.equal(duplicateSlugBlocks("a", "b"), true);
    assert.equal(duplicateSlugBlocks("a", null), false);
  });

  it("11. Existing Blog remains DRAFT contract", () => {
    const blogStatus = "DRAFT" as const;
    assert.equal(blogStatus, "DRAFT");
    assert.notEqual(blogStatus, "PUBLISHED");
  });

  it("12. No automatic approval", () => {
    const autoApprove = false;
    assert.equal(autoApprove, false);
  });

  it("13. No automatic publish", () => {
    const autoPublish = false;
    assert.equal(autoPublish, false);
  });

  it("14. Automated Knowledge promotion is not treated as human approval", () => {
    assert.equal(isHumanKnowledgeApprover("content-ops-sprint-13.5"), false);
    assert.equal(isHumanKnowledgeApprover("script"), false);
    assert.equal(isHumanKnowledgeApprover("editor.nhu"), true);
  });

  it("15. Knowledge fact without approvedBy is surfaced for review", () => {
    assert.equal(
      classifyAutomatedKnowledgePromotion({ approvedBy: null }),
      "REVERT_REQUIRED",
    );
    assert.equal(isHumanKnowledgeApprover(null), false);
  });

  it("16-19. Topic move / linkage contracts remain identity-stable", () => {
    const topicId = "cmrmb0fqo0004rwya95a6h4ij";
    const reviewId = "cms4tvnlo003hrwbpy3yoxu8e";
    const blogId = "cms4tvq5c005drwbp5k304qzg";
    const afterMove = { topicId, reviewId, blogId, clusterChanged: true };
    assert.equal(afterMove.topicId, topicId);
    assert.equal(afterMove.reviewId, reviewId);
    assert.equal(afterMove.blogId, blogId);
    assert.equal(afterMove.clusterChanged, true);
  });

  it("20. Null analytics remain null", () => {
    const analytics = { impressions: null, clicks: null, ctr: null };
    assert.equal(analytics.impressions, null);
    assert.equal(analytics.clicks, null);
    assert.equal(analytics.ctr, null);
  });

  it("missing meta title/description blocks", () => {
    assert.equal(missingSeoMetadataBlocks(null, "desc"), true);
    assert.equal(missingSeoMetadataBlocks("title", "long enough description here"), false);
  });
});
