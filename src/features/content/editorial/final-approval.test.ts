import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  APPROVAL_STAGE_LABELS,
  buildApprovalChecklist,
  buildFinalApprovalFailure,
  evaluateFinalApproval,
  finalApprovalToastMessage,
  isApprovalWriteConsistent,
  type ApprovalChecklistItem,
  type ApprovalStage,
  type ReviewBlocker,
} from "@/features/content/editorial/review-approval.policy";

const GREEN_CHECKLIST_INPUT = {
  usesLatestDraft: true,
  requiredFactsSatisfied: true,
  faqValid: true,
  requiredSectionsApproved: true,
  blockingQaCleared: true,
  mediaReady: true,
};

function checklist(
  overrides: Partial<typeof GREEN_CHECKLIST_INPUT> = {},
): ApprovalChecklistItem[] {
  return buildApprovalChecklist({ ...GREEN_CHECKLIST_INPUT, ...overrides });
}

function decide(input: {
  reviewStatus?: string;
  checklist?: ApprovalChecklistItem[];
  blockers?: ReviewBlocker[];
  rejectedSections?: number;
  changesRequestedSections?: number;
}) {
  return evaluateFinalApproval({
    reviewStatus: input.reviewStatus ?? "IN_REVIEW",
    checklist: input.checklist ?? checklist(),
    blockers: input.blockers ?? [],
    rejectedSections: input.rejectedSections ?? 0,
    changesRequestedSections: input.changesRequestedSections ?? 0,
  });
}

function blocker(group: ReviewBlocker["group"], code: string): ReviewBlocker {
  return { group, code, message: `${code} message`, sectionId: null };
}

const SERVICE_SOURCE = readFileSync(
  path.join(process.cwd(), "src/features/content/services/content-review.service.ts"),
  "utf8",
);

function approvalFunctionSource(): string {
  const start = SERVICE_SOURCE.indexOf("export async function approveWritingDraftReview");
  const end = SERVICE_SOURCE.indexOf("export async function rejectWritingDraftReview");
  assert.ok(start > -1 && end > start, "approveWritingDraftReview not found in service");
  return SERVICE_SOURCE.slice(start, end);
}

