import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertNoSecretsInLaunchStatus,
  buildAiGenerationLaunchBlock,
  buildGraphLaunchBlock,
  buildPublishingLaunchBlock,
  isLaunchTopicDuplicate,
  missingMoqBlocksInformationalArticle,
  resolveLaunchReadinessFlags,
} from "@/features/content/launch/content-launch-status.rules";
import {
  CONTENT_LAUNCH_ARTICLE,
  CONTENT_LAUNCH_BRIEF_TEMPLATE,
  CONTENT_LAUNCH_FACT_POLICY,
  CONTENT_LAUNCH_QA_CHECKS,
  CONTENT_LAUNCH_QUESTION_KEYWORDS,
  CONTENT_LAUNCH_SECONDARY_KEYWORDS,
  CONTENT_LAUNCH_WORKFLOW_STEPS,
} from "@/features/content/launch/content-launch.constants";
import { getContentLaunchQaPreset } from "@/features/content/launch/content-launch-qa-preset";
import { readFileSync } from "node:fs";

describe("content launch status rules", () => {
  it("manual launch ready without AI provider", () => {
    const ai = buildAiGenerationLaunchBlock({
      enabled: false,
      provider: "openai",
      model: "gpt-4o-mini",
      apiKeyConfigured: false,
      maxOutputTokensPerSection: 1200,
      dailyRunLimit: 50,
      monthlyBudgetUsd: null,
      maxSectionsPerRun: 20,
    });
    const publishing = buildPublishingLaunchBlock({
      cronSecretConfigured: false,
      cronSchedule: "0 17 * * *",
      lastSuccessfulDueRunAt: null,
    });
    const flags = resolveLaunchReadinessFlags({ ai, publishing });
    assert.equal(flags.readyForManualContentLaunch, true);
    assert.equal(flags.readyForAiAssistedLaunch, false);
    assert.equal(flags.readyForScheduledPublishing, false);
    assert.equal(publishing.immediatePublishReady, true);
  });

  it("AI-assisted launch false when provider disabled", () => {
    const ai = buildAiGenerationLaunchBlock({
      enabled: false,
      provider: "openai",
      model: "x",
      apiKeyConfigured: true,
      maxOutputTokensPerSection: 1,
      dailyRunLimit: 1,
      monthlyBudgetUsd: null,
      maxSectionsPerRun: 1,
    });
    assert.equal(ai.sectionGenerationReady, false);
    assert.equal(resolveLaunchReadinessFlags({
      ai,
      publishing: buildPublishingLaunchBlock({
        cronSecretConfigured: true,
        cronSchedule: "0 17 * * *",
        lastSuccessfulDueRunAt: null,
      }),
    }).readyForAiAssistedLaunch, false);
  });

  it("AI-assisted launch true only with valid config", () => {
    const ai = buildAiGenerationLaunchBlock({
      enabled: true,
      provider: "openai",
      model: "gpt-4o-mini",
      apiKeyConfigured: true,
      maxOutputTokensPerSection: 1200,
      dailyRunLimit: 50,
      monthlyBudgetUsd: 20,
      maxSectionsPerRun: 5,
    });
    assert.equal(ai.providerConfigured, true);
    assert.equal(ai.sectionGenerationReady, true);
    assert.equal(
      resolveLaunchReadinessFlags({
        ai,
        publishing: buildPublishingLaunchBlock({
          cronSecretConfigured: false,
          cronSchedule: "0 17 * * *",
          lastSuccessfulDueRunAt: null,
        }),
      }).readyForAiAssistedLaunch,
      true,
    );
  });

  it("secret values never returned in status payload", () => {
    const payload = {
      aiGeneration: buildAiGenerationLaunchBlock({
        enabled: true,
        provider: "openai",
        model: "gpt-4o-mini",
        apiKeyConfigured: true,
        maxOutputTokensPerSection: 100,
        dailyRunLimit: 1,
        monthlyBudgetUsd: null,
        maxSectionsPerRun: 1,
      }),
      publishing: buildPublishingLaunchBlock({
        cronSecretConfigured: true,
        cronSchedule: "0 17 * * *",
        lastSuccessfulDueRunAt: null,
      }),
    };
    assert.equal(assertNoSecretsInLaunchStatus(payload).length, 0);
    assert.equal(assertNoSecretsInLaunchStatus({ key: "sk-test-leak" }).includes("sk-"), true);
  });

  it("graph flags reported false by default snapshot helper", () => {
    const graph = buildGraphLaunchBlock({
      global: false,
      SEO_TOPIC_PLANNER: false,
      SEO_BRIEF: false,
      SEO_CONTENT: false,
      rolloutMode: "OFF",
    });
    assert.equal(graph.globalExpansionEnabled, false);
    assert.deepEqual(graph.consumerFlagsEnabled, []);
    assert.equal(graph.rolloutMode, "OFF");
  });
});

