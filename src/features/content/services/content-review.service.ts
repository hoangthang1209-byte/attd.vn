import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDraftJson, parsePlanJson } from "@/features/writing-engine/services/writing-engine.wiring";
import { runWritingQa } from "@/features/writing-engine/qa/writing-qa.service";
import {
  lockSection,
  parseSectionLocks,
} from "@/features/writing-engine/services/writing-section-lock.service";
import { renderDraftOutputs } from "@/features/writing-engine/services/writing-engine.wiring";
import type { WritingPlan, WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";
import {
  hashSectionContent,
  qaIssuesToReviewSeeds,
  type ContentReviewReadiness,
  type ContentReviewSeverity,
} from "@/features/content/content-review.types";
import {
  ACTIVE_REVIEW_STATUSES,
  approvalToastMessage,
  buildApprovalChecklist,
  groupApprovalBlockers,
  isActiveReviewStatus,
  isMediaFactId,
  resolveReviewRestartMode,
  selectBulkApprovableSections,
  type BulkApproveSectionCandidate,
  type ReviewBlocker,
  type ReviewBlockerGroup,
} from "@/features/content/editorial/review-approval.policy";

export class ContentReviewError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  constructor(message: string, code: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "ContentReviewError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const ACTIVE_REVIEW = ACTIVE_REVIEW_STATUSES;

const UNSAFE_CLAIM_CODES = new Set([
  "SUPERLATIVE",
  "GUARANTEE",
  "CERTIFICATION",
  "CAPACITY",
  "MOQ",
  "LEAD_TIME",
]);

const FACT_ISSUE_CODES = new Set([
  "MISSING_REQUIRED_FACT",
  "UNKNOWN_FACT",
  "EXCLUDED_FACT_USED",
  "CONFIDENTIAL_FACT",
  "FACT_WRONG_SECTION",
]);

const FAQ_ISSUE_CODES = new Set(["FAQ_SCHEMA_WITHOUT_FAQ", "FAQ_CONTENT_OUT_OF_SYNC"]);

const MEDIA_ISSUE_CODES = new Set(["MISSING_FEATURED", "UNKNOWN_MEDIA"]);

function blockerGroupForCode(code: string): ReviewBlockerGroup {
  if (FACT_ISSUE_CODES.has(code)) return "REQUIRED_FACTS";
  if (FAQ_ISSUE_CODES.has(code)) return "FAQ";
  return "QA";
}

/**
 * Session creation writes one row per section plus one per QA issue. Batched
 * inserts keep the whole thing inside a single short transaction — sequential
 * per-row inserts exceeded the interactive transaction budget on production
 * latency and left superseded reviews without a successor.
 */
const REVIEW_TX_OPTIONS = { timeout: 20_000, maxWait: 10_000 } as const;

type ReviewCreationInputs = {
  draft: NonNullable<Awaited<ReturnType<typeof prisma.writingDraftRecord.findUnique>>>;
  contextBuildId: string;
  structured: ReturnType<typeof parseDraftJson>;
  planJson: WritingPlan;
  qa: WritingStructuredDraft["qa"];
};

/** Validate every governance gate before any write happens. */
async function loadReviewCreationInputs(writingDraftId: string): Promise<ReviewCreationInputs> {
  const draft = await prisma.writingDraftRecord.findUnique({ where: { id: writingDraftId } });
  if (!draft) throw new ContentReviewError("Draft not found", "DRAFT_NOT_FOUND", 404);
  if (!["REVIEW_READY", "QA_FAILED"].includes(draft.status)) {
    throw new ContentReviewError(
      "Draft phải REVIEW_READY hoặc QA_FAILED để bắt đầu review.",
      "DRAFT_NOT_ELIGIBLE",
      422
    );
  }

  const plan = await prisma.writingPlanRecord.findUnique({ where: { id: draft.writingPlanId } });
  if (!plan) throw new ContentReviewError("Plan not found", "PLAN_NOT_FOUND", 404);
  if (plan.status === "SUPERSEDED") {
    throw new ContentReviewError("Writing Plan đã SUPERSEDED", "PLAN_SUPERSEDED", 409);
  }

  const context = await prisma.contentContextBuild.findUnique({
    where: { id: plan.contextBuildId },
  });
  if (!context) throw new ContentReviewError("Context Build not found", "CONTEXT_NOT_FOUND", 404);
  if (context.status === "SUPERSEDED") {
    throw new ContentReviewError("Context Build đã SUPERSEDED", "CONTEXT_SUPERSEDED", 409);
  }

  const structured = parseDraftJson(draft as never);
  return {
    draft,
    contextBuildId: plan.contextBuildId,
    structured,
    planJson: parsePlanJson(plan as never),
    qa: (draft.qaReport as WritingStructuredDraft["qa"]) ?? structured.qa,
  };
}

async function assertNoActiveReviewForVersion(writingDraftId: string, version: number) {
  const existing = await prisma.contentReviewSession.findFirst({
    where: {
      writingDraftId,
      writingDraftVersion: version,
      status: { in: [...ACTIVE_REVIEW] },
    },
    select: { id: true },
  });
  if (existing) {
    throw new ContentReviewError(
      "Đã có review session active cho version này.",
      "ACTIVE_REVIEW_EXISTS",
      409,
      { existingReviewId: existing.id }
    );
  }
}

/** Create the session and seed sections/issues inside the caller's transaction. */
async function createReviewSessionInTx(
  tx: Prisma.TransactionClient,
  inputs: ReviewCreationInputs,
  actor: { actorId: string; assignedReviewerId?: string | null }
) {
  const { draft, structured, planJson, qa } = inputs;

  const created = await tx.contentReviewSession.create({
    data: {
      writingDraftId: draft.id,
      writingDraftVersion: draft.version,
      writingPlanId: draft.writingPlanId,
      contextBuildId: inputs.contextBuildId,
      status: "IN_REVIEW",
      assignedReviewerId: actor.assignedReviewerId ?? actor.actorId,
      startedBy: actor.actorId,
      startedAt: new Date(),
    },
  });

  // Sections always start PENDING — approvals are never inherited.
  await tx.contentReviewSection.createMany({
    data: structured.sections.map((section) => ({
      reviewSessionId: created.id,
      sectionId: section.sectionId,
      sectionKey:
        planJson.sections.find((s) => s.id === section.sectionId)?.sectionKey ?? section.sectionId,
      heading: section.heading,
      status: "PENDING" as const,
    })),
  });

  const seeds = qaIssuesToReviewSeeds(qa);
  if (seeds.length > 0) {
    await tx.contentReviewIssue.createMany({
      data: seeds.map((seed) => ({
        reviewSessionId: created.id,
        sectionId: seed.sectionId,
        code: seed.code,
        severity: seed.severity as never,
        status: "OPEN" as const,
        message: seed.message,
        suggestedFix: seed.suggestedFix,
        source: seed.source,
        metadata: seed.metadata as Prisma.InputJsonValue,
      })),
    });
  }

  return created;
}

export async function startContentReview(input: {
  writingDraftId: string;
  actorId: string;
  assignedReviewerId?: string | null;
}) {
  const inputs = await loadReviewCreationInputs(input.writingDraftId);
  await assertNoActiveReviewForVersion(inputs.draft.id, inputs.draft.version);

  const session = await prisma.$transaction(async (tx) => {
    // Supersede incomplete reviews for older versions
    await tx.contentReviewSession.updateMany({
      where: {
        writingDraftId: inputs.draft.id,
        writingDraftVersion: { not: inputs.draft.version },
        status: { in: [...ACTIVE_REVIEW] },
      },
      data: { status: "SUPERSEDED" },
    });

    return createReviewSessionInTx(tx, inputs, input);
  }, REVIEW_TX_OPTIONS);

  return getContentReviewSession(session.id);
}

export async function getContentReviewSession(reviewId: string) {
  const session = await prisma.contentReviewSession.findUnique({
    where: { id: reviewId },
    include: {
      sections: { orderBy: { createdAt: "asc" } },
      issues: { orderBy: { createdAt: "asc" } },
      decisions: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!session) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);

  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: session.writingDraftId },
  });
  const plan = await prisma.writingPlanRecord.findUnique({
    where: { id: session.writingPlanId },
  });
  const structured = draft ? parseDraftJson(draft as never) : null;
  const planJson = plan ? parsePlanJson(plan as never) : null;
  const readiness = await evaluateContentReviewReadiness(session.id);
  const successor = await findSuccessorReview(session);

  return {
    session,
    draft,
    plan,
    structuredDraft: structured,
    writingPlan: planJson,
    readiness,
    versionMatch: draft ? draft.version === session.writingDraftVersion : false,
    successorReview: successor,
    successorAdminRoute: successor ? `/admin/content/reviews/${successor.id}` : null,
    restartMode: resolveReviewRestartMode({
      sessionStatus: session.status,
      hasSuccessor: Boolean(successor),
      stale: readiness.stale,
    }),
  };
}

