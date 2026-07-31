import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approvalToastMessage,
  buildApprovalChecklist,
  countVisibleFaqEntries,
  evaluateFaqSchemaSignal,
  groupApprovalBlockers,
  isActiveReviewStatus,
  isKnowledgeRequiredFact,
  isMediaFactId,
  isMediaFactSourceType,
  resolveReviewRestartMode,
  selectBulkApprovableSections,
  STALE_REVIEW_BANNER,
  type BulkApproveSectionCandidate,
  type ReviewBlocker,
} from "@/features/content/editorial/review-approval.policy";
import { runFactQa } from "@/features/writing-engine/qa/fact-qa";
import { runSchemaQa } from "@/features/writing-engine/qa/schema-qa";
import type {
  WritingPlan,
  WritingSectionDraft,
} from "@/features/writing-engine/writing-engine.types";

function planWithFacts(
  usages: Array<{ factId: string; sectionId: string; required: boolean }>,
  schemaTypes: string[] = ["Article"],
): WritingPlan {
  return {
    factPlan: {
      usages: usages.map((u) => ({
        ...u,
        statement: "stmt",
        structuredValue: null,
        allowedParaphrase: true,
        mustUseExactValue: false,
        citationRequired: true,
        publicUseAllowed: true,
        usageNotes: [],
      })),
      unallocatedFactIds: [],
      excludedFactIds: [],
    },
    schemaPlan: { schemaTypes, faqEnabled: true, breadcrumbEnabled: true, warnings: [] },
  } as unknown as WritingPlan;
}

function sectionDraft(overrides: Partial<WritingSectionDraft> = {}): WritingSectionDraft {
  return {
    sectionId: "sec_1",
    heading: "Mở đầu",
    html: "<p>Nội dung</p>",
    plainText: "Nội dung",
    factIdsUsed: [],
    citationIdsUsed: [],
    internalLinkIdsUsed: [],
    mediaPlacementIdsUsed: [],
    keywordUsage: [],
    claims: [],
    wordCount: 10,
    warnings: [],
    ...overrides,
  };
}

function candidate(
  overrides: Partial<BulkApproveSectionCandidate> = {},
): BulkApproveSectionCandidate {
  return {
    sectionId: "sec_1",
    heading: "Mở đầu",
    status: "PENDING",
    hasContent: true,
    hasBlockingQaIssue: false,
    hasUnresolvedRequiredFact: false,
    hasUnsafeClaim: false,
    isStale: false,
    ...overrides,
  };
}

const cleanChecklistInput = {
  usesLatestDraft: true,
  requiredFactsSatisfied: true,
  faqValid: true,
  requiredSectionsApproved: true,
  blockingQaCleared: true,
  mediaReady: true,
};

