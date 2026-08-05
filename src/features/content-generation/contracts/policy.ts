import {
  getContentGenerationConfig,
  type ContentGenerationConfig,
  type ContentGenerationRolloutStage,
} from "@/features/content-generation/contracts/config";
import {
  CONTENT_GENERATION_TYPES,
  ContentGenerationError,
  type ContentGenerationProviderMode,
  type ContentGenerationType,
} from "@/features/content-generation/contracts/generation.types";

/** All types the platform can propose today. Foundation sprint — full list. */
export const ALLOWED_CONTENT_GENERATION_TYPES: readonly ContentGenerationType[] = CONTENT_GENERATION_TYPES;

/**
 * Categories of unsupported claims that must never appear in proposal text
 * unless backed by fact IDs present in the governed context.
 * See claim-safety.service.ts for the pattern matching that enforces this.
 */
export const PROHIBITED_CLAIM_CATEGORIES = [
  "MOQ_WITHOUT_FACT",
  "PRICE_WITHOUT_FACT",
  "LEAD_TIME_WITHOUT_FACT",
  "FACTORY_OWNERSHIP_WITHOUT_FACT",
  "CERTIFICATION_WITHOUT_FACT",
  "CAPACITY_WITHOUT_FACT",
  "SUPERLATIVE_WITHOUT_FACT",
  "GUARANTEE_CLAIM",
] as const;

export type ProhibitedClaimCategory = (typeof PROHIBITED_CLAIM_CATEGORIES)[number];

/**
 * Sprint 18.0 — rollout-stage / provider compatibility matrix, independent
 * from the `enabled`/`provider` config knobs:
 *  - OFF: nothing may run, even the TEST provider.
 *  - TEST: only the TEST provider may run — the production-safe default so
 *    `CONTENT_GENERATION_ENABLED=true` can ship without any OpenAI exposure.
 *  - OPENAI_INTERNAL / OPENAI_EDITOR / OPENAI_ALL: OpenAI is allowed (still
 *    gated on `apiKeyConfigured` — see assertGenerationAllowed), and TEST
 *    remains allowed too (it never calls a paid API, so it's always safe).
 */
export function isRolloutStageAllowingProvider(
  stage: ContentGenerationRolloutStage,
  provider: ContentGenerationProviderMode,
): boolean {
  if (stage === "OFF") return false;
  if (stage === "TEST") return provider === "TEST";
  return provider === "TEST" || provider === "OPENAI";
}

/** Throws GENERATION_DISABLED/PROVIDER_NOT_CONFIGURED per isRolloutStageAllowingProvider. */
export function assertRolloutAllowsProvider(config: ContentGenerationConfig): void {
  if (isRolloutStageAllowingProvider(config.rolloutStage, config.provider)) return;

  if (config.rolloutStage === "OFF") {
    throw new ContentGenerationError(
      "Giai đoạn triển khai AI đang ở mức OFF — chưa cho phép tạo đề xuất.",
      "GENERATION_DISABLED",
    );
  }

  if (config.rolloutStage === "TEST") {
    throw new ContentGenerationError(
      "Giai đoạn triển khai hiện tại chỉ cho phép provider TEST (chưa mở OpenAI).",
      "PROVIDER_NOT_CONFIGURED",
    );
  }

  throw new ContentGenerationError(
    `Provider "${config.provider}" chưa được phép ở giai đoạn triển khai hiện tại.`,
    "PROVIDER_NOT_CONFIGURED",
  );
}

/**
 * Governance gate every proposal creation must pass through before a
 * provider is invoked. Throws ContentGenerationError — never silently
 * degrades to a "best effort" generation.
 */
