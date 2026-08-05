import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { ContentGenerationConfig } from "@/features/content-generation/contracts/config";
import { getRolloutReadinessSummary } from "@/features/content-generation/contracts/policy";
import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";
import {
  runSmokeChecks,
  worstSmokeStatus,
  type SmokeCheckInput,
} from "@/features/content-generation/services/smoke-check.service";
import {
  buildAiTestTopicCreateInput,
  isAiTestTopicSafe,
  AI_TEST_TOPIC_SLUG,
  AI_TEST_TOPIC_TITLE_MARKER,
} from "@/features/content-generation/services/ai-test-topic.mapping";
import {
  buildQualityFeedback,
  validateQualityFeedbackInput,
} from "@/features/content-generation/services/quality-feedback";
import { normalizeRunWarnings, withQualityFeedback, withRolledBackAt } from "@/features/content-generation/services/run-warnings";
import { buildProviderComparison } from "@/features/content-generation/services/proposal-detail.service";
import { computePromptVersionMetrics, type PromptMetricsRow } from "@/features/content-generation/services/prompt-metrics";
import { buildUsageExportCsv, buildUsageExportJson, USAGE_EXPORT_CSV_HEADERS, type UsageExportRow } from "@/features/content-generation/services/usage-export";
import {
  buildSyntheticSmokeContext,
  isFailureLabScenario,
  mapFailureLabScenarioToTestToken,
  runInvalidKeyReadinessScenario,
  runProviderFailureScenario,
  runQuotaExceededScenario,
  FAILURE_LAB_SCENARIOS,
} from "@/features/content-generation/services/failure-lab.service";

