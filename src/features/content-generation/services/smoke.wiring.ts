import "server-only";

import { prisma } from "@/lib/prisma";
import { getContentGenerationConfig, type ContentGenerationUsageSnapshot } from "@/features/content-generation/contracts/config";
import { getRolloutReadinessSummary, type RolloutReadinessSummary } from "@/features/content-generation/contracts/policy";
import { listPromptTemplates } from "@/features/content-generation/prompts/prompt-registry";
import { getAiTestTopic, type AiTestTopicRecord } from "@/features/content-generation/services/ai-test-topic.service";
import {
  runSmokeChecks,
  type SmokeCheckInput,
  type SmokeCheckResult,
} from "@/features/content-generation/services/smoke-check.service";
import {
  buildSyntheticSmokeContext,
  FAILURE_LAB_SCENARIOS,
  isFailureLabScenario,
  runInvalidKeyReadinessScenario,
  runProviderFailureScenario,
  runQuotaExceededScenario,
  type FailureLabResult,
  type FailureLabScenario,
} from "@/features/content-generation/services/failure-lab.service";
import { getProviderStatusSnapshot } from "@/features/content-generation/services/proposal.wiring";
import { getUsageForWorkspaceToday, getUsageLedgerSummary } from "@/features/content-generation/services/usage-ledger.service";

async function testTopicHasCompletedContext(topicId: string): Promise<boolean> {
  const build = await prisma.contentContextBuild.findFirst({
    where: { topicId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });
  return Boolean(build);
}

export type SmokeStatusSnapshot = {
  provider: Awaited<ReturnType<typeof getProviderStatusSnapshot>>;
  rolloutStage: string;
  rolloutReadiness: RolloutReadinessSummary;
  quota: {
    dailyLimit: number;
    dailyLimitPerUser: number;
    dailyLimitPerTopic: number;
    monthlyBudgetUsd: number | null;
  };
  usage: { today: ContentGenerationUsageSnapshot; month: ContentGenerationUsageSnapshot };
  testTopic: { exists: boolean; id: string | null; title: string | null; status: string | null; hasContext: boolean };
};

/** GET /api/content/generation/smoke — prerequisites/status, entirely read-only. */
export async function getSmokeStatusSnapshot(): Promise<SmokeStatusSnapshot> {
  const config = getContentGenerationConfig();
  const [providerHealth, ledger, testTopic] = await Promise.all([
    getProviderStatusSnapshot(),
    getUsageLedgerSummary(),
    getAiTestTopic(),
  ]);

  const hasContext = testTopic ? await testTopicHasCompletedContext(testTopic.id) : false;

  return {
    provider: providerHealth,
    rolloutStage: config.rolloutStage,
    rolloutReadiness: getRolloutReadinessSummary(config),
    quota: {
      dailyLimit: config.dailyLimit,
      dailyLimitPerUser: config.dailyLimitPerUser,
      dailyLimitPerTopic: config.dailyLimitPerTopic,
      monthlyBudgetUsd: config.monthlyBudgetUsd,
    },
    usage: { today: ledger.today, month: ledger.month },
    testTopic: testTopic
      ? { exists: true, id: testTopic.id, title: testTopic.title, status: testTopic.status, hasContext }
      : { exists: false, id: null, title: null, status: null, hasContext: false },
  };
}

export type RunSmokeInput = {
  mode?: "check" | "simulate";
  scenarios?: string[];
};

export type RunSmokeResult = {
  checks: SmokeCheckResult[];
  simulations: FailureLabResult[] | null;
  generatedAt: string;
};

async function resolveTestTopicForSimulation(): Promise<AiTestTopicRecord | null> {
  return getAiTestTopic();
}

async function runSimulations(
  scenarios: FailureLabScenario[],
  testTopic: AiTestTopicRecord | null,
  config: ReturnType<typeof getContentGenerationConfig>,
): Promise<FailureLabResult[]> {
  if (!testTopic) {
    return scenarios.map((scenario) => ({
      scenario,
      status: "WARNING" as const,
      detail: "Chưa có AI Test Topic — hãy tạo (POST .../smoke/test-topic) trước khi mô phỏng.",
    }));
  }

  const context = buildSyntheticSmokeContext({ id: testTopic.id, title: testTopic.title });

  return Promise.all(
    scenarios.map((scenario) => {
      if (scenario === "timeout" || scenario === "malformed" || scenario === "provider_error") {
        return runProviderFailureScenario(scenario, context);
      }
      if (scenario === "quota_exceeded") {
        return runQuotaExceededScenario(config);
      }
      return Promise.resolve(runInvalidKeyReadinessScenario(config));
    }),
  );
}

/**
 * POST /api/content/generation/smoke — always runs the read-only
 * prerequisite checks; additionally runs TEST-only failure simulations when
 * `mode: "simulate"`. Never mutates any DB row (Failure Lab is entirely
 * in-memory) and never calls a paid provider.
 */
export async function runSmokeChecksAndSimulations(input: RunSmokeInput): Promise<RunSmokeResult> {
  const config = getContentGenerationConfig();
  const [providerHealth, promptCount, testTopic, ledgerQueryOk] = await Promise.all([
    getProviderStatusSnapshot().catch(() => null),
    Promise.resolve(listPromptTemplates().length),
    getAiTestTopic().catch(() => null),
    getUsageForWorkspaceToday()
      .then(() => true)
      .catch(() => false),
  ]);

  const hasContext = testTopic ? await testTopicHasCompletedContext(testTopic.id).catch(() => false) : false;

  const checkInput: SmokeCheckInput = {
    config,
    providerHealth: providerHealth ? { available: providerHealth.available } : null,
    promptCount,
    testTopic: { exists: Boolean(testTopic), hasContext },
    ledgerQueryOk,
    retryRollbackRoutesAvailable: true,
  };

  const checks = runSmokeChecks(checkInput);

  let simulations: FailureLabResult[] | null = null;
  if (input.mode === "simulate") {
    const requested = (input.scenarios ?? []).filter(isFailureLabScenario);
    const scenarios: FailureLabScenario[] = requested.length > 0 ? requested : [...FAILURE_LAB_SCENARIOS];
    const resolvedTestTopic = testTopic ?? (await resolveTestTopicForSimulation());
    simulations = await runSimulations(scenarios, resolvedTestTopic, config);
  }

  return { checks, simulations, generatedAt: new Date().toISOString() };
}
