/**
 * Sprint 18.1 — Failure Lab: safe, TEST-provider-only failure simulations
 * for the AI Smoke Workspace. Nothing here ever calls OpenAI, ever writes
 * an `AiGenerationRun` row, or ever mutates quota/DB state — every
 * "exceeded" or "invalid" scenario is proven against an in-memory
 * synthetic context/config, not real data.
 */

import type { ContentGenerationConfig } from "@/features/content-generation/contracts/config";
import {
  ContentGenerationError,
  type ContentGenerationRequest,
  type GovernedGenerationContext,
} from "@/features/content-generation/contracts/generation.types";
import { assertQuotaAllowed, type QuotaUsageDeps } from "@/features/content-generation/services/quota-engine.service";
import { validateStructuredOutput } from "@/features/content-generation/services/structured-output.service";
import { TEST_PROVIDER_TOKENS, TestContentGenerationProvider } from "@/features/content-generation/providers/test-provider";

export const FAILURE_LAB_SCENARIOS = [
  "timeout",
  "malformed",
  "provider_error",
  "quota_exceeded",
  "invalid_key",
] as const;

export type FailureLabScenario = (typeof FAILURE_LAB_SCENARIOS)[number];

export function isFailureLabScenario(value: unknown): value is FailureLabScenario {
  return typeof value === "string" && (FAILURE_LAB_SCENARIOS as readonly string[]).includes(value);
}

export type FailureLabResult = {
  scenario: FailureLabScenario;
  status: "PASS" | "WARNING" | "FAIL";
  detail: string;
};

const PROVIDER_SCENARIO_TOKENS: Record<"timeout" | "malformed" | "provider_error", string> = {
  timeout: TEST_PROVIDER_TOKENS.TIMEOUT,
  malformed: TEST_PROVIDER_TOKENS.MALFORMED,
  provider_error: TEST_PROVIDER_TOKENS.PROVIDER_ERROR,
};

export function mapFailureLabScenarioToTestToken(scenario: FailureLabScenario): string | null {
  if (scenario === "timeout" || scenario === "malformed" || scenario === "provider_error") {
    return PROVIDER_SCENARIO_TOKENS[scenario];
  }
  return null;
}

/**
 * Pure synthetic context builder — used so Failure Lab never depends on a
 * real `ContentContextBuild` existing for the AI test topic (context
 * retrieval readiness is checked separately, see smoke-check.service.ts).
 */
export function buildSyntheticSmokeContext(topic: {
  id: string;
  title: string;
  primaryKeyword?: string;
}): GovernedGenerationContext {
  return {
    topicId: topic.id,
    briefId: null,
    language: "vi",
    topicTitle: topic.title,
    primaryKeyword: topic.primaryKeyword ?? "ai-test-smoke",
    brandVoice: { tone: null, voiceRules: [], prohibitedPhrases: [], terminology: {} },
    facts: [],
    media: [],
    links: [],
    prohibitedClaims: [],
    outline: [],
    section: {
      id: "ai-test-smoke-section",
      heading: "AI Test Section",
      purpose: "smoke",
      targetWordCountMin: 20,
      targetWordCountMax: 150,
      requiredFactIds: [],
      existingHtml: null,
      existingPlainText: null,
    },
    editorInstruction: null,
    provenance: { contextBuildId: null, retrievalRequestId: null, packageHash: null, generatedAt: new Date().toISOString() },
  };
}

/**
 * Runs one of the three TEST-provider magic-token scenarios and classifies
 * the result: PASS means the safety net (either the provider's own thrown
 * error, or — for `malformed` — the structured-output validator) behaved
 * exactly as expected. Never touches a database or a paid API.
 */