describe("Hotfix 13.5.4 — final review approval", () => {
  it("1. All gates green → final approval is allowed", () => {
    const decision = decide({});
    assert.equal(decision.ok, true);
    assert.equal(decision.alreadyApproved, false);
    assert.deepEqual(decision.failed, []);
  });

  it("2. Required section not approved → blocked on the sections row", () => {
    const decision = decide({
      checklist: buildApprovalChecklist({
        ...GREEN_CHECKLIST_INPUT,
        requiredSectionsApproved: false,
        pendingSections: 1,
        pendingRequiredSections: 1,
        totalSections: 27,
      }),
      blockers: [blocker("SECTION_APPROVALS", "SECTION_NOT_APPROVED")],
    });
    assert.equal(decision.ok, false);
    assert.equal(decision.failed.length, 1);
    assert.equal(decision.failed[0].checklistId, "sections");
    assert.match(decision.failed[0].message, /1\/27 đoạn chưa duyệt/);
  });

  it("3. Stale draft → blocked on the latest-draft row", () => {
    const decision = decide({
      checklist: buildApprovalChecklist({
        ...GREEN_CHECKLIST_INPUT,
        usesLatestDraft: false,
        reviewDraftVersion: 29,
        latestDraftVersion: 30,
      }),
      blockers: [blocker("DRAFT_VERSION", "DRAFT_VERSION_CHANGED")],
    });
    assert.equal(decision.ok, false);
    assert.equal(decision.failed[0].checklistId, "latest_draft");
    assert.match(decision.failed[0].message, /v29.*v30/);
  });

  it("4. Blocking QA → blocked on the QA row", () => {
    const decision = decide({
      checklist: checklist({ blockingQaCleared: false }),
      blockers: [blocker("QA", "UNKNOWN_FACT")],
    });
    assert.equal(decision.ok, false);
    assert.equal(decision.failed[0].checklistId, "qa");
  });

  it("5. Required fact missing → blocked on the required-facts row", () => {
    const decision = decide({
      checklist: checklist({ requiredFactsSatisfied: false }),
      blockers: [blocker("REQUIRED_FACTS", "MISSING_REQUIRED_FACT")],
    });
    assert.equal(decision.ok, false);
    assert.equal(decision.failed[0].checklistId, "required_facts");
  });

  it("6. Invalid FAQ → blocked on the FAQ row", () => {
    const decision = decide({
      checklist: checklist({ faqValid: false }),
      blockers: [blocker("FAQ", "FAQ_SCHEMA_WITHOUT_FAQ")],
    });
    assert.equal(decision.ok, false);
    assert.equal(decision.failed[0].checklistId, "faq");
  });

  it("7. Media not ready → blocked on the media row", () => {
    const decision = decide({
      checklist: checklist({ mediaReady: false }),
      blockers: [blocker("QA", "MISSING_FEATURED")],
    });
    assert.equal(decision.ok, false);
    assert.equal(decision.failed[0].checklistId, "media");
  });

  it("8. Rejected / changes-requested sections block an otherwise green checklist", () => {
    const rejected = decide({ rejectedSections: 1 });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.failed[0].code, "SECTION_REJECTED");

    const changes = decide({ changesRequestedSections: 2 });
    assert.equal(changes.ok, false);
    assert.equal(changes.failed[0].code, "SECTION_CHANGES_REQUESTED");
  });

  it("9. SUPERSEDED Review cannot be approved through this gate", () => {
    const decision = decide({
      reviewStatus: "SUPERSEDED",
      blockers: [blocker("DRAFT_VERSION", "REVIEW_NOT_EDITABLE")],
    });
    assert.equal(decision.ok, false);
    assert.equal(decision.alreadyApproved, false);
    // The status invariant covers REVIEW_NOT_EDITABLE — reported once, not twice.
    assert.equal(decision.failed.length, 1);
    assert.equal(decision.failed[0].code, "REVIEW_NOT_ACTIVE");
    assert.match(decision.failed[0].message, /SUPERSEDED/);
  });

  it("10. REJECTED Review cannot be approved through this gate", () => {
    const decision = decide({ reviewStatus: "REJECTED" });
    assert.equal(decision.ok, false);
    assert.equal(decision.failed[0].code, "REVIEW_NOT_ACTIVE");
  });

  it("11. Already APPROVED → idempotent replay, not a blocked approval", () => {
    const decision = decide({ reviewStatus: "APPROVED" });
    assert.equal(decision.ok, false);
    assert.equal(decision.alreadyApproved, true);
    assert.deepEqual(decision.failed, []);
    assert.equal(finalApprovalToastMessage(decision), "Review đã được phê duyệt trước đó.");
  });

  it("12. Duplicate approve request writes no second decision", () => {
    const source = approvalFunctionSource();
    // The status-scoped claim makes a concurrent approve a no-op…
    assert.match(source, /status: \{ in: \[\.\.\.ACTIVE_REVIEW\] \}/);
    assert.match(source, /if \(claimed\.count === 0\) return \{ claimed: false as const \};/);
    // …and the decision row is only written when none exists yet.
    assert.match(source, /priorDecisions = await tx\.contentReviewDecision\.count/);
    assert.match(source, /if \(priorDecisions === 0\)/);
    // An already-approved Review short-circuits before any write.
    assert.match(source, /current\.status === "APPROVED"/);
  });

  it("13. Inconsistent post-write state fails verification (transaction rolls back)", () => {
    const consistent = {
      reviewStatus: "APPROVED",
      reviewApprovedBy: "admin_1",
      reviewApprovedAt: new Date(),
      draftStatus: "APPROVED",
      draftApprovedBy: "admin_1",
      draftVersion: 30,
      expectedDraftVersion: 30,
      approveDecisions: 1,
    };
    assert.equal(isApprovalWriteConsistent(consistent), true);
    assert.equal(
      isApprovalWriteConsistent({ ...consistent, reviewApprovedBy: null }),
      false,
      "approvedBy must be set",
    );
    assert.equal(
      isApprovalWriteConsistent({ ...consistent, reviewApprovedAt: null }),
      false,
      "approvedAt must be set",
    );
    assert.equal(
      isApprovalWriteConsistent({ ...consistent, draftStatus: "REVIEW_READY" }),
      false,
      "draft must be APPROVED",
    );
    assert.equal(
      isApprovalWriteConsistent({ ...consistent, draftVersion: 29 }),
      false,
      "approval must stay on the reviewed version",
    );
    assert.equal(
      isApprovalWriteConsistent({ ...consistent, approveDecisions: 2 }),
      false,
      "exactly one APPROVE_DRAFT decision",
    );
  });

  it("14. A duplicate version snapshot must not poison the approval transaction", () => {
    // Root cause model: in Postgres a failed statement aborts the transaction and
    // every later statement fails with 25P02, so catching the JS rejection is not
    // enough. ON CONFLICT DO NOTHING (Prisma `skipDuplicates`) never fails.
    const run = (
      statements: Array<{ conflicts?: boolean; onConflictDoNothing?: boolean; swallow?: boolean }>,
    ) => {
      let aborted = false;
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (aborted) return { failedAt: i, code: "25P02" };
        if (stmt.conflicts && !stmt.onConflictDoNothing) {
          aborted = true;
          if (!stmt.swallow) return { failedAt: i, code: "P2002" };
        }
      }
      return { failedAt: null, code: null };
    };

    const legacy = run([
      { conflicts: true, swallow: true }, // writingDraftVersion.create(...).catch(() => {})
      {}, // contentReviewDecision.create — the statement users actually saw fail
    ]);
    assert.deepEqual(legacy, { failedAt: 1, code: "25P02" });

    const fixed = run([{ conflicts: true, onConflictDoNothing: true }, {}]);
    assert.deepEqual(fixed, { failedAt: null, code: null });

    const source = approvalFunctionSource();
    assert.match(source, /writingDraftVersion\.createMany/);
    assert.match(source, /skipDuplicates: true/);
    assert.doesNotMatch(
      source,
      /\.catch\(/,
      "the approval transaction must not swallow a statement error",
    );
  });

  it("15. Unexpected server error → structured, safe client payload", () => {
    const failure = buildFinalApprovalFailure({
      stage: "write_decision",
      errorName: "PrismaClientUnknownRequestError",
      errorCode: undefined,
    });
    assert.equal(failure.ok, false);
    assert.equal(failure.code, "APPROVE_WRITE_FAILED");
    assert.equal(failure.details.stage, "write_decision");
    assert.equal(failure.details.rolledBack, true);
    assert.equal(failure.details.errorCode, "PrismaClientUnknownRequestError");
    assert.match(failure.message, /ghi quyết định kiểm duyệt/);
    assert.match(failure.message, /Không có thay đổi nào được lưu/);
    assert.notEqual(failure.message, "Approve failed");
    for (const leak of ["at ", "prisma.", "SELECT", "INSERT", "postgres://"]) {
      assert.ok(!failure.message.includes(leak), `message must not leak ${leak}`);
    }
  });

  it("16. Every stage has reviewer-facing copy, and a committed stage says so", () => {
    const stages = Object.keys(APPROVAL_STAGE_LABELS) as ApprovalStage[];
    for (const stage of stages) {
      const failure = buildFinalApprovalFailure({ stage, errorCode: "P1001" });
      assert.ok(failure.message.includes(APPROVAL_STAGE_LABELS[stage]));
      assert.match(failure.message, /P1001/);
    }
    // Only the post-commit stage tells the reviewer their approval was saved.
    assert.equal(buildFinalApprovalFailure({ stage: "reload", errorCode: "P1001" }).details.rolledBack, false);
    assert.match(
      buildFinalApprovalFailure({ stage: "reload", errorCode: "P1001" }).message,
      /đã được ghi/,
    );
  });

  it("17. Contract: an all-green checklist can never hide a server-side refusal", () => {
    const groups: ReviewBlocker["group"][] = [
      "DRAFT_VERSION",
      "REQUIRED_FACTS",
      "FAQ",
      "SECTION_APPROVALS",
      "QA",
    ];
    for (const group of groups) {
      // A blocker with a fully green checklist must still be reported.
      const decision = decide({ blockers: [blocker(group, `${group}_CODE`)] });
      assert.equal(decision.ok, false, `${group} must refuse approval`);
      assert.ok(decision.failed.length > 0, `${group} must name an invariant`);
      assert.equal(decision.failed[0].code, "UNMAPPED_BLOCKER");
      assert.match(decision.failed[0].message, new RegExp(`${group}_CODE`));
    }

    // And the converse: a failing checklist row is always reported, never silent.
    const rows: Array<keyof typeof GREEN_CHECKLIST_INPUT> = [
      "usesLatestDraft",
      "requiredFactsSatisfied",
      "faqValid",
      "requiredSectionsApproved",
      "blockingQaCleared",
      "mediaReady",
    ];
    for (const row of rows) {
      const decision = decide({ checklist: checklist({ [row]: false }) });
      assert.equal(decision.ok, false, `${row} must refuse approval`);
      assert.equal(decision.failed.length, 1);
      assert.equal(decision.failed[0].code, "CHECKLIST_ITEM_FAILED");
    }
  });

  it("18. readyToApprove is the checklist gate, not a parallel expression", () => {
    // The service must not recompute readiness for the button separately.
    assert.match(SERVICE_SOURCE, /readyToApprove: approval\.ok/);
    assert.match(SERVICE_SOURCE, /const approval = evaluateFinalApproval\(\{/);
    assert.match(approvalFunctionSource(), /if \(!readiness\.approval\.ok\)/);
  });

  it("19. Final approval neither publishes the Blog nor rewrites its linkage", () => {
    const source = approvalFunctionSource();
    assert.doesNotMatch(source, /blogPost\.update/);
    assert.doesNotMatch(source, /blogPost\.updateMany/);
    assert.doesNotMatch(source, /"PUBLISHED"/);
    assert.doesNotMatch(source, /publishedAt/);
    // Linkage is read for verification only.
    assert.match(source, /blogPost\.findFirst/);
  });

  it("20. Approval keeps sections APPROVED and only locks them", () => {
    const source = approvalFunctionSource();
    assert.doesNotMatch(source, /contentReviewSection\.update/);
    assert.match(source, /lockSection\(locks, section\.sectionId, "USER_APPROVED"/);
  });
});
