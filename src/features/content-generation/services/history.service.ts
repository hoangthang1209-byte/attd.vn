import "server-only";

import { prisma } from "@/lib/prisma";
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

export type ListProposalHistoryInput = {
  topicId?: string | null;
  writingDraftId?: string | null;
  limit?: number;
  cursor?: string | null;
};

export type ListProposalHistoryResult = {
  items: SafeProposalSummary[];
  nextCursor: string | null;
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/**
 * Lists AI content-generation proposals for a topic or writing draft. Reads
 * AiGenerationRun rows that carry a proposalStatus (Sprint 16.0 rows) —
 * legacy SEO_BRIEF rows without proposalStatus are excluded here (they
 * remain visible via the existing /brief-generations endpoint).
 */
export async function listProposalHistory(input: ListProposalHistoryInput): Promise<ListProposalHistoryResult> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? DEFAULT_LIMIT));

  if (!input.topicId && !input.writingDraftId) {
    return { items: [], nextCursor: null };
  }

  const rows = await prisma.aiGenerationRun.findMany({
    where: {
      proposalStatus: { not: null },
      ...(input.writingDraftId
        ? { writingDraftId: input.writingDraftId }
        : { entityType: "SEO_TOPIC", entityId: input.topicId ?? undefined }),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: page.map((row) =>
      toSafeProposalSummary({
        ...row,
        estimatedCostUsd: row.estimatedCostUsd == null ? null : Number(row.estimatedCostUsd),
      } as unknown as ProposalRunRecord),
    ),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}