export async function listContentReviews(filters?: {
  status?: string;
  assignedReviewerId?: string;
  take?: number;
}) {
  const rows = await prisma.contentReviewSession.findMany({
    where: {
      ...(filters?.status ? { status: filters.status as never } : {}),
      ...(filters?.assignedReviewerId
        ? { assignedReviewerId: filters.assignedReviewerId }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: filters?.take ?? 50,
    include: {
      sections: { select: { status: true } },
      issues: { where: { status: "OPEN" }, select: { severity: true } },
    },
  });

  return Promise.all(
    rows.map(async (row) => {
      const plan = await prisma.writingPlanRecord.findUnique({
        where: { id: row.writingPlanId },
        select: { topicId: true, contentType: true },
      });
      const draft = await prisma.writingDraftRecord.findUnique({
        where: { id: row.writingDraftId },
        select: { status: true, version: true, qaReport: true },
      });
      // Only surface QA score — never return full report bodies to list/dashboard clients.
      const qaScore =
        draft?.qaReport && typeof draft.qaReport === "object" && draft.qaReport !== null
          ? Number((draft.qaReport as { score?: number }).score ?? 0)
          : null;
      const topic = plan
        ? await prisma.seoTopic.findUnique({
            where: { id: plan.topicId },
            select: { id: true, title: true },
          })
        : null;
      const handoff = await prisma.contentHandoffRecord.findFirst({
        where: {
          writingDraftId: row.writingDraftId,
          writingDraftVersion: row.writingDraftVersion,
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        select: { targetEntityId: true },
      });

      return {
        id: row.id,
        status: row.status,
        writingDraftId: row.writingDraftId,
        writingDraftVersion: row.writingDraftVersion,
        topicId: topic?.id ?? null,
        topicTitle: topic?.title ?? null,
        contentType: plan?.contentType ?? null,
        draftStatus: draft?.status ?? null,
        qaScore,
        blockingIssues: row.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR")
          .length,
        sectionProgress: {
          total: row.sections.length,
          approved: row.sections.filter((s) => s.status === "APPROVED").length,
          pending: row.sections.filter((s) => s.status === "PENDING").length,
          changesRequested: row.sections.filter((s) => s.status === "CHANGES_REQUESTED").length,
          rejected: row.sections.filter((s) => s.status === "REJECTED").length,
        },
        assignedReviewerId: row.assignedReviewerId,
        updatedAt: row.updatedAt,
        targetBlogId: handoff?.targetEntityId ?? null,
        readyForHandoff: row.status === "APPROVED",
      };
    })
  );
}

export async function evaluateContentReviewReadiness(
  reviewId: string
): Promise<ContentReviewReadiness> {
  const session = await prisma.contentReviewSession.findUnique({
    where: { id: reviewId },
    include: { sections: true, issues: true },
  });
  if (!session) {
    return {
      readyToStart: false,
      readyToApprove: false,
      score: 0,
      blockingIssues: ["Review not found"],
      warnings: [],
      blockers: [
        { group: "QA", code: "REVIEW_NOT_FOUND", message: "Review not found" },
      ],
      stale: false,
      reviewDraftVersion: 0,
      latestDraftVersion: null,
      checklist: [],
      bulkApprove: { eligible: [], excluded: [], blockers: [] },
      sectionSummary: {
        total: 0,
        approved: 0,
        pending: 0,
        changesRequested: 0,
        rejected: 0,
        blocked: 0,
        stale: 0,
      },
    };
  }

  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: session.writingDraftId },
  });
  const plan = await prisma.writingPlanRecord.findUnique({
    where: { id: session.writingPlanId },
  });
  const context = plan
    ? await prisma.contentContextBuild.findUnique({ where: { id: plan.contextBuildId } })
    : null;

  const blockers: ReviewBlocker[] = [];
  const warnings: string[] = [];
  const addBlocker = (
    group: ReviewBlockerGroup,
    code: string,
    message: string,
    sectionId?: string | null
  ) => {
    blockers.push({ group, code, message, sectionId: sectionId ?? null });
  };

  const stale = Boolean(draft && draft.version !== session.writingDraftVersion);

  if (!draft) addBlocker("QA", "DRAFT_MISSING", "Draft missing");
  if (!isActiveReviewStatus(session.status)) {
    addBlocker(
      "DRAFT_VERSION",
      "REVIEW_NOT_EDITABLE",
      `Phiên kiểm duyệt ở trạng thái ${session.status} — không thể phê duyệt.`
    );
  }
  if (stale) {
    addBlocker(
      "DRAFT_VERSION",
      "DRAFT_VERSION_CHANGED",
      `Draft version changed — start a new review session (review v${session.writingDraftVersion} · draft v${draft?.version})`
    );
  }
  if (plan?.status === "SUPERSEDED") addBlocker("QA", "PLAN_SUPERSEDED", "Writing Plan superseded");
  if (context?.status === "SUPERSEDED") {
    addBlocker("QA", "CONTEXT_SUPERSEDED", "Context Build superseded");
  }

  if (plan?.briefId && context?.packageJson && typeof context.packageJson === "object") {
    const pkg = context.packageJson as {
      entity?: { briefVersion?: number };
      brief?: { version?: number; approved?: boolean };
    };
    const briefVersion = pkg.entity?.briefVersion ?? pkg.brief?.version;
    const brief = await prisma.seoContentBrief.findUnique({ where: { topicId: plan.topicId } });
    if (brief && briefVersion != null && Number(brief.version) !== Number(briefVersion)) {
      addBlocker("QA", "BRIEF_VERSION_MISMATCH", "Brief version mismatch — rebuild context");
    }
  }

  const structured = draft ? parseDraftJson(draft as never) : null;
  const planJson = plan ? parsePlanJson(plan as never) : null;
  const liveQa = structured && planJson ? runWritingQa(planJson, structured) : null;
  const liveHardIssues =
    liveQa?.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR") ?? [];
  const issueKey = (code: string, sectionId?: string | null) => `${code}:${sectionId ?? ""}`;
  const liveHardKeys = new Set(liveHardIssues.map((i) => issueKey(i.code, i.sectionId)));

  const openBlocking = session.issues.filter(
    (i) =>
      i.status === "OPEN" && (i.severity === "BLOCKING" || i.severity === "ERROR")
  );
  const seededOpenKeys = new Set(openBlocking.map((i) => issueKey(i.code, i.sectionId)));

  for (const issue of openBlocking) {
    // Seeded issues are a snapshot of QA at review creation. When the current
    // draft no longer reproduces them, they are historical noise — surfaced as
    // a warning instead of a phantom blocker. Live QA below remains the gate.
    if (liveQa && !liveHardKeys.has(issueKey(issue.code, issue.sectionId))) {
      warnings.push(`Vấn đề QA cũ không còn tái hiện trên bản nháp hiện tại: ${issue.code}`);
      continue;
    }
    addBlocker(
      blockerGroupForCode(issue.code),
      issue.code,
      `${issue.code}: ${issue.message}`,
      issue.sectionId
    );
  }

  for (const issue of liveHardIssues) {
    if (seededOpenKeys.has(issueKey(issue.code, issue.sectionId))) continue;
    addBlocker(
      blockerGroupForCode(issue.code),
      issue.code,
      `Live QA: ${issue.message}`,
      issue.sectionId ?? null
    );
  }
  for (const issue of liveQa?.issues ?? []) {
    if (issue.severity === "WARNING") warnings.push(`Live QA: ${issue.message}`);
  }

  const requiredSectionIds = new Set(
    planJson ? planJson.sections.filter((s) => s.required).map((s) => s.id) : []
  );

  const staleSectionIds = new Set<string>();
  let pendingRequiredSections = 0;

  for (const section of session.sections) {
    const isRequired = requiredSectionIds.size === 0 || requiredSectionIds.has(section.sectionId);

    if (isRequired) {
      if (section.status === "REJECTED") {
        addBlocker(
          "SECTION_APPROVALS",
          "SECTION_REJECTED",
          `Section rejected: ${section.heading}`,
          section.sectionId
        );
      }
      if (section.status === "CHANGES_REQUESTED") {
        addBlocker(
          "SECTION_APPROVALS",
          "SECTION_CHANGES_REQUESTED",
          `Changes requested: ${section.heading}`,
          section.sectionId
        );
      }
      if (section.status === "PENDING" || section.status === "LOCKED") {
        pendingRequiredSections += 1;
        addBlocker(
          "SECTION_APPROVALS",
          "SECTION_NOT_APPROVED",
          `Required section not approved: ${section.heading}`,
          section.sectionId
        );
      }
    }

    // Invalidate stale approvals if content hash drifted
    if (section.status === "APPROVED" && section.approvedContentHash && structured) {
      const current = structured.sections.find((s) => s.sectionId === section.sectionId);
      if (current && hashSectionContent(current) !== section.approvedContentHash) {
        staleSectionIds.add(section.sectionId);
        addBlocker(
          "SECTION_APPROVALS",
          "SECTION_CONTENT_CHANGED",
          `Approved section content changed: ${section.heading}`,
          section.sectionId
        );
      }
    }
  }

  const requiredFactBySection = new Map<string, string[]>();
  for (const usage of planJson?.factPlan.usages ?? []) {
    if (!usage.required || isMediaFactId(usage.factId)) continue;
    requiredFactBySection.set(usage.sectionId, [
      ...(requiredFactBySection.get(usage.sectionId) ?? []),
      usage.factId,
    ]);
  }

  const candidates: BulkApproveSectionCandidate[] = session.sections.map((section) => {
    const draftSection = structured?.sections.find((s) => s.sectionId === section.sectionId);
    const sectionIssues = liveHardIssues.filter((i) => i.sectionId === section.sectionId);
    const unsafeClaims = (liveQa?.issues ?? []).filter(
      (i) => i.sectionId === section.sectionId && UNSAFE_CLAIM_CODES.has(i.code)
    );
    const missingFacts = (requiredFactBySection.get(section.sectionId) ?? []).filter(
      (factId) => !(draftSection?.factIdsUsed ?? []).includes(factId)
    );
    return {
      sectionId: section.sectionId,
      heading: section.heading,
      status: section.status,
      hasContent: Boolean(draftSection?.plainText?.trim()),
      hasBlockingQaIssue: sectionIssues.length > 0,
      hasUnresolvedRequiredFact: missingFacts.length > 0,
      hasUnsafeClaim: unsafeClaims.length > 0,
      isStale: staleSectionIds.has(section.sectionId),
    };
  });

  const bulkApprove = selectBulkApprovableSections({ reviewIsStale: stale, sections: candidates });

  const blockedSections = new Set(
    blockers
      .filter((b) => b.group === "SECTION_APPROVALS" && b.code !== "SECTION_NOT_APPROVED")
      .map((b) => b.sectionId)
      .filter((id): id is string => Boolean(id))
  );
  for (const candidate of candidates) {
    if (candidate.hasBlockingQaIssue || candidate.hasUnresolvedRequiredFact) {
      blockedSections.add(candidate.sectionId);
    }
  }

  const sectionSummary = {
    total: session.sections.length,
    approved: session.sections.filter((s) => s.status === "APPROVED").length,
    pending: session.sections.filter((s) => s.status === "PENDING").length,
    changesRequested: session.sections.filter((s) => s.status === "CHANGES_REQUESTED").length,
    rejected: session.sections.filter((s) => s.status === "REJECTED").length,
    blocked: blockedSections.size,
    stale: stale ? session.sections.length : staleSectionIds.size,
  };

  const requiredSectionsApproved =
    requiredSectionIds.size === 0
      ? sectionSummary.approved === sectionSummary.total
      : [...requiredSectionIds].every((id) =>
          session.sections.some((s) => s.sectionId === id && s.status === "APPROVED")
        );

  const hasGroup = (group: ReviewBlockerGroup) => blockers.some((b) => b.group === group);
  const mediaReady = !liveHardIssues.some((i) => MEDIA_ISSUE_CODES.has(i.code));

  const checklist = buildApprovalChecklist({
    usesLatestDraft: Boolean(draft) && !stale,
    requiredFactsSatisfied: !hasGroup("REQUIRED_FACTS"),
    faqValid: !hasGroup("FAQ"),
    requiredSectionsApproved,
    blockingQaCleared: !hasGroup("QA"),
    mediaReady,
    latestDraftVersion: draft?.version ?? null,
    reviewDraftVersion: session.writingDraftVersion,
    pendingRequiredSections,
  });

  const blockingIssues = blockers.map((b) => b.message);
  const score = Math.max(0, 100 - blockingIssues.length * 15 - warnings.length * 3);

  return {
    readyToStart: true,
    readyToApprove:
      !stale &&
      blockers.length === 0 &&
      sectionSummary.rejected === 0 &&
      sectionSummary.changesRequested === 0 &&
      requiredSectionsApproved,
    score,
    blockingIssues,
    warnings,
    blockers,
    stale,
    reviewDraftVersion: session.writingDraftVersion,
    latestDraftVersion: draft?.version ?? null,
    checklist,
    bulkApprove,
    sectionSummary,
  };
}

