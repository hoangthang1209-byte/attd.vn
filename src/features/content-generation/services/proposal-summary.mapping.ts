/**
 * Pure mapping from a full ProposalRunRecord to the safe (no-secret) shapes
 * returned by every content-generation API route. Split out of
 * history.service.ts (which also does prisma/`server-only` work) so
 * anything that only needs the mapping — like proposal-detail.service.ts,
 * and content-generation-18-0.test.ts — can import it without pulling in a
 * database dependency.
 */

import type { ProposalRunRecord } from "@/features/content-generation/services/proposal.service";

export type SafeProposalSummary = {
  id: string;
  type: string;
  status: string;
  proposalStatus: string | null;
  provider: string;
  model: string;
  promptVersion: string;
  entityType: string;
  entityId: string;
  sectionId: string | null;
  writingDraftId: string | null;
  writingPlanId: string | null;
  contextBuildId: string | null;
  templateId: string | null;
  templateVersion: string | null;
  factIdsUsed: unknown;
  mediaIdsUsed: unknown;
  warnings: unknown;
  errorMessage: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
  };
  requestedBy: string | null;
  appliedAt: Date | null;
  appliedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Safe summary — never includes provider API keys/secrets or raw stack traces. */
export function toSafeProposalSummary(run: ProposalRunRecord): SafeProposalSummary {
  return {
    id: run.id,
    type: run.type,
    status: run.status,
    proposalStatus: run.proposalStatus,
    provider: run.provider,
    model: run.model,
    promptVersion: run.promptVersion,
    entityType: run.entityType,
    entityId: run.entityId,
    sectionId: run.sectionId,
    writingDraftId: run.writingDraftId,
    writingPlanId: run.writingPlanId,
    contextBuildId: run.contextBuildId,
    templateId: run.templateId,
    templateVersion: run.templateVersion,
    factIdsUsed: run.factIdsUsed,
    mediaIdsUsed: run.mediaIdsUsed,
    warnings: run.warnings,
    errorMessage: run.errorMessage,
    usage: {
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      totalTokens: run.totalTokens,
      estimatedCostUsd: run.estimatedCostUsd,
    },
    requestedBy: run.requestedBy,
    appliedAt: run.appliedAt,
    appliedBy: run.appliedBy,
    rejectedAt: run.rejectedAt,
    rejectedBy: run.rejectedBy,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

/** Adds the validated structured output — still no secrets/raw provider bodies. */
export function toSafeProposalDetail(run: ProposalRunRecord): SafeProposalSummary & { output: unknown } {
  return { ...toSafeProposalSummary(run), output: run.output };
}
