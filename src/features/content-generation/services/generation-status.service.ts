import { getSeoBriefAiConfig, getSeoBriefAiSafeStatus } from "@/features/ai/ai-seo-brief-config";
import {
  getContentGenerationConfig,
  getContentGenerationSafeStatus,
  type ContentGenerationSafeStatus,
  type ContentGenerationUsageSnapshot,
} from "@/features/content-generation/contracts/config";
import {
  getWritingGenerationConfig,
  getWritingGenerationSafeStatus,
} from "@/features/writing-engine/writing-generation-config";

export type AggregatedContentGenerationStatus = {
  contentGeneration: ContentGenerationSafeStatus;
  writing: { enabled: boolean; configured: boolean };
  brief: { keyConfigured: boolean };
};

export type AggregatedStatusUsageInjection = {
  today?: ContentGenerationUsageSnapshot | null;
  month?: ContentGenerationUsageSnapshot | null;
};

/**
 * Aggregates the safe (no-secret) status of every AI surface an editor
 * interacts with: the new Content Generation Engine, the Writing Engine, and
 * the SEO Brief AI assistant (key-configured flag only, per sprint scope).
 *
 * `usage` is optional (Sprint 18.0): the status API route fetches it from
 * usage-ledger.service.ts (a DB call) and injects it here; every other
 * caller (or a caller without DB access) gets `todayUsage`/`monthUsage:
 * null` — this function itself stays synchronous and DB-free.
 */
export function getAggregatedContentGenerationStatus(
  usage?: AggregatedStatusUsageInjection,
): AggregatedContentGenerationStatus {
  const contentGeneration = getContentGenerationSafeStatus(getContentGenerationConfig(), usage);
  const writing = getWritingGenerationSafeStatus(getWritingGenerationConfig());
  const brief = getSeoBriefAiSafeStatus(getSeoBriefAiConfig());

  return {
    contentGeneration,
    writing: { enabled: writing.enabled, configured: writing.configured },
    brief: { keyConfigured: brief.configured },
  };
}