async function assertReviewEditable(reviewId: string) {
  const session = await prisma.contentReviewSession.findUnique({ where: { id: reviewId } });
  if (!session) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);
  if (!isActiveReviewStatus(session.status)) {
    throw new ContentReviewError("Review không còn editable", "REVIEW_NOT_EDITABLE", 409);
  }
  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: session.writingDraftId },
  });
  if (!draft) throw new ContentReviewError("Draft not found", "DRAFT_NOT_FOUND", 404);
  if (draft.version !== session.writingDraftVersion) {
    throw new ContentReviewError(
      "Draft version changed — tạo review mới",
      "VERSION_MISMATCH",
      409
    );
  }
  return { session, draft };
}

export async function approveReviewSection(input: {
  reviewId: string;
  sectionId: string;
  actorId: string;
  note?: string | null;
}) {
  const { session, draft } = await assertReviewEditable(input.reviewId);
  const structured = parseDraftJson(draft as never);
  const section = structured.sections.find((s) => s.sectionId === input.sectionId);
  if (!section) throw new ContentReviewError("Section not found", "SECTION_NOT_FOUND", 404);

  const contentHash = hashSectionContent(section);

  await prisma.$transaction(async (tx) => {
    await tx.contentReviewSection.update({
      where: {
        reviewSessionId_sectionId: {
          reviewSessionId: input.reviewId,
          sectionId: input.sectionId,
        },
      },
      data: {
        status: "APPROVED",
        reviewerId: input.actorId,
        reviewerNotes: input.note ?? null,
        reviewedAt: new Date(),
        approvedContentHash: contentHash,
      },
    });

    await tx.contentReviewDecision.create({
      data: {
        reviewSessionId: input.reviewId,
        decisionType: "APPROVE_SECTION",
        sectionId: input.sectionId,
        actorId: input.actorId,
        note: input.note ?? null,
        metadata: { contentHash },
      },
    });

    const locks = lockSection(
      parseSectionLocks(draft.sectionLocks),
      input.sectionId,
      "USER_APPROVED",
      input.actorId,
      "Approved in review"
    );
    await tx.writingDraftRecord.update({
      where: { id: draft.id },
      data: { sectionLocks: locks as Prisma.InputJsonValue },
    });
  });

  return getContentReviewSession(input.reviewId);
}

