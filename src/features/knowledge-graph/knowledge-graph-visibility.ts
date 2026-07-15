import type { KnowledgeBaseVisibility } from "@prisma/client";

const VISIBILITY_RANK: Record<KnowledgeBaseVisibility, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
};

/**
 * Effective path/node visibility is the strictest of all inputs.
 * Callers cannot lower visibility — only tighten.
 */
export function strictestVisibility(
  ...values: Array<KnowledgeBaseVisibility | null | undefined>
): KnowledgeBaseVisibility {
  let max: KnowledgeBaseVisibility = "PUBLIC";
  for (const value of values) {
    if (!value) continue;
    if (VISIBILITY_RANK[value] > VISIBILITY_RANK[max]) {
      max = value;
    }
  }
  return max;
}

export function isVisibilityAtMost(
  visibility: KnowledgeBaseVisibility,
  maxAllowed: KnowledgeBaseVisibility
): boolean {
  return VISIBILITY_RANK[visibility] <= VISIBILITY_RANK[maxAllowed];
}

export function visibilityRank(visibility: KnowledgeBaseVisibility): number {
  return VISIBILITY_RANK[visibility];
}

/** Compare two visibilities for equality of strictness checks. */
export function isStricterThan(
  a: KnowledgeBaseVisibility,
  b: KnowledgeBaseVisibility
): boolean {
  return VISIBILITY_RANK[a] > VISIBILITY_RANK[b];
}
