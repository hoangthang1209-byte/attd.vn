/**
 * Optional AI provider hooks for Sprint 14.5+.
 * Interfaces only — no paid Vision / LLM implementations.
 */

import type {
  BetterImageProvider,
  BundleRecommender,
  MediaClassifier,
  MetadataProvider,
  SimilarityProvider,
} from "@/features/media/intelligence/provider-interfaces";

export type VisionAiProviderId =
  | "openai_vision"
  | "gemini_vision"
  | "claude_vision"
  | "gpt_vision";

export type OptionalAiMediaProviders = {
  classifier?: MediaClassifier;
  metadata?: MetadataProvider;
  bundleRecommender?: BundleRecommender;
  similarity?: SimilarityProvider;
  betterImage?: BetterImageProvider;
};

/**
 * Registry placeholder. Returns null until a provider is registered at runtime.
 * Deterministic defaults remain the production path.
 */
const registry: Partial<Record<VisionAiProviderId, OptionalAiMediaProviders>> = {};

export function registerOptionalAiMediaProvider(
  id: VisionAiProviderId,
  providers: OptionalAiMediaProviders,
): void {
  registry[id] = providers;
}

export function getOptionalAiMediaProvider(
  id: VisionAiProviderId,
): OptionalAiMediaProviders | null {
  return registry[id] ?? null;
}

export function listRegisteredOptionalAiProviders(): VisionAiProviderId[] {
  return Object.keys(registry) as VisionAiProviderId[];
}