export type ReviewDraftChanges = {
  available: boolean;
  reviewDraftVersion: number;
  latestDraftVersion: number | null;
  addedSections: string[];
  removedSections: string[];
  modifiedSections: string[];
  faqCountBefore: number;
  faqCountAfter: number;
  qaScoreBefore: number | null;
  qaScoreAfter: number | null;
};

/** What changed in the Draft since this Review snapshot was taken. */
export async function getReviewDraftChanges(reviewId: string): Promise<ReviewDraftChanges> {
  const session = await prisma.contentReviewSession.findUnique({ where: { id: reviewId } });
  if (!session) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);

  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: session.writingDraftId },
  });
  const snapshot = await prisma.writingDraftVersion.findFirst({
    where: { writingDraftId: session.writingDraftId, version: session.writingDraftVersion },
    orderBy: { createdAt: "desc" },
  });

  const empty: ReviewDraftChanges = {
    available: false,
    reviewDraftVersion: session.writingDraftVersion,
    latestDraftVersion: draft?.version ?? null,
    addedSections: [],
    removedSections: [],
    modifiedSections: [],
    faqCountBefore: 0,
    faqCountAfter: 0,
    qaScoreBefore: null,
    qaScoreAfter: null,
  };
  if (!draft || !snapshot) return empty;

  const before = snapshot.structuredDraft as unknown as WritingStructuredDraft | null;
  const after = parseDraftJson(draft as never);
  if (!before?.sections) return empty;

  const beforeById = new Map(before.sections.map((s) => [s.sectionId, s]));
  const afterById = new Map(after.sections.map((s) => [s.sectionId, s]));

  const addedSections = after.sections
    .filter((s) => !beforeById.has(s.sectionId))
    .map((s) => s.heading);
  const removedSections = before.sections
    .filter((s) => !afterById.has(s.sectionId))
    .map((s) => s.heading);
  const modifiedSections = after.sections
    .filter((s) => {
      const prev = beforeById.get(s.sectionId);
      return prev != null && hashSectionContent(prev) !== hashSectionContent(s);
    })
    .map((s) => s.heading);

  return {
    available: true,
    reviewDraftVersion: session.writingDraftVersion,
    latestDraftVersion: draft.version,
    addedSections,
    removedSections,
    modifiedSections,
    faqCountBefore: before.faq?.length ?? 0,
    faqCountAfter: after.faq?.length ?? 0,
    qaScoreBefore: before.qa?.score ?? null,
    qaScoreAfter: after.qa?.score ?? null,
  };
}

