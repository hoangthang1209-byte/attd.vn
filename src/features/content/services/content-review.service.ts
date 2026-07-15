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

export class ContentReviewError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "ContentReviewError";
    this.code = code;
    this.status = status;
  }
}

const ACTIVE_REVIEW = ["NOT_STARTED", "IN_REVIEW", "CHANGES_REQUESTED"] as const;

export async function startContentReview(input: {
  writingDraftId: string;
  actorId: string;
  assignedReviewerId?: string | null;
}) {
  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: input.writingDraftId },
  });
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

  const existing = await prisma.contentReviewSession.findFirst({
    where: {
      writingDraftId: draft.id,
      writingDraftVersion: draft.version,
      status: { in: [...ACTIVE_REVIEW] },
    },
  });
  if (existing) {
    throw new ContentReviewError(
      "Đã có review session active cho version này.",
      "ACTIVE_REVIEW_EXISTS",
      409
    );
  }

  // Supersede incomplete reviews for older versions
  await prisma.contentReviewSession.updateMany({
    where: {
      writingDraftId: draft.id,
      writingDraftVersion: { not: draft.version },
      status: { in: [...ACTIVE_REVIEW] },
    },
    data: { status: "SUPERSEDED" },
  });

  const structured = parseDraftJson(draft as never);
  const qa = (draft.qaReport as WritingStructuredDraft["qa"]) ?? structured.qa;
  const planJson = parsePlanJson(plan as never);

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.contentReviewSession.create({
      data: {
        writingDraftId: draft.id,
        writingDraftVersion: draft.version,
        writingPlanId: draft.writingPlanId,
        contextBuildId: plan.contextBuildId,
        status: "IN_REVIEW",
        assignedReviewerId: input.assignedReviewerId ?? input.actorId,
        startedBy: input.actorId,
        startedAt: new Date(),
      },
    });

    for (const section of structured.sections) {
      const planSection = planJson.sections.find((s) => s.id === section.sectionId);
      await tx.contentReviewSection.create({
        data: {
          reviewSessionId: created.id,
          sectionId: section.sectionId,
          sectionKey: planSection?.sectionKey ?? section.sectionId,
          heading: section.heading,
          status: "PENDING",
        },
      });
    }

    const seeds = qaIssuesToReviewSeeds(qa);
    for (const seed of seeds) {
      await tx.contentReviewIssue.create({
        data: {
          reviewSessionId: created.id,
          sectionId: seed.sectionId,
          code: seed.code,
          severity: seed.severity as never,
          status: "OPEN",
          message: seed.message,
          suggestedFix: seed.suggestedFix,
          source: seed.source,
          metadata: seed.metadata as Prisma.InputJsonValue,
        },
      });
    }

    return created;
  });

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

  return {
    session,
    draft,
    plan,
    structuredDraft: structured,
    writingPlan: planJson,
    readiness,
    versionMatch: draft ? draft.version === session.writingDraftVersion : false,
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
      });
      const qaScore =
        draft?.qaReport && typeof draft.qaReport === "object" && draft.qaReport !== null
          ? Number((draft.qaReport as { score?: number }).score ?? 0)
          : null;

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
      sectionSummary: { total: 0, approved: 0, pending: 0, changesRequested: 0, rejected: 0 },
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

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (!draft) blockingIssues.push("Draft missing");
  if (draft && draft.version !== session.writingDraftVersion) {
    blockingIssues.push("Draft version changed — start a new review session");
  }
  if (plan?.status === "SUPERSEDED") blockingIssues.push("Writing Plan superseded");
  if (context?.status === "SUPERSEDED") blockingIssues.push("Context Build superseded");

  if (plan?.briefId && context?.packageJson && typeof context.packageJson === "object") {
    const pkg = context.packageJson as {
      entity?: { briefVersion?: number };
      brief?: { version?: number; approved?: boolean };
    };
    const briefVersion = pkg.entity?.briefVersion ?? pkg.brief?.version;
    const brief = await prisma.seoContentBrief.findUnique({ where: { topicId: plan.topicId } });
    if (brief && briefVersion != null && Number(brief.version) !== Number(briefVersion)) {
      blockingIssues.push("Brief version mismatch — rebuild context");
    }
  }

  const openBlocking = session.issues.filter(
    (i) =>
      i.status === "OPEN" && (i.severity === "BLOCKING" || i.severity === "ERROR")
  );
  for (const issue of openBlocking) {
    blockingIssues.push(`${issue.code}: ${issue.message}`);
  }

  const requiredSectionIds = new Set(
    plan
      ? parsePlanJson(plan as never).sections.filter((s) => s.required).map((s) => s.id)
      : []
  );

  for (const section of session.sections) {
    if (requiredSectionIds.has(section.sectionId) || requiredSectionIds.size === 0) {
      if (section.status === "REJECTED") blockingIssues.push(`Section rejected: ${section.heading}`);
      if (section.status === "CHANGES_REQUESTED") {
        blockingIssues.push(`Changes requested: ${section.heading}`);
      }
      if (section.status !== "APPROVED" && section.status !== "LOCKED") {
        // LOCKED without approval still blocks final approval for required
        if (requiredSectionIds.has(section.sectionId) && section.status !== "APPROVED") {
          if (section.status === "PENDING") {
            blockingIssues.push(`Required section not approved: ${section.heading}`);
          }
        }
      }
    }

    // Invalidate stale approvals if content hash drifted
    if (section.status === "APPROVED" && section.approvedContentHash && draft) {
      const structured = parseDraftJson(draft as never);
      const current = structured.sections.find((s) => s.sectionId === section.sectionId);
      if (current && hashSectionContent(current) !== section.approvedContentHash) {
        blockingIssues.push(`Approved section content changed: ${section.heading}`);
      }
    }
  }

  if (draft) {
    const structured = parseDraftJson(draft as never);
    const planJson = plan ? parsePlanJson(plan as never) : null;
    if (planJson) {
      const qa = runWritingQa(planJson, structured);
      if (!qa.passed) {
        const hard = qa.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR");
        for (const i of hard) warnings.push(`Live QA: ${i.message}`);
        if (hard.length > 0) blockingIssues.push("Live QA has blocking/error issues");
      }
    }
  }

  const sectionSummary = {
    total: session.sections.length,
    approved: session.sections.filter((s) => s.status === "APPROVED").length,
    pending: session.sections.filter((s) => s.status === "PENDING").length,
    changesRequested: session.sections.filter((s) => s.status === "CHANGES_REQUESTED").length,
    rejected: session.sections.filter((s) => s.status === "REJECTED").length,
  };

  const score = Math.max(0, 100 - blockingIssues.length * 15 - warnings.length * 3);

  return {
    readyToStart: true,
    readyToApprove:
      blockingIssues.length === 0 &&
      sectionSummary.rejected === 0 &&
      sectionSummary.changesRequested === 0 &&
      (requiredSectionIds.size === 0
        ? sectionSummary.approved === sectionSummary.total
        : [...requiredSectionIds].every((id) =>
            session.sections.some((s) => s.sectionId === id && s.status === "APPROVED")
          )),
    score,
    blockingIssues,
    warnings,
    sectionSummary,
  };
}

async function assertReviewEditable(reviewId: string) {
  const session = await prisma.contentReviewSession.findUnique({ where: { id: reviewId } });
  if (!session) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);
  if (!ACTIVE_REVIEW.includes(session.status as (typeof ACTIVE_REVIEW)[number])) {
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
  const readiness = await evaluateContentReviewReadiness(input.reviewId);
  if (!readiness.readyToApprove) {
    throw new ContentReviewError(
      `Chưa đủ điều kiện approve: ${readiness.blockingIssues.join("; ")}`,
      "NOT_READY",
      422
    );
  }

  const session = await prisma.contentReviewSession.findUnique({ where: { id: input.reviewId } });
  if (!session) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);

  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: session.writingDraftId },
  });
  if (!draft) throw new ContentReviewError("Draft not found", "DRAFT_NOT_FOUND", 404);

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
