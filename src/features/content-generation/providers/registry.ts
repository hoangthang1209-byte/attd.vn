import {
  getContentGenerationConfig,
  type ContentGenerationConfig,
} from "@/features/content-generation/contracts/config";
import type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";
import { DisabledContentGenerationProvider } from "@/features/content-generation/providers/disabled-provider";
import { ManualContentGenerationProvider } from "@/features/content-generation/providers/manual-provider";
import { createOpenAiContentGenerationProvider } from "@/features/content-generation/providers/openai-content.provider";
import { TestContentGenerationProvider } from "@/features/content-generation/providers/test-provider";

export type ResolvedContentGenerationProvider = {
  provider: ContentGenerationProvider;
  providerName: string;
};

let cachedTestProvider: TestContentGenerationProvider | null = null;

/**
 * Resolves the provider implementation from config only. Does NOT check
 * policy (assertGenerationAllowed) — callers (proposal.service) must call
 * the policy gate first so callers cannot bypass governance by resolving a
 * provider directly.
 */
export function resolveContentGenerationProvider(
  config: ContentGenerationConfig = getContentGenerationConfig(),
): ResolvedContentGenerationProvider {
  if (!config.enabled) {
    return { provider: new DisabledContentGenerationProvider(), providerName: "disabled" };
  }

  switch (config.provider) {
    case "TEST": {
      if (!cachedTestProvider) cachedTestProvider = new TestContentGenerationProvider();
      return { provider: cachedTestProvider, providerName: "test" };
    }
    case "MANUAL":
      return { provider: new ManualContentGenerationProvider(), providerName: "manual" };
    case "OPENAI":
      return { provider: createOpenAiContentGenerationProvider(), providerName: "openai" };
    case "DISABLED":
    default:
      return { provider: new DisabledContentGenerationProvider(), providerName: "disabled" };
  }
}

/** Test-only helper to reset the cached TEST provider between test cases. */
export function resetContentGenerationProviderCache(): void {
  cachedTestProvider = null;
}
