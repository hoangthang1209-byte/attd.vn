import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getContentGenerationConfig,
  getContentGenerationSafeStatus,
  type ContentGenerationConfig,
} from "@/features/content-generation/contracts/config";
import {
  assertRolloutAllowsProvider,
  isRolloutStageAllowingProvider,
} from "@/features/content-generation/contracts/policy";
import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";
import { estimateGenerationCost } from "@/features/content-generation/services/cost-engine.service";
import { assertQuotaAllowed, type QuotaUsageDeps } from "@/features/content-generation/services/quota-engine.service";
import {
  countLedgerRowsByStatus,
  groupLedgerRowsByTopic,
  groupLedgerRowsByUser,
  summarizeLedgerRows,
  type LedgerRunRow,
} from "@/features/content-generation/services/usage-ledger.mapping";
import { buildProposalDetail, buildProposalTimeline } from "@/features/content-generation/services/proposal-detail.service";
import type { ProposalRunRecord } from "@/features/content-generation/services/proposal.service";
import { mapPriorRunToRetryInput, type PriorRunForRetry } from "@/features/content-generation/services/retry-mapping";
import {
  normalizeRunWarnings,
  withRetriedByRunId,
  withRetryOfRunId,
  withRollbackSnapshot,
  type RollbackSnapshot,
} from "@/features/content-generation/services/run-warnings";
import { assertSelectionNotStale } from "@/features/content-generation/services/stale-check";
import {
  buildProviderStatusSnapshot,
  type ProviderStatusRunRow,
} from "@/features/content-generation/services/provider-status.service";

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

function baseRun(overrides: Partial<ProposalRunRecord> = {}): ProposalRunRecord {
  const now = new Date("2026-08-05T10:00:00.000Z");
  return {
    id: "run-1",
    type: "SECTION_DRAFT",
    status: "COMPLETED",
    proposalStatus: "GENERATED",
    provider: "TEST",
    model: "test-model",
    promptVersion: "v1",
    entityType: "SEO_TOPIC",
    entityId: "topic-1",
    retrievalRequestId: null,
    inputHash: null,
    inputSummary: { editorInstruction: null, factCount: 0, mediaCount: 0, linkCount: 0 },
    output: { html: "<p>Xin chào</p>", plainText: "Xin chào", factIdsUsed: [], mediaIdsUsed: [], internalLinkIdsUsed: [], warnings: [] },
    warnings: ["provider:TEST", "rolloutStage:TEST"],
    errorMessage: null,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    estimatedCostUsd: 0,
    sectionId: "section-1",
    writingDraftId: "draft-1",
    writingPlanId: "plan-1",
    contextBuildId: "ctx-1",
    templateId: "tpl-1",
    templateVersion: "v1",
    factIdsUsed: [],
    mediaIdsUsed: [],
    appliedAt: null,
    appliedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    requestedBy: "user-1",
    startedAt: new Date(now.getTime() - 2_000),
    completedAt: now,
    createdAt: new Date(now.getTime() - 3_000),
    updatedAt: now,
    ...overrides,
  };
}

