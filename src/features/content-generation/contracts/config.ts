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
  /** Sprint 18.0 — staged production rollout. See CONTENT_GENERATION_ROLLOUT_STAGES. */
  rolloutStage: ContentGenerationRolloutStage;
  dailyLimitPerUser: number;
  dailyLimitPerTopic: number;
};

/**
 * Sprint 18.0 — staged rollout gate, independent from `provider`/`enabled`.
 * OFF disables every provider (even TEST). TEST only allows the TEST
 * provider — this is the safe default for "production enabled" without any
 * paid-provider exposure. OPENAI_* stages progressively widen who can
 * trigger real OpenAI calls (enforced elsewhere — this enum only records
 * *intent*, actual editor/role targeting is out of scope for this sprint).
 */
export const CONTENT_GENERATION_ROLLOUT_STAGES = [
  "OFF",
  "TEST",
  "OPENAI_INTERNAL",
  "OPENAI_EDITOR",
  "OPENAI_ALL",
] as const;

export type ContentGenerationRolloutStage = (typeof CONTENT_GENERATION_ROLLOUT_STAGES)[number];

export function isContentGenerationRolloutStage(value: unknown): value is ContentGenerationRolloutStage {
  return typeof value === "string" && (CONTENT_GENERATION_ROLLOUT_STAGES as readonly string[]).includes(value);
}

/** Aggregated AiGenerationRun totals for a time window — always null-safe. */
export type ContentGenerationUsageSnapshot = {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  appliedRuns: number;
  totalTokens: number | null;
  totalCostUsd: number | null;
  avgLatencyMs: number | null;
};

export function emptyContentGenerationUsageSnapshot(): ContentGenerationUsageSnapshot {
  return {
    totalRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    appliedRuns: 0,
    totalTokens: null,
    totalCostUsd: null,
    avgLatencyMs: null,
  };
}

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
  /** Sprint 18.0 additions — still no secrets, only rollout/quota shape. */
  rolloutStage: ContentGenerationRolloutStage;
  dailyLimitPerUser: number;
  dailyLimitPerTopic: number;
  /** Populated only when the caller injects a ledger snapshot (see getContentGenerationSafeStatus). */
  todayUsage: ContentGenerationUsageSnapshot | null;
  monthUsage: ContentGenerationUsageSnapshot | null;
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
 * Resolves the rollout stage. Defaults to OFF, EXCEPT when the master switch
 * is on and the provider is TEST — that combination defaults to TEST so a
 * `CONTENT_GENERATION_ENABLED=true` + `CONTENT_GENERATION_PROVIDER=test`
 * environment (the sprint's target "production-safe" default) doesn't also
 * require a second env var to be set. Any explicit env value always wins.
 */
function resolveRolloutStage(
  raw: string | undefined,
  enabled: boolean,
  provider: ContentGenerationProviderMode,
): ContentGenerationRolloutStage {
  const normalized = raw?.trim().toUpperCase();
  if (normalized && isContentGenerationRolloutStage(normalized)) return normalized;
  if (enabled && provider === "TEST") return "TEST";
  return "OFF";
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
      "gpt-5.4-mini"
    ).trim() || "gpt-5.4-mini";

  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return {
    enabled,
    provider,
    model,
    apiKeyConfigured,
    maxOutputTokens: envInt("CONTENT_GENERATION_MAX_OUTPUT_TOKENS", 1_200),
    maxSectionsPerRun: envInt("CONTENT_GENERATION_MAX_SECTIONS_PER_RUN", 1),
    dailyLimit: envInt("CONTENT_GENERATION_DAILY_LIMIT", 10),
    monthlyBudgetUsd: envFloat("CONTENT_GENERATION_MONTHLY_BUDGET_USD") ?? (
      // When OpenAI is explicitly enabled and no monthly budget is set, default
      // to a conservative $5 hard cap for Solo Founder production safety.
      enabled && provider === "OPENAI" ? 5 : null
    ),
    timeoutMs: envInt("CONTENT_GENERATION_TIMEOUT_MS", 60_000),
    retryLimit: Math.min(3, envInt("CONTENT_GENERATION_RETRY_LIMIT", 1)),
    configurationVersion: "content-generation-config-v3",
    rolloutStage: resolveRolloutStage(process.env.CONTENT_GENERATION_ROLLOUT_STAGE, enabled, provider),
    dailyLimitPerUser: envInt("CONTENT_GENERATION_DAILY_LIMIT_PER_USER", 10),
    dailyLimitPerTopic: envInt("CONTENT_GENERATION_DAILY_LIMIT_PER_TOPIC", 3),
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
 *
 * `usage` is an optional injection point: callers with server/DB access
 * (the status API route) pass in a ledger snapshot (see
 * usage-ledger.service.ts); callers without it (most tests, and any
 * pure/offline caller) get `todayUsage`/`monthUsage: null` rather than a
 * fabricated number.
 */
export function getContentGenerationSafeStatus(
  config: ContentGenerationConfig = getContentGenerationConfig(),
  usage?: { today?: ContentGenerationUsageSnapshot | null; month?: ContentGenerationUsageSnapshot | null },
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
    // Sprint 18.0 — cost-engine.service.ts now provides a static rate table
    // for OPENAI/CLAUDE/GEMINI; TEST is always free. Unknown model/provider
    // combinations still safely report rateTableAvailable:false per-call.
    rateTableAvailable: config.provider === "OPENAI" || config.provider === "TEST",
    costEstimateSupported: config.provider === "OPENAI" || config.provider === "TEST",
    configurationVersion: config.configurationVersion,
    rolloutStage: config.rolloutStage,
    dailyLimitPerUser: config.dailyLimitPerUser,
    dailyLimitPerTopic: config.dailyLimitPerTopic,
    todayUsage: usage?.today ?? null,
    monthUsage: usage?.month ?? null,
  };
}
