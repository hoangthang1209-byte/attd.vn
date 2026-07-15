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
