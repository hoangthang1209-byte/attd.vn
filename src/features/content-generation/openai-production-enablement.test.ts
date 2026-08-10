/**
 * OpenAI production enablement — focused contract tests (mocked, no paid calls).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getContentGenerationConfig,
  getContentGenerationSafeStatus,
  isContentGenerationConfigured,
  type ContentGenerationConfig,
} from "@/features/content-generation/contracts/config";
import {
  assertGenerationAllowed,
  assertRolloutAllowsProvider,
  isRolloutStageAllowingProvider,
} from "@/features/content-generation/contracts/policy";
import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";
import { estimateGenerationCost, listCostRateTable } from "@/features/content-generation/services/cost-engine.service";
import { assertQuotaAllowed, type QuotaUsageDeps } from "@/features/content-generation/services/quota-engine.service";
import { ATTD_EDITORIAL_VOICE_ID, ATTD_EDITORIAL_VOICE_PROMPT_LINES } from "@/features/content/editorial/attd-editorial-voice";
import { R1_BLOG_FORM } from "@/features/content/revenue/r1-blog-form.content";
import { R1_BLOG_FABRIC } from "@/features/content/revenue/r1-blog-fabric.content";
import { R1_BLOG_PRINT } from "@/features/content/revenue/r1-blog-print.content";
import { R1_BLOG_XUONG_IN } from "@/features/content/revenue/r1-blog-xuong-in.content";

function baseConfig(overrides: Partial<ContentGenerationConfig> = {}): ContentGenerationConfig {
  return {
    enabled: true,
    provider: "OPENAI",
    model: "gpt-5.4-mini",
    apiKeyConfigured: true,
    maxOutputTokens: 1_200,
    maxSectionsPerRun: 1,
    dailyLimit: 10,
    monthlyBudgetUsd: 5,
    timeoutMs: 60_000,
    retryLimit: 1,
    configurationVersion: "content-generation-config-v3",
    rolloutStage: "OPENAI_INTERNAL",
    dailyLimitPerUser: 10,
    dailyLimitPerTopic: 3,
    ...overrides,
  };
}

function emptyUsage() {
  return {
    totalRuns: 0,
    totalCostUsd: null as number | null,
  };
}

function quotaDeps(overrides: Partial<QuotaUsageDeps> = {}): QuotaUsageDeps {
  return {
    getWorkspaceToday: async () => emptyUsage(),
    getMonthToDate: async () => emptyUsage(),
    getUserToday: async () => emptyUsage(),
    getTopicToday: async () => emptyUsage(),
    ...overrides,
  };
}

describe("OpenAI production writer enablement", () => {
  it("OPENAI_INTERNAL permits OpenAI and TEST; OPENAI_ALL is not the default enablement stage", () => {
    assert.equal(isRolloutStageAllowingProvider("OPENAI_INTERNAL", "OPENAI"), true);
    assert.equal(isRolloutStageAllowingProvider("OPENAI_INTERNAL", "TEST"), true);
    assert.equal(isRolloutStageAllowingProvider("TEST", "OPENAI"), false);
    assert.equal(isRolloutStageAllowingProvider("OPENAI_ALL", "OPENAI"), true);
    assert.doesNotThrow(() => assertRolloutAllowsProvider(baseConfig()));
    assert.throws(
      () => assertRolloutAllowsProvider(baseConfig({ rolloutStage: "TEST", provider: "OPENAI" })),
      (err) => err instanceof ContentGenerationError,
    );
  });

  it("TEST remains supported alongside OpenAI rollout", () => {
    assert.doesNotThrow(() =>
      assertGenerationAllowed("SECTION_REWRITE", baseConfig({ provider: "TEST", rolloutStage: "TEST", apiKeyConfigured: false })),
    );
  });

  it("missing API key performs no OpenAI configuration", () => {
    const cfg = baseConfig({ apiKeyConfigured: false });
    assert.equal(isContentGenerationConfigured(cfg), false);
    assert.throws(
      () => assertGenerationAllowed("SECTION_DRAFT", cfg),
      (err) => err instanceof ContentGenerationError && err.code === "PROVIDER_NOT_CONFIGURED",
    );
  });

  it("quota exceeded blocks generation before a provider call", async () => {
    await assert.rejects(
      () =>
        assertQuotaAllowed(
          { type: "SECTION_REWRITE", topicId: "t1", userId: "u1", config: baseConfig({ dailyLimit: 10 }) },
          quotaDeps({
            getWorkspaceToday: async () => ({ totalRuns: 10, totalCostUsd: null }),
          }),
        ),
      (err) => err instanceof ContentGenerationError && err.code === "DAILY_LIMIT",
    );

    await assert.rejects(
      () =>
        assertQuotaAllowed(
          { type: "SECTION_REWRITE", topicId: "t1", userId: "u1", config: baseConfig({ monthlyBudgetUsd: 5 }) },
          quotaDeps({
            getMonthToDate: async () => ({ totalRuns: 1, totalCostUsd: 5 }),
          }),
        ),
      (err) => err instanceof ContentGenerationError && err.code === "MONTHLY_BUDGET_EXCEEDED",
    );
  });

  it("selects gpt-5.4-mini exactly as the production writer model default", () => {
    const prevModel = process.env.CONTENT_GENERATION_MODEL;
    const prevWriting = process.env.WRITING_MODEL;
    const prevBrief = process.env.AI_SEO_BRIEF_MODEL;
    delete process.env.CONTENT_GENERATION_MODEL;
    delete process.env.WRITING_MODEL;
    delete process.env.AI_SEO_BRIEF_MODEL;
    const cfg = getContentGenerationConfig();
    assert.equal(cfg.model, "gpt-5.4-mini");
    if (prevModel === undefined) delete process.env.CONTENT_GENERATION_MODEL;
    else process.env.CONTENT_GENERATION_MODEL = prevModel;
    if (prevWriting === undefined) delete process.env.WRITING_MODEL;
    else process.env.WRITING_MODEL = prevWriting;
    if (prevBrief === undefined) delete process.env.AI_SEO_BRIEF_MODEL;
    else process.env.AI_SEO_BRIEF_MODEL = prevBrief;
  });

  it("pricing table is correct for gpt-5.4-mini and gpt-5.4", () => {
    const rates = listCostRateTable();
    const mini = rates.find((r) => r.provider === "OPENAI" && r.model === "gpt-5.4-mini");
    const full = rates.find((r) => r.provider === "OPENAI" && r.model === "gpt-5.4");
    assert.ok(mini);
    assert.ok(full);
    assert.equal(mini!.inputPer1k, 0.00075);
    assert.equal(mini!.outputPer1k, 0.0045);
    assert.equal(mini!.cachedInputPer1k, 0.000075);
    assert.equal(full!.inputPer1k, 0.0025);
    assert.equal(full!.outputPer1k, 0.015);
    assert.equal(full!.cachedInputPer1k, 0.00025);

    const cost = estimateGenerationCost({
      provider: "OPENAI",
      model: "gpt-5.4-mini",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    assert.equal(cost.rateTableAvailable, true);
    assert.equal(cost.estimatedCostUsd, 5.25);
  });

  it("safe status never exposes API key material", () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-live-secret-should-never-leak";
    const status = getContentGenerationSafeStatus(baseConfig());
    const blob = JSON.stringify(status);
    assert.equal(status.keyConfigured, true);
    assert.ok(!blob.includes("sk-live-secret"));
    assert.equal((status as Record<string, unknown>).apiKey, undefined);
    if (prev === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prev;
  });

  it("editorial voice forbids blank terminology and English CMS labels", () => {
    assert.equal(ATTD_EDITORIAL_VOICE_ID, "attd-editorial-voice-v1");
    assert.ok(ATTD_EDITORIAL_VOICE_PROMPT_LINES.some((l) => /never “blank”/i.test(l) || /never "blank"/i.test(l)));
    assert.ok(ATTD_EDITORIAL_VOICE_PROMPT_LINES.some((l) => /Hub:/.test(l)));
    assert.ok(ATTD_EDITORIAL_VOICE_PROMPT_LINES.some((l) => /áo trơn/.test(l)));
  });

  it("acceptance article remains the Regular/Oversize draft id; other R1 drafts stay separate", () => {
    assert.equal(R1_BLOG_FORM.id, "cmsk0932x0005rwjijj5udpl5");
    assert.equal(R1_BLOG_FORM.slug, "regular-hay-oversize-xuong-in-nen-nhap-form-nao");
    assert.notEqual(R1_BLOG_XUONG_IN.id, R1_BLOG_FORM.id);
    assert.notEqual(R1_BLOG_FABRIC.id, R1_BLOG_FORM.id);
    assert.notEqual(R1_BLOG_PRINT.id, R1_BLOG_FORM.id);
  });

  it("human gates remain: generation creates proposals only through policy (no auto publish path in config)", () => {
    const status = getContentGenerationSafeStatus(baseConfig());
    assert.equal(status.rolloutStage, "OPENAI_INTERNAL");
    assert.equal(status.model, "gpt-5.4-mini");
    assert.equal(status.dailyLimit, 10);
    assert.equal(status.monthlyBudgetUsd, 5);
    assert.equal(status.maxSectionsPerRun, 1);
  });
});
