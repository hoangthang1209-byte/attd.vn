import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  APPROVED_REVIEW_BANNER,
  BLOG_OWNED_FIELDS,
  buildHandoffFailure,
  buildHandoffPlan,
  classifyHandoffField,
  faqAnswerToPlainText,
  hasManualEditRisk,
  HANDOFF_STAGE_LABELS,
  resolveBlogHandoffTarget,
  resolveReviewHandoffView,
  type BlogHandoffCandidate,
  type HandoffFieldName,
  type HandoffFieldPlan,
  type HandoffStage,
} from "@/features/content/editorial/blog-handoff.policy";

/** Production records this sprint must keep intact. */
const REVIEW_ID = "cms8i8s9a0004l00442kcxe2p";
const STALE_REVIEW_ID = "cms4tvnlo003hrwbpy3yoxu8e";
const BLOG_ID = "cms4tvq5c005drwbp5k304qzg";
const BLOG_SLUG = "huong-dan-chon-ao-polo-dong-phuc-cong-ty";
const DRAFT_ID = "cms4tvdas001yrwbp73t8lzlo";

const HANDOFF_SOURCE = readFileSync(
  path.join(process.cwd(), "src/features/content/services/writing-blog-handoff.service.ts"),
  "utf8",
);
const REVIEW_UI_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/admin/content/ContentReviewDetailClient.tsx"),
  "utf8",
);
const REVIEW_SERVICE_SOURCE = readFileSync(
  path.join(process.cwd(), "src/features/content/services/content-review.service.ts"),
  "utf8",
);
const READINESS_SOURCE = readFileSync(
  path.join(process.cwd(), "src/features/content/services/content-publish-readiness.service.ts"),
  "utf8",
);

function candidate(
  overrides: Partial<BlogHandoffCandidate> & Pick<BlogHandoffCandidate, "matchedBy">,
): BlogHandoffCandidate {
  return {
    blogPostId: BLOG_ID,
    slug: BLOG_SLUG,
    status: "DRAFT",
    ...overrides,
  };
}

function classify(
  field: HandoffFieldName,
  draftValue: string,
  blogValue: string,
  manualEditRisk = false,
): HandoffFieldPlan {
  return classifyHandoffField({ field, draftValue, blogValue, manualEditRisk });
}

function approvedView(
  blog: {
    id: string;
    status: string;
    sourceReviewSessionId: string | null;
    sourceHandoffRecordId?: string | null;
  } | null,
  blogPublishReady: boolean | null = null,
) {
  return resolveReviewHandoffView({
    reviewId: REVIEW_ID,
    reviewStatus: "APPROVED",
    blog,
    blogPublishReady,
  });
}

const LINKED_DRAFT_BLOG = {
  id: BLOG_ID,
  status: "DRAFT",
  sourceReviewSessionId: REVIEW_ID,
  sourceHandoffRecordId: "handoff-completed-1",
};

const LINKED_WITHOUT_HANDOFF = {
  id: BLOG_ID,
  status: "DRAFT",
  sourceReviewSessionId: REVIEW_ID,
  sourceHandoffRecordId: null,
};