export type ReviewSuccessor = {
  id: string;
  status: string;
  writingDraftVersion: number;
  createdAt: Date;
};

/** The Review that replaced this one, if a restart already happened. */
export async function findSuccessorReview(session: {
  id: string;
  writingDraftId: string;
  createdAt: Date;
}): Promise<ReviewSuccessor | null> {
  return prisma.contentReviewSession.findFirst({
    where: {
      writingDraftId: session.writingDraftId,
      id: { not: session.id },
      createdAt: { gte: session.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, writingDraftVersion: true, createdAt: true },
  });
}

/**
 * Governed restart: open a new Review on the latest Draft version and supersede
 * the old one in the same transaction, so a failed creation can never leave a
 * superseded Review without a successor. History is preserved and no approval
 * state is carried over.
 */
export async function restartContentReview(input: {
  reviewId: string;
  actorId: string;
  note?: string | null;
}) {
  const session = await prisma.contentReviewSession.findUnique({ where: { id: input.reviewId } });
  if (!session) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);

  const successor = await findSuccessorReview(session);
  if (successor) {
    throw new ContentReviewError(
      "Phiên kiểm duyệt mới đã tồn tại — mở phiên đó để tiếp tục.",
      "SUCCESSOR_EXISTS",
      409,
      {
        successorReviewId: successor.id,
        adminRoute: `/admin/content/reviews/${successor.id}`,
      }
    );
  }

  const isActive = isActiveReviewStatus(session.status);
  const isOrphanedSupersede = session.status === "SUPERSEDED";
  if (!isActive && !isOrphanedSupersede) {
    throw new ContentReviewError(
      "Chỉ tạo phiên mới từ phiên đang mở hoặc phiên bị thay thế mà chưa có phiên kế nhiệm.",
      "REVIEW_NOT_RESTARTABLE",
      409
    );
  }

  const inputs = await loadReviewCreationInputs(session.writingDraftId);
  const draft = inputs.draft;
  if (isActive && draft.version === session.writingDraftVersion) {
    throw new ContentReviewError(
      "Phiên kiểm duyệt đang dùng bản nháp mới nhất.",
      "REVIEW_NOT_STALE",
      409
    );
  }
  await assertNoActiveReviewForVersion(draft.id, draft.version);

  const reason = isOrphanedSupersede ? "ORPHANED_SUPERSEDE_RECOVERY" : "STALE_DRAFT_VERSION";
  const created = await prisma.$transaction(async (tx) => {
    const newSession = await createReviewSessionInTx(tx, inputs, {
      actorId: input.actorId,
      assignedReviewerId: session.assignedReviewerId ?? input.actorId,
    });

    await tx.contentReviewDecision.create({
      data: {
        reviewSessionId: session.id,
        decisionType: "REOPEN_DRAFT",
        actorId: input.actorId,
        note:
          input.note?.trim() ||
          `Superseded: draft v${session.writingDraftVersion} → v${draft.version} (successor ${newSession.id})`,
        metadata: {
          reason,
          previousDraftVersion: session.writingDraftVersion,
          latestDraftVersion: draft.version,
          successorReviewId: newSession.id,
        },
      },
    });

    if (session.status !== "SUPERSEDED") {
      await tx.contentReviewSession.update({
        where: { id: session.id },
        data: { status: "SUPERSEDED", completedAt: new Date() },
      });
    }

    // Keep the governed Blog linkage pointing at the active review session.
    await tx.blogPost.updateMany({
      where: { sourceReviewSessionId: session.id },
      data: {
        sourceReviewSessionId: newSession.id,
        sourceWritingDraftVersion: draft.version,
      },
    });

    return newSession;
  }, REVIEW_TX_OPTIONS);

  return {
    previousReviewId: session.id,
    recovered: isOrphanedSupersede,
    ...(await getContentReviewSession(created.id)),
  };
}

