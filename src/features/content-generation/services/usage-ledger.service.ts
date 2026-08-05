import "server-only";

import { prisma } from "@/lib/prisma";
import type { ContentGenerationUsageSnapshot } from "@/features/content-generation/contracts/config";
import {
  countLedgerRowsByStatus,
  groupLedgerRowsByTopic,
  groupLedgerRowsByUser,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
  summarizeLedgerRows,
  type LedgerGroupSummary,
  type LedgerRunRow,
} from "@/features/content-generation/services/usage-ledger.mapping";
import {
  computePromptVersionMetrics,
  type PromptMetricsRow,
  type PromptVersionMetrics,
} from "@/features/content-generation/services/prompt-metrics";
import type { UsageExportRow } from "@/features/content-generation/services/usage-export";

const LEDGER_SELECT = {
  id: true,
  status: true,
  proposalStatus: true,
  entityType: true,
  entityId: true,
  requestedBy: true,
  totalTokens: true,
  estimatedCostUsd: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
} as const;

type LedgerSelectRow = {
  id: string;
  status: string;
  proposalStatus: string | null;
  entityType: string;
  entityId: string;
  requestedBy: string | null;
  totalTokens: number | null;
  estimatedCostUsd: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

function toLedgerRow(row: LedgerSelectRow): LedgerRunRow {
  return {
    ...row,
    estimatedCostUsd: row.estimatedCostUsd == null ? null : Number(row.estimatedCostUsd as never),
  };
}

export type UsageLedgerSummary = {
  today: ContentGenerationUsageSnapshot;
  /** Sprint 18.1 — Monday-start UTC week. */
  week: ContentGenerationUsageSnapshot;
  month: ContentGenerationUsageSnapshot;
  byUserToday: Array<LedgerGroupSummary<"userId">>;
  byTopicToday: Array<LedgerGroupSummary<"topicId">>;
  statusCountsToday: Record<string, number>;
  /** Sprint 18.1 — per-promptVersion acceptance/retry/rollback/quality metrics, month-to-date, sorted by volume desc. */
  promptVersionMetrics: PromptVersionMetrics[];
  generatedAt: string;
};

/**
 * Full ledger snapshot for the admin AI operations dashboard
 * (GET /api/content/generation/usage). Reads AiGenerationRun only — no
 * migration, no new table.
 */
export async function getUsageLedgerSummary({ now = new Date() }: { now?: Date } = {}): Promise<UsageLedgerSummary> {
  const dayStart = startOfUtcDay(now);
  const weekStart = startOfUtcWeek(now);
  const monthStart = startOfUtcMonth(now);
  // Week can start before the month (e.g. the 1st falling mid-week) — fetch
  // from whichever is earliest so the week card is never short a few days.
  const queryStart = weekStart.getTime() < monthStart.getTime() ? weekStart : monthStart;

  const [rows, promptMetricsRows] = await Promise.all([
    prisma.aiGenerationRun.findMany({
      where: { createdAt: { gte: queryStart } },
      select: LEDGER_SELECT,
    }) as Promise<LedgerSelectRow[]>,
    prisma.aiGenerationRun.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { promptVersion: true, status: true, proposalStatus: true, warnings: true },
    }) as Promise<PromptMetricsRow[]>,
  ]);

  const mapped = rows.map(toLedgerRow);
  const monthRows = mapped.filter((row) => row.createdAt >= monthStart);
  const weekRows = mapped.filter((row) => row.createdAt >= weekStart);
  const todayRows = mapped.filter((row) => row.createdAt >= dayStart);

  return {
    today: summarizeLedgerRows(todayRows),
    week: summarizeLedgerRows(weekRows),
    month: summarizeLedgerRows(monthRows),
    byUserToday: groupLedgerRowsByUser(todayRows),
    byTopicToday: groupLedgerRowsByTopic(todayRows),
    statusCountsToday: countLedgerRowsByStatus(todayRows),
    promptVersionMetrics: computePromptVersionMetrics(promptMetricsRows),
    generatedAt: new Date().toISOString(),
  };
}

/** Per-user daily total — used by the quota engine and the proposal detail page. */
export async function getUsageForUserToday(userId: string): Promise<ContentGenerationUsageSnapshot> {
  if (!userId?.trim()) return summarizeLedgerRows([]);
  const dayStart = startOfUtcDay(new Date());
  const rows = (await prisma.aiGenerationRun.findMany({
    where: { requestedBy: userId, createdAt: { gte: dayStart } },
    select: LEDGER_SELECT,
  })) as LedgerSelectRow[];
  return summarizeLedgerRows(rows.map(toLedgerRow));
}

/** Per-topic daily total — used by the quota engine. */
export async function getUsageForTopicToday(topicId: string): Promise<ContentGenerationUsageSnapshot> {
  if (!topicId?.trim()) return summarizeLedgerRows([]);
  const dayStart = startOfUtcDay(new Date());
  const rows = (await prisma.aiGenerationRun.findMany({
    where: { entityId: topicId, createdAt: { gte: dayStart } },
    select: LEDGER_SELECT,
  })) as LedgerSelectRow[];
  return summarizeLedgerRows(rows.map(toLedgerRow));
}

/** Whole-workspace daily total — used by the quota engine's dailyLimit gate. */
export async function getUsageForWorkspaceToday(): Promise<ContentGenerationUsageSnapshot> {
  const dayStart = startOfUtcDay(new Date());
  const rows = (await prisma.aiGenerationRun.findMany({
    where: { createdAt: { gte: dayStart } },
    select: LEDGER_SELECT,
  })) as LedgerSelectRow[];
  return summarizeLedgerRows(rows.map(toLedgerRow));
}

const MAX_EXPORT_ROWS = 5_000;

/**
 * Sprint 18.1 — admin-only export rows for GET
 * /api/content/generation/usage/export. Capped at MAX_EXPORT_ROWS (most
 * recent first) to avoid an unbounded export; callers narrow with
 * `since`/`until` when they need a specific window.
 */
export async function getUsageExportRows(opts: { since?: Date; until?: Date } = {}): Promise<UsageExportRow[]> {
  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (opts.since) createdAtFilter.gte = opts.since;
  if (opts.until) createdAtFilter.lte = opts.until;

  const rows = await prisma.aiGenerationRun.findMany({
    where: Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {},
    orderBy: { createdAt: "desc" },
    take: MAX_EXPORT_ROWS,
    select: {
      id: true,
      requestedBy: true,
      provider: true,
      model: true,
      status: true,
      proposalStatus: true,
      totalTokens: true,
      estimatedCostUsd: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return rows.map((row) => ({
    ...row,
    estimatedCostUsd: row.estimatedCostUsd == null ? null : Number(row.estimatedCostUsd as never),
  }));
}
