import "server-only";

import { prisma } from "@/lib/prisma";
import type { ProposalRunRecord } from "@/features/content-generation/services/proposal.service";
import {
  toSafeProposalDetail,
  toSafeProposalSummary,
  type SafeProposalSummary,
} from "@/features/content-generation/services/proposal-summary.mapping";

// Re-exported for backward compatibility — every existing API route imports
// these two from history.service.ts. The actual (pure, prisma-free)
// implementation now lives in proposal-summary.mapping.ts so
// proposal-detail.service.ts and unit tests can use it without a database.
export { toSafeProposalDetail, toSafeProposalSummary };
export type { SafeProposalSummary };

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