export async function runProviderFailureScenario(
  scenario: "timeout" | "malformed" | "provider_error",
  context: GovernedGenerationContext,
): Promise<FailureLabResult> {
  const provider = new TestContentGenerationProvider();
  const token = mapFailureLabScenarioToTestToken(scenario);

  const request: ContentGenerationRequest = {
    type: "SECTION_DRAFT",
    topicId: context.topicId,
    briefId: context.briefId,
    contextBuildId: context.provenance.contextBuildId,
    writingPlanId: null,
    writingDraftId: null,
    sectionId: context.section?.id ?? null,
    editorInstruction: token,
    model: "test-model",
    maxOutputTokens: 500,
    timeoutMs: 5_000,
    context,
  };

  try {
    const result = await provider.generate(request);

    if (scenario === "malformed") {
      try {
        validateStructuredOutput("SECTION_DRAFT", result.output, context);
        return {
          scenario,
          status: "FAIL",
          detail: "Output không hợp lệ nhưng KHÔNG bị structured-output validation chặn lại.",
        };
      } catch (err) {
        if (err instanceof ContentGenerationError && err.code === "INVALID_PROVIDER_OUTPUT") {
          return { scenario, status: "PASS", detail: "Structured-output validation đã chặn đúng output không hợp lệ." };
        }
        return { scenario, status: "WARNING", detail: "Lỗi khác với kỳ vọng khi validate output mô phỏng." };
      }
    }

    return { scenario, status: "FAIL", detail: "Provider TEST không mô phỏng lỗi như mong đợi." };
  } catch (err) {
    const expectedCode = scenario === "timeout" ? "TIMEOUT" : "PROVIDER_ERROR";
    if (err instanceof ContentGenerationError && err.code === expectedCode) {
      return { scenario, status: "PASS", detail: `Provider TEST mô phỏng đúng lỗi ${expectedCode}.` };
    }
    return { scenario, status: "WARNING", detail: "Lỗi khác với kỳ vọng khi mô phỏng." };
  }
}

/**
 * Proves the quota gate itself works by supplying strict IN-MEMORY mock
 * limits/usage — never reads or writes the real ledger/DB. PASS means
 * `assertQuotaAllowed` correctly threw DAILY_LIMIT for the synthetic
 * over-limit usage.
 */
export async function runQuotaExceededScenario(baseConfig: ContentGenerationConfig): Promise<FailureLabResult> {
  const strictConfig: ContentGenerationConfig = { ...baseConfig, dailyLimit: 1, dailyLimitPerUser: 0, dailyLimitPerTopic: 0, monthlyBudgetUsd: null };
  const deps: QuotaUsageDeps = {
    getWorkspaceToday: async () => ({ totalRuns: 1, totalCostUsd: 0 }),
    getUserToday: async () => ({ totalRuns: 0, totalCostUsd: 0 }),
    getTopicToday: async () => ({ totalRuns: 0, totalCostUsd: 0 }),
    getMonthToDate: async () => ({ totalRuns: 0, totalCostUsd: 0 }),
  };

  try {
    await assertQuotaAllowed({ type: "SECTION_DRAFT", config: strictConfig }, deps);
    return {
      scenario: "quota_exceeded",
      status: "FAIL",
      detail: "Quota gate KHÔNG chặn được yêu cầu vượt hạn mức mô phỏng (in-memory).",
    };
  } catch (err) {
    if (err instanceof ContentGenerationError && err.code === "DAILY_LIMIT") {
      return {
        scenario: "quota_exceeded",
        status: "PASS",
        detail: "Quota gate chặn đúng khi vượt hạn mức mô phỏng (in-memory, không đổi DB thật).",
      };
    }
    return { scenario: "quota_exceeded", status: "WARNING", detail: "Lỗi khác với kỳ vọng khi mô phỏng quota." };
  }
}

/**
 * Readiness-only — never calls OpenAI to validate the key. PASS/WARNING
 * describe whether the key is *present*, not whether it is valid.
 */
export function runInvalidKeyReadinessScenario(config: ContentGenerationConfig): FailureLabResult {
  if (config.provider !== "OPENAI") {
    return {
      scenario: "invalid_key",
      status: "WARNING",
      detail: "Provider hiện tại không phải OPENAI — kiểm tra key không áp dụng.",
    };
  }
  if (!config.apiKeyConfigured) {
    return {
      scenario: "invalid_key",
      status: "WARNING",
      detail: "OPENAI_API_KEY chưa cấu hình — đây chỉ là kiểm tra readiness, không gọi OpenAI để xác thực key.",
    };
  }
  return {
    scenario: "invalid_key",
    status: "PASS",
    detail: "OPENAI_API_KEY đã cấu hình (không gọi OpenAI để kiểm tra tính hợp lệ thật, tránh phát sinh chi phí).",
  };
}
