/**
 * Sprint 18.0 — provider health snapshot for GET
 * /api/content/generation/providers/status. Pure: takes the already-loaded
 * config + a small window of recent AiGenerationRun rows and derives
 * availability/health heuristics. No secrets ever appear here — only
 * `keyConfigured: boolean`, same convention as ContentGenerationSafeStatus.
 */

import {
  isContentGenerationConfigured,
  type ContentGenerationConfig,
} from "@/features/content-generation/contracts/config";
import { isRolloutStageAllowingProvider } from "@/features/content-generation/contracts/policy";

export type ProviderStatusRunRow = {
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type ProviderHealthSnapshot = {
  provider: string;
  model: string;
  enabled: boolean;
  keyConfigured: boolean;
  rolloutStage: string;
  /** True only when enabled + rollout stage allows the configured provider + (for OPENAI) key is set. */
  available: boolean;
  recentRunCount: number;
  recentCompletedCount: number;
  recentFailedCount: number;
  avgLatencyMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

/**
 * `rows` should be pre-sorted newest-first (proposal.wiring.ts's
 * getProviderStatusSnapshot queries `orderBy: { createdAt: "desc" }`) so
 * lastSuccessAt/lastFailureAt reflect the most recent occurrence.
 */
export function buildProviderStatusSnapshot(
  config: ContentGenerationConfig,
  rows: readonly ProviderStatusRunRow[],
): ProviderHealthSnapshot {
  let completedCount = 0;
  let failedCount = 0;
  let latencySumMs = 0;
  let latencyCount = 0;
  let lastSuccessAt: Date | null = null;
  let lastFailureAt: Date | null = null;

  for (const row of rows) {
    if (row.status === "COMPLETED") {
      completedCount += 1;
      if (!lastSuccessAt && row.completedAt) lastSuccessAt = row.completedAt;
    }
    if (row.status === "FAILED") {
      failedCount += 1;
      if (!lastFailureAt && row.completedAt) lastFailureAt = row.completedAt;
    }
    if (row.startedAt && row.completedAt) {
      const latency = row.completedAt.getTime() - row.startedAt.getTime();
      if (latency >= 0) {
        latencySumMs += latency;
        latencyCount += 1;
      }
    }
  }

  const available =
    config.enabled &&
    isRolloutStageAllowingProvider(config.rolloutStage, config.provider) &&
    isContentGenerationConfigured(config);

  return {
    provider: config.provider.toLowerCase(),
    model: config.model,
    enabled: config.enabled,
    keyConfigured: config.apiKeyConfigured,
    rolloutStage: config.rolloutStage,
    available,
    recentRunCount: rows.length,
    recentCompletedCount: completedCount,
    recentFailedCount: failedCount,
    avgLatencyMs: latencyCount > 0 ? Math.round(latencySumMs / latencyCount) : null,
    lastSuccessAt: lastSuccessAt ? lastSuccessAt.toISOString() : null,
    lastFailureAt: lastFailureAt ? lastFailureAt.toISOString() : null,
  };
}