export type BulkApproveResult = {
  approvedSectionIds: string[];
  skipped: Array<{ sectionId: string; heading: string; reason: string }>;
};

/**
 * Explicit human bulk approval of sections that are clean on the current Draft
 * version. Requires confirmation and never runs automatically.
 */
export async function bulkApproveEligibleSections(input: {
  reviewId: string;
  actorId: string;
  confirmed: boolean;
  note?: string | null;
}): Promise<BulkApproveResult & { review: Awaited<ReturnType<typeof getContentReviewSession>> }> {
  if (!input.confirmed) {
    throw new ContentReviewError(
      "Cần xác nhận của người duyệt trước khi duyệt hàng loạt.",
      "CONFIRMATION_REQUIRED",
      400
    );
  }

  const { draft } = await assertReviewEditable(input.reviewId);
  const readiness = await evaluateContentReviewReadiness(input.reviewId);
  if (readiness.stale) {
    throw new ContentReviewError(
      "Draft version changed — tạo review mới",
      "VERSION_MISMATCH",
      409
    );
  }

  const eligible = readiness.bulkApprove.eligible;
  if (eligible.length === 0) {
    throw new ContentReviewError(
      "Không có đoạn nào đủ điều kiện duyệt hàng loạt.",
      "NO_ELIGIBLE_SECTIONS",
      422
    );
  }

  const structured = parseDraftJson(draft as never);

  await prisma.$transaction(async (tx) => {
    let locks = parseSectionLocks(draft.sectionLocks);
    for (const target of eligible) {
      const section = structured.sections.find((s) => s.sectionId === target.sectionId);
      if (!section) continue;
      const contentHash = hashSectionContent(section);

      await tx.contentReviewSection.update({
        where: {
          reviewSessionId_sectionId: {
            reviewSessionId: input.reviewId,
            sectionId: target.sectionId,
          },
        },
        data: {
          status: "APPROVED",
          reviewerId: input.actorId,
          reviewerNotes: input.note ?? null,
          reviewedAt: new Date(),
          approvedContentHash: contentHash,
        },
      });

      await tx.contentReviewDecision.create({
        data: {
          reviewSessionId: input.reviewId,
          decisionType: "APPROVE_SECTION",
          sectionId: target.sectionId,
          actorId: input.actorId,
          note: input.note ?? "Bulk approval (human confirmed)",
          metadata: { contentHash, bulk: true },
        },
      });

      locks = lockSection(
        locks,
        target.sectionId,
        "USER_APPROVED",
        input.actorId,
        "Bulk approved in review"
      );
    }

    await tx.writingDraftRecord.update({
      where: { id: draft.id },
      data: { sectionLocks: locks as Prisma.InputJsonValue },
    });
  });

  return {
    approvedSectionIds: eligible.map((e) => e.sectionId),
    skipped: readiness.bulkApprove.excluded.map((e) => ({
      sectionId: e.sectionId,
      heading: e.heading,
      reason: e.reason,
    })),
    review: await getContentReviewSession(input.reviewId),
  };
}

