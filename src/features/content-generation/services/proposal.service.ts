import {
  getContentGenerationConfig,
  type ContentGenerationConfig,
} from "@/features/content-generation/contracts/config";
import {
  CONTENT_GENERATION_SECTION_TYPES,
  ContentGenerationError,
  type ContentGenerationProposalStatus,
  type ContentGenerationRequest,
  type ContentGenerationType,
  type ContentGenerationUsage,
  type GenerationErrorCode,
  type GovernedGenerationContext,
} from "@/features/content-generation/contracts/generation.types";
import { assertGenerationAllowed } from "@/features/content-generation/contracts/policy";
import { getPromptTemplate } from "@/features/content-generation/prompts/prompt-registry";
import type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";
import type { AssembleContentGenerationContextInput } from "@/features/content-generation/services/context-assembler.service";
import { extractUsedIds, validateStructuredOutput } from "@/features/content-generation/services/structured-output.service";

export type ProposalRunRecord = {
  id: string;
  type: ContentGenerationType;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  proposalStatus: ContentGenerationProposalStatus | null;
  provider: string;
  model: string;
  promptVersion: string;
  entityType: string;
  entityId: string;
  retrievalRequestId: string | null;
  inputHash: string | null;
  inputSummary: unknown;
  output: unknown;
  warnings: unknown;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  sectionId: string | null;
  writingDraftId: string | null;
  writingPlanId: string | null;
  contextBuildId: string | null;
  templateId: string | null;
  templateVersion: string | null;
  factIdsUsed: unknown;
  mediaIdsUsed: unknown;
  appliedAt: Date | null;
  appliedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  requestedBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProposalRunInput = {
  type: ContentGenerationType;
  provider: string;
  model: string;
  promptVersion: string;
  entityType: string;
  entityId: string;
  contextBuildId: string | null;
  writingPlanId: string | null;
  writingDraftId: string | null;
  sectionId: string | null;
  templateId: string;
  templateVersion: string;
  retrievalRequestId: string | null;
  inputHash: string | null;
  inputSummary: unknown;
  requestedBy: string | null;
};

export type ProposalStore = {
  createRequested(data: CreateProposalRunInput): Promise<ProposalRunRecord>;
  markRunning(id: string): Promise<ProposalRunRecord>;
  markGenerated(
    id: string,
    data: {
      output: unknown;
      warnings: unknown;
      usage: ContentGenerationUsage;
      factIdsUsed: string[];
      mediaIdsUsed: string[];
    },
  ): Promise<ProposalRunRecord>;
  markValidationFailed(id: string, errorMessage: string): Promise<ProposalRunRecord>;
  markFailed(id: string, errorMessage: string): Promise<ProposalRunRecord>;
  getById(id: string): Promise<ProposalRunRecord | null>;
  markApplied(id: string, data: { appliedBy: string | null; edited: boolean }): Promise<ProposalRunRecord>;
  markRejected(id: string, rejectedBy: string | null): Promise<ProposalRunRecord>;
  markCancelled(id: string): Promise<ProposalRunRecord>;
};

export type ApplyProposalInput = {
  appliedBy?: string | null;
  editedOutput?: unknown;
  fields?: string[];
  confirmApprovedOverwrite?: boolean;
};

export type ProposalServiceDeps = {
  store: ProposalStore;
  assembleContext: (input: AssembleContentGenerationContextInput) => Promise<GovernedGenerationContext>;
  resolveProvider: (
    config?: ContentGenerationConfig,
  ) => { provider: ContentGenerationProvider; providerName: string };
  config?: ContentGenerationConfig;
  /** Optional: resolves the WritingDraftRecord.version at proposal-creation time, used for staleness checks on apply. */
  getDraftVersion?: (writingDraftId: string) => Promise<number | null>;
  applyBriefProposal?: (run: ProposalRunRecord, input: ApplyProposalInput) => Promise<unknown>;
  applySectionProposal?: (run: ProposalRunRecord, input: ApplyProposalInput) => Promise<unknown>;
  applyMetaLikeProposal?: (run: ProposalRunRecord, input: ApplyProposalInput) => Promise<unknown>;
};

export type CreateProposalInput = {
  type: ContentGenerationType;
  topicId: string;
  briefId?: string | null;
  contextBuildId?: string | null;
  writingPlanId?: string | null;
  writingDraftId?: string | null;
  sectionId?: string | null;
  editorInstruction?: string | null;
  requestedBy?: string | null;
};

const VALIDATION_ERROR_CODES: GenerationErrorCode[] = [
  "FACT_NOT_ALLOWED",
  "MEDIA_NOT_ALLOWED",
  "LINK_NOT_VALID",
  "UNSAFE_CLAIM",
  "INVALID_PROVIDER_OUTPUT",
];

/**
 * Core creation flow: policy gate → assemble governed context → resolve
 * provider → generate → validate/sanitize → persist. AI never sets
 * proposalStatus past GENERATED/VALIDATION_FAILED — only humans move it
 * further via applyProposal/rejectProposal.
 */
export async function createProposal(
  input: CreateProposalInput,
  deps: ProposalServiceDeps,
): Promise<ProposalRunRecord> {
  const config = deps.config ?? getContentGenerationConfig();
  assertGenerationAllowed(input.type, config);

  if (!input.topicId?.trim()) {
    throw new ContentGenerationError("topicId là bắt buộc.", "INVALID_REQUEST");
  }

  const context = await deps.assembleContext({
    topicId: input.topicId,
    briefId: input.briefId ?? null,
    contextBuildId: input.contextBuildId ?? null,
    writingPlanId: input.writingPlanId ?? null,
    writingDraftId: input.writingDraftId ?? null,
    sectionId: input.sectionId ?? null,
    editorInstruction: input.editorInstruction ?? null,
  });

  const promptTemplate = getPromptTemplate(input.type);
  const { provider, providerName } = deps.resolveProvider(config);

  const draftVersionAtCreation =
    input.writingDraftId && deps.getDraftVersion ? await deps.getDraftVersion(input.writingDraftId) : null;

  let run = await deps.store.createRequested({
    type: input.type,
    provider: providerName,
    model: config.model,
    promptVersion: promptTemplate.version,
    entityType: "SEO_TOPIC",
    entityId: input.topicId,
    contextBuildId: context.provenance.contextBuildId,
    writingPlanId: input.writingPlanId ?? null,
    writingDraftId: input.writingDraftId ?? null,
    sectionId: input.sectionId ?? context.section?.id ?? null,
    templateId: promptTemplate.id,
    templateVersion: promptTemplate.version,
    retrievalRequestId: context.provenance.retrievalRequestId,
    inputHash: null,
    inputSummary: {
      editorInstruction: input.editorInstruction ?? null,
      factCount: context.facts.length,
      mediaCount: context.media.length,
      linkCount: context.links.length,
      draftVersionAtCreation,
    },
    requestedBy: input.requestedBy ?? null,
  });

  try {
    run = await deps.store.markRunning(run.id);

    const request: ContentGenerationRequest = {
      type: input.type,
      topicId: input.topicId,
      briefId: context.briefId,
      contextBuildId: context.provenance.contextBuildId,
      writingPlanId: input.writingPlanId ?? null,
      writingDraftId: input.writingDraftId ?? null,
      sectionId: input.sectionId ?? context.section?.id ?? null,
      editorInstruction: input.editorInstruction ?? null,
      model: config.model,
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: config.timeoutMs,
      context,
    };

    const result = await provider.generate(request);
    const validated = validateStructuredOutput(input.type, result.output, context);
    const { factIdsUsed, mediaIdsUsed } = extractUsedIds(input.type, validated);

    return await deps.store.markGenerated(run.id, {
      output: validated,
      warnings: result.warnings,
      usage: result.usage,
      factIdsUsed,
      mediaIdsUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    if (err instanceof ContentGenerationError && VALIDATION_ERROR_CODES.includes(err.code)) {
      await deps.store.markValidationFailed(run.id, message);
      throw err;
    }
    await deps.store.markFailed(run.id, message);
    if (err instanceof ContentGenerationError) throw err;
    throw new ContentGenerationError(message, "PROVIDER_ERROR");
  }
}

/**
 * Humans apply a GENERATED proposal onto the destination record. This never
 * auto-approves/auto-publishes: brief apply clears approval (same behavior
 * as seo-brief-apply.service), section apply writes via the existing
 * saveHumanEditedSection governed path, and media/link/alt suggestions are
 * only recorded as "accepted" — never auto-written to MediaAsset or link
 * tables.
 */
export async function applyProposal(
  id: string,
  input: ApplyProposalInput,
  deps: ProposalServiceDeps,
): Promise<{ run: ProposalRunRecord; result: unknown }> {
  const run = await deps.store.getById(id);
  if (!run) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }

  if (run.proposalStatus === "APPLIED" || run.proposalStatus === "EDITED_AND_APPLIED") {
    return { run, result: { idempotent: true, message: "Đề xuất đã được áp dụng trước đó." } };
  }

  if (run.proposalStatus !== "GENERATED") {
    throw new ContentGenerationError(
      "Chỉ áp dụng được đề xuất ở trạng thái GENERATED.",
      "PROPOSAL_NOT_APPLICABLE",
    );
  }

  let result: unknown;
  const isSectionType = (CONTENT_GENERATION_SECTION_TYPES as ContentGenerationType[]).includes(run.type);

  if (run.type === "BRIEF_SUGGESTION" || run.type === "OUTLINE_SUGGESTION") {
    if (!deps.applyBriefProposal) {
      throw new ContentGenerationError("Chưa cấu hình adapter áp dụng brief.", "PROPOSAL_NOT_APPLICABLE", 500);
    }
    result = await deps.applyBriefProposal(run, input);
  } else if (isSectionType) {
    if (!deps.applySectionProposal) {
      throw new ContentGenerationError("Chưa cấu hình adapter áp dụng section.", "PROPOSAL_NOT_APPLICABLE", 500);
    }
    result = await deps.applySectionProposal(run, input);
  } else if (run.type === "FAQ_SUGGESTION" || run.type === "META_SUGGESTION" || run.type === "CTA_SUGGESTION") {
    if (!deps.applyMetaLikeProposal) {
      throw new ContentGenerationError("Chưa cấu hình adapter áp dụng đề xuất này.", "PROPOSAL_NOT_APPLICABLE", 500);
    }
    result = await deps.applyMetaLikeProposal(run, input);
  } else if (
    run.type === "MEDIA_SUGGESTION" ||
    run.type === "INTERNAL_LINK_SUGGESTION" ||
    run.type === "ALT_CAPTION_SUGGESTION"
  ) {
    result = {
      accepted: true,
      note: "Đã ghi nhận chấp nhận đề xuất — không tự động ghi vào MediaAsset/liên kết. Cần thao tác thủ công tương ứng.",
    };
  } else {
    throw new ContentGenerationError("Loại đề xuất không hỗ trợ apply.", "PROPOSAL_NOT_APPLICABLE");
  }

  const updated = await deps.store.markApplied(id, {
    appliedBy: input.appliedBy ?? null,
    edited: input.editedOutput !== undefined,
  });

  return { run: updated, result };
}

export async function rejectProposal(
  id: string,
  rejectedBy: string | null,
  deps: ProposalServiceDeps,
): Promise<ProposalRunRecord> {
  const run = await deps.store.getById(id);
  if (!run) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }
  if (run.proposalStatus !== "GENERATED" && run.proposalStatus !== "VALIDATION_FAILED") {
    throw new ContentGenerationError(
      "Chỉ từ chối được đề xuất chưa được áp dụng.",
      "PROPOSAL_NOT_APPLICABLE",
    );
  }
  return deps.store.markRejected(id, rejectedBy);
}

export async function cancelProposal(id: string, deps: ProposalServiceDeps): Promise<ProposalRunRecord> {
  const run = await deps.store.getById(id);
  if (!run) {
    throw new ContentGenerationError("Không tìm thấy đề xuất.", "PROPOSAL_NOT_FOUND");
  }
  if (run.proposalStatus !== "REQUESTED" && run.proposalStatus !== "RUNNING") {
    throw new ContentGenerationError(
      "Chỉ huỷ được đề xuất đang REQUESTED hoặc RUNNING.",
      "PROPOSAL_NOT_APPLICABLE",
    );
  }
  return deps.store.markCancelled(id);
}