function ledgerRow(overrides: Partial<LedgerRunRow> = {}): LedgerRunRow {
  const now = new Date("2026-08-05T10:00:00.000Z");
  return {
    id: "run-1",
    status: "COMPLETED",
    proposalStatus: "APPLIED",
    entityType: "SEO_TOPIC",
    entityId: "topic-1",
    requestedBy: "user-1",
    totalTokens: 150,
    estimatedCostUsd: 0.001,
    startedAt: new Date(now.getTime() - 2_000),
    completedAt: now,
    createdAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1) cost engine
// ---------------------------------------------------------------------------

describe("content-generation-18-0: cost-engine.service", () => {
  it("estimates a known OpenAI rate deterministically", () => {
    const result = estimateGenerationCost({
      provider: "OPENAI",
      model: "gpt-4o-mini",
      inputTokens: 1000,
      outputTokens: 1000,
    });
    assert.equal(result.rateTableAvailable, true);
    assert.equal(result.estimatedCostUsd, 0.00075);
  });

  it("applies a discounted cached-input rate when cachedTokens is supplied", () => {
    const result = estimateGenerationCost({
      provider: "OPENAI",
      model: "gpt-4o-mini",
      inputTokens: 1000,
      outputTokens: 0,
      cachedTokens: 1000,
    });
    assert.equal(result.breakdown.cachedCostUsd, 0.000075);
    assert.equal(result.breakdown.inputCostUsd, 0);
  });

  it("TEST provider is always free with rateTableAvailable:true", () => {
    const result = estimateGenerationCost({ provider: "TEST", model: "anything", inputTokens: 999, outputTokens: 999 });
    assert.equal(result.estimatedCostUsd, 0);
    assert.equal(result.rateTableAvailable, true);
  });

  it("returns null cost + rateTableAvailable:false for an unknown provider/model", () => {
    const result = estimateGenerationCost({
      provider: "OPENAI",
      model: "some-future-model",
      inputTokens: 100,
      outputTokens: 100,
    });
    assert.equal(result.estimatedCostUsd, null);
    assert.equal(result.rateTableAvailable, false);
  });
});

// ---------------------------------------------------------------------------
// 2) quota engine
// ---------------------------------------------------------------------------

describe("content-generation-18-0: quota-engine.service", () => {
  function deps(overrides: Partial<QuotaUsageDeps> = {}): QuotaUsageDeps {
    return {
      getWorkspaceToday: async () => ({ totalRuns: 0, totalCostUsd: 0 }),
      getUserToday: async () => ({ totalRuns: 0, totalCostUsd: 0 }),
      getTopicToday: async () => ({ totalRuns: 0, totalCostUsd: 0 }),
      getMonthToDate: async () => ({ totalRuns: 0, totalCostUsd: 0 }),
      ...overrides,
    };
  }

  it("allows the request when every usage is under limit", async () => {
    await assert.doesNotReject(
      assertQuotaAllowed({ type: "SECTION_DRAFT", topicId: "topic-1", userId: "user-1", config: baseConfig({ dailyLimit: 50 }) }, deps()),
    );
  });

  it("blocks on workspace daily limit with DAILY_LIMIT", async () => {
    const d = deps({ getWorkspaceToday: async () => ({ totalRuns: 50, totalCostUsd: 0 }) });
    await assert.rejects(
      assertQuotaAllowed({ type: "SECTION_DRAFT", config: baseConfig({ dailyLimit: 50 }) }, d),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "DAILY_LIMIT",
    );
  });

  it("blocks on monthly budget with MONTHLY_BUDGET_EXCEEDED", async () => {
    const d = deps({ getMonthToDate: async () => ({ totalRuns: 5, totalCostUsd: 10 }) });
    await assert.rejects(
      assertQuotaAllowed({ type: "SECTION_DRAFT", config: baseConfig({ monthlyBudgetUsd: 10 }) }, d),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "MONTHLY_BUDGET_EXCEEDED",
    );
  });

  it("blocks on per-user daily limit with DAILY_LIMIT", async () => {
    const d = deps({ getUserToday: async () => ({ totalRuns: 20, totalCostUsd: 0 }) });
    await assert.rejects(
      assertQuotaAllowed({ type: "SECTION_DRAFT", userId: "user-1", config: baseConfig({ dailyLimitPerUser: 20 }) }, d),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "DAILY_LIMIT",
    );
  });

  it("blocks on per-topic daily limit with DAILY_LIMIT", async () => {
    const d = deps({ getTopicToday: async () => ({ totalRuns: 10, totalCostUsd: 0 }) });
    await assert.rejects(
      assertQuotaAllowed({ type: "SECTION_DRAFT", topicId: "topic-1", config: baseConfig({ dailyLimitPerTopic: 10 }) }, d),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "DAILY_LIMIT",
    );
  });

  it("skips a check entirely when the corresponding limit is 0/disabled", async () => {
    const d = deps({ getUserToday: async () => ({ totalRuns: 999, totalCostUsd: 0 }) });
    await assert.doesNotReject(
      assertQuotaAllowed({ type: "SECTION_DRAFT", userId: "user-1", config: baseConfig({ dailyLimitPerUser: 0 }) }, d),
    );
  });
});

// ---------------------------------------------------------------------------
// 3) rollout policy
// ---------------------------------------------------------------------------

describe("content-generation-18-0: rollout/provider compatibility policy", () => {
  it("OFF blocks every provider, including TEST", () => {
    assert.equal(isRolloutStageAllowingProvider("OFF", "TEST"), false);
    assert.equal(isRolloutStageAllowingProvider("OFF", "OPENAI"), false);
  });

  it("TEST stage allows only the TEST provider — never OpenAI", () => {
    assert.equal(isRolloutStageAllowingProvider("TEST", "TEST"), true);
    assert.equal(isRolloutStageAllowingProvider("TEST", "OPENAI"), false);
  });

  it("OPENAI_* stages allow both TEST and OPENAI", () => {
    for (const stage of ["OPENAI_INTERNAL", "OPENAI_EDITOR", "OPENAI_ALL"] as const) {
      assert.equal(isRolloutStageAllowingProvider(stage, "OPENAI"), true);
      assert.equal(isRolloutStageAllowingProvider(stage, "TEST"), true);
    }
  });

  it("assertRolloutAllowsProvider throws GENERATION_DISABLED at OFF", () => {
    assert.throws(
      () => assertRolloutAllowsProvider(baseConfig({ rolloutStage: "OFF", provider: "TEST" })),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_DISABLED",
    );
  });

  it("assertRolloutAllowsProvider throws PROVIDER_NOT_CONFIGURED when TEST stage but provider is OPENAI", () => {
    assert.throws(
      () => assertRolloutAllowsProvider(baseConfig({ rolloutStage: "TEST", provider: "OPENAI" })),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "PROVIDER_NOT_CONFIGURED",
    );
  });

  it("assertRolloutAllowsProvider passes for TEST stage + TEST provider", () => {
    assert.doesNotThrow(() => assertRolloutAllowsProvider(baseConfig({ rolloutStage: "TEST", provider: "TEST" })));
  });
});

// ---------------------------------------------------------------------------
// 4) usage ledger aggregation
// ---------------------------------------------------------------------------

describe("content-generation-18-0: usage-ledger.mapping", () => {
  it("summarizes totals/tokens/cost/latency across mixed rows", () => {
    const rows = [
      ledgerRow({ id: "a", status: "COMPLETED", proposalStatus: "APPLIED", totalTokens: 100, estimatedCostUsd: 0.01 }),
      ledgerRow({ id: "b", status: "FAILED", proposalStatus: null, totalTokens: null, estimatedCostUsd: null, startedAt: null, completedAt: null }),
      ledgerRow({ id: "c", status: "COMPLETED", proposalStatus: "EDITED_AND_APPLIED", totalTokens: 200, estimatedCostUsd: 0.02 }),
    ];
    const summary = summarizeLedgerRows(rows);
    assert.equal(summary.totalRuns, 3);
    assert.equal(summary.completedRuns, 2);
    assert.equal(summary.failedRuns, 1);
    assert.equal(summary.appliedRuns, 2);
    assert.equal(summary.totalTokens, 300);
    assert.equal(summary.totalCostUsd, 0.03);
    assert.equal(summary.avgLatencyMs, 2_000);
  });

  it("returns the null-safe empty snapshot for zero rows", () => {
    const summary = summarizeLedgerRows([]);
    assert.equal(summary.totalRuns, 0);
    assert.equal(summary.totalTokens, null);
    assert.equal(summary.totalCostUsd, null);
    assert.equal(summary.avgLatencyMs, null);
  });

  it("groups by user and by topic, sorted by totalRuns desc", () => {
    const rows = [
      ledgerRow({ id: "a", requestedBy: "user-1", entityId: "topic-1" }),
      ledgerRow({ id: "b", requestedBy: "user-1", entityId: "topic-1" }),
      ledgerRow({ id: "c", requestedBy: "user-2", entityId: "topic-2" }),
    ];
    const byUser = groupLedgerRowsByUser(rows);
    assert.equal(byUser[0].userId, "user-1");
    assert.equal(byUser[0].totalRuns, 2);

    const byTopic = groupLedgerRowsByTopic(rows);
    assert.equal(byTopic[0].topicId, "topic-1");
    assert.equal(byTopic[0].totalRuns, 2);
  });

  it("counts rows by (proposalStatus ?? status)", () => {
    const rows = [
      ledgerRow({ id: "a", proposalStatus: "APPLIED" }),
      ledgerRow({ id: "b", proposalStatus: "APPLIED" }),
      ledgerRow({ id: "c", proposalStatus: null, status: "FAILED" }),
    ];
    const counts = countLedgerRowsByStatus(rows);
    assert.equal(counts.APPLIED, 2);
    assert.equal(counts.FAILED, 1);
  });
});

// ---------------------------------------------------------------------------
// 5) proposal detail timeline shape
// ---------------------------------------------------------------------------

describe("content-generation-18-0: proposal-detail.service", () => {
  it("builds a full timeline for an APPLIED run, in order, with real timestamps", () => {
    const run = baseRun({ proposalStatus: "APPLIED", appliedAt: new Date("2026-08-05T10:05:00.000Z") });
    const timeline = buildProposalTimeline(run);
    assert.deepEqual(
      timeline.map((p) => p.key),
      ["requested", "running", "generated", "applied"],
    );
    assert.equal(timeline.every((p) => p.done), true);
    assert.equal(timeline[3].at, "2026-08-05T10:05:00.000Z");
  });

  it("stops at 'failed' for a FAILED run — never fabricates later steps", () => {
    const run = baseRun({ proposalStatus: "FAILED", status: "FAILED" });
    const timeline = buildProposalTimeline(run);
    assert.deepEqual(
      timeline.map((p) => p.key),
      ["requested", "running", "failed"],
    );
  });

  it("marks 'running'/'generated' as not-done for a still-REQUESTED run", () => {
    const run = baseRun({ proposalStatus: "REQUESTED", startedAt: null, completedAt: null });
    const timeline = buildProposalTimeline(run);
    const running = timeline.find((p) => p.key === "running");
    assert.equal(running?.done, false);
    assert.equal(running?.at, null);
  });

  it("buildProposalDetail computes latency, display, and rollback/retry fields", () => {
    const run = baseRun({
      warnings: { messages: ["provider:TEST"], retryOfRunId: "run-0" } satisfies Record<string, unknown>,
    });
    const detail = buildProposalDetail(run);
    assert.equal(detail.latencyMs, 2_000);
    assert.equal(detail.retryOfRunId, "run-0");
    assert.equal(detail.rollbackAvailable, false);
    assert.equal(detail.display.plainText, "Xin chào");
  });
});

// ---------------------------------------------------------------------------
// 6) selection stale check
// ---------------------------------------------------------------------------

describe("content-generation-18-0: stale-check.assertSelectionNotStale", () => {
  it("passes when draftVersionAtCreation and selection.draftVersion both match", () => {
    assert.doesNotThrow(() =>
      assertSelectionNotStale({ draftVersionAtCreation: 3, selection: { draftVersion: 3 } }, 3),
    );
  });

  it("rejects apply with GENERATION_STALE when draftVersionAtCreation no longer matches", () => {
    assert.throws(
      () => assertSelectionNotStale({ draftVersionAtCreation: 2 }, 3),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_STALE",
    );
  });

  it("rejects apply with GENERATION_STALE when only the text selection's draftVersion is stale", () => {
    assert.throws(
      () => assertSelectionNotStale({ draftVersionAtCreation: 3, selection: { draftVersion: 2 } }, 3),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_STALE",
    );
  });

  it("passes when neither field was recorded (no selection anchor supplied)", () => {
    assert.doesNotThrow(() => assertSelectionNotStale({}, 7));
  });
});

// ---------------------------------------------------------------------------
// 7) rollback snapshot storage/exposure
// ---------------------------------------------------------------------------

describe("content-generation-18-0: run-warnings rollback/retry helpers", () => {
  const snapshot: RollbackSnapshot = {
    draftId: "draft-1",
    sectionId: "section-1",
    previousHtml: "<p>Cũ</p>",
    previousPlainText: "Cũ",
    previousVersion: 4,
    capturedAt: "2026-08-05T10:00:00.000Z",
  };

  it("withRollbackSnapshot preserves legacy string[] messages and adds the snapshot", () => {
    const payload = withRollbackSnapshot(["provider:TEST"], snapshot);
    assert.deepEqual(payload.messages, ["provider:TEST"]);
    assert.deepEqual(payload.rollbackSnapshot, snapshot);
  });

  it("normalizeRunWarnings round-trips the structured payload", () => {
    const payload = withRollbackSnapshot(["a warning"], snapshot);
    const normalized = normalizeRunWarnings(payload);
    assert.deepEqual(normalized.rollbackSnapshot, snapshot);
    assert.deepEqual(normalized.messages, ["a warning"]);
  });

  it("buildProposalDetail exposes rollbackAvailable:true only when previousHtml is present", () => {
    const run = baseRun({ warnings: withRollbackSnapshot([], snapshot) as unknown as Record<string, unknown> });
    const detail = buildProposalDetail(run);
    assert.equal(detail.rollbackAvailable, true);
    assert.deepEqual(detail.rollbackSnapshot, snapshot);
  });

  it("withRetryOfRunId / withRetriedByRunId cross-link runs without losing rollbackSnapshot", () => {
    const withRollback = withRollbackSnapshot([], snapshot);
    const withRetry = withRetryOfRunId(withRollback, "prior-run-id");
    assert.equal(withRetry.retryOfRunId, "prior-run-id");
    assert.deepEqual(withRetry.rollbackSnapshot, snapshot);

    const withRetried = withRetriedByRunId([], "next-run-id");
    assert.equal(withRetried.retriedByRunId, "next-run-id");
  });
});

// ---------------------------------------------------------------------------
// 8) provider status safety
// ---------------------------------------------------------------------------

describe("content-generation-18-0: provider-status.service", () => {
  function row(overrides: Partial<ProviderStatusRunRow> = {}): ProviderStatusRunRow {
    return { status: "COMPLETED", startedAt: new Date(0), completedAt: new Date(1_000), ...overrides };
  }

  it("never includes a secret field — only keyConfigured:boolean", () => {
    const snapshot = buildProviderStatusSnapshot(baseConfig({ apiKeyConfigured: true }), []);
    const keys = Object.keys(snapshot);
    assert.ok(!keys.some((k) => k.toLowerCase().includes("key") && k !== "keyConfigured"));
    assert.equal(typeof snapshot.keyConfigured, "boolean");
  });

  it("computes recent completed/failed counts and avg latency from rows", () => {
    const rows = [row({ status: "COMPLETED" }), row({ status: "FAILED" }), row({ status: "COMPLETED" })];
    const snapshot = buildProviderStatusSnapshot(baseConfig({ enabled: true, provider: "TEST", rolloutStage: "TEST" }), rows);
    assert.equal(snapshot.recentRunCount, 3);
    assert.equal(snapshot.recentCompletedCount, 2);
    assert.equal(snapshot.recentFailedCount, 1);
    assert.equal(snapshot.avgLatencyMs, 1_000);
  });

  it("available:true only when enabled + rollout allows provider + provider is actually configured", () => {
    const notAvailable = buildProviderStatusSnapshot(baseConfig({ enabled: false }), []);
    assert.equal(notAvailable.available, false);

    const available = buildProviderStatusSnapshot(
      baseConfig({ enabled: true, provider: "TEST", rolloutStage: "TEST" }),
      [],
    );
    assert.equal(available.available, true);

    const blockedByRollout = buildProviderStatusSnapshot(
      baseConfig({ enabled: true, provider: "OPENAI", apiKeyConfigured: true, rolloutStage: "TEST" }),
      [],
    );
    assert.equal(blockedByRollout.available, false);
  });
});

// ---------------------------------------------------------------------------
// 9) retry mapping
// ---------------------------------------------------------------------------

describe("content-generation-18-0: retry-mapping.mapPriorRunToRetryInput", () => {
  function priorRun(overrides: Partial<PriorRunForRetry> = {}): PriorRunForRetry {
    return {
      type: "SECTION_DRAFT",
      entityType: "SEO_TOPIC",
      entityId: "topic-1",
      writingPlanId: "plan-1",
      writingDraftId: "draft-1",
      sectionId: "section-1",
      contextBuildId: "ctx-1",
      inputSummary: { editorInstruction: "Nhấn mạnh MOQ" },
      ...overrides,
    };
  }

  it("maps type/topic/section/context and recovers editorInstruction from inputSummary", () => {
    const input = mapPriorRunToRetryInput(priorRun(), "user-2");
    assert.equal(input.type, "SECTION_DRAFT");
    assert.equal(input.topicId, "topic-1");
    assert.equal(input.writingDraftId, "draft-1");
    assert.equal(input.sectionId, "section-1");
    assert.equal(input.editorInstruction, "Nhấn mạnh MOQ");
    assert.equal(input.requestedBy, "user-2");
  });

  it("produces an empty topicId (caught by createProposal's own validation) for a non-SEO_TOPIC entity", () => {
    const input = mapPriorRunToRetryInput(priorRun({ entityType: "OTHER", entityId: "x" }), null);
    assert.equal(input.topicId, "");
  });

  it("tolerates a missing/malformed inputSummary without throwing", () => {
    const input = mapPriorRunToRetryInput(priorRun({ inputSummary: null }), null);
    assert.equal(input.editorInstruction, null);
  });
});

// ---------------------------------------------------------------------------
// 10) OpenAI remains off by default
// ---------------------------------------------------------------------------

describe("content-generation-18-0: OpenAI stays off by default", () => {
  it("getContentGenerationConfig defaults rolloutStage to OFF when no env vars are set", () => {
    const config = getContentGenerationConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.provider, "DISABLED");
    assert.equal(config.rolloutStage, "OFF");
    assert.equal(config.apiKeyConfigured, false);
  });

  it("getContentGenerationSafeStatus never leaks a secret, and reports rolloutStage/limits", () => {
    const status = getContentGenerationSafeStatus(baseConfig({ rolloutStage: "TEST" }));
    assert.equal(status.rolloutStage, "TEST");
    assert.equal(status.dailyLimitPerUser, 20);
    assert.equal(status.dailyLimitPerTopic, 10);
    assert.equal((status as unknown as Record<string, unknown>).apiKey, undefined);
    assert.equal(status.todayUsage, null);
  });

  it("getContentGenerationSafeStatus injects usage snapshots only when explicitly provided", () => {
    const usageSnapshot = {
      totalRuns: 3,
      completedRuns: 2,
      failedRuns: 1,
      appliedRuns: 1,
      totalTokens: 300,
      totalCostUsd: 0.02,
      avgLatencyMs: 1_200,
    };
    const status = getContentGenerationSafeStatus(baseConfig(), { today: usageSnapshot, month: null });
    assert.deepEqual(status.todayUsage, usageSnapshot);
    assert.equal(status.monthUsage, null);
  });
});