describe("Sprint 13.5.5 — approved review → existing blog handoff", () => {
  it("1. APPROVED review does not render an approval blocker", () => {
    // The readiness builder no longer emits "trạng thái APPROVED — không thể phê duyệt".
    assert.match(
      REVIEW_SERVICE_SOURCE,
      /!isActiveReviewStatus\(session\.status\) && session\.status !== "APPROVED"/,
    );
    // And the red group banner is suppressed for the terminal success state.
    assert.match(REVIEW_UI_SOURCE, /\{!approved && groups\.length > 0 && \(/);
    const view = approvedView(LINKED_DRAFT_BLOG);
    assert.equal(view.terminal, true);
    assert.equal(view.successBanner?.title, "Đã phê duyệt");
    assert.equal(view.successBanner?.body, APPROVED_REVIEW_BANNER.body);
  });

  it("2. APPROVED review hides approve, bulk approve and per-section approval", () => {
    assert.match(REVIEW_UI_SOURCE, /\{!approved && \(\s*<section className="admin-sidebar-card"/);
    assert.match(REVIEW_UI_SOURCE, /\{!approved && \(\s*<div style=\{\{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 \}\}>/);
    // The Approve/Reject/Return panel is replaced wholesale by the terminal card.
    assert.match(REVIEW_UI_SOURCE, /\{approved \? \(\s*<section className="admin-sidebar-card"/);
    assert.match(REVIEW_UI_SOURCE, /admin-sidebar-title">Đã duyệt</);
  });

  it("3. APPROVED review exposes a Blog handoff CTA in every linkage state", () => {
    assert.equal(approvedView(null).ctaLabel, "Hoàn tất bàn giao sang Blog Draft");
    assert.equal(approvedView(null).ctaKind, "RUN_HANDOFF");
    // Linked to the Review but never formally handed off ⇒ still RUN_HANDOFF.
    assert.equal(approvedView(LINKED_WITHOUT_HANDOFF).ctaKind, "RUN_HANDOFF");
    assert.equal(approvedView(LINKED_WITHOUT_HANDOFF).state, "NEEDS_HANDOFF");
    assert.equal(approvedView(LINKED_DRAFT_BLOG).ctaLabel, "Mở Blog Draft");
    assert.equal(approvedView(LINKED_DRAFT_BLOG).ctaKind, "OPEN_BLOG");
  });

  it("4. An existing matching Blog is reused, never recreated", () => {
    const target = resolveBlogHandoffTarget({
      candidates: [candidate({ matchedBy: "TOPIC_LINK" }), candidate({ matchedBy: "SLUG" })],
    });
    assert.equal(target.decision, "REUSE");
    assert.equal(target.blogPostId, BLOG_ID);
    assert.equal(target.matchedBy, "TOPIC_LINK");
  });

  it("5. The existing Blog is relinked to the current Review", () => {
    assert.match(HANDOFF_SOURCE, /sourceReviewSessionId: review\.id/);
    // Linkage is written outside the conditional field sync, so a no-op content
    // plan still relinks.
    const updateBlock = HANDOFF_SOURCE.slice(
      HANDOFF_SOURCE.indexOf("const updateData: Prisma.BlogPostUpdateInput"),
      HANDOFF_SOURCE.indexOf('if (sync.has("title"))'),
    );
    assert.match(updateBlock, /sourceReviewSessionId: review\.id/);
    assert.match(updateBlock, /sourceHandoffRecordId: handoff\.id/);
  });

  it("6. A stale Review link is replaced and reported", () => {
    const view = approvedView({
      id: BLOG_ID,
      status: "DRAFT",
      sourceReviewSessionId: STALE_REVIEW_ID,
    });
    assert.equal(view.needsRelink, true);
    assert.equal(view.ctaKind, "RUN_HANDOFF");
    assert.match(HANDOFF_SOURCE, /relinkedFromReviewId/);
  });

  it("7. No duplicate Blog is created when a candidate exists", () => {
    const target = resolveBlogHandoffTarget({ candidates: [candidate({ matchedBy: "DRAFT_LINK" })] });
    assert.equal(target.decision, "REUSE");
    // The slug collision suffix that used to fabricate a near-duplicate is gone.
    assert.doesNotMatch(HANDOFF_SOURCE, /\$\{slug\}-\$\{draft\.version\}/);
    assert.match(HANDOFF_SOURCE, /const duplicateCreated = existingBlog \? blogCountAfter !== blogCountBefore : false/);
  });

  it("8. An exact slug match is reused when no editorial link exists", () => {
    const target = resolveBlogHandoffTarget({ candidates: [candidate({ matchedBy: "SLUG" })] });
    assert.equal(target.decision, "REUSE");
    assert.equal(target.matchedBy, "SLUG");
  });

  it("9. Multiple candidates block the handoff instead of guessing", () => {
    const target = resolveBlogHandoffTarget({
      candidates: [
        candidate({ matchedBy: "REVIEW_LINK" }),
        candidate({ matchedBy: "SLUG", blogPostId: "other-blog-id", slug: `${BLOG_SLUG}-2` }),
      ],
    });
    assert.equal(target.decision, "CONFLICT");
    assert.equal(target.blogPostId, null);
    assert.deepEqual(target.conflictIds, [BLOG_ID, "other-blog-id"]);
    assert.match(HANDOFF_SOURCE, /"BLOG_CONFLICT"/);
  });

  it("10. Repeated handoff is idempotent", () => {
    // Same review + draft + mode + target + fields ⇒ same snapshot hash ⇒ the
    // completed record is returned without another write.
    assert.match(HANDOFF_SOURCE, /status: "COMPLETED"[\s\S]{0,200}?existingCompleted/);
    assert.match(HANDOFF_SOURCE, /cacheHint: true/);
    assert.match(HANDOFF_SOURCE, /reused: true/);
    assert.match(HANDOFF_SOURCE, /Bàn giao đã hoàn tất trước đó/);
    // History is not duplicated on a repeat either.
    assert.match(HANDOFF_SOURCE, /const priorDecision = await prisma\.contentReviewDecision\.findFirst/);
    assert.match(HANDOFF_SOURCE, /if \(!priorDecision\) \{/);
  });

  it("11. The Blog stays DRAFT — handoff never sets a status", () => {
    const updateBlock = HANDOFF_SOURCE.slice(
      HANDOFF_SOURCE.indexOf("const updateData: Prisma.BlogPostUpdateInput"),
      HANDOFF_SOURCE.indexOf("await prisma.blogPost.update({ where: { id: existingBlog.id }"),
    );
    assert.doesNotMatch(updateBlock, /status:/);
    assert.doesNotMatch(updateBlock, /publishedAt/);
    // A newly created Blog is hardcoded to DRAFT.
    assert.match(HANDOFF_SOURCE, /status: "DRAFT",/);
  });

  it("12. publishedAt stays null and is verified after the write", () => {
    assert.match(HANDOFF_SOURCE, /verified\?\.publishedAt === null/);
    assert.match(HANDOFF_SOURCE, /verified\?\.status !== "PUBLISHED"/);
  });

  it("13. Manual Blog edits are never overwritten silently", () => {
    const plan = classify("content", "<p>approved</p>", "<p>edited by human</p>", true);
    assert.equal(plan.classification, "CONFLICT_REQUIRES_HUMAN");
    const built = buildHandoffPlan({ classifications: [plan] });
    assert.deepEqual(built.synchronized, []);
    assert.deepEqual(built.preserved, ["content"]);
    assert.equal(built.conflicts.length, 1);
    // Only an explicit human opt-in promotes a conflict to a write.
    const forced = buildHandoffPlan({ classifications: [plan], overwriteFields: ["content"] });
    assert.deepEqual(forced.synchronized, ["content"]);
    assert.equal(forced.conflicts.length, 0);
  });

  it("14. Governed fields synchronize when the Blog carries no manual edits", () => {
    assert.equal(classify("content", "<h2>new</h2>", "## old markdown").classification, "SAFE_TO_SYNC");
    assert.equal(classify("metaTitle", "meta", "").classification, "SAFE_TO_SYNC");
    assert.equal(classify("title", "same", "same").classification, "IN_SYNC");
    assert.equal(classify("metaDescription", "", "kept").classification, "KEEP_BLOG_VALUE");
    const built = buildHandoffPlan({
      classifications: [
        classify("title", "same", "same"),
        classify("content", "<h2>new</h2>", "## old"),
      ],
    });
    assert.deepEqual(built.synchronized, ["content"]);
    assert.deepEqual(built.preserved, ["title"]);
  });

  it("15. FAQ synchronizes as plain text, matching how it renders and is indexed", () => {
    assert.equal(faqAnswerToPlainText("<p>Thêu bền hơn.</p>"), "Thêu bền hơn.");
    assert.equal(faqAnswerToPlainText("<p>A</p><p>B</p>"), "A B");
    assert.equal(faqAnswerToPlainText("Giá &amp; số lượng"), "Giá & số lượng");
    assert.doesNotMatch(faqAnswerToPlainText("<p>x</p>"), /</);
    assert.match(HANDOFF_SOURCE, /answer: faqAnswerToPlainText\(f\.answerHtml\)/);
    // A draft/blog pair that differs only by markup is already in sync.
    assert.equal(classify("faq", "Q|A", "Q|A").classification, "IN_SYNC");
  });

  it("16. Featured and OG images stay linked — handoff never writes them", () => {
    for (const field of ["featuredImageUrl", "ogImageUrl", "canonicalUrl", "excerpt", "tags"]) {
      assert.ok(
        (BLOG_OWNED_FIELDS as readonly string[]).includes(field),
        `${field} must be Blog-owned`,
      );
    }
    const updateBlock = HANDOFF_SOURCE.slice(
      HANDOFF_SOURCE.indexOf("const updateData: Prisma.BlogPostUpdateInput"),
      HANDOFF_SOURCE.indexOf("await prisma.blogPost.update({ where: { id: existingBlog.id }"),
    );
    for (const field of ["featuredImageUrl", "ogImageUrl", "canonicalUrl", "excerpt", "tags", "slug"]) {
      assert.doesNotMatch(updateBlock, new RegExp(`${field}:`), `${field} must not be rewritten`);
    }
    // An existing media bundle is not swapped out either.
    assert.match(HANDOFF_SOURCE, /topic\.mediaBundleId && !existingBlog\.mediaBundleId/);
  });

  it("17. Source traceability is written on every handoff", () => {
    for (const field of [
      "sourceWritingDraftId: draft.id",
      "sourceWritingDraftVersion: draft.version",
      "sourceReviewSessionId: review.id",
      "sourceHandoffRecordId: handoff.id",
    ]) {
      assert.ok(HANDOFF_SOURCE.includes(field), `${field} must be written`);
    }
  });

  it("18. A handoff audit event is recorded without the article body", () => {
    const auditBlock = HANDOFF_SOURCE.slice(
      HANDOFF_SOURCE.indexOf('decisionType: "HANDOFF_TO_BLOG"'),
      HANDOFF_SOURCE.indexOf('stage = "verify"'),
    );
    for (const key of [
      "handoffId",
      "blogId",
      "writingDraftId",
      "draftVersion",
      "reusedExistingBlog",
      "relinkedFromReviewId",
    ]) {
      assert.match(auditBlock, new RegExp(key), `audit metadata must carry ${key}`);
    }
    assert.doesNotMatch(auditBlock, /contentHtml/, "audit must not copy the article body");
    assert.doesNotMatch(auditBlock, /renderedHtml/);
  });

  it("19. Readiness is recalculated as part of the handoff result", () => {
    assert.match(HANDOFF_SOURCE, /const readiness = await getContentPublishReadiness\(blogId\)/);
    assert.match(HANDOFF_SOURCE, /readiness,\n/);
  });

  it("20. An APPROVED Review satisfies the Blog publish review gate", () => {
    assert.match(READINESS_SOURCE, /evaluateReviewPublishGate/);
    const view = approvedView(LINKED_DRAFT_BLOG, true);
    assert.equal(view.state, "BLOG_READY");
    assert.equal(view.ctaLabel, "Sẵn sàng xuất bản — mở Blog Draft");
  });

  it("21. Warning-only issues do not block READY", () => {
    // Brief approval and OG image stay in the warnings bucket.
    assert.match(READINESS_SOURCE, /warnings\.push\([\s\S]{0,120}Brief chưa được human approve/);
    assert.match(READINESS_SOURCE, /warnings\.push\("Thiếu ảnh OG/);
    const view = approvedView(LINKED_DRAFT_BLOG, true);
    assert.equal(view.state, "BLOG_READY");
  });

  it("22. Missing media still blocks publish", () => {
    assert.match(READINESS_SOURCE, /assertBlogPublishMediaReady/);
    assert.match(READINESS_SOURCE, /checks\.mediaValid = false/);
    const view = approvedView(LINKED_DRAFT_BLOG, false);
    assert.equal(view.state, "BLOG_DRAFT");
    assert.equal(view.ctaLabel, "Mở Blog Draft");
  });

  it("23. A Blog pointing at an old Review asks for relink before anything else", () => {
    const view = approvedView(
      { id: BLOG_ID, status: "DRAFT", sourceReviewSessionId: STALE_REVIEW_ID },
      true,
    );
    // Even a "ready" Blog must be relinked first — readiness computed against
    // the wrong Review is not a green light.
    assert.equal(view.state, "NEEDS_HANDOFF");
    assert.equal(view.needsRelink, true);
  });

  it("24. A PUBLISHED Blog is never reset to DRAFT", () => {
    const view = approvedView({ id: BLOG_ID, status: "PUBLISHED", sourceReviewSessionId: REVIEW_ID });
    assert.equal(view.state, "BLOG_PUBLISHED");
    assert.equal(view.ctaKind, "OPEN_BLOG");
    assert.match(HANDOFF_SOURCE, /"PUBLISHED_PROTECTED"/);
    assert.match(HANDOFF_SOURCE, /existingBlog\?\.status === "PUBLISHED"/);
  });

  it("25. Handoff never publishes", () => {
    assert.doesNotMatch(HANDOFF_SOURCE, /status: "PUBLISHED"/);
    assert.doesNotMatch(HANDOFF_SOURCE, /publishedAt: new Date/);
    assert.doesNotMatch(HANDOFF_SOURCE, /publishBlogPost/);
  });

  it("26. Handoff never approves anything", () => {
    assert.doesNotMatch(HANDOFF_SOURCE, /contentReviewSession\.update/);
    assert.doesNotMatch(HANDOFF_SOURCE, /contentReviewSection\.update/);
    assert.doesNotMatch(HANDOFF_SOURCE, /writingDraftRecord\.update/);
    // Approval is a precondition it reads, never a state it writes.
    assert.match(HANDOFF_SOURCE, /review\.status !== "APPROVED"/);
    assert.match(HANDOFF_SOURCE, /"REVIEW_NOT_APPROVED"/);
  });

  it("27. No new Blog for the current article", () => {
    const target = resolveBlogHandoffTarget({
      candidates: [
        candidate({ matchedBy: "TOPIC_LINK" }),
        candidate({ matchedBy: "REVIEW_LINK" }),
        candidate({ matchedBy: "DRAFT_LINK" }),
        candidate({ matchedBy: "SLUG" }),
      ],
    });
    assert.equal(target.decision, "REUSE");
    assert.equal(target.blogPostId, BLOG_ID);
    // Creation only happens with zero candidates.
    assert.equal(resolveBlogHandoffTarget({ candidates: [] }).decision, "CREATE");
  });

  it("28. The current Blog ID and slug survive the handoff", () => {
    assert.match(
      HANDOFF_SOURCE,
      /verified\?\.id === existingBlog\.id && verified\?\.slug === existingBlog\.slug/,
    );
    const view = approvedView(LINKED_DRAFT_BLOG);
    assert.equal(view.state, "BLOG_DRAFT");
  });

  it("29. The Review CTA uses the real Blog admin route", () => {
    assert.match(HANDOFF_SOURCE, /adminRoute: `\/admin\/blog\/\$\{blogId\}`/);
    assert.match(HANDOFF_SOURCE, /adminRoute: `\/admin\/blog\/\$\{blog\.id\}`/);
    assert.doesNotMatch(HANDOFF_SOURCE, /\/admin\/content\/blog\//);
    assert.match(REVIEW_UI_SOURCE, /href=\{handoff\.blog\.adminRoute\}/);
  });

  it("30. Handoff touches no analytics, CRM, knowledge or product surface", () => {
    for (const forbidden of [
      "analytics",
      "crm",
      "knowledgeGraph",
      "knowledgeEntity",
      "product.update",
      "category.update",
      "expandKnowledge",
    ]) {
      assert.ok(!HANDOFF_SOURCE.includes(forbidden), `handoff must not touch ${forbidden}`);
    }
  });

  it("31. Errors are structured and actionable, never a bare failure", () => {
    const stages = Object.keys(HANDOFF_STAGE_LABELS) as HandoffStage[];
    for (const stage of stages) {
      const failure = buildHandoffFailure({ stage, diagnosticId: "abc12345", errorCode: "P1001" });
      assert.equal(failure.code, "HANDOFF_WRITE_FAILED");
      assert.ok(failure.message.includes(HANDOFF_STAGE_LABELS[stage]));
      assert.match(failure.message, /abc12345/);
      assert.match(failure.message, /không bị xuất bản/);
      assert.notEqual(failure.message, "Handoff failed");
    }
    assert.match(HANDOFF_SOURCE, /"HANDOFF_VERIFY_FAILED"/);
    assert.match(HANDOFF_SOURCE, /"CONTENT_CONFLICT"/);
    assert.match(HANDOFF_SOURCE, /"DRAFT_VERSION_INVALID"/);
  });

  it("32. Manual-edit risk is derived, not guessed", () => {
    // Drift flag set after a handoff ⇒ human edits exist.
    assert.equal(
      hasManualEditRisk({
        contentModifiedAfterHandoff: true,
        lastHandoffAt: new Date(),
        blogSourceWritingDraftId: DRAFT_ID,
        draftId: DRAFT_ID,
      }),
      true,
    );
    // Never handed off, but from this article chain ⇒ pre-governance artifact.
    assert.equal(
      hasManualEditRisk({
        contentModifiedAfterHandoff: false,
        lastHandoffAt: null,
        blogSourceWritingDraftId: DRAFT_ID,
        draftId: DRAFT_ID,
      }),
      false,
    );
    // Never handed off and from somewhere else ⇒ treat as hand-written.
    assert.equal(
      hasManualEditRisk({
        contentModifiedAfterHandoff: false,
        lastHandoffAt: null,
        blogSourceWritingDraftId: null,
        draftId: DRAFT_ID,
      }),
      true,
    );
  });

  it("33. Non-approved review states keep their own UI", () => {
    for (const status of ["IN_REVIEW", "CHANGES_REQUESTED", "NOT_STARTED"]) {
      const view = resolveReviewHandoffView({
        reviewId: REVIEW_ID,
        reviewStatus: status,
        blog: null,
      });
      assert.equal(view.state, "APPROVAL_IN_PROGRESS");
      assert.equal(view.terminal, false);
      assert.equal(view.successBanner, null);
    }
    assert.equal(
      resolveReviewHandoffView({ reviewId: REVIEW_ID, reviewStatus: "SUPERSEDED", blog: null }).state,
      "SUPERSEDED",
    );
    const rejected = resolveReviewHandoffView({
      reviewId: REVIEW_ID,
      reviewStatus: "REJECTED",
      blog: null,
    });
    assert.equal(rejected.state, "REJECTED");
    assert.equal(rejected.successBanner, null);
  });
});
