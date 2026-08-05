import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getContentGenerationConfig } from "@/features/content-generation/contracts/config";
import {
  ContentGenerationError,
  type BriefResult,
  type MetaResult,
  type SectionResult,
} from "@/features/content-generation/contracts/generation.types";
import { resolveContentGenerationProvider } from "@/features/content-generation/providers/registry";
import {
  buildProviderStatusSnapshot,
  type ProviderHealthSnapshot,
  type ProviderStatusRunRow,
} from "@/features/content-generation/services/provider-status.service";
import {
  buildProposalDetail,
  buildProviderComparison,
  type ProposalDetailView,
  type ProviderComparison,
} from "@/features/content-generation/services/proposal-detail.service";
import { mapPriorRunToRetryInput } from "@/features/content-generation/services/retry-mapping";
import {
  normalizeRunWarnings,
  withQualityFeedback,
  withRetriedByRunId,
  withRetryOfRunId,
  withRollbackSnapshot,
  withRolledBackAt,
  type RollbackSnapshot,
} from "@/features/content-generation/services/run-warnings";
import { buildQualityFeedback, validateQualityFeedbackInput } from "@/features/content-generation/services/quality-feedback";
import { assertSelectionNotStale, type StaleCheckInputSummary } from "@/features/content-generation/services/stale-check";
import {
  getUsageForTopicToday,
  getUsageForUserToday,
  getUsageForWorkspaceToday,
  getUsageLedgerSummary,
} from "@/features/content-generation/services/usage-ledger.service";
import {
  assembleContentGenerationContext,
  type ContentGenerationContextDeps,
  type ContextBuildLookup,
} from "@/features/content-generation/services/context-assembler.service";
import {
  applyProposal,
  cancelProposal,
  createProposal,
  rejectProposal,
  type ApplyProposalInput,
  type CreateProposalInput,
  type ProposalRunRecord,
  type ProposalServiceDeps,
  type ProposalStore,
} from "@/features/content-generation/services/proposal.service";
import { applySeoBriefSuggestion, SeoBriefApplyError } from "@/features/content/services/seo-brief-apply.service";
import { createPrismaSeoBriefApplyStore } from "@/features/content/services/seo-brief-ai.wiring";
import { SEO_BRIEF_APPLY_FIELD_KEYS, type SeoBriefApplyFieldKey } from "@/features/content/services/seo-brief-suggestion.types";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";
import { saveHumanEditedSection, WritingGenerationError } from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import type { WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";

function mapRun(row: Record<string, unknown>): ProposalRunRecord {
  return {
    ...(row as unknown as ProposalRunRecord),
    estimatedCostUsd: row.estimatedCostUsd == null ? null : Number(row.estimatedCostUsd as never),
  };
}

export function createPrismaProposalStore(): ProposalStore {
  return {
    async createRequested(data) {
      const row = await prisma.aiGenerationRun.create({
        data: {
          type: data.type as never,
          status: "PENDING",
          proposalStatus: "REQUESTED",
          provider: data.provider,
          model: data.model,
          promptVersion: data.promptVersion,
          entityType: data.entityType,
          entityId: data.entityId,
          contextBuildId: data.contextBuildId,
          writingPlanId: data.writingPlanId,
          writingDraftId: data.writingDraftId,
          sectionId: data.sectionId,
          templateId: data.templateId,
          templateVersion: data.templateVersion,
          retrievalRequestId: data.retrievalRequestId,
          inputHash: data.inputHash,
          inputSummary: data.inputSummary as Prisma.InputJsonValue,
          requestedBy: data.requestedBy,
          startedAt: new Date(),
        },
      });
      return mapRun(row);
    },
    async markRunning(id) {
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: { status: "RUNNING", proposalStatus: "RUNNING" },
      });
      return mapRun(row);
    },
    async markGenerated(id, data) {
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: {
          status: "COMPLETED",
          proposalStatus: "GENERATED",
          output: data.output as Prisma.InputJsonValue,
          warnings: data.warnings as Prisma.InputJsonValue,
          inputTokens: data.usage.inputTokens,
          outputTokens: data.usage.outputTokens,
          totalTokens: data.usage.totalTokens,
          estimatedCostUsd: data.usage.estimatedCostUsd,
          factIdsUsed: data.factIdsUsed as Prisma.InputJsonValue,
          mediaIdsUsed: data.mediaIdsUsed as Prisma.InputJsonValue,
          completedAt: new Date(),
          errorMessage: null,
        },
      });
      return mapRun(row);
    },
    async markValidationFailed(id, errorMessage) {
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: {
          status: "FAILED",
          proposalStatus: "VALIDATION_FAILED",
          errorMessage: errorMessage.slice(0, 2000),
          completedAt: new Date(),
        },
      });
      return mapRun(row);
    },
    async markFailed(id, errorMessage) {
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: {
          status: "FAILED",
          proposalStatus: "FAILED",
          errorMessage: errorMessage.slice(0, 2000),
          completedAt: new Date(),
        },
      });
      return mapRun(row);
    },
    async getById(id) {
      const row = await prisma.aiGenerationRun.findUnique({ where: { id } });
      return row ? mapRun(row) : null;
    },
    async markApplied(id, data) {
      let warnings: Prisma.InputJsonValue | undefined;
      if (data.rollbackSnapshot !== undefined) {
        const current = await prisma.aiGenerationRun.findUnique({ where: { id }, select: { warnings: true } });
        warnings = withRollbackSnapshot(current?.warnings, data.rollbackSnapshot as RollbackSnapshot) as Prisma.InputJsonValue;
      }
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: {
          proposalStatus: data.edited ? "EDITED_AND_APPLIED" : "APPLIED",
          appliedAt: new Date(),
          appliedBy: data.appliedBy,
          ...(warnings !== undefined ? { warnings } : {}),
        },
      });
      return mapRun(row);
    },
    async markRejected(id, rejectedBy) {
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: { proposalStatus: "REJECTED", rejectedAt: new Date(), rejectedBy },
      });
      return mapRun(row);
    },
    async markCancelled(id) {
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: { status: "CANCELLED", proposalStatus: "CANCELLED", completedAt: new Date() },
      });
      return mapRun(row);
    },
  };
}