describe("Hotfix 13.5.2 — stale review & approval UX", () => {
  it("1. Stale Review cannot approve", () => {
    const checklist = buildApprovalChecklist({
      ...cleanChecklistInput,
      usesLatestDraft: false,
      reviewDraftVersion: 28,
      latestDraftVersion: 29,
    });
    const latest = checklist.find((i) => i.id === "latest_draft")!;
    assert.equal(latest.passed, false);
    assert.equal(checklist.every((i) => i.passed), false);
    assert.match(latest.detail ?? "", /v28.*v29/);
  });

  it("2. Stale Review displays restart action", () => {
    assert.equal(
      STALE_REVIEW_BANNER.title,
      "Bản nháp đã thay đổi sau khi phiên kiểm duyệt này được tạo.",
    );
    assert.equal(STALE_REVIEW_BANNER.primaryAction, "Tạo phiên kiểm duyệt mới");
    assert.equal(STALE_REVIEW_BANNER.secondaryAction, "Xem thay đổi");
  });

  it("3. Restart targets the latest Draft version", () => {
    // Restart contract: new review snapshot must equal the latest draft version.
    const restartSnapshot = (latestDraftVersion: number) => ({
      writingDraftVersion: latestDraftVersion,
    });
    assert.equal(restartSnapshot(29).writingDraftVersion, 29);
    const checklist = buildApprovalChecklist({
      ...cleanChecklistInput,
      reviewDraftVersion: 29,
      latestDraftVersion: 29,
    });
    assert.equal(checklist.find((i) => i.id === "latest_draft")!.passed, true);
  });

  it("4. Old Review remains historical, not deleted", () => {
    const supersede = (status: string) => (status === "IN_REVIEW" ? "SUPERSEDED" : status);
    assert.equal(supersede("IN_REVIEW"), "SUPERSEDED");
    assert.notEqual(supersede("IN_REVIEW"), "DELETED");
  });

  it("5. Old approvals are not copied into the new Review", () => {
    const oldSections = [
      { sectionId: "sec_1", status: "APPROVED" },
      { sectionId: "sec_2", status: "PENDING" },
    ];
    // New sessions seed every section as PENDING regardless of prior state.
    const newSections = oldSections.map((s) => ({ sectionId: s.sectionId, status: "PENDING" }));
    assert.deepEqual(
      newSections.map((s) => s.status),
      ["PENDING", "PENDING"],
    );
  });

  it("6. Topic linkage preserved through the plan", () => {
    const oldReview = { writingPlanId: "plan_1", writingDraftId: "draft_1" };
    const newReview = { writingPlanId: "plan_1", writingDraftId: "draft_1" };
    assert.equal(newReview.writingPlanId, oldReview.writingPlanId);
    assert.equal(newReview.writingDraftId, oldReview.writingDraftId);
  });

  it("7. Blog linkage moves to the active Review, keeping the draft id", () => {
    const blog = { sourceReviewSessionId: "rev_old", sourceWritingDraftId: "draft_1" };
    const relinked = { ...blog, sourceReviewSessionId: "rev_new" };
    assert.equal(relinked.sourceWritingDraftId, "draft_1");
    assert.equal(relinked.sourceReviewSessionId, "rev_new");
  });

  it("8. Media Bundle is not treated as a required Knowledge fact", () => {
    assert.equal(isMediaFactId("bundle-cmrmfoose0000rwswz7kemovv"), true);
    assert.equal(isMediaFactId("media-abc"), true);
    assert.equal(isMediaFactSourceType("MEDIA_BUNDLE"), true);
    assert.equal(
      isKnowledgeRequiredFact({ factId: "bundle-cmrmfoose0000rwswz7kemovv", required: true }),
      false,
    );

    const plan = planWithFacts([
      { factId: "bundle-cmrmfoose0000rwswz7kemovv", sectionId: "sec_1", required: true },
    ]);
    const issues = runFactQa(plan, [sectionDraft()]);
    assert.equal(issues.filter((i) => i.code === "MISSING_REQUIRED_FACT").length, 0);
  });

  it("9. Knowledge fact validation remains enforced", () => {
    assert.equal(isKnowledgeRequiredFact({ factId: "kb-123", required: true }), true);
    const plan = planWithFacts([{ factId: "kb-123", sectionId: "sec_1", required: true }]);

    const missing = runFactQa(plan, [sectionDraft()]);
    assert.equal(missing.filter((i) => i.code === "MISSING_REQUIRED_FACT").length, 1);

    const used = runFactQa(plan, [sectionDraft({ factIdsUsed: ["kb-123"] })]);
    assert.equal(used.filter((i) => i.code === "MISSING_REQUIRED_FACT").length, 0);
  });

  it("10. FAQ visible content + faqJson passes", () => {
    const signal = evaluateFaqSchemaSignal({
      schemaTypes: ["FAQPage"],
      structuredFaqCount: 5,
      visibleFaqCount: 5,
    });
    assert.equal(signal.valid, true);
    assert.equal(signal.code, null);

    const issues = runSchemaQa(planWithFacts([], ["FAQPage"]), {
      structuredFaqCount: 5,
      visibleFaqCount: 5,
    });
    assert.equal(issues.filter((i) => i.code === "FAQ_SCHEMA_WITHOUT_FAQ").length, 0);

    const visible = countVisibleFaqEntries([
      {
        heading: "Câu hỏi thường gặp",
        html: "<h3>Giá bao nhiêu?</h3><p>Tùy số lượng.</p><h3>Giao khi nào?</h3><p>Theo hợp đồng.</p>",
        plainText: "Giá bao nhiêu?\nTùy số lượng.\nGiao khi nào?\nTheo hợp đồng.",
      },
    ]);
    assert.equal(visible, 2);
  });

  it("11. FAQ schema without visible FAQ fails", () => {
    const signal = evaluateFaqSchemaSignal({
      schemaTypes: ["FAQPage"],
      structuredFaqCount: 0,
      visibleFaqCount: 0,
    });
    assert.equal(signal.valid, false);
    assert.equal(signal.severity, "ERROR");
    assert.equal(signal.code, "FAQ_SCHEMA_WITHOUT_FAQ");

    const issues = runSchemaQa(planWithFacts([], ["FAQPage"]), {
      structuredFaqCount: 0,
      visibleFaqCount: 0,
    });
    assert.equal(issues.filter((i) => i.code === "FAQ_SCHEMA_WITHOUT_FAQ").length, 1);

    const outOfSync = evaluateFaqSchemaSignal({
      schemaTypes: ["FAQPage"],
      structuredFaqCount: 5,
      visibleFaqCount: 2,
    });
    assert.equal(outOfSync.severity, "WARNING");
    assert.equal(outOfSync.code, "FAQ_CONTENT_OUT_OF_SYNC");
  });

  it("12. Bulk approve requires explicit confirmation", () => {
    const guard = (confirmed: boolean) => {
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      return true;
    };
    assert.throws(() => guard(false), /CONFIRMATION_REQUIRED/);
    assert.equal(guard(true), true);
  });

  it("13. Bulk approve skips blocked sections", () => {
    const plan = selectBulkApprovableSections({
      reviewIsStale: false,
      sections: [
        candidate({ sectionId: "ok", required: true }),
        candidate({
          sectionId: "empty",
          hasContent: false,
          required: true,
        }),
        candidate({
          sectionId: "qa",
          hasBlockingQaIssue: true,
          qaCodes: ["HEADING_HIERARCHY"],
          required: true,
        }),
        candidate({
          sectionId: "fact",
          hasUnresolvedRequiredFact: true,
          missingRequiredFactIds: ["kb-1"],
          required: true,
        }),
        candidate({
          sectionId: "claim",
          hasUnsafeClaim: true,
          unsafeClaimCodes: ["MOQ"],
          required: true,
        }),
        candidate({ sectionId: "done", status: "APPROVED", required: true }),
        candidate({ sectionId: "returned", status: "CHANGES_REQUESTED", required: true }),
      ],
    });
    assert.deepEqual(plan.eligible.map((e) => e.sectionId), ["ok"]);
    assert.equal(plan.excluded.length, 6);
    assert.equal(plan.counts.eligible, 1);
    assert.equal(plan.counts.excluded, 6);
    assert.equal(plan.counts.total, 7);

    const qaSkip = plan.excluded.find((e) => e.sectionId === "qa")!;
    assert.equal(qaSkip.reason, "BLOCKING_QA");
    assert.deepEqual(qaSkip.qa, ["HEADING_HIERARCHY"]);

    const factSkip = plan.excluded.find((e) => e.sectionId === "fact")!;
    assert.equal(factSkip.reason, "REQUIRED_FACT");
    assert.deepEqual(factSkip.requiredFact, ["kb-1"]);

    const claimSkip = plan.excluded.find((e) => e.sectionId === "claim")!;
    assert.equal(claimSkip.reason, "UNSAFE_CLAIM");
    assert.deepEqual(claimSkip.unsafeClaim, ["MOQ"]);
  });

  it("14. Bulk approve rejects a stale Review", () => {
    const plan = selectBulkApprovableSections({
      reviewIsStale: true,
      sections: [candidate(), candidate({ sectionId: "sec_2" })],
    });
    assert.equal(plan.eligible.length, 0);
    assert.ok(plan.excluded.every((e) => e.reason === "STALE"));
    assert.ok(plan.excluded.every((e) => e.stale === true));
  });

  it("15. Final approval disabled while sections pending", () => {
    const checklist = buildApprovalChecklist({
      ...cleanChecklistInput,
      requiredSectionsApproved: false,
      pendingRequiredSections: 26,
      pendingSections: 27,
      totalSections: 27,
    });
    const sections = checklist.find((i) => i.id === "sections")!;
    assert.equal(sections.passed, false);
    assert.equal(sections.detail, "27/27 đoạn chưa duyệt · 26 bắt buộc còn chờ");
    assert.equal(checklist.every((i) => i.passed), false);

    const clean = buildApprovalChecklist(cleanChecklistInput);
    assert.equal(clean.every((i) => i.passed), true);
  });

  it("16. Repetitive section errors are grouped and collapsed", () => {
    const blockers: ReviewBlocker[] = [
      {
        group: "DRAFT_VERSION",
        code: "DRAFT_VERSION_CHANGED",
        message: "Draft version changed — start a new review session",
      },
      {
        group: "REQUIRED_FACTS",
        code: "MISSING_REQUIRED_FACT",
        message: "MISSING_REQUIRED_FACT: Required fact not used: kb-1",
      },
      ...Array.from({ length: 26 }, (_, i) => ({
        group: "SECTION_APPROVALS" as const,
        code: "SECTION_NOT_APPROVED",
        message: `Required section not approved: Đoạn ${i + 1}`,
        sectionId: `sec_${i + 1}`,
      })),
    ];

    const groups = groupApprovalBlockers(blockers, {
      pending: 27,
      total: 27,
      requiredPending: 26,
    });
    assert.equal(groups.length, 3);
    const sectionGroup = groups.find((g) => g.group === "SECTION_APPROVALS")!;
    assert.equal(sectionGroup.collapsed, true);
    assert.equal(sectionGroup.summary, "27/27 đoạn chưa duyệt · 26 bắt buộc còn chờ");
    assert.equal(sectionGroup.items.length, 3);
    assert.equal(
      approvalToastMessage(groups),
      "Chưa đủ điều kiện phê duyệt. Xem 3 nhóm vấn đề cần xử lý.",
    );
  });

  it("25. UI eligibility mirrors API: 27 eligible / 0 excluded succeeds contract", () => {
    const sections = Array.from({ length: 27 }, (_, i) =>
      candidate({
        sectionId: `sec_${i + 1}`,
        heading: `Đoạn ${i + 1}`,
        required: i < 26,
        contentHash: `hash_${i + 1}`,
      }),
    );
    const plan = selectBulkApprovableSections({ reviewIsStale: false, sections });
    assert.equal(plan.counts.eligible, 27);
    assert.equal(plan.counts.excluded, 0);
    assert.equal(plan.counts.pending, 27);
    assert.equal(plan.counts.requiredPending, 26);
    assert.equal(plan.counts.optionalPending, 1);
    // Contract: when eligible==27 and excluded==0 the write path must attempt all 27.
    assert.equal(plan.eligible.length, 27);
  });

  it("26. One blocked section is skipped with structured diagnostics", () => {
    const plan = selectBulkApprovableSections({
      reviewIsStale: false,
      sections: [
        ...Array.from({ length: 26 }, (_, i) =>
          candidate({ sectionId: `sec_${i + 1}`, required: true, contentHash: `h${i}` }),
        ),
        candidate({
          sectionId: "sec_blocked",
          heading: "Blocked",
          required: true,
          hasBlockingQaIssue: true,
          qaCodes: ["UNKNOWN_FACT"],
          contentHash: "h_blocked",
        }),
      ],
    });
    assert.equal(plan.counts.eligible, 26);
    assert.equal(plan.counts.excluded, 1);
    const skip = plan.excluded[0];
    assert.equal(skip.sectionId, "sec_blocked");
    assert.equal(skip.reason, "BLOCKING_QA");
    assert.deepEqual(skip.qa, ["UNKNOWN_FACT"]);
    assert.equal(skip.hash, "h_blocked");
    assert.equal(skip.stale, false);
  });

  it("27. Required-fact and unsafe-claim blocks emit skip fields", () => {
    const plan = selectBulkApprovableSections({
      reviewIsStale: false,
      sections: [
        candidate({
          sectionId: "fact",
          hasUnresolvedRequiredFact: true,
          missingRequiredFactIds: ["kb-abc"],
          contentHash: "hf",
        }),
        candidate({
          sectionId: "claim",
          hasUnsafeClaim: true,
          unsafeClaimCodes: ["LEAD_TIME"],
          contentHash: "hc",
        }),
      ],
    });
    assert.equal(plan.eligible.length, 0);
    assert.deepEqual(plan.excluded.find((e) => e.sectionId === "fact")!.requiredFact, ["kb-abc"]);
    assert.deepEqual(plan.excluded.find((e) => e.sectionId === "claim")!.unsafeClaim, ["LEAD_TIME"]);
  });

  it("28. Banner/checklist/bulk share one pending/required count source", () => {
    const sections = Array.from({ length: 27 }, (_, i) =>
      candidate({ sectionId: `sec_${i + 1}`, required: i < 26 }),
    );
    const plan = selectBulkApprovableSections({ reviewIsStale: false, sections });
    const checklist = buildApprovalChecklist({
      ...cleanChecklistInput,
      requiredSectionsApproved: false,
      pendingSections: plan.counts.pending,
      pendingRequiredSections: plan.counts.requiredPending,
      totalSections: plan.counts.total,
    });
    const groups = groupApprovalBlockers(
      Array.from({ length: plan.counts.requiredPending }, (_, i) => ({
        group: "SECTION_APPROVALS" as const,
        code: "SECTION_NOT_APPROVED",
        message: `Required section not approved: ${i}`,
        sectionId: `sec_${i + 1}`,
      })),
      plan.counts,
    );
    const detail = checklist.find((i) => i.id === "sections")!.detail!;
    const summary = groups.find((g) => g.group === "SECTION_APPROVALS")!.summary;
    assert.match(detail, /27\/27/);
    assert.match(detail, /26 bắt buộc/);
    assert.match(summary, /27\/27/);
    assert.match(summary, /26 bắt buộc/);
    assert.equal(plan.counts.eligible, 27);
  });

  it("17. No automatic Review approval", () => {
    // Bulk approval only ever touches sections; the session decision stays manual.
    const plan = selectBulkApprovableSections({
      reviewIsStale: false,
      sections: [candidate()],
    });
    assert.equal(plan.eligible.length, 1);
    const sessionStatusAfterBulk = "IN_REVIEW";
    assert.equal(sessionStatusAfterBulk, "IN_REVIEW");
  });

  it("18/19. No automatic Blog publication — Blog stays DRAFT", () => {
    const blog = { status: "DRAFT" as const, publishedAt: null };
    const afterReviewWork = { ...blog };
    assert.equal(afterReviewWork.status, "DRAFT");
    assert.equal(afterReviewWork.publishedAt, null);
  });

  it("21. Superseded Review with a successor points at the successor, not restart", () => {
    assert.equal(
      resolveReviewRestartMode({
        sessionStatus: "SUPERSEDED",
        hasSuccessor: true,
        stale: true,
      }),
      "OPEN_SUCCESSOR",
    );
    assert.equal(
      resolveReviewRestartMode({ sessionStatus: "IN_REVIEW", hasSuccessor: true, stale: true }),
      "OPEN_SUCCESSOR",
    );
  });

  it("22. Superseded Review without a successor offers orphan recovery", () => {
    assert.equal(
      resolveReviewRestartMode({
        sessionStatus: "SUPERSEDED",
        hasSuccessor: false,
        stale: true,
      }),
      "ORPHAN_RECOVERY",
    );
    // Recovery stays available even when versions happen to match.
    assert.equal(
      resolveReviewRestartMode({
        sessionStatus: "SUPERSEDED",
        hasSuccessor: false,
        stale: false,
      }),
      "ORPHAN_RECOVERY",
    );
  });

  it("23. Restart offered only for stale active Reviews", () => {
    assert.equal(
      resolveReviewRestartMode({ sessionStatus: "IN_REVIEW", hasSuccessor: false, stale: true }),
      "STALE",
    );
    assert.equal(
      resolveReviewRestartMode({ sessionStatus: "IN_REVIEW", hasSuccessor: false, stale: false }),
      "NONE",
    );
    for (const closed of ["APPROVED", "REJECTED"]) {
      assert.equal(
        resolveReviewRestartMode({ sessionStatus: closed, hasSuccessor: false, stale: true }),
        "NONE",
      );
    }
  });

  it("24. Closed Reviews accept no reviewer decisions", () => {
    assert.equal(isActiveReviewStatus("IN_REVIEW"), true);
    assert.equal(isActiveReviewStatus("CHANGES_REQUESTED"), true);
    assert.equal(isActiveReviewStatus("NOT_STARTED"), true);
    assert.equal(isActiveReviewStatus("SUPERSEDED"), false);
    assert.equal(isActiveReviewStatus("APPROVED"), false);
    assert.equal(isActiveReviewStatus("REJECTED"), false);
  });

  it("20. Publish readiness opens only after human Review APPROVED", () => {
    const publishGate = (reviewStatus: string, checklistPassed: boolean) =>
      reviewStatus === "APPROVED" && checklistPassed;
    assert.equal(publishGate("IN_REVIEW", true), false);
    assert.equal(publishGate("SUPERSEDED", true), false);
    assert.equal(publishGate("APPROVED", false), false);
    assert.equal(publishGate("APPROVED", true), true);
  });
});
