/**
 * Sprint 18.0 — central provider pricing table + cost estimator. Pure/no
 * side effects, no network/DB calls, so it can run on every proposal
 * (proposal.service.ts) and inside tests without hitting a paid API.
 *
 * Rates are a static reference table (USD per 1,000 tokens) that must be
 * kept in sync manually as providers change pricing — this sprint does not
 * add a live pricing-API integration. When a provider/model pair isn't in
 * the table, `estimateGenerationCost` returns `estimatedCostUsd: null` and
 * `rateTableAvailable: false` rather than fabricating a number.
 */

export type CostEngineProvider = "OPENAI" | "CLAUDE" | "GEMINI" | "TEST";

export type ProviderRate = {
  provider: CostEngineProvider;
  model: string;
  inputPer1k: number;
  outputPer1k: number;
  /** Optional discounted rate for cached/reused input tokens. */
  cachedInputPer1k?: number;
};

const RATE_TABLE: ProviderRate[] = [
  // Official OpenAI list prices (USD per 1,000 tokens) — Sprint OpenAI enablement.
  // Source: platform pricing for gpt-5.4-mini / gpt-5.4 (input / cached input / output).
  {
    provider: "OPENAI",
    model: "gpt-5.4-mini",
    inputPer1k: 0.00075,
    outputPer1k: 0.0045,
    cachedInputPer1k: 0.000075,
  },
  {
    provider: "OPENAI",
    model: "gpt-5.4",
    inputPer1k: 0.0025,
    outputPer1k: 0.015,
    cachedInputPer1k: 0.00025,
  },
  // Legacy rows kept for older runs / rollback comparison — do not invent unverified rates.
  { provider: "OPENAI", model: "gpt-4o-mini", inputPer1k: 0.00015, outputPer1k: 0.0006, cachedInputPer1k: 0.000075 },
  { provider: "OPENAI", model: "gpt-4o", inputPer1k: 0.0025, outputPer1k: 0.01, cachedInputPer1k: 0.00125 },
  { provider: "OPENAI", model: "gpt-4.1-mini", inputPer1k: 0.0004, outputPer1k: 0.0016 },
  { provider: "OPENAI", model: "gpt-4.1", inputPer1k: 0.002, outputPer1k: 0.008 },
  { provider: "CLAUDE", model: "claude-3-5-sonnet", inputPer1k: 0.003, outputPer1k: 0.015 },
  { provider: "CLAUDE", model: "claude-3-5-haiku", inputPer1k: 0.0008, outputPer1k: 0.004 },
  { provider: "CLAUDE", model: "claude-3-haiku", inputPer1k: 0.00025, outputPer1k: 0.00125 },
  { provider: "GEMINI", model: "gemini-1.5-pro", inputPer1k: 0.00125, outputPer1k: 0.005 },
  { provider: "GEMINI", model: "gemini-1.5-flash", inputPer1k: 0.000075, outputPer1k: 0.0003 },
  // TEST is always free — never a paid API — but listed for completeness/UI display.
  { provider: "TEST", model: "test-model", inputPer1k: 0, outputPer1k: 0 },
];

export type EstimateGenerationCostInput = {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Tokens already billed at a discounted cached-input rate, if the provider reports it. */
  cachedTokens?: number | null;
  /** Extra context-window tokens not already counted in inputTokens (rare — most providers fold this into inputTokens). */
  contextTokens?: number | null;
};

export type EstimateGenerationCostBreakdown = {
  inputCostUsd: number | null;
  cachedCostUsd: number | null;
  outputCostUsd: number | null;
  rateInputPer1k: number | null;
  rateOutputPer1k: number | null;
};

export type EstimateGenerationCostResult = {
  estimatedCostUsd: number | null;
  breakdown: EstimateGenerationCostBreakdown;
  rateTableAvailable: boolean;
};

function normalizeProvider(raw: string): string {
  return raw.trim().toUpperCase();
}

function normalizeModel(raw: string): string {
  return raw.trim().toLowerCase();
}

function findRate(provider: string, model: string): ProviderRate | null {
  const p = normalizeProvider(provider);
  const m = normalizeModel(model);
  return RATE_TABLE.find((r) => r.provider === p && normalizeModel(r.model) === m) ?? null;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

const EMPTY_BREAKDOWN: EstimateGenerationCostBreakdown = {
  inputCostUsd: null,
  cachedCostUsd: null,
  outputCostUsd: null,
  rateInputPer1k: null,
  rateOutputPer1k: null,
};

/**
 * Estimates a proposal's provider cost from token usage. Returns a null
 * cost + `rateTableAvailable: false` for any provider/model this sprint
 * doesn't have a reference rate for (never a fabricated $0 or guessed
 * number) — TEST is the one exception, always $0 since it never calls a
 * paid API.
 */
export function estimateGenerationCost(input: EstimateGenerationCostInput): EstimateGenerationCostResult {
  const providerNorm = normalizeProvider(input.provider ?? "");

  if (providerNorm === "TEST") {
    return {
      estimatedCostUsd: 0,
      breakdown: { inputCostUsd: 0, cachedCostUsd: 0, outputCostUsd: 0, rateInputPer1k: 0, rateOutputPer1k: 0 },
      rateTableAvailable: true,
    };
  }

  const rate = findRate(input.provider ?? "", input.model ?? "");
  if (!rate) {
    return { estimatedCostUsd: null, breakdown: EMPTY_BREAKDOWN, rateTableAvailable: false };
  }

  const inputTokens = Math.max(0, input.inputTokens ?? 0) + Math.max(0, input.contextTokens ?? 0);
  const outputTokens = Math.max(0, input.outputTokens ?? 0);
  const cachedTokens = Math.max(0, Math.min(input.cachedTokens ?? 0, inputTokens));
  const billableInputTokens = Math.max(0, inputTokens - cachedTokens);

  const inputCostUsd = round6((billableInputTokens / 1000) * rate.inputPer1k);
  const cachedCostUsd = round6((cachedTokens / 1000) * (rate.cachedInputPer1k ?? rate.inputPer1k));
  const outputCostUsd = round6((outputTokens / 1000) * rate.outputPer1k);
  const estimatedCostUsd = round6(inputCostUsd + cachedCostUsd + outputCostUsd);

  return {
    estimatedCostUsd,
    breakdown: {
      inputCostUsd,
      cachedCostUsd,
      outputCostUsd,
      rateInputPer1k: rate.inputPer1k,
      rateOutputPer1k: rate.outputPer1k,
    },
    rateTableAvailable: true,
  };
}

/** Read-only rate table snapshot for the admin AI operations page — no secrets, just USD/1k reference rates. */
export function listCostRateTable(): ProviderRate[] {
  return RATE_TABLE.map((r) => ({ ...r }));
}
