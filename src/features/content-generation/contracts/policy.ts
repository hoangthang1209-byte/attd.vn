import {
  getContentGenerationConfig,
  type ContentGenerationConfig,
} from "@/features/content-generation/contracts/config";
import {
  CONTENT_GENERATION_TYPES,
  ContentGenerationError,
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

  if (config.provider === "OPENAI" && !config.apiKeyConfigured) {
    throw new ContentGenerationError("Thiếu OPENAI_API_KEY cho provider OpenAI.", "PROVIDER_NOT_CONFIGURED");
  }

  // Daily-run-limit / monthly-budget enforcement is placeholder-only in this
  // foundation sprint: full aggregation lives in history.service once a
  // production usage ledger is wired. Providers must still respect
  // config.maxOutputTokens / config.timeoutMs per call.
}

/** True when the given category requires fact IDs to be present to be safe. */
export function isProhibitedClaimCategory(value: string): value is ProhibitedClaimCategory {
  return (PROHIBITED_CLAIM_CATEGORIES as readonly string[]).includes(value);
}
