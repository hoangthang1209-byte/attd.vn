/**
 * Sprint 18.0 — hard-stop quota gate, checked right before every provider
 * call (see proposal.service.ts's createProposal). Pure/DI: this module
 * never imports prisma directly so it stays unit-testable without a
 * database — the real DB-backed usage lookups are supplied by
 * proposal.wiring.ts via usage-ledger.service.ts.
 */

import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";
import type { ContentGenerationConfig } from "@/features/content-generation/contracts/config";

export type QuotaUsageSnapshot = {
  totalRuns: number;
  totalCostUsd: number | null;
};

export type QuotaUsageDeps = {
  getWorkspaceToday: () => Promise<QuotaUsageSnapshot>;
  getUserToday: (userId: string) => Promise<QuotaUsageSnapshot>;
  getTopicToday: (topicId: string) => Promise<QuotaUsageSnapshot>;
  getMonthToDate: () => Promise<QuotaUsageSnapshot>;
};

export type AssertQuotaAllowedInput = {
  /** Informational only (useful for future per-type quotas / logging). */
  type: string;
  topicId?: string | null;
  userId?: string | null;
  config: ContentGenerationConfig;
};

/**
 * Enforces, in order: workspace daily limit, monthly budget, per-user daily
 * limit, per-topic daily limit. Throws ContentGenerationError with
 * DAILY_LIMIT or MONTHLY_BUDGET_EXCEEDED (Vietnamese message) on the first
 * violated gate — never silently truncates or degrades the request.
 */
export async function assertQuotaAllowed(input: AssertQuotaAllowedInput, deps: QuotaUsageDeps): Promise<void> {
  const { config, topicId, userId } = input;

  if (config.dailyLimit > 0) {
    const workspace = await deps.getWorkspaceToday();
    if (workspace.totalRuns >= config.dailyLimit) {
      throw new ContentGenerationError(
        `Đã đạt giới hạn ${config.dailyLimit} lượt tạo đề xuất AI trong ngày cho toàn hệ thống.`,
        "DAILY_LIMIT",
      );
    }
  }

  if (config.monthlyBudgetUsd != null) {
    const month = await deps.getMonthToDate();
    const spent = month.totalCostUsd ?? 0;
    if (spent >= config.monthlyBudgetUsd) {
      throw new ContentGenerationError(
        `Đã vượt ngân sách AI hàng tháng (tối đa ${config.monthlyBudgetUsd} USD).`,
        "MONTHLY_BUDGET_EXCEEDED",
      );
    }
  }

  if (userId && config.dailyLimitPerUser > 0) {
    const user = await deps.getUserToday(userId);
    if (user.totalRuns >= config.dailyLimitPerUser) {
      throw new ContentGenerationError(
        `Bạn đã đạt giới hạn ${config.dailyLimitPerUser} lượt tạo đề xuất AI trong ngày.`,
        "DAILY_LIMIT",
      );
    }
  }

  if (topicId && config.dailyLimitPerTopic > 0) {
    const topic = await deps.getTopicToday(topicId);
    if (topic.totalRuns >= config.dailyLimitPerTopic) {
      throw new ContentGenerationError(
        `Chủ đề này đã đạt giới hạn ${config.dailyLimitPerTopic} lượt tạo đề xuất AI trong ngày.`,
        "DAILY_LIMIT",
      );
    }
  }
}
