import type { ContentLaunchStatus } from "@/features/content/launch/content-launch.types";

/**
 * Pure helpers for launch-status rules — used by services and unit tests.
 * Never accepts or returns secret values.
 */

export type WritingConfigSnapshot = {
  enabled: boolean;
  provider: string;
  model: string;
  apiKeyConfigured: boolean;
  maxOutputTokensPerSection: number;
  dailyRunLimit: number;
  monthlyBudgetUsd: number | null;
  maxSectionsPerRun: number;
};

export type GraphFlagSnapshot = {
  global: boolean;
  SEO_TOPIC_PLANNER: boolean;
  SEO_BRIEF: boolean;
  SEO_CONTENT: boolean;
  rolloutMode: string;
};

export function buildAiGenerationLaunchBlock(
  writing: WritingConfigSnapshot,
): ContentLaunchStatus["aiGeneration"] {
  const providerConfigured =
    writing.enabled && (writing.provider === "fake" || writing.apiKeyConfigured);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!writing.enabled) {
    warnings.push(
      "WRITING_GENERATION_ENABLED=false — AI generation tắt. Vẫn có thể nhập nội dung thủ công.",
    );
  } else if (writing.provider === "openai" && !writing.apiKeyConfigured) {
    errors.push("OPENAI_API_KEY chưa cấu hình trong môi trường hiện tại.");
  }

  return {
    enabled: writing.enabled,
    providerConfigured,
    provider: writing.provider,
    model: writing.model,
    apiKeyConfigured: writing.apiKeyConfigured,
    sectionGenerationReady: providerConfigured,
    maxOutputTokensPerSection: writing.maxOutputTokensPerSection,
    dailyRunLimit: writing.dailyRunLimit,
    monthlyBudgetUsd: writing.monthlyBudgetUsd,
    maxSectionsPerRun: writing.maxSectionsPerRun,
    errors,
    warnings,
  };
}

export function buildPublishingLaunchBlock(input: {
  cronSecretConfigured: boolean;
  cronSchedule: string;
  lastSuccessfulDueRunAt: string | null;
}): ContentLaunchStatus["publishing"] {
  const warnings: string[] = [];
  if (!input.cronSecretConfigured) {
    warnings.push(
      "CONTENT_PUBLISH_CRON_SECRET / CRON_SECRET chưa cấu hình — scheduling chưa operational; immediate publish vẫn dùng được.",
    );
  }
  return {
    immediatePublishReady: true,
    schedulingConfigured: input.cronSecretConfigured,
    cronSecretConfigured: input.cronSecretConfigured,
    cronRouteRegistered: true,
    cronScheduleConfigured: true,
    cronSchedule: input.cronSchedule,
    lastSuccessfulDueRunAt: input.lastSuccessfulDueRunAt,
    errors: [],
    warnings,
  };
}

export function buildGraphLaunchBlock(
  graph: GraphFlagSnapshot,
): ContentLaunchStatus["graph"] {
  const consumerFlagsEnabled = (
    ["SEO_TOPIC_PLANNER", "SEO_BRIEF", "SEO_CONTENT"] as const
  ).filter((flag) => graph[flag]);

  return {
    globalExpansionEnabled: graph.global,
    consumerFlagsEnabled,
    rolloutMode: graph.rolloutMode,
  };
}

export function resolveLaunchReadinessFlags(input: {
  ai: ContentLaunchStatus["aiGeneration"];
  publishing: ContentLaunchStatus["publishing"];
}): Pick<
  ContentLaunchStatus,
  "readyForManualContentLaunch" | "readyForAiAssistedLaunch" | "readyForScheduledPublishing"
> {
  return {
    readyForManualContentLaunch: true,
    readyForAiAssistedLaunch: input.ai.enabled && input.ai.providerConfigured,
    readyForScheduledPublishing: input.publishing.cronSecretConfigured,
  };
}

/** Ensure serialized status never contains secret-like keys. */
export function assertNoSecretsInLaunchStatus(payload: unknown): string[] {
  const raw = JSON.stringify(payload);
  const leaks: string[] = [];
  for (const needle of ["sk-", "OPENAI_API_KEY=", "CRON_SECRET=", "Bearer "]) {
    if (raw.includes(needle)) leaks.push(needle);
  }
  return leaks;
}

export function missingMoqBlocksInformationalArticle(): boolean {
  return false;
}

export function isLaunchTopicDuplicate(
  existingPrimaryKeywords: string[],
  candidate: string,
): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const target = norm(candidate);
  return existingPrimaryKeywords.some((k) => norm(k) === target);
}
