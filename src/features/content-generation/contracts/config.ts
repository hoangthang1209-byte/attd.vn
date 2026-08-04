import type { ContentGenerationProviderMode } from "@/features/content-generation/contracts/generation.types";

export type ContentGenerationConfig = {
  enabled: boolean;
  provider: ContentGenerationProviderMode;
  model: string;
  apiKeyConfigured: boolean;
  maxOutputTokens: number;
  maxSectionsPerRun: number;
  dailyLimit: number;
  monthlyBudgetUsd: number | null;
  timeoutMs: number;
  retryLimit: number;
  configurationVersion: string;
};

/** Never includes the API key or any secret value. Safe to return from an API. */
export type ContentGenerationSafeStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  keyConfigured: boolean;
  maxTokens: number;
  maxSectionsPerRun: number;
  dailyLimit: number;
  monthlyBudgetUsd: number | null;
  rateTableAvailable: boolean;
  costEstimateSupported: boolean;
  configurationVersion: string;
};

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function envFloat(name: string): number | null {
  const raw = process.env[name];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function resolveProviderMode(raw: string): ContentGenerationProviderMode {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "openai") return "OPENAI";
  if (normalized === "test") return "TEST";
  if (normalized === "manual") return "MANUAL";
  return "DISABLED";
}

/**
 * Reads CONTENT_GENERATION_* env vars. When those are unset, model/timeout
 * knobs fall back to WRITING_* / AI_SEO_BRIEF_* for awareness — but the master
 * `enabled` switch NEVER inherits from those sprints. It stays false unless
 * CONTENT_GENERATION_ENABLED=true is set explicitly.
 */
export function getContentGenerationConfig(): ContentGenerationConfig {
  const enabled = envBool("CONTENT_GENERATION_ENABLED", false);
  const provider = resolveProviderMode(process.env.CONTENT_GENERATION_PROVIDER ?? "disabled");

  const model =
    (
      process.env.CONTENT_GENERATION_MODEL ??
      process.env.WRITING_MODEL ??
      process.env.AI_SEO_BRIEF_MODEL ??
      "gpt-4o-mini"
    ).trim() || "gpt-4o-mini";

  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return {
    enabled,
    provider,
    model,
    apiKeyConfigured,
    maxOutputTokens: envInt("CONTENT_GENERATION_MAX_OUTPUT_TOKENS", 1_200),
    maxSectionsPerRun: envInt("CONTENT_GENERATION_MAX_SECTIONS_PER_RUN", 3),
    dailyLimit: envInt("CONTENT_GENERATION_DAILY_LIMIT", 50),
    monthlyBudgetUsd: envFloat("CONTENT_GENERATION_MONTHLY_BUDGET_USD"),
    timeoutMs: envInt("CONTENT_GENERATION_TIMEOUT_MS", 30_000),
    retryLimit: Math.min(3, envInt("CONTENT_GENERATION_RETRY_LIMIT", 1)),
    configurationVersion: "content-generation-config-v1",
  };
}

/** True only when a real (non-disabled/manual) provider can actually run. */
export function isContentGenerationConfigured(config: ContentGenerationConfig = getContentGenerationConfig()): boolean {
  if (!config.enabled) return false;
  if (config.provider === "TEST") return true;
  if (config.provider === "OPENAI") return config.apiKeyConfigured;
  return false;
}

/**
 * Client-safe status — NEVER include process.env.OPENAI_API_KEY or any
 * secret. Only a boolean `keyConfigured` flag is exposed.
 */
export function getContentGenerationSafeStatus(
  config: ContentGenerationConfig = getContentGenerationConfig(),
): ContentGenerationSafeStatus {
  return {
    enabled: config.enabled,
    provider: config.provider.toLowerCase(),
    model: config.model,
    keyConfigured: config.apiKeyConfigured,
    maxTokens: config.maxOutputTokens,
    maxSectionsPerRun: config.maxSectionsPerRun,
    dailyLimit: config.dailyLimit,
    monthlyBudgetUsd: config.monthlyBudgetUsd,
    // Foundation sprint: no live per-token rate table or cost ledger yet.
    rateTableAvailable: false,
    costEstimateSupported: config.provider === "OPENAI",
    configurationVersion: config.configurationVersion,
  };
}
