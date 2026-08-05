import "server-only";

import { prisma } from "@/lib/prisma";
import type { ContentGenerationUsageSnapshot } from "@/features/content-generation/contracts/config";
import {
  countLedgerRowsByStatus,
  groupLedgerRowsByTopic,
  groupLedgerRowsByUser,
  startOfUtcDay,
  startOfUtcMonth,
  summarizeLedgerRows,
  type LedgerGroupSummary,
  type LedgerRunRow,
} from "@/features/content-generation/services/usage-ledger.mapping";

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
  month: ContentGenerationUsageSnapshot;
  byUserToday: Array<LedgerGroupSummary<"userId">>;
  byTopicToday: Array<LedgerGroupSummary<"topicId">>;
  statusCountsToday: Record<string, number>;
  generatedAt: string;
};

/**
 * Full ledger snapshot for the admin AI operations dashboard
 * (GET /api/content/generation/usage). Reads AiGenerationRun only — no
 * migration, no new table.
 */
export async function getUsageLedgerSummary({ now = new Date() }: { now?: Date } = {}): Promise<UsageLedgerSummary> {
  const dayStart = startOfUtcDay(now);
  const monthStart = startOfUtcMonth(now);

  const rows = (await prisma.aiGenerationRun.findMany({
    where: { createdAt: { gte: monthStart } },
    select: LEDGER_SELECT,
  })) as LedgerSelectRow[];

  const mapped = rows.map(toLedgerRow);
  const todayRows = mapped.filter((row) => row.createdAt >= dayStart);

  return {
    today: summarizeLedgerRows(todayRows),
    month: summarizeLedgerRows(mapped),
    byUserToday: groupLedgerRowsByUser(todayRows),
    byTopicToday: groupLedgerRowsByTopic(todayRows),
    statusCountsToday: countLedgerRowsByStatus(todayRows),
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