export function createPrismaContentGenerationContextDeps(): ContentGenerationContextDeps {
  return {
    async getContextBuild(id) {
      const row = await prisma.contentContextBuild.findUnique({ where: { id } });
      return row as unknown as ContextBuildLookup | null;
    },
    async findLatestCompletedContextBuild(topicId) {
      const row = await prisma.contentContextBuild.findFirst({
        where: { topicId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
      });
      return row as unknown as ContextBuildLookup | null;
    },
    async getWritingPlan(id) {
      const row = await prisma.writingPlanRecord.findUnique({ where: { id } });
      return row ? { id: row.id, planJson: row.planJson } : null;
    },
    async getWritingDraft(id) {
      const row = await prisma.writingDraftRecord.findUnique({ where: { id } });
      return row ? { id: row.id, writingPlanId: row.writingPlanId, structuredDraft: row.structuredDraft } : null;
    },
    async getMediaAssetGovernance(ids) {
      if (ids.length === 0) return [];
      const rows = await prisma.mediaAsset.findMany({
        where: { id: { in: ids } },
        select: { id: true, lifecycleStatus: true, rightsStatus: true },
      });
      return rows;
    },
  };
}

function mapSeoBriefApplyErrorCode(code: string): "PROPOSAL_NOT_APPLICABLE" | "APPLY_CONFLICT" | "INVALID_REQUEST" {
  if (code === "APPROVED_CONFIRM_REQUIRED") return "APPLY_CONFLICT";
  if (code === "NO_FIELDS" || code === "NO_OUTPUT") return "INVALID_REQUEST";
  return "PROPOSAL_NOT_APPLICABLE";
}

/**
 * Reuses the existing seo-brief-apply.service pipeline (same field-level
 * apply, same "clears approval, never auto-approves" behavior) for
 * BRIEF_SUGGESTION / OUTLINE_SUGGESTION proposals instead of inventing a
 * parallel brief-write path.
 */
async function applyBriefLikeProposalAdapter(run: ProposalRunRecord, input: ApplyProposalInput): Promise<unknown> {
  const output = run.output as (BriefResult & Record<string, unknown>) | null;
  if (!output) {
    throw new ContentGenerationError("Đề xuất không có output.", "PROPOSAL_NOT_APPLICABLE");
  }

  const availableFields = (SEO_BRIEF_APPLY_FIELD_KEYS as readonly string[]).filter(
    (f) => output[f] !== undefined,
  ) as SeoBriefApplyFieldKey[];
  const fields = input.fields?.length
    ? (input.fields.filter((f) =>
        (SEO_BRIEF_APPLY_FIELD_KEYS as readonly string[]).includes(f),
      ) as SeoBriefApplyFieldKey[])
    : availableFields;

  if (fields.length === 0) {
    throw new ContentGenerationError("Không có field hợp lệ để áp dụng từ đề xuất này.", "PROPOSAL_NOT_APPLICABLE");
  }

  try {
    return await applySeoBriefSuggestion(
      {
        topicId: run.entityId,
        runId: run.id,
        fields,
        confirmApprovedOverwrite: input.confirmApprovedOverwrite === true,
      },
      createPrismaSeoBriefApplyStore(),
    );
  } catch (err) {
    if (err instanceof SeoBriefApplyError) {
      throw new ContentGenerationError(err.message, mapSeoBriefApplyErrorCode(err.code), err.status);
    }
    throw err;
  }
}

/**
 * Applies a SECTION_* proposal via the existing governed
 * saveHumanEditedSection path (sanitizes HTML, reruns Writing QA, locks the
 * section as USER_EDITED). Draft status can land on REVIEW_READY or
 * QA_FAILED — never auto-approved.
 */
async function applySectionProposalAdapter(run: ProposalRunRecord, input: ApplyProposalInput): Promise<unknown> {
  if (!run.writingDraftId || !run.sectionId) {
    throw new ContentGenerationError("Đề xuất section thiếu writingDraftId/sectionId.", "PROPOSAL_NOT_APPLICABLE");
  }

  const store = createPrismaGenerationOrchestratorStore();
  const draftRow = await store.findDraft(run.writingDraftId);
  if (!draftRow) {
    throw new ContentGenerationError("Không tìm thấy bản nháp.", "DRAFT_NOT_FOUND");
  }

  const inputSummary = (run.inputSummary ?? {}) as StaleCheckInputSummary;
  assertSelectionNotStale(inputSummary, draftRow.version);

  const output = (input.editedOutput ?? run.output) as SectionResult | null;
  if (!output?.html) {
    throw new ContentGenerationError("Đề xuất section không có nội dung html.", "PROPOSAL_NOT_APPLICABLE");
  }

  // Sprint 18.0 — capture a rollback snapshot of the section BEFORE
  // overwriting it, so POST /api/content/generation/[id]/rollback can
  // restore this exact html/version later without a migration (stored in
  // AiGenerationRun.warnings by applyProposal → store.markApplied).
  const structuredBefore = draftRow.structuredDraft as WritingStructuredDraft;
  const previousSection = structuredBefore.sections.find((s) => s.sectionId === run.sectionId);
  const rollback: RollbackSnapshot = {
    draftId: run.writingDraftId,
    sectionId: run.sectionId,
    previousHtml: previousSection?.html ?? null,
    previousPlainText: previousSection?.plainText ?? null,
    previousVersion: draftRow.version,
    capturedAt: new Date().toISOString(),
  };

  try {
    const { draft, version } = await saveHumanEditedSection(
      {
        draftId: run.writingDraftId,
        sectionId: run.sectionId,
        html: output.html,
        plainText: output.plainText,
        lockAfterSave: true,
        editedBy: input.appliedBy ?? null,
      },
      store,
    );
    return {
      writingDraftId: run.writingDraftId,
      sectionId: run.sectionId,
      version,
      draftStatus: draft.status,
      rollback,
    };
  } catch (err) {
    if (err instanceof WritingGenerationError) {
      throw new ContentGenerationError(err.message, "APPLY_CONFLICT", err.status);
    }
    throw err;
  }
}

/**
 * META_SUGGESTION updates draft-level metaTitle/metaDescription only (never
 * the slug of a published record). FAQ/CTA suggestions are recorded as
 * accepted-only in this foundation sprint — see docs/operations for the
 * follow-up needed to merge them into WritingStructuredDraft.faq/cta safely.
 */
async function applyMetaLikeProposalAdapter(run: ProposalRunRecord, input: ApplyProposalInput): Promise<unknown> {
  if (run.type !== "META_SUGGESTION") {
    return {
      accepted: true,
      note: "Đã ghi nhận chấp nhận đề xuất — chưa tự động ghi vào draft (cần wiring tiếp theo cho FAQ/CTA).",
    };
  }

  if (!run.writingDraftId) {
    throw new ContentGenerationError("Đề xuất meta thiếu writingDraftId.", "PROPOSAL_NOT_APPLICABLE");
  }

  const store = createPrismaGenerationOrchestratorStore();
  const draftRow = await store.findDraft(run.writingDraftId);
  if (!draftRow) {
    throw new ContentGenerationError("Không tìm thấy bản nháp.", "DRAFT_NOT_FOUND");
  }

  const structured = draftRow.structuredDraft as WritingStructuredDraft;
  const output = (input.editedOutput ?? run.output) as MetaResult;
  const next: WritingStructuredDraft = {
    ...structured,
    metaTitle: output.metaTitle,
    metaDescription: output.metaDescription,
    updatedAt: new Date().toISOString(),
  };
  await store.updateDraft(run.writingDraftId, { structuredDraft: next });
  return { writingDraftId: run.writingDraftId, metaTitle: next.metaTitle, metaDescription: next.metaDescription };
}

/** Sprint 18.0 — real DB-backed quota lookups, injected into proposal.service.ts's pure assertQuotaAllowed. */
function createLedgerQuotaUsageDeps() {
  return {
    async getWorkspaceToday() {
      const usage = await getUsageForWorkspaceToday();
      return { totalRuns: usage.totalRuns, totalCostUsd: usage.totalCostUsd };
    },
    async getUserToday(userId: string) {
      const usage = await getUsageForUserToday(userId);
      return { totalRuns: usage.totalRuns, totalCostUsd: usage.totalCostUsd };
    },
    async getTopicToday(topicId: string) {
      const usage = await getUsageForTopicToday(topicId);
      return { totalRuns: usage.totalRuns, totalCostUsd: usage.totalCostUsd };
    },
    async getMonthToDate() {
      const summary = await getUsageLedgerSummary();
      return { totalRuns: summary.month.totalRuns, totalCostUsd: summary.month.totalCostUsd };
    },
  };
}

export function createDefaultProposalServiceDeps(): ProposalServiceDeps {
  const contextDeps = createPrismaContentGenerationContextDeps();
  return {
    store: createPrismaProposalStore(),
    assembleContext: (input) => assembleContentGenerationContext(input, contextDeps),
    resolveProvider: (config) => resolveContentGenerationProvider(config),
    async getDraftVersion(writingDraftId) {
      const row = await prisma.writingDraftRecord.findUnique({
        where: { id: writingDraftId },
        select: { version: true },
      });
      return row?.version ?? null;
    },
    applyBriefProposal: applyBriefLikeProposalAdapter,
    applySectionProposal: applySectionProposalAdapter,
    applyMetaLikeProposal: applyMetaLikeProposalAdapter,
    quotaUsageDeps: createLedgerQuotaUsageDeps(),
  };
}

export async function createContentProposal(input: CreateProposalInput): Promise<ProposalRunRecord> {
  return createProposal(input, createDefaultProposalServiceDeps());
}

export async function applyContentProposal(
  id: string,
  input: ApplyProposalInput,
): Promise<{ run: ProposalRunRecord; result: unknown }> {
  return applyProposal(id, input, createDefaultProposalServiceDeps());
}

export async function rejectContentProposal(id: string, rejectedBy: string | null): Promise<ProposalRunRecord> {
  return rejectProposal(id, rejectedBy, createDefaultProposalServiceDeps());
}

export async function cancelContentProposal(id: string): Promise<ProposalRunRecord> {
  return cancelProposal(id, createDefaultProposalServiceDeps());
}

/** GET /api/content/generation/[id] — safe detail + status timeline. */
export async function getProposalDetail(id: string): Promise<ProposalDetailView> {
  const run = await createPrismaProposalStore().getById(id);
  if (!run) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }
  return buildProposalDetail(run);
}