function baseConfig(overrides: Partial<ContentGenerationConfig> = {}): ContentGenerationConfig {
  return {
    enabled: false,
    provider: "DISABLED",
    model: "gpt-4o-mini",
    apiKeyConfigured: false,
    maxOutputTokens: 1_200,
    maxSectionsPerRun: 3,
    dailyLimit: 50,
    monthlyBudgetUsd: null,
    timeoutMs: 30_000,
    retryLimit: 1,
    configurationVersion: "content-generation-config-v2",
    rolloutStage: "OFF",
    dailyLimitPerUser: 20,
    dailyLimitPerTopic: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1) smoke check classification
// ---------------------------------------------------------------------------

describe("content-generation-18-1: smoke-check.service", () => {
  function checkInput(overrides: Partial<SmokeCheckInput> = {}): SmokeCheckInput {
    return {
      config: baseConfig({ enabled: true, provider: "TEST", rolloutStage: "TEST" }),
      providerHealth: { available: true },
      promptCount: 14,
      testTopic: { exists: true, hasContext: true },
      ledgerQueryOk: true,
      retryRollbackRoutesAvailable: true,
      ...overrides,
    };
  }

  it("returns all-PASS for a fully healthy TEST-stage environment", () => {
    const results = runSmokeChecks(checkInput());
    assert.equal(worstSmokeStatus(results), "PASS");
    assert.ok(results.some((r) => r.key === "health" && r.status === "PASS"));
    assert.ok(results.some((r) => r.key === "context_retrieval" && r.status === "PASS"));
  });

  it("marks health as WARNING (not FAIL) when the feature is disabled", () => {
    const results = runSmokeChecks(checkInput({ config: baseConfig({ enabled: false }) }));
    const health = results.find((r) => r.key === "health");
    assert.equal(health?.status, "WARNING");
  });

  it("marks context_retrieval as WARNING when no test topic exists yet — never FAIL", () => {
    const results = runSmokeChecks(checkInput({ testTopic: { exists: false, hasContext: false } }));
    const check = results.find((r) => r.key === "context_retrieval");
    assert.equal(check?.status, "WARNING");
  });

  it("marks context_retrieval as WARNING when the topic exists but has no context build", () => {
    const results = runSmokeChecks(checkInput({ testTopic: { exists: true, hasContext: false } }));
    const check = results.find((r) => r.key === "context_retrieval");
    assert.equal(check?.status, "WARNING");
  });

  it("FAILs prompt_registry when there are zero prompt templates", () => {
    const results = runSmokeChecks(checkInput({ promptCount: 0 }));
    const check = results.find((r) => r.key === "prompt_registry");
    assert.equal(check?.status, "FAIL");
  });

  it("FAILs ledger_write_capability when the ledger query throws", () => {
    const results = runSmokeChecks(checkInput({ ledgerQueryOk: false }));
    const check = results.find((r) => r.key === "ledger_write_capability");
    assert.equal(check?.status, "FAIL");
  });

  it("FAILs provider_config_safe when OPENAI is allowed by rollout but has no key", () => {
    const results = runSmokeChecks(
      checkInput({ config: baseConfig({ enabled: true, provider: "OPENAI", apiKeyConfigured: false, rolloutStage: "OPENAI_INTERNAL" }) }),
    );
    const check = results.find((r) => r.key === "provider_config_safe");
    assert.equal(check?.status, "FAIL");
  });

  it("worstSmokeStatus picks the single worst status across all checks", () => {
    assert.equal(worstSmokeStatus([{ key: "a", label: "A", status: "PASS", detail: "" }]), "PASS");
    assert.equal(
      worstSmokeStatus([
        { key: "a", label: "A", status: "PASS", detail: "" },
        { key: "b", label: "B", status: "WARNING", detail: "" },
      ]),
      "WARNING",
    );
    assert.equal(
      worstSmokeStatus([
        { key: "a", label: "A", status: "WARNING", detail: "" },
        { key: "b", label: "B", status: "FAIL", detail: "" },
      ]),
      "FAIL",
    );
  });
});

// ---------------------------------------------------------------------------
// 2) rollout readiness helper
// ---------------------------------------------------------------------------

describe("content-generation-18-1: getRolloutReadinessSummary", () => {
  it("is not eligible for TEST or OPENAI_INTERNAL when the feature is disabled", () => {
    const summary = getRolloutReadinessSummary(baseConfig({ enabled: false }));
    assert.equal(summary.test.eligible, false);
    assert.equal(summary.openaiInternal.eligible, false);
  });

  it("TEST is eligible whenever enabled=true, regardless of provider/key", () => {
    const summary = getRolloutReadinessSummary(baseConfig({ enabled: true, provider: "TEST" }));
    assert.equal(summary.test.eligible, true);
  });

  it("OPENAI_INTERNAL requires both enabled=true AND apiKeyConfigured=true", () => {
    const missingKey = getRolloutReadinessSummary(baseConfig({ enabled: true, provider: "OPENAI", apiKeyConfigured: false }));
    assert.equal(missingKey.openaiInternal.eligible, false);

    const ready = getRolloutReadinessSummary(baseConfig({ enabled: true, provider: "OPENAI", apiKeyConfigured: true }));
    assert.equal(ready.openaiInternal.eligible, true);
  });

  it("never allows automatic advancement — always false/true guard fields, regardless of config", () => {
    for (const stage of ["OFF", "TEST", "OPENAI_INTERNAL", "OPENAI_EDITOR", "OPENAI_ALL"] as const) {
      const summary = getRolloutReadinessSummary(baseConfig({ enabled: true, apiKeyConfigured: true, rolloutStage: stage }));
      assert.equal(summary.autoAdvanceAllowed, false);
      assert.equal(summary.requiresHumanApprovalBeyondTest, true);
      assert.equal(summary.openaiInternal.requiresApproval, true);
      assert.equal(summary.stage, stage);
    }
  });
});

// ---------------------------------------------------------------------------
// 3) AI test topic safety flags (never published)
// ---------------------------------------------------------------------------

describe("content-generation-18-1: ai-test-topic safety", () => {
  it("buildAiTestTopicCreateInput always produces a never-publishable payload", () => {
    const input = buildAiTestTopicCreateInput("cluster-1");
    assert.equal(input.status, "DRAFTING");
    assert.equal(input.targetUrl, null);
    assert.equal(input.existingUrl, null);
    assert.equal(input.publishedAt, null);
    assert.ok(input.title.includes(AI_TEST_TOPIC_TITLE_MARKER));
    assert.ok(input.slug.startsWith("ai-test-"));
    assert.equal(input.slug, AI_TEST_TOPIC_SLUG);
  });

  it("throws rather than creating a topic with no clusterId", () => {
    assert.throws(() => buildAiTestTopicCreateInput(""));
  });

  it("isAiTestTopicSafe is true for the exact create-input shape", () => {
    const input = buildAiTestTopicCreateInput("cluster-1");
    assert.equal(isAiTestTopicSafe(input), true);
  });

  it("isAiTestTopicSafe is false the moment any single safety field regresses", () => {
    const base = buildAiTestTopicCreateInput("cluster-1");
    assert.equal(isAiTestTopicSafe({ ...base, status: "PUBLISHED" }), false);
    assert.equal(isAiTestTopicSafe({ ...base, targetUrl: "https://attd.vn/blog/x" }), false);
    assert.equal(isAiTestTopicSafe({ ...base, existingUrl: "https://attd.vn/blog/x" }), false);
    assert.equal(isAiTestTopicSafe({ ...base, publishedAt: new Date() }), false);
    assert.equal(isAiTestTopicSafe({ ...base, title: "Không có marker" }), false);
    assert.equal(isAiTestTopicSafe({ ...base, slug: "some-other-slug" }), false);
  });
});

// ---------------------------------------------------------------------------
// 4) quality feedback merge into warnings
// ---------------------------------------------------------------------------

describe("content-generation-18-1: quality-feedback + warnings merge", () => {
  it("validateQualityFeedbackInput requires an integer rating 1-5", () => {
    assert.throws(
      () => validateQualityFeedbackInput({ rating: 0 }),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "INVALID_REQUEST",
    );
    assert.throws(
      () => validateQualityFeedbackInput({ rating: 6 }),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "INVALID_REQUEST",
    );
    assert.throws(() => validateQualityFeedbackInput(null));
    assert.doesNotThrow(() => validateQualityFeedbackInput({ rating: 4 }));
  });

  it("buildQualityFeedback stamps submittedAt/submittedBy and preserves optional fields", () => {
    const input = validateQualityFeedbackInput({ rating: 5, helpful: true, note: "Rất tốt" });
    const feedback = buildQualityFeedback(input, "user-9", new Date("2026-08-05T10:00:00.000Z"));
    assert.equal(feedback.rating, 5);
    assert.equal(feedback.helpful, true);
    assert.equal(feedback.note, "Rất tốt");
    assert.equal(feedback.submittedBy, "user-9");
    assert.equal(feedback.submittedAt, "2026-08-05T10:00:00.000Z");
  });

  it("withQualityFeedback merges into warnings while preserving legacy string[] messages", () => {
    const feedback = buildQualityFeedback(validateQualityFeedbackInput({ rating: 3 }), null, new Date());
    const merged = withQualityFeedback(["provider:TEST"], feedback);
    assert.deepEqual(merged.messages, ["provider:TEST"]);
    assert.deepEqual(merged.qualityFeedback, feedback);
  });

  it("withQualityFeedback preserves an existing rollbackSnapshot/retry keys already present", () => {
    const existing = { messages: ["a"], retryOfRunId: "run-0", rollbackSnapshot: null };
    const feedback = buildQualityFeedback(validateQualityFeedbackInput({ rating: 2 }), "user-1", new Date());
    const merged = withQualityFeedback(existing, feedback);
    assert.equal(merged.retryOfRunId, "run-0");
    assert.deepEqual(merged.qualityFeedback, feedback);
  });

  it("normalizeRunWarnings round-trips rolledBackAt and qualityFeedback together", () => {
    const feedback = buildQualityFeedback(validateQualityFeedbackInput({ rating: 4 }), null, new Date());
    const withBoth = withQualityFeedback(withRolledBackAt(["x"], "2026-08-05T11:00:00.000Z"), feedback);
    const normalized = normalizeRunWarnings(withBoth);
    assert.equal(normalized.rolledBackAt, "2026-08-05T11:00:00.000Z");
    assert.deepEqual(normalized.qualityFeedback, feedback);
    assert.deepEqual(normalized.messages, ["x"]);
  });
});

// ---------------------------------------------------------------------------
// 5) provider comparison helper selection
// ---------------------------------------------------------------------------

describe("content-generation-18-1: buildProviderComparison", () => {
  function run(overrides: Partial<Parameters<typeof buildProviderComparison>[0]> = {}) {
    return {
      id: "run-1",
      provider: "test",
      model: "test-model",
      totalTokens: 200,
      estimatedCostUsd: 0,
      startedAt: new Date("2026-08-05T10:00:00.000Z"),
      completedAt: new Date("2026-08-05T10:00:02.000Z"),
      ...overrides,
    };
  }

  it("returns comparison:null and diffSummary:null when no candidate exists", () => {
    const result = buildProviderComparison(run(), null);
    assert.equal(result.comparison, null);
    assert.equal(result.diffSummary, null);
    assert.equal(result.current.latencyMs, 2_000);
  });

  it("computes a diff summary with signed token/latency/cost deltas", () => {
    const current = run({ totalTokens: 300, estimatedCostUsd: 0.002, completedAt: new Date("2026-08-05T10:00:03.000Z") });
    const candidate = run({
      id: "run-0",
      provider: "openai",
      model: "gpt-4o-mini",
      totalTokens: 200,
      estimatedCostUsd: 0.0005,
      completedAt: new Date("2026-08-05T10:00:02.000Z"),
    });
    const result = buildProviderComparison(current, candidate);
    assert.ok(result.comparison);
    assert.equal(result.comparison?.provider, "openai");
    assert.ok(result.diffSummary?.includes("openai/gpt-4o-mini"));
    assert.ok(result.diffSummary?.includes("+100"));
  });
});

// ---------------------------------------------------------------------------
// 6) prompt evaluation metrics
// ---------------------------------------------------------------------------

describe("content-generation-18-1: computePromptVersionMetrics", () => {
  function row(overrides: Partial<PromptMetricsRow> = {}): PromptMetricsRow {
    return { promptVersion: "content-generation-prompt-v1", status: "COMPLETED", proposalStatus: "GENERATED", warnings: null, ...overrides };
  }

  it("computes acceptance rate as applied/generated", () => {
    const rows = [
      row({ proposalStatus: "GENERATED" }),
      row({ proposalStatus: "APPLIED" }),
      row({ proposalStatus: "APPLIED" }),
      row({ proposalStatus: "REJECTED" }),
    ];
    const [metrics] = computePromptVersionMetrics(rows);
    assert.equal(metrics.totalRuns, 4);
    assert.equal(metrics.generatedRuns, 4);
    assert.equal(metrics.appliedRuns, 2);
    assert.equal(metrics.acceptanceRate, 0.5);
  });

  it("computes retry rate from retriedByRunId presence in warnings", () => {
    const rows = [
      row({ warnings: { messages: [], retriedByRunId: "run-2" } }),
      row({ warnings: { messages: [] } }),
    ];
    const [metrics] = computePromptVersionMetrics(rows);
    assert.equal(metrics.retryRate, 0.5);
  });

  it("computes rollback rate as rolledBack/applied — null when zero applied", () => {
    const noApplied = computePromptVersionMetrics([row({ proposalStatus: "GENERATED" })]);
    assert.equal(noApplied[0].rollbackRate, null);

    const withRollback = computePromptVersionMetrics([
      row({ proposalStatus: "APPLIED", warnings: { messages: [], rolledBackAt: "2026-08-05T10:00:00.000Z" } }),
      row({ proposalStatus: "APPLIED" }),
    ]);
    assert.equal(withRollback[0].rollbackRate, 0.5);
  });

  it("computes average quality rating only from rows carrying qualityFeedback.rating", () => {
    const rows = [
      row({ warnings: { messages: [], qualityFeedback: { rating: 4 } } }),
      row({ warnings: { messages: [], qualityFeedback: { rating: 2 } } }),
      row({ warnings: { messages: [] } }),
    ];
    const [metrics] = computePromptVersionMetrics(rows);
    assert.equal(metrics.qualityRatingCount, 2);
    assert.equal(metrics.avgQualityRating, 3);
  });

  it("groups by promptVersion and sorts the result by totalRuns desc", () => {
    const rows = [
      row({ promptVersion: "v1" }),
      row({ promptVersion: "v2" }),
      row({ promptVersion: "v2" }),
      row({ promptVersion: "v2" }),
    ];
    const metrics = computePromptVersionMetrics(rows);
    assert.equal(metrics[0].promptVersion, "v2");
    assert.equal(metrics[0].totalRuns, 3);
    assert.equal(metrics[1].promptVersion, "v1");
  });
});

// ---------------------------------------------------------------------------
// 7) usage export CSV/JSON shape
// ---------------------------------------------------------------------------

describe("content-generation-18-1: usage-export", () => {
  function exportRow(overrides: Partial<UsageExportRow> = {}): UsageExportRow {
    return {
      id: "run-1",
      requestedBy: "user-1",
      provider: "test",
      model: "test-model",
      status: "COMPLETED",
      proposalStatus: "APPLIED",
      totalTokens: 150,
      estimatedCostUsd: 0.001,
      createdAt: new Date("2026-08-05T10:00:00.000Z"),
      startedAt: new Date("2026-08-05T10:00:00.000Z"),
      completedAt: new Date("2026-08-05T10:00:02.000Z"),
      ...overrides,
    };
  }

  it("buildUsageExportJson produces one object per row with every header key present", () => {
    const [row] = buildUsageExportJson([exportRow()]);
    for (const header of USAGE_EXPORT_CSV_HEADERS) {
      assert.ok(header in row, `missing ${header}`);
    }
    assert.equal(row.id, "run-1");
    assert.equal(row.totalTokens, "150");
  });

  it("buildUsageExportCsv emits a header row plus one row per generation, comma-joined", () => {
    const csv = buildUsageExportCsv([exportRow(), exportRow({ id: "run-2", requestedBy: null })]);
    const lines = csv.split("\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0], USAGE_EXPORT_CSV_HEADERS.join(","));
    assert.ok(lines[1].startsWith("run-1,"));
    assert.ok(lines[2].startsWith("run-2,,")); // requestedBy is empty
  });

  it("buildUsageExportCsv escapes commas/quotes per RFC 4180", () => {
    const csv = buildUsageExportCsv([exportRow({ requestedBy: 'user, "vip"' })]);
    assert.ok(csv.includes('"user, ""vip"""'));
  });
});

// ---------------------------------------------------------------------------
// 8) failure-lab simulation mapping
// ---------------------------------------------------------------------------

describe("content-generation-18-1: failure-lab.service", () => {
  it("isFailureLabScenario accepts only the five known scenarios", () => {
    for (const scenario of FAILURE_LAB_SCENARIOS) {
      assert.equal(isFailureLabScenario(scenario), true);
    }
    assert.equal(isFailureLabScenario("not_a_scenario"), false);
    assert.equal(isFailureLabScenario(123), false);
  });

  it("maps provider-based scenarios to distinct TEST provider magic tokens", () => {
    const timeout = mapFailureLabScenarioToTestToken("timeout");
    const malformed = mapFailureLabScenarioToTestToken("malformed");
    const providerError = mapFailureLabScenarioToTestToken("provider_error");
    assert.ok(timeout && malformed && providerError);
    assert.notEqual(timeout, malformed);
    assert.notEqual(malformed, providerError);
    assert.equal(mapFailureLabScenarioToTestToken("quota_exceeded"), null);
    assert.equal(mapFailureLabScenarioToTestToken("invalid_key"), null);
  });

  it("runProviderFailureScenario PASSes timeout/provider_error via the expected thrown error code", async () => {
    const context = buildSyntheticSmokeContext({ id: "topic-1", title: "AI Test Topic" });
    const timeout = await runProviderFailureScenario("timeout", context);
    assert.equal(timeout.status, "PASS");
    const providerError = await runProviderFailureScenario("provider_error", context);
    assert.equal(providerError.status, "PASS");
  });

  it("runProviderFailureScenario PASSes malformed via structured-output validation rejecting it", async () => {
    const context = buildSyntheticSmokeContext({ id: "topic-1", title: "AI Test Topic" });
    const result = await runProviderFailureScenario("malformed", context);
    assert.equal(result.status, "PASS");
  });

  it("runQuotaExceededScenario PASSes by proving the quota gate blocks an in-memory over-limit request", async () => {
    const result = await runQuotaExceededScenario(baseConfig({ dailyLimit: 50 }));
    assert.equal(result.status, "PASS");
    assert.equal(result.scenario, "quota_exceeded");
  });

  it("runInvalidKeyReadinessScenario never claims PASS for an unset OpenAI key", () => {
    const missing = runInvalidKeyReadinessScenario(baseConfig({ provider: "OPENAI", apiKeyConfigured: false }));
    assert.equal(missing.status, "WARNING");
    const configured = runInvalidKeyReadinessScenario(baseConfig({ provider: "OPENAI", apiKeyConfigured: true }));
    assert.equal(configured.status, "PASS");
    const notOpenAi = runInvalidKeyReadinessScenario(baseConfig({ provider: "TEST" }));
    assert.equal(notOpenAi.status, "WARNING");
  });
});

// ---------------------------------------------------------------------------
// 9) structural guard — no Sprint 18.1 helper touches publish/review/handoff
// ---------------------------------------------------------------------------

describe("content-generation-18-1: no new helper calls publish/review/handoff mutations", () => {
  const FILES_TO_SCAN = [
    "src/features/content-generation/services/ai-test-topic.mapping.ts",
    "src/features/content-generation/services/ai-test-topic.service.ts",
    "src/features/content-generation/services/quality-feedback.ts",
    "src/features/content-generation/services/failure-lab.service.ts",
    "src/features/content-generation/services/smoke-check.service.ts",
    "src/features/content-generation/services/smoke.wiring.ts",
    "src/features/content-generation/services/prompt-metrics.ts",
    "src/features/content-generation/services/usage-export.ts",
  ];

  const FORBIDDEN_PATTERNS: RegExp[] = [
    /content-review\.service/,
    /content-publishing\.service/,
    /writing-blog-handoff\.service/,
    /seo-brief-apply\.service/,
    /applyProposal\b/,
    /applySeoBriefSuggestion/,
    /saveHumanEditedSection/,
    /publishArticle/i,
    /approveReview/i,
  ];

  it("never imports or calls a publish/review-approval/handoff/apply mutation from the codebase", () => {
    for (const file of FILES_TO_SCAN) {
      const source = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        assert.doesNotMatch(source, pattern, `${file} unexpectedly references ${pattern}`);
      }
    }
  });

  it("rollback marker/quality feedback only ever touch AiGenerationRun.warnings, never proposalStatus, in proposal.wiring.ts's new Sprint 18.1 code paths", () => {
    const source = readFileSync("src/features/content-generation/services/proposal.wiring.ts", "utf8");
    const qualityFnStart = source.indexOf("export async function recordProposalQualityFeedback");
    assert.ok(qualityFnStart >= 0, "recordProposalQualityFeedback not found");
    const qualityFnBody = source.slice(qualityFnStart, qualityFnStart + 800);
    assert.doesNotMatch(qualityFnBody, /proposalStatus:/);
  });
});