export async function requestSectionChanges(input: {
  reviewId: string;
  sectionId: string;
  actorId: string;
  note: string;
}) {
  if (!input.note.trim()) {
    throw new ContentReviewError("Ghi chú bắt buộc khi request changes", "NOTE_REQUIRED", 400);
  }
  await assertReviewEditable(input.reviewId);

  await prisma.$transaction(async (tx) => {
    await tx.contentReviewSection.update({
      where: {
        reviewSessionId_sectionId: {
          reviewSessionId: input.reviewId,
          sectionId: input.sectionId,
        },
      },
      data: {
        status: "CHANGES_REQUESTED",
        reviewerId: input.actorId,
        reviewerNotes: input.note,
        reviewedAt: new Date(),
        approvedContentHash: null,
      },
    });
    await tx.contentReviewDecision.create({
      data: {
        reviewSessionId: input.reviewId,
        decisionType: "REQUEST_CHANGES",
        sectionId: input.sectionId,
        actorId: input.actorId,
        note: input.note,
      },
    });
    await tx.contentReviewSession.update({
      where: { id: input.reviewId },
      data: { status: "CHANGES_REQUESTED" },
    });
  });

  return getContentReviewSession(input.reviewId);
}

export async function rejectReviewSection(input: {
  reviewId: string;
  sectionId: string;
  actorId: string;
  note: string;
}) {
  if (!input.note.trim()) {
    throw new ContentReviewError("Lý do reject bắt buộc", "NOTE_REQUIRED", 400);
  }
  await assertReviewEditable(input.reviewId);

  await prisma.$transaction(async (tx) => {
    await tx.contentReviewSection.update({
      where: {
        reviewSessionId_sectionId: {
          reviewSessionId: input.reviewId,
          sectionId: input.sectionId,
        },
      },
      data: {
        status: "REJECTED",
        reviewerId: input.actorId,
        reviewerNotes: input.note,
        reviewedAt: new Date(),
        approvedContentHash: null,
      },
    });
    await tx.contentReviewDecision.create({
      data: {
        reviewSessionId: input.reviewId,
        decisionType: "REJECT_SECTION",
        sectionId: input.sectionId,
        actorId: input.actorId,
        note: input.note,
      },
    });
  });

  return getContentReviewSession(input.reviewId);
}