export function assertGenerationAllowed(
  type: ContentGenerationType,
  config: ContentGenerationConfig = getContentGenerationConfig(),
): void {
  if (!config.enabled) {
    throw new ContentGenerationError(
      "Tính năng tạo nội dung AI chưa được bật (CONTENT_GENERATION_ENABLED=false).",
      "GENERATION_DISABLED",
    );
  }

  if (config.provider === "DISABLED") {
    throw new ContentGenerationError("Provider tạo nội dung AI đang tắt.", "GENERATION_DISABLED");
  }

  if (config.provider === "MANUAL") {
    throw new ContentGenerationError(
      "Chế độ thủ công đang bật — không gọi provider AI. Hãy soạn nội dung trực tiếp.",
      "GENERATION_DISABLED",
    );
  }

  if (!ALLOWED_CONTENT_GENERATION_TYPES.includes(type)) {
    throw new ContentGenerationError(`Loại đề xuất "${type}" chưa được cho phép.`, "TYPE_NOT_ALLOWED");
  }

  assertRolloutAllowsProvider(config);

  if (config.provider === "OPENAI" && !config.apiKeyConfigured) {
    throw new ContentGenerationError("Thiếu OPENAI_API_KEY cho provider OpenAI.", "PROVIDER_NOT_CONFIGURED");
  }

  // Daily-run-limit / monthly-budget / per-user / per-topic hard stops now
  // live in quota-engine.service.ts (assertQuotaAllowed), wired into
  // proposal.service.ts's createProposal right before the provider call —
  // this function only gates enabled/provider/type/rollout, which never
  // require a database read.
}

/** True when the given category requires fact IDs to be present to be safe. */
export function isProhibitedClaimCategory(value: string): value is ProhibitedClaimCategory {
  return (PROHIBITED_CLAIM_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Sprint 18.1 — read-only rollout-readiness forecast, distinct from the
 * *currently active* `config.rolloutStage`. This answers "if an operator
 * moved the stage, would it technically work?" for the two safest next
 * steps (TEST, OPENAI_INTERNAL) — it never changes `rolloutStage` itself
 * and never implies an automatic advancement.
 */
export type RolloutStageEligibility = {
  eligible: boolean;
  reason: string;
};

export type RolloutReadinessSummary = {
  stage: ContentGenerationRolloutStage;
  test: RolloutStageEligibility;
  openaiInternal: RolloutStageEligibility & { requiresApproval: true };
  /** Always true — OPENAI_EDITOR/OPENAI_ALL require an explicit human decision, never automatic. */
  requiresHumanApprovalBeyondTest: true;
  /** Always false in this sprint — documents intent for callers/tests, see policy comment above. */
  autoAdvanceAllowed: false;
};

/**
 * Pure/no-DB forecast used by the AI admin "OPENAI Internal Pilot Readiness"
 * block and the smoke workspace. TEST is eligible whenever the master
 * switch is on (it never calls a paid API); OPENAI_INTERNAL additionally
 * requires `apiKeyConfigured` — but reaching OPENAI_INTERNAL (or beyond)
 * still requires an operator to explicitly set
 * CONTENT_GENERATION_ROLLOUT_STAGE, never an automatic transition.
 */
export function getRolloutReadinessSummary(config: ContentGenerationConfig): RolloutReadinessSummary {
  const testEligible = config.enabled;
  const openaiInternalEligible = config.enabled && config.apiKeyConfigured;

  return {
    stage: config.rolloutStage,
    test: {
      eligible: testEligible,
      reason: testEligible
        ? "Có thể chạy provider TEST an toàn — không gọi API trả phí."
        : "CONTENT_GENERATION_ENABLED=false — cần bật tính năng trước, kể cả cho TEST.",
    },
    openaiInternal: {
      eligible: openaiInternalEligible,
      reason: openaiInternalEligible
        ? "Đã cấu hình OPENAI_API_KEY — đủ điều kiện kỹ thuật cho OPENAI_INTERNAL."
        : "Thiếu OPENAI_API_KEY hoặc tính năng đang tắt — chưa đủ điều kiện kỹ thuật cho OPENAI_INTERNAL.",
      requiresApproval: true,
    },
    requiresHumanApprovalBeyondTest: true,
    autoAdvanceAllowed: false,
  };
}