describe("content launch first article constants", () => {
  it("setup constants have no fake SEO metrics fields", () => {
    const raw = JSON.stringify(CONTENT_LAUNCH_ARTICLE);
    assert.doesNotMatch(raw, /searchVolume|keywordDifficulty|cpc/i);
    assert.equal(CONTENT_LAUNCH_ARTICLE.status, "IDEA");
    assert.equal(CONTENT_LAUNCH_ARTICLE.contentType, "BLOG_ARTICLE");
  });

  it("keyword suggestions are editorial only", () => {
    assert.ok(CONTENT_LAUNCH_SECONDARY_KEYWORDS.length >= 5);
    assert.ok(CONTENT_LAUNCH_QUESTION_KEYWORDS.length >= 3);
    assert.equal(
      CONTENT_LAUNCH_ARTICLE.primaryKeyword,
      "áo polo đồng phục công ty",
    );
  });

  it("duplicate topic detection is idempotent by primary keyword", () => {
    assert.equal(
      isLaunchTopicDuplicate(
        ["áo polo đồng phục công ty"],
        CONTENT_LAUNCH_ARTICLE.primaryKeyword,
      ),
      true,
    );
    assert.equal(isLaunchTopicDuplicate([], CONTENT_LAUNCH_ARTICLE.primaryKeyword), false);
  });

  it("brief template does not invent MOQ/lead time/prices", () => {
    const raw = JSON.stringify(CONTENT_LAUNCH_BRIEF_TEMPLATE);
    assert.doesNotMatch(raw, /\bMOQ\s*=|\d+\s*áo\/|giá\s*\d+/i);
    assert.ok(CONTENT_LAUNCH_BRIEF_TEMPLATE.notes.some((n) => n.includes("human")));
  });

  it("fact policy blocks unsupported factory claims without evidence", () => {
    assert.ok(
      CONTENT_LAUNCH_FACT_POLICY.notAllowedWithoutEvidence.some((x) =>
        x.toLowerCase().includes("factory"),
      ),
    );
  });
});

describe("content launch knowledge / media / workflow contracts", () => {
  it("missing MOQ does not block informational article", () => {
    assert.equal(missingMoqBlocksInformationalArticle(), false);
  });

  it("workflow stepper has all governed steps and does not skip review", () => {
    const ids = CONTENT_LAUNCH_WORKFLOW_STEPS.map((s) => s.id);
    assert.ok(ids.includes("brief"));
    assert.ok(ids.includes("context"));
    assert.ok(ids.includes("review"));
    assert.ok(ids.includes("blog_handoff"));
    assert.ok(ids.includes("published"));
    assert.equal(ids.length, 11);
  });

  it("QA launch preset keeps required checks", () => {
    const preset = getContentLaunchQaPreset();
    assert.ok(preset.checks.includes("no unsupported claims"));
    assert.ok(preset.checks.includes("public media only"));
    assert.deepEqual(preset.checks, [...CONTENT_LAUNCH_QA_CHECKS]);
  });

  it("scheduling warns when secret missing while immediate publish stays ready", () => {
    const publishing = buildPublishingLaunchBlock({
      cronSecretConfigured: false,
      cronSchedule: "0 17 * * *",
      lastSuccessfulDueRunAt: null,
    });
    assert.equal(publishing.immediatePublishReady, true);
    assert.equal(publishing.schedulingConfigured, false);
    assert.ok(publishing.warnings.some((w) => w.includes("CRON")));
  });

  it("admin launch page and APIs exist without function-prop RSC pitfalls", () => {
    const page = readFileSync(
      "src/app/(backend)/admin/content/launch/page.tsx",
      "utf8",
    );
    const statusRoute = readFileSync("src/app/api/content/launch/status/route.ts", "utf8");
    const setupRoute = readFileSync(
      "src/app/api/content/launch/setup-first-article/route.ts",
      "utf8",
    );
    assert.match(page, /ContentLaunchClient/);
    assert.doesNotMatch(page, /=\{\(id\)\s*=>/);
    assert.match(statusRoute, /action: "read"/);
    assert.match(statusRoute, /platform: "content"/);
    assert.match(setupRoute, /action: "create"/);
    assert.match(setupRoute, /setupFirstLaunchArticle/);
  });

  it("operations docs exist and do not embed secrets", () => {
    const aiDoc = readFileSync("docs/operations/content-ai-generation.md", "utf8");
    const pubDoc = readFileSync("docs/operations/content-publishing.md", "utf8");
    assert.match(aiDoc, /WRITING_GENERATION_ENABLED/);
    assert.match(pubDoc, /CONTENT_PUBLISH_CRON_SECRET/);
    assert.doesNotMatch(aiDoc, /sk-[a-zA-Z0-9]{10,}/);
    assert.doesNotMatch(pubDoc, /Bearer [a-f0-9]{32,}/);
  });

  it("nav includes launch entry", () => {
    const nav = readFileSync("src/lib/admin/admin-navigation.ts", "utf8");
    assert.match(nav, /\/admin\/content\/launch/);
    assert.match(nav, /Viết bài/);
  });
});