/**
 * Sprint 18.1 — safe, read-only provider comparison: the most recent run
 * for the same topic+section+type but a DIFFERENT provider, if any. Never
 * writes anything; used only by the proposal detail admin page.
 */
export async function getProposalProviderComparison(id: string): Promise<ProviderComparison> {
  const run = await createPrismaProposalStore().getById(id);
  if (!run) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }

  const candidate = await prisma.aiGenerationRun.findFirst({
    where: {
      entityType: run.entityType,
      entityId: run.entityId,
      type: run.type as never,
      sectionId: run.sectionId,
      provider: { not: run.provider },
      id: { not: run.id },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      model: true,
      totalTokens: true,
      estimatedCostUsd: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return buildProviderComparison(run, candidate ? { ...candidate, estimatedCostUsd: candidate.estimatedCostUsd == null ? null : Number(candidate.estimatedCostUsd as never) } : null);
}

/**
 * POST /api/content/generation/[id]/rollback — reapplies the previousHtml
 * captured at apply time (see applySectionProposalAdapter) through the same
 * governed saveHumanEditedSection path used for every other section write.
 * Does not change proposalStatus (the proposal stays APPLIED/
 * EDITED_AND_APPLIED) — rollback is a content operation, not a new
 * proposal-lifecycle state.
 */
export async function rollbackContentProposal(
  id: string,
  actorId: string | null,
): Promise<{ run: ProposalRunRecord; result: unknown }> {
  const store = createPrismaProposalStore();
  const run = await store.getById(id);
  if (!run) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }
  if (run.proposalStatus !== "APPLIED" && run.proposalStatus !== "EDITED_AND_APPLIED") {
    throw new ContentGenerationError("Chỉ khôi phục được đề xuất đã áp dụng.", "PROPOSAL_NOT_APPLICABLE");
  }
  if (!run.writingDraftId || !run.sectionId) {
    throw new ContentGenerationError("Đề xuất này không có nội dung section để khôi phục.", "PROPOSAL_NOT_APPLICABLE");
  }

  const snapshot = normalizeRunWarnings(run.warnings).rollbackSnapshot;
  if (!snapshot || snapshot.previousHtml == null) {
    throw new ContentGenerationError("Không có dữ liệu khôi phục cho đề xuất này.", "PROPOSAL_NOT_APPLICABLE");
  }

  const orchestratorStore = createPrismaGenerationOrchestratorStore();
  try {
    const { draft, version } = await saveHumanEditedSection(
      {
        draftId: run.writingDraftId,
        sectionId: run.sectionId,
        html: snapshot.previousHtml,
        plainText: snapshot.previousPlainText ?? undefined,
        lockAfterSave: true,
        editedBy: actorId,
      },
      orchestratorStore,
    );

    // Sprint 18.1 — marks that a rollback occurred (for prompt-metrics'
    // rollback rate). Never changes proposalStatus — rollback stays a
    // content operation, not a new proposal-lifecycle state.
    const rolledBackAt = new Date().toISOString();
    await prisma.aiGenerationRun.update({
      where: { id: run.id },
      data: { warnings: withRolledBackAt(run.warnings, rolledBackAt) as Prisma.InputJsonValue },
    });

    return {
      run,
      result: {
        writingDraftId: run.writingDraftId,
        sectionId: run.sectionId,
        version,
        draftStatus: draft.status,
        rolledBackToVersion: snapshot.previousVersion,
      },
    };
  } catch (err) {
    if (err instanceof WritingGenerationError) {
      throw new ContentGenerationError(err.message, "APPLY_CONFLICT", err.status);
    }
    throw err;
  }
}

/**
 * POST /api/content/generation/[id]/retry — creates a brand-new proposal
 * from the prior run's type/topic/section/context/editorInstruction (see
 * retry-mapping.ts). Never mutates or replaces the original run; both runs
 * are cross-linked via `retryOfRunId`/`retriedByRunId` in `warnings`.
 */
export async function retryContentProposal(id: string, requestedBy: string | null): Promise<ProposalRunRecord> {
  const store = createPrismaProposalStore();
  const prior = await store.getById(id);
  if (!prior) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }

  const retryInput = mapPriorRunToRetryInput(prior, requestedBy);
  if (!retryInput.topicId) {
    throw new ContentGenerationError("Đề xuất gốc thiếu topicId hợp lệ để tạo lại.", "INVALID_REQUEST");
  }

  const next = await createContentProposal(retryInput);

  const [patchedNext] = await Promise.all([
    prisma.aiGenerationRun.update({
      where: { id: next.id },
      data: { warnings: withRetryOfRunId(next.warnings, prior.id) as Prisma.InputJsonValue },
    }),
    prisma.aiGenerationRun.update({
      where: { id: prior.id },
      data: { warnings: withRetriedByRunId(prior.warnings, next.id) as Prisma.InputJsonValue },
    }),
  ]);

  return mapRun(patchedNext);
}

