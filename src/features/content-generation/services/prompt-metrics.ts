/**
 * Sprint 18.1 — per-`promptVersion` evaluation metrics: acceptance rate,
 * retry rate, rollback rate, average quality rating. Pure/no-prisma (mirrors
 * usage-ledger.mapping.ts's split) so this can run against fabricated rows
 * in tests — the real DB-backed row fetch lives in usage-ledger.service.ts.
 */

import { normalizeRunWarnings } from "@/features/content-generation/services/run-warnings";

export type PromptMetricsRow = {
  promptVersion: string;
  status: string;
  proposalStatus: string | null;
  warnings: unknown;
};

export type PromptVersionMetrics = {
  promptVersion: string;
  totalRuns: number;
  generatedRuns: number;
  appliedRuns: number;
  retriedRuns: number;
  rolledBackRuns: number;
  /** applied / generated — null when there are zero generated runs (avoids a fabricated 0%). */
  acceptanceRate: number | null;
  /** retried / total. */
  retryRate: number | null;
  /** rolled back / applied — null when there are zero applied runs. */
  rollbackRate: number | null;
  avgQualityRating: number | null;
  qualityRatingCount: number;
};

const APPLIED_PROPOSAL_STATUSES = new Set(["APPLIED", "EDITED_AND_APPLIED"]);
/** Reached at least GENERATED — i.e. the provider succeeded and structured-output validation passed. */
const GENERATED_OR_LATER_STATUSES = new Set(["GENERATED", "APPLIED", "EDITED_AND_APPLIED", "REJECTED"]);

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function computeOne(promptVersion: string, rows: readonly PromptMetricsRow[]): PromptVersionMetrics {
  let generatedRuns = 0;
  let appliedRuns = 0;
  let retriedRuns = 0;
  let rolledBackRuns = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const row of rows) {
    const key = row.proposalStatus ?? row.status;
    if (GENERATED_OR_LATER_STATUSES.has(key)) generatedRuns += 1;
    if (row.proposalStatus && APPLIED_PROPOSAL_STATUSES.has(row.proposalStatus)) appliedRuns += 1;

    const warnings = normalizeRunWarnings(row.warnings);
    if (warnings.retriedByRunId) retriedRuns += 1;
    if (warnings.rolledBackAt) rolledBackRuns += 1;
    if (warnings.qualityFeedback && typeof warnings.qualityFeedback.rating === "number") {
      ratingSum += warnings.qualityFeedback.rating;
      ratingCount += 1;
    }
  }

  return {
    promptVersion,
    totalRuns: rows.length,
    generatedRuns,
    appliedRuns,
    retriedRuns,
    rolledBackRuns,
    acceptanceRate: generatedRuns > 0 ? round4(appliedRuns / generatedRuns) : null,
    retryRate: rows.length > 0 ? round4(retriedRuns / rows.length) : null,
    rollbackRate: appliedRuns > 0 ? round4(rolledBackRuns / appliedRuns) : null,
    avgQualityRating: ratingCount > 0 ? round4(ratingSum / ratingCount) : null,
    qualityRatingCount: ratingCount,
  };
}

/** Sorted by totalRuns desc — the AI admin dashboard renders the top N as "top prompts". */
export function computePromptVersionMetrics(rows: readonly PromptMetricsRow[]): PromptVersionMetrics[] {
  const groups = new Map<string, PromptMetricsRow[]>();
  for (const row of rows) {
    const key = row.promptVersion || "unknown";
    const arr = groups.get(key);
    if (arr) arr.push(row);
    else groups.set(key, [row]);
  }
  return Array.from(groups.entries())
    .map(([promptVersion, groupRows]) => computeOne(promptVersion, groupRows))
    .sort((a, b) => b.totalRuns - a.totalRuns);
}
