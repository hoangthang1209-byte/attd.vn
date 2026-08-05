/**
 * Sprint 18.0 — pure mapping from a prior AiGenerationRun to the
 * CreateProposalInput needed to retry it (same type/topic/section/context,
 * re-using the same editorInstruction from inputSummary). No prisma import
 * so it's directly unit-testable; proposal.wiring.ts's retryContentProposal
 * calls this after fetching the prior run.
 */

import type { ContentGenerationType } from "@/features/content-generation/contracts/generation.types";
import type { CreateProposalInput } from "@/features/content-generation/services/proposal.service";

export type PriorRunForRetry = {
  type: ContentGenerationType;
  entityType: string;
  entityId: string;
  writingPlanId: string | null;
  writingDraftId: string | null;
  sectionId: string | null;
  contextBuildId: string | null;
  inputSummary: unknown;
};

/**
 * Only SEO_TOPIC-entity runs are retryable today (the only entityType this
 * feature creates) — anything else is a data inconsistency, surfaced as
 * `topicId: ""` so the caller's validation (`topicId là bắt buộc.`) catches
 * it instead of silently retrying against the wrong entity.
 */
export function mapPriorRunToRetryInput(
  prior: PriorRunForRetry,
  requestedBy: string | null,
): CreateProposalInput {
  const inputSummary =
    prior.inputSummary && typeof prior.inputSummary === "object"
      ? (prior.inputSummary as Record<string, unknown>)
      : {};

  return {
    type: prior.type,
    topicId: prior.entityType === "SEO_TOPIC" ? prior.entityId : "",
    writingPlanId: prior.writingPlanId,
    writingDraftId: prior.writingDraftId,
    sectionId: prior.sectionId,
    contextBuildId: prior.contextBuildId,
    editorInstruction: typeof inputSummary.editorInstruction === "string" ? inputSummary.editorInstruction : null,
    requestedBy,
  };
}
