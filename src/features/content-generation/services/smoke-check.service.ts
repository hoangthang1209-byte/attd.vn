/**
 * Sprint 18.1 — AI Smoke Workspace check classification. Pure: takes
 * already-loaded config/health/counts and classifies each prerequisite as
 * PASS/WARNING/FAIL. No prisma import here on purpose — the real DB-backed
 * gathering (provider health, prompt count, test-topic/context lookup,
 * ledger query) lives in smoke.wiring.ts, so this module stays unit
 * testable with in-memory fixtures (see content-generation-18-1.test.ts).
 */

import type { ContentGenerationConfig } from "@/features/content-generation/contracts/config";
import { isRolloutStageAllowingProvider } from "@/features/content-generation/contracts/policy";

export type SmokeCheckStatus = "PASS" | "WARNING" | "FAIL";

export type SmokeCheckResult = {
  key: string;
  label: string;
  status: SmokeCheckStatus;
  detail: string;
};

export type SmokeCheckInput = {
  config: ContentGenerationConfig;
  providerHealth: { available: boolean } | null;
  promptCount: number;
  testTopic: { exists: boolean; hasContext: boolean };
  /** True when a ledger query (e.g. getUsageForWorkspaceToday) resolved without throwing. */
  ledgerQueryOk: boolean;
  /** True when the retry/rollback API routes are present in this deployment (static in this codebase). */
  retryRollbackRoutesAvailable: boolean;
};

/** Worst status wins — used by callers that want a single overall verdict. */
export function worstSmokeStatus(results: readonly SmokeCheckResult[]): SmokeCheckStatus {
  if (results.some((r) => r.status === "FAIL")) return "FAIL";
  if (results.some((r) => r.status === "WARNING")) return "WARNING";
  return "PASS";
}

/**
 * Never throws — every branch resolves to a PASS/WARNING/FAIL result so the
 * smoke page always renders a full checklist, even against a completely
 * unconfigured (OFF) environment.
 */
export function runSmokeChecks(input: SmokeCheckInput): SmokeCheckResult[] {
  const { config } = input;
  const results: SmokeCheckResult[] = [];

  results.push({
    key: "health",
    label: "Health",
    status: config.enabled ? "PASS" : "WARNING",
    detail: config.enabled
      ? `Tính năng AI đang bật (provider=${config.provider}, rolloutStage=${config.rolloutStage}).`
      : "CONTENT_GENERATION_ENABLED=false — các kiểm tra bên dưới chỉ mang tính tham khảo.",
  });

  const quotaConfigured = config.dailyLimit > 0 || config.dailyLimitPerUser > 0 || config.dailyLimitPerTopic > 0;
  results.push({
    key: "quota_gate",
    label: "Quota gate presence",
    status: quotaConfigured ? "PASS" : "WARNING",
    detail: `dailyLimit=${config.dailyLimit}, dailyLimitPerUser=${config.dailyLimitPerUser}, dailyLimitPerTopic=${config.dailyLimitPerTopic}`,
  });

  results.push(buildProviderConfigSafeCheck(config));

  results.push({
    key: "prompt_registry",
    label: "Prompt registry available",
    status: input.promptCount > 0 ? "PASS" : "FAIL",
    detail:
      input.promptCount > 0
        ? `${input.promptCount} prompt template(s) sẵn sàng.`
        : "Không có prompt template nào — không thể tạo đề xuất AI.",
  });

  results.push(buildContextRetrievalCheck(input.testTopic));

  results.push({
    key: "ledger_write_capability",
    label: "Ledger write capability",
    status: input.ledgerQueryOk ? "PASS" : "FAIL",
    detail: input.ledgerQueryOk
      ? "Đã truy vấn và phân loại được usage ledger (AiGenerationRun)."
      : "Không truy vấn được usage ledger — kiểm tra kết nối database.",
  });

  results.push({
    key: "retry_rollback_routes",
    label: "Retry/rollback route availability",
    status: input.retryRollbackRoutesAvailable ? "PASS" : "WARNING",
    detail: input.retryRollbackRoutesAvailable
      ? "Route retry/rollback đã sẵn sàng (POST .../retry, POST .../rollback)."
      : "Chưa xác nhận được route retry/rollback trong bản triển khai này.",
  });

  return results;
}

function buildProviderConfigSafeCheck(config: ContentGenerationConfig): SmokeCheckResult {
  if (config.provider === "OPENAI" && config.apiKeyConfigured && config.rolloutStage !== "OFF" && config.rolloutStage !== "TEST") {
    return {
      key: "provider_config_safe",
      label: "Provider config safe",
      status: "WARNING",
      detail: `rolloutStage=${config.rolloutStage} cho phép OpenAI thật — cần đã có phê duyệt thủ công vượt TEST.`,
    };
  }

  if (config.provider === "OPENAI" && !config.apiKeyConfigured) {
    const stageAllowsOpenAi = isRolloutStageAllowingProvider(config.rolloutStage, "OPENAI");
    return {
      key: "provider_config_safe",
      label: "Provider config safe",
      status: stageAllowsOpenAi ? "FAIL" : "WARNING",
      detail: stageAllowsOpenAi
        ? "rolloutStage cho phép OpenAI nhưng thiếu OPENAI_API_KEY."
        : "Provider=OPENAI nhưng thiếu OPENAI_API_KEY (hiện chưa được rollout stage cho phép nên chưa chặn cứng).",
    };
  }

  return {
    key: "provider_config_safe",
    label: "Provider config safe",
    status: "PASS",
    detail: `provider=${config.provider}, rolloutStage=${config.rolloutStage} — cấu hình nhất quán, an toàn.`,
  };
}

function buildContextRetrievalCheck(testTopic: SmokeCheckInput["testTopic"]): SmokeCheckResult {
  if (!testTopic.exists) {
    return {
      key: "context_retrieval",
      label: "Context retrieval ready",
      status: "WARNING",
      detail: "Chưa có AI Test Topic — hãy tạo trước khi kiểm tra context retrieval.",
    };
  }
  if (!testTopic.hasContext) {
    return {
      key: "context_retrieval",
      label: "Context retrieval ready",
      status: "WARNING",
      detail: "AI Test Topic đã có nhưng chưa có Content Context Build hoàn tất.",
    };
  }
  return {
    key: "context_retrieval",
    label: "Context retrieval ready",
    status: "PASS",
    detail: "AI Test Topic có Content Context Build hoàn tất — sẵn sàng cho retrieval.",
  };
}