/**
 * Sprint 18.1 — POST /api/content/generation/[id]/quality. Audit-only:
 * merges a human rating/feedback into `warnings.qualityFeedback`, never
 * touches `proposalStatus` or any apply/publish path.
 */
export async function recordProposalQualityFeedback(
  id: string,
  raw: unknown,
  submittedBy: string | null,
): Promise<ProposalRunRecord> {
  const input = validateQualityFeedbackInput(raw);
  const store = createPrismaProposalStore();
  const run = await store.getById(id);
  if (!run) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }

  const feedback = buildQualityFeedback(input, submittedBy);
  const row = await prisma.aiGenerationRun.update({
    where: { id },
    data: { warnings: withQualityFeedback(run.warnings, feedback) as Prisma.InputJsonValue },
  });
  return mapRun(row);
}

const PROVIDER_STATUS_WINDOW = 50;

/** GET /api/content/generation/providers/status — heuristic health snapshot, no secrets. */
export async function getProviderStatusSnapshot(): Promise<ProviderHealthSnapshot> {
  const config = getContentGenerationConfig();
  const rows = (await prisma.aiGenerationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: PROVIDER_STATUS_WINDOW,
    select: { status: true, startedAt: true, completedAt: true },
  })) as ProviderStatusRunRow[];
  return buildProviderStatusSnapshot(config, rows);
}
