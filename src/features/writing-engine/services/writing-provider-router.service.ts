import {
  getWritingGenerationConfig,
  isWritingGenerationConfigured,
  type WritingGenerationConfig,
} from "@/features/writing-engine/writing-generation-config";
import { FakeWritingSectionProvider } from "@/features/writing-engine/providers/fake-writing-section.provider";
import { createOpenAiWritingSectionProvider } from "@/features/writing-engine/providers/openai-writing-section.provider";
import {
  getWritingSectionProvider,
  registerWritingSectionProvider,
} from "@/features/writing-engine/providers/writing-provider-registry";
import type { WritingSectionProvider } from "@/features/writing-engine/writing-engine.types";

export type WritingProviderRoute = {
  provider: string;
  model: string;
  reason: string;
  maxOutputTokens: number;
  timeoutMs: number;
};

export class WritingProviderRouterError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 422) {
    super(message);
    this.name = "WritingProviderRouterError";
    this.code = code;
    this.status = status;
  }
}

export function resolveWritingProviderRoute(
  config: WritingGenerationConfig = getWritingGenerationConfig()
): WritingProviderRoute {
  if (!config.enabled) {
    throw new WritingProviderRouterError(
      "Tạo nội dung AI chưa bật (WRITING_GENERATION_ENABLED).",
      "GENERATION_DISABLED",
      503
    );
  }
  if (!isWritingGenerationConfigured(config)) {
    throw new WritingProviderRouterError(
      "Provider chưa cấu hình đủ (thiếu OPENAI_API_KEY nếu dùng OpenAI).",
      "PROVIDER_NOT_CONFIGURED",
      503
    );
  }

  return {
    provider: config.provider,
    model: config.model,
    reason: "default_single_provider",
    maxOutputTokens: config.maxOutputTokensPerSection,
    timeoutMs: config.timeoutMs,
  };
}

export function resolveWritingSectionProvider(
  config: WritingGenerationConfig = getWritingGenerationConfig()
): { route: WritingProviderRoute; provider: WritingSectionProvider } {
  const route = resolveWritingProviderRoute(config);

  const registered = getWritingSectionProvider(route.provider);
  if (registered) {
    return { route, provider: registered };
  }

  if (route.provider === "fake") {
    const provider = new FakeWritingSectionProvider();
    registerWritingSectionProvider("fake", provider);
    return { route, provider };
  }

  const provider = createOpenAiWritingSectionProvider();
  registerWritingSectionProvider("openai", provider);
  return { route, provider };
}
