export type WritingGenerationConfig = {
  enabled: boolean;
  provider: "openai" | "fake";
  model: string;
  apiKeyConfigured: boolean;
  maxParallelSections: number;
  maxRetries: number;
  timeoutMs: number;
  maxOutputTokensPerSection: number;
  dailyRunLimit: number;
  monthlyBudgetUsd: number | null;
  maxSectionsPerRun: number;
  configurationVersion: string;
};

export type WritingGenerationSafeStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  configured: boolean;
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

export function getWritingGenerationConfig(): WritingGenerationConfig {
  const providerRaw = (process.env.WRITING_PROVIDER ?? "openai").trim().toLowerCase();
  const provider: "openai" | "fake" = providerRaw === "fake" ? "fake" : "openai";

  return {
    enabled: envBool("WRITING_GENERATION_ENABLED", false),
    provider,
    model: (process.env.WRITING_MODEL ?? "gpt-4o-mini").trim() || "gpt-4o-mini",
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    maxParallelSections: Math.min(3, Math.max(1, envInt("WRITING_MAX_PARALLEL_SECTIONS", 2))),
    maxRetries: Math.min(3, Math.max(0, envInt("WRITING_MAX_RETRIES", 2))),
    timeoutMs: envInt("WRITING_TIMEOUT_MS", 60_000),
    maxOutputTokensPerSection: envInt("WRITING_MAX_OUTPUT_TOKENS_PER_SECTION", 1_200),
    dailyRunLimit: envInt("WRITING_DAILY_RUN_LIMIT", 50),
    monthlyBudgetUsd: envFloat("WRITING_MONTHLY_BUDGET_USD"),
    maxSectionsPerRun: envInt("WRITING_MAX_SECTIONS_PER_RUN", 20),
    configurationVersion: "writing-generation-config-v1",
  };
}

export function isWritingGenerationConfigured(
  config = getWritingGenerationConfig()
): boolean {
  if (!config.enabled) return false;
  if (config.provider === "fake") return true;
  return config.apiKeyConfigured;
}

export function getWritingGenerationSafeStatus(
  config = getWritingGenerationConfig()
): WritingGenerationSafeStatus {
  return {
    enabled: config.enabled,
    provider: config.provider,
    model: config.model,
    configured: isWritingGenerationConfigured(config),
    configurationVersion: config.configurationVersion,
  };
}
