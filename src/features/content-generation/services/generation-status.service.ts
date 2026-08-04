import { getSeoBriefAiConfig, getSeoBriefAiSafeStatus } from "@/features/ai/ai-seo-brief-config";
import {
  getContentGenerationConfig,
  getContentGenerationSafeStatus,
  type ContentGenerationSafeStatus,
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

/**
 * Aggregates the safe (no-secret) status of every AI surface an editor
 * interacts with: the new Content Generation Engine, the Writing Engine, and
 * the SEO Brief AI assistant (key-configured flag only, per sprint scope).
 */
export function getAggregatedContentGenerationStatus(): AggregatedContentGenerationStatus {
  const contentGeneration = getContentGenerationSafeStatus(getContentGenerationConfig());
  const writing = getWritingGenerationSafeStatus(getWritingGenerationConfig());
  const brief = getSeoBriefAiSafeStatus(getSeoBriefAiConfig());

  return {
    contentGeneration,
    writing: { enabled: writing.enabled, configured: writing.configured },
    brief: { keyConfigured: brief.configured },
  };
}