export async function resolveReviewIssue(input: {
  reviewId: string;
  issueId: string;
  actorId: string;
  action: "resolve" | "dismiss" | "reopen";
  note?: string | null;
  canDismissBlocking?: boolean;
}) {
  const issue = await prisma.contentReviewIssue.findUnique({ where: { id: input.issueId } });
  if (!issue || issue.reviewSessionId !== input.reviewId) {
    throw new ContentReviewError("Issue not found", "ISSUE_NOT_FOUND", 404);
  }
  await assertReviewEditable(input.reviewId);

  if (
    input.action === "dismiss" &&
    (issue.severity === "BLOCKING" || issue.severity === "ERROR") &&
    !input.canDismissBlocking
  ) {
    throw new ContentReviewError(
      "Không thể dismiss BLOCKING/ERROR issue (cần quyền cao).",
      "DISMISS_FORBIDDEN",
      403
    );
  }

  if (input.action === "dismiss" && !input.note?.trim()) {
    throw new ContentReviewError("Dismiss cần lý do", "NOTE_REQUIRED", 400);
  }

  const status =
    input.action === "resolve" ? "RESOLVED" : input.action === "dismiss" ? "DISMISSED" : "OPEN";

  await prisma.contentReviewIssue.update({
    where: { id: input.issueId },
    data: {
      status,
      resolvedBy: input.action === "reopen" ? null : input.actorId,
      resolvedAt: input.action === "reopen" ? null : new Date(),
      metadata: {
        ...((issue.metadata as object) ?? {}),
        lastActionNote: input.note ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  return getContentReviewSession(input.reviewId);
}

export async function approveWritingDraftReview(input: {
  reviewId: string;
  actorId: string;
  note?: string | null;
}) {
  // Superseded/closed sessions can never be approved, even if their snapshot
  // once satisfied every gate.
  const { draft } = await assertReviewEditable(input.reviewId);

  const readiness = await evaluateContentReviewReadiness(input.reviewId);
  if (!readiness.readyToApprove) {
    const groups = groupApprovalBlockers(readiness.blockers);
    throw new ContentReviewError(approvalToastMessage(groups), "NOT_READY", 422, {
      groups,
      stale: readiness.stale,
      checklist: readiness.checklist,
    });
  }

  const structured = parseDraftJson(draft as never);
  const rendered = renderDraftOutputs(structured);
  const approvedDraft = {
    ...structured,
    rendered,
    status: "APPROVED" as const,
    updatedAt: new Date().toISOString(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.contentReviewSession.update({
      where: { id: input.reviewId },
      data: {
        status: "APPROVED",
        approvedBy: input.actorId,
        approvedAt: new Date(),
        completedAt: new Date(),
        finalNotes: input.note ?? null,
      },
    });

    let locks = parseSectionLocks(draft.sectionLocks);
    for (const section of structured.sections) {
      locks = lockSection(locks, section.sectionId, "USER_APPROVED", input.actorId, "Final approval");
    }

    await tx.writingDraftRecord.update({
      where: { id: draft.id },
      data: {
        status: "APPROVED",
        approvedBy: input.actorId,
        approvedAt: new Date(),
        structuredDraft: approvedDraft as Prisma.InputJsonValue,
        renderedHtml: rendered.html,
        renderedMarkdown: rendered.markdown,
        sectionLocks: locks as Prisma.InputJsonValue,
        version: draft.version,
      },
    });

    await tx.writingDraftVersion.create({
      data: {
        writingDraftId: draft.id,
        version: draft.version,
        reason: "final_approval",
        structuredDraft: approvedDraft as Prisma.InputJsonValue,
        qaReport: approvedDraft.qa as Prisma.InputJsonValue,
        createdBy: input.actorId,
      },
    }).catch(async () => {
      // unique constraint if snapshot already exists for version — update skip
    });

    await tx.contentReviewDecision.create({
      data: {
        reviewSessionId: input.reviewId,
        decisionType: "APPROVE_DRAFT",
        actorId: input.actorId,
        note: input.note ?? null,
      },
    });
  });

  return getContentReviewSession(input.reviewId);
}

export async function rejectWritingDraftReview(input: {
  reviewId: string;
  actorId: string;
  note: string;
}) {
  if (!input.note.trim()) {
    throw new ContentReviewError("Lý do reject bắt buộc", "NOTE_REQUIRED", 400);
  }
  await assertReviewEditable(input.reviewId);

  await prisma.$transaction(async (tx) => {
    await tx.contentReviewSession.update({
      where: { id: input.reviewId },
      data: {
        status: "REJECTED",
        rejectedBy: input.actorId,
        rejectedAt: new Date(),
        completedAt: new Date(),
        finalNotes: input.note,
      },
    });
    const session = await tx.contentReviewSession.findUnique({ where: { id: input.reviewId } });
    if (session) {
      await tx.writingDraftRecord.update({
        where: { id: session.writingDraftId },
        data: { status: "REJECTED" },
      });
    }
    await tx.contentReviewDecision.create({
      data: {
        reviewSessionId: input.reviewId,
        decisionType: "REJECT_DRAFT",
        actorId: input.actorId,
        note: input.note,
      },
    });
  });

  return getContentReviewSession(input.reviewId);
}

export async function reopenWritingDraftReview(input: {
  reviewId: string;
  actorId: string;
  note?: string | null;
}) {
  const session = await prisma.contentReviewSession.findUnique({ where: { id: input.reviewId } });
  if (!session) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);
  if (!["APPROVED", "REJECTED"].includes(session.status)) {
    throw new ContentReviewError("Chỉ reopen APPROVED/REJECTED", "INVALID_STATUS", 409);
  }

  await prisma.$transaction(async (tx) => {
    await tx.contentReviewSession.update({
      where: { id: input.reviewId },
      data: {
        status: "IN_REVIEW",
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        completedAt: null,
      },
    });
    await tx.writingDraftRecord.update({
      where: { id: session.writingDraftId },
      data: { status: "REVIEW_READY", approvedBy: null, approvedAt: null },
    });
    await tx.contentReviewDecision.create({
      data: {
        reviewSessionId: input.reviewId,
        decisionType: "REOPEN_DRAFT",
        actorId: input.actorId,
        note: input.note ?? null,
      },
    });
  });

  return getContentReviewSession(input.reviewId);
}

export async function refreshReviewIssuesFromQa(reviewId: string, actorId: string) {
  const { session, draft } = await assertReviewEditable(reviewId);
  const plan = await prisma.writingPlanRecord.findUnique({ where: { id: session.writingPlanId } });
  if (!plan) throw new ContentReviewError("Plan not found", "PLAN_NOT_FOUND", 404);

  const structured = parseDraftJson(draft as never);
  const planJson = parsePlanJson(plan as never);
  const qa = runWritingQa(planJson, structured);

  const existing = await prisma.contentReviewIssue.findMany({
    where: { reviewSessionId: reviewId },
  });

  const openCodes = new Set(
    existing.filter((i) => i.status === "OPEN").map((i) => `${i.code}:${i.sectionId ?? ""}`)
  );

  for (const seed of qaIssuesToReviewSeeds(qa)) {
    const key = `${seed.code}:${seed.sectionId ?? ""}`;
    if (openCodes.has(key)) continue;
    const previouslyResolved = existing.find(
      (i) =>
        i.code === seed.code &&
        (i.sectionId ?? "") === (seed.sectionId ?? "") &&
        (i.status === "RESOLVED" || i.status === "DISMISSED")
    );
    // Reopen if underlying issue still exists and was resolved
    if (previouslyResolved) {
      await prisma.contentReviewIssue.update({
        where: { id: previouslyResolved.id },
        data: { status: "OPEN", resolvedAt: null, resolvedBy: null, message: seed.message },
      });
    } else {
      await prisma.contentReviewIssue.create({
        data: {
          reviewSessionId: reviewId,
          sectionId: seed.sectionId,
          code: seed.code,
          severity: seed.severity as never,
          message: seed.message,
          suggestedFix: seed.suggestedFix,
          source: "QA_RERUN",
          metadata: { ...seed.metadata, refreshedBy: actorId } as Prisma.InputJsonValue,
        },
      });
    }
  }

  await prisma.writingDraftRecord.update({
    where: { id: draft.id },
    data: {
      qaReport: qa as Prisma.InputJsonValue,
      structuredDraft: { ...structured, qa } as Prisma.InputJsonValue,
      status: qa.passed ? "REVIEW_READY" : "QA_FAILED",
    },
  });

  return getContentReviewSession(reviewId);
}

export type { WritingPlan, ContentReviewSeverity };
