import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ContentGenerationError,
  type BriefResult,
  type MetaResult,
  type SectionResult,
} from "@/features/content-generation/contracts/generation.types";
import { resolveContentGenerationProvider } from "@/features/content-generation/providers/registry";
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
      const row = await prisma.aiGenerationRun.update({
        where: { id },
        data: {
          proposalStatus: data.edited ? "EDITED_AND_APPLIED" : "APPLIED",
          appliedAt: new Date(),
          appliedBy: data.appliedBy,
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

  const inputSummary = (run.inputSummary ?? {}) as { draftVersionAtCreation?: number | null };
  if (inputSummary.draftVersionAtCreation != null && inputSummary.draftVersionAtCreation !== draftRow.version) {
    throw new ContentGenerationError(
      "Bản nháp đã thay đổi kể từ khi tạo đề xuất — cần tạo lại đề xuất mới.",
      "GENERATION_STALE",
    );
  }

  const output = (input.editedOutput ?? run.output) as SectionResult | null;
  if (!output?.html) {
    throw new ContentGenerationError("Đề xuất section không có nội dung html.", "PROPOSAL_NOT_APPLICABLE");
  }

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
    return { writingDraftId: run.writingDraftId, sectionId: run.sectionId, version, draftStatus: draft.status };
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
