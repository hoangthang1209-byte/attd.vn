/**
 * Sprint 18.0 — pure aggregation helpers over AiGenerationRun rows. No
 * prisma/server-only import here on purpose: usage-ledger.service.ts (the
 * DB-backed layer) and content-generation-18-0.test.ts (unit tests, with
 * fabricated rows) both import this file directly.
 */

import {
  emptyContentGenerationUsageSnapshot,
  type ContentGenerationUsageSnapshot,
} from "@/features/content-generation/contracts/config";

export type LedgerRunRow = {
  id: string;
  status: string;
  proposalStatus: string | null;
  entityType: string;
  entityId: string;
  requestedBy: string | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

const APPLIED_PROPOSAL_STATUSES = new Set(["APPLIED", "EDITED_AND_APPLIED"]);

/** Robust to nulls: a row missing tokens/cost/timestamps never breaks the total, it's just excluded from that particular average/sum. */
export function summarizeLedgerRows(rows: readonly LedgerRunRow[]): ContentGenerationUsageSnapshot {
  if (rows.length === 0) return emptyContentGenerationUsageSnapshot();

  let completedRuns = 0;
  let failedRuns = 0;
  let appliedRuns = 0;
  let totalTokens: number | null = null;
  let totalCostUsd: number | null = null;
  let latencySumMs = 0;
  let latencyCount = 0;

  for (const row of rows) {
    if (row.status === "COMPLETED") completedRuns += 1;
    if (row.status === "FAILED") failedRuns += 1;
    if (row.proposalStatus && APPLIED_PROPOSAL_STATUSES.has(row.proposalStatus)) appliedRuns += 1;

    if (typeof row.totalTokens === "number" && Number.isFinite(row.totalTokens)) {
      totalTokens = (totalTokens ?? 0) + row.totalTokens;
    }
    if (typeof row.estimatedCostUsd === "number" && Number.isFinite(row.estimatedCostUsd)) {
      totalCostUsd = (totalCostUsd ?? 0) + row.estimatedCostUsd;
    }
    if (row.startedAt && row.completedAt) {
      const latency = row.completedAt.getTime() - row.startedAt.getTime();
      if (latency >= 0) {
        latencySumMs += latency;
        latencyCount += 1;
      }
    }
  }

  return {
    totalRuns: rows.length,
    completedRuns,
    failedRuns,
    appliedRuns,
    totalTokens,
    totalCostUsd: totalCostUsd != null ? Math.round(totalCostUsd * 1e6) / 1e6 : null,
    avgLatencyMs: latencyCount > 0 ? Math.round(latencySumMs / latencyCount) : null,
  };
}

export type LedgerGroupSummary<TKey extends string> = { [key in TKey]: string } & ContentGenerationUsageSnapshot;

function groupBy(rows: readonly LedgerRunRow[], keyOf: (row: LedgerRunRow) => string | null): Map<string, LedgerRunRow[]> {
  const groups = new Map<string, LedgerRunRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const arr = groups.get(key);
    if (arr) arr.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

export function groupLedgerRowsByUser(
  rows: readonly LedgerRunRow[],
  limit = 10,
): Array<LedgerGroupSummary<"userId">> {
  const groups = groupBy(rows, (row) => row.requestedBy);
  return Array.from(groups.entries())
    .map(([userId, groupRows]) => ({ userId, ...summarizeLedgerRows(groupRows) }))
    .sort((a, b) => b.totalRuns - a.totalRuns)
    .slice(0, limit);
}

export function groupLedgerRowsByTopic(
  rows: readonly LedgerRunRow[],
  limit = 10,
): Array<LedgerGroupSummary<"topicId">> {
  const groups = groupBy(rows, (row) => (row.entityType === "SEO_TOPIC" ? row.entityId : null));
  return Array.from(groups.entries())
    .map(([topicId, groupRows]) => ({ topicId, ...summarizeLedgerRows(groupRows) }))
    .sort((a, b) => b.totalRuns - a.totalRuns)
    .slice(0, limit);
}

export function countLedgerRowsByStatus(rows: readonly LedgerRunRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.proposalStatus ?? row.status;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
