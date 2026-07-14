export type SeoBriefAiConfig = {
  enabled: boolean;
  provider: "openai" | "fake";
  model: string;
  apiKeyConfigured: boolean;
  maxInputCharacters: number;
  maxOutputTokens: number;
  timeoutMs: number;
  /** Extra structured-output validation retries after the first attempt (0 or 1). */
  retryInvalidOutput: number;
  softMonthlyBudgetUsd: number | null;
};

export type SeoBriefAiSafeStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  configured: boolean;
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

export function getSeoBriefAiConfig(): SeoBriefAiConfig {
  const providerRaw = (process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
  const provider: "openai" | "fake" = providerRaw === "fake" ? "fake" : "openai";
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return {
    enabled: envBool("AI_SEO_BRIEF_ENABLED", false),
    provider,
    model: (process.env.AI_SEO_BRIEF_MODEL ?? "gpt-4o-mini").trim() || "gpt-4o-mini",
    apiKeyConfigured,
    maxInputCharacters: envInt("AI_SEO_BRIEF_MAX_INPUT_CHARACTERS", 24_000),
    maxOutputTokens: envInt("AI_SEO_BRIEF_MAX_OUTPUT_TOKENS", 2_500),
    timeoutMs: envInt("AI_SEO_BRIEF_TIMEOUT_MS", 45_000),
    retryInvalidOutput: Math.min(1, envInt("AI_SEO_BRIEF_RETRY", 1)),
    softMonthlyBudgetUsd: envFloat("AI_SEO_BRIEF_MONTHLY_BUDGET_USD"),
  };
}

/**
 * True when the feature can be invoked (enabled + provider credentials ready).
 * Fake provider never requires an API key.
 */
export function isSeoBriefAiConfigured(config = getSeoBriefAiConfig()): boolean {
  if (!config.enabled) return false;
  if (config.provider === "fake") return true;
  return config.apiKeyConfigured;
}

/**
 * Client-safe status — never includes API keys or secret values.
 */
export function getSeoBriefAiSafeStatus(config = getSeoBriefAiConfig()): SeoBriefAiSafeStatus {
  return {
    enabled: config.enabled,
    provider: config.provider,
    model: config.model,
    configured: isSeoBriefAiConfigured(config),
  };
}
