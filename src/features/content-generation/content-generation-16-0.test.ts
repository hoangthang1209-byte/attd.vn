import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";

import {
  getContentGenerationConfig,
  getContentGenerationSafeStatus,
  type ContentGenerationConfig,
} from "@/features/content-generation/contracts/config";
import { assertGenerationAllowed, PROHIBITED_CLAIM_CATEGORIES } from "@/features/content-generation/contracts/policy";
import {
  CONTENT_GENERATION_TYPES,
  ContentGenerationError,
  type ContentGenerationType,
  type GovernedGenerationContext,
} from "@/features/content-generation/contracts/generation.types";
import { DisabledContentGenerationProvider } from "@/features/content-generation/providers/disabled-provider";
import { ManualContentGenerationProvider } from "@/features/content-generation/providers/manual-provider";
import type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";
import { TestContentGenerationProvider, TEST_PROVIDER_TOKENS } from "@/features/content-generation/providers/test-provider";
import {
  resolveContentGenerationProvider,
  resetContentGenerationProviderCache,
} from "@/features/content-generation/providers/registry";
import { getPromptTemplate, listPromptTemplates } from "@/features/content-generation/prompts/prompt-registry";
import {
  assertSafeProposalText,
  findClaimSafetyViolation,
} from "@/features/content-generation/services/claim-safety.service";
import {
  extractUsedIds,
  validateSectionResult,
  validateStructuredOutput,
} from "@/features/content-generation/services/structured-output.service";

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
    configurationVersion: "content-generation-config-v1",
    rolloutStage: "TEST",
    dailyLimitPerUser: 20,
    dailyLimitPerTopic: 10,
    ...overrides,
  };
}

function baseContext(overrides: Partial<GovernedGenerationContext> = {}): GovernedGenerationContext {
  return {
    topicId: "topic-1",
    briefId: "brief-1",
    language: "vi",
    topicTitle: "OEM áo thun",
    primaryKeyword: "ao thun oem",
    brandVoice: { tone: "professional", voiceRules: [], prohibitedPhrases: [], terminology: {} },
    facts: [
      {
        factId: "fact-1",
        statement: "MOQ tối thiểu 500 pcs mỗi màu.",
        sourceType: "PRODUCT_SPEC",
        authorityRank: 1,
      },
    ],
    media: [
      { id: "media-1", url: "https://cdn.attd.vn/a.jpg", altText: "Áo thun OEM", caption: null, slotType: "HERO" },
    ],
    links: [
      { id: "link-1", url: "https://attd.vn/blog/oem-ao-thun", anchorText: "OEM áo thun", targetTitle: "OEM áo thun", targetTopicId: "topic-1" },
    ],
    prohibitedClaims: [],
    outline: [{ level: "H2", heading: "Tổng quan", purpose: "overview", required: true, sortOrder: 0 }],
    section: {
      id: "section-1",
      heading: "Tổng quan",
      purpose: "overview",
      targetWordCountMin: 100,
      targetWordCountMax: 300,
      requiredFactIds: [],
      existingHtml: null,
      existingPlainText: null,
    },
    editorInstruction: null,
    provenance: {
      contextBuildId: "ctxbuild-1",
      retrievalRequestId: "retrieval-1",
      packageHash: "hash-1",
      generatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe("content-generation-16-0: config", () => {
  it("defaults enabled=false and provider=DISABLED regardless of WRITING_*/AI_SEO_BRIEF_* envs", () => {
    const prevEnabled = process.env.CONTENT_GENERATION_ENABLED;
    const prevProvider = process.env.CONTENT_GENERATION_PROVIDER;
    const prevWritingEnabled = process.env.WRITING_GENERATION_ENABLED;
    delete process.env.CONTENT_GENERATION_ENABLED;
    delete process.env.CONTENT_GENERATION_PROVIDER;
    process.env.WRITING_GENERATION_ENABLED = "true";

    const config = getContentGenerationConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.provider, "DISABLED");

    if (prevEnabled === undefined) delete process.env.CONTENT_GENERATION_ENABLED;
    else process.env.CONTENT_GENERATION_ENABLED = prevEnabled;
    if (prevProvider === undefined) delete process.env.CONTENT_GENERATION_PROVIDER;
    else process.env.CONTENT_GENERATION_PROVIDER = prevProvider;
    if (prevWritingEnabled === undefined) delete process.env.WRITING_GENERATION_ENABLED;
    else process.env.WRITING_GENERATION_ENABLED = prevWritingEnabled;
  });

  it("safe status never includes the API key or any secret field", () => {
    const prevKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-super-secret-value";

    const status = getContentGenerationSafeStatus(baseConfig({ enabled: true, provider: "OPENAI", apiKeyConfigured: true }));
    const serialized = JSON.stringify(status);

    assert.equal((status as Record<string, unknown>).apiKey, undefined);
    assert.ok(!serialized.includes("sk-super-secret-value"));
    assert.equal(status.keyConfigured, true);
    assert.equal(status.enabled, true);

    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
  });
});

describe("content-generation-16-0: policy", () => {
  it("rejects every type when generation is disabled", () => {
    const config = baseConfig({ enabled: false });
    for (const type of CONTENT_GENERATION_TYPES) {
      assert.throws(
        () => assertGenerationAllowed(type, config),
        (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_DISABLED",
      );
    }
  });

  it("rejects when provider mode is DISABLED or MANUAL even if enabled=true", () => {
    assert.throws(
      () => assertGenerationAllowed("SECTION_DRAFT", baseConfig({ enabled: true, provider: "DISABLED" })),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_DISABLED",
    );
    assert.throws(
      () => assertGenerationAllowed("SECTION_DRAFT", baseConfig({ enabled: true, provider: "MANUAL" })),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_DISABLED",
    );
  });

  it("rejects OPENAI provider without an API key configured", () => {
    assert.throws(
      () => assertGenerationAllowed("SECTION_DRAFT", baseConfig({ enabled: true, provider: "OPENAI", apiKeyConfigured: false })),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "PROVIDER_NOT_CONFIGURED",
    );
  });

  it("allows TEST provider when enabled", () => {
    assert.doesNotThrow(() => assertGenerationAllowed("SECTION_DRAFT", baseConfig({ enabled: true, provider: "TEST" })));
  });

  it("exposes the sprint's prohibited claim categories", () => {
    for (const category of [
      "MOQ_WITHOUT_FACT",
      "PRICE_WITHOUT_FACT",
      "LEAD_TIME_WITHOUT_FACT",
      "FACTORY_OWNERSHIP_WITHOUT_FACT",
      "CERTIFICATION_WITHOUT_FACT",
      "CAPACITY_WITHOUT_FACT",
      "SUPERLATIVE_WITHOUT_FACT",
      "GUARANTEE_CLAIM",
    ]) {
      assert.ok((PROHIBITED_CLAIM_CATEGORIES as readonly string[]).includes(category), `missing category ${category}`);
    }
  });
});

describe("content-generation-16-0: provider registry", () => {
  afterEach(() => resetContentGenerationProviderCache());

  it("resolves DisabledContentGenerationProvider when master switch is off", () => {
    const { provider, providerName } = resolveContentGenerationProvider(baseConfig({ enabled: false, provider: "TEST" }));
    assert.ok(provider instanceof DisabledContentGenerationProvider);
    assert.equal(providerName, "disabled");
  });

  it("resolves TestContentGenerationProvider for provider=TEST when enabled", () => {
    const { provider, providerName } = resolveContentGenerationProvider(baseConfig({ enabled: true, provider: "TEST" }));
    assert.ok(provider instanceof TestContentGenerationProvider);
    assert.equal(providerName, "test");
  });

  it("resolves ManualContentGenerationProvider for provider=MANUAL when enabled", () => {
    const { provider, providerName } = resolveContentGenerationProvider(baseConfig({ enabled: true, provider: "MANUAL" }));
    assert.ok(provider instanceof ManualContentGenerationProvider);
    assert.equal(providerName, "manual");
  });
});

describe("content-generation-16-0: disabled/manual providers never call anything", () => {
  it("DisabledContentGenerationProvider throws GENERATION_DISABLED without touching the request", async () => {
    const provider: ContentGenerationProvider = new DisabledContentGenerationProvider();
    await assert.rejects(
      () =>
        provider.generate({
          type: "SECTION_DRAFT",
          topicId: "topic-1",
          briefId: null,
          contextBuildId: null,
          writingPlanId: null,
          writingDraftId: null,
          sectionId: null,
          editorInstruction: null,
          model: "gpt-4o-mini",
          maxOutputTokens: 100,
          timeoutMs: 1000,
          context: baseContext(),
        }),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_DISABLED",
    );
  });

  it("ManualContentGenerationProvider throws GENERATION_DISABLED with a manual-mode message", async () => {
    const provider: ContentGenerationProvider = new ManualContentGenerationProvider();
    await assert.rejects(
      () =>
        provider.generate({
          type: "SECTION_DRAFT",
          topicId: "topic-1",
          briefId: null,
          contextBuildId: null,
          writingPlanId: null,
          writingDraftId: null,
          sectionId: null,
          editorInstruction: null,
          model: "gpt-4o-mini",
          maxOutputTokens: 100,
          timeoutMs: 1000,
          context: baseContext(),
        }),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "GENERATION_DISABLED",
    );
  });
});

describe("content-generation-16-0: test provider deterministic outputs", () => {
  it("produces a valid SECTION_DRAFT output referencing the first context fact", async () => {
    const provider = new TestContentGenerationProvider();
    const context = baseContext();
    const result = await provider.generate({
      type: "SECTION_DRAFT",
      topicId: context.topicId,
      briefId: context.briefId,
      contextBuildId: context.provenance.contextBuildId,
      writingPlanId: "plan-1",
      writingDraftId: "draft-1",
      sectionId: "section-1",
      editorInstruction: null,
      model: "test-model",
      maxOutputTokens: 100,
      timeoutMs: 1000,
      context,
    });

    const validated = validateSectionResult(result.output, context);
    assert.equal(validated.sectionId, "section-1");
    assert.ok(validated.html.includes("<p>"));
    assert.deepEqual(validated.factIdsUsed, ["fact-1"]);
  });

  it("produces a valid BRIEF_SUGGESTION output", async () => {
    const provider = new TestContentGenerationProvider();
    const context = baseContext();
    const result = await provider.generate({
      type: "BRIEF_SUGGESTION",
      topicId: context.topicId,
      briefId: context.briefId,
      contextBuildId: context.provenance.contextBuildId,
      writingPlanId: null,
      writingDraftId: null,
      sectionId: null,
      editorInstruction: null,
      model: "test-model",
      maxOutputTokens: 100,
      timeoutMs: 1000,
      context,
    });

    const validated = validateStructuredOutput("BRIEF_SUGGESTION", result.output, context);
    const { factIdsUsed } = extractUsedIds("BRIEF_SUGGESTION", validated);
    assert.deepEqual(factIdsUsed, ["fact-1"]);
  });

  it("__TEST_UNSAFE_CLAIM__ produces text that fails claim-safety validation", async () => {
    const provider = new TestContentGenerationProvider();
    const context = baseContext();
    const result = await provider.generate({
      type: "SECTION_DRAFT",
      topicId: context.topicId,
      briefId: context.briefId,
      contextBuildId: context.provenance.contextBuildId,
      writingPlanId: null,
      writingDraftId: null,
      sectionId: "section-1",
      editorInstruction: TEST_PROVIDER_TOKENS.UNSAFE_CLAIM,
      model: "test-model",
      maxOutputTokens: 100,
      timeoutMs: 1000,
      context,
    });

    assert.throws(
      () => validateSectionResult(result.output, context),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "UNSAFE_CLAIM",
    );
  });

  it("__TEST_MALFORMED__ produces output that fails structured-output validation", async () => {
    const provider = new TestContentGenerationProvider();
    const context = baseContext();
    const result = await provider.generate({
      type: "SECTION_DRAFT",
      topicId: context.topicId,
      briefId: context.briefId,
      contextBuildId: context.provenance.contextBuildId,
      writingPlanId: null,
      writingDraftId: null,
      sectionId: "section-1",
      editorInstruction: TEST_PROVIDER_TOKENS.MALFORMED,
      model: "test-model",
      maxOutputTokens: 100,
      timeoutMs: 1000,
      context,
    });

    assert.throws(
      () => validateSectionResult(result.output, context),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "INVALID_PROVIDER_OUTPUT",
    );
  });

  it("__TEST_TIMEOUT__ rejects with TIMEOUT before returning any output", async () => {
    const provider = new TestContentGenerationProvider();
    const context = baseContext();
    await assert.rejects(
      () =>
        provider.generate({
          type: "SECTION_DRAFT",
          topicId: context.topicId,
          briefId: context.briefId,
          contextBuildId: context.provenance.contextBuildId,
          writingPlanId: null,
          writingDraftId: null,
          sectionId: "section-1",
          editorInstruction: TEST_PROVIDER_TOKENS.TIMEOUT,
          model: "test-model",
          maxOutputTokens: 100,
          timeoutMs: 1000,
          context,
        }),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "TIMEOUT",
    );
  });

  it("__TEST_PROVIDER_ERROR__ rejects with PROVIDER_ERROR", async () => {
    const provider = new TestContentGenerationProvider();
    const context = baseContext();
    await assert.rejects(
      () =>
        provider.generate({
          type: "SECTION_DRAFT",
          topicId: context.topicId,
          briefId: context.briefId,
          contextBuildId: context.provenance.contextBuildId,
          writingPlanId: null,
          writingDraftId: null,
          sectionId: "section-1",
          editorInstruction: TEST_PROVIDER_TOKENS.PROVIDER_ERROR,
          model: "test-model",
          maxOutputTokens: 100,
          timeoutMs: 1000,
          context,
        }),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "PROVIDER_ERROR",
    );
  });
});

describe("content-generation-16-0: claim safety", () => {
  it("blocks an MOQ claim with no supporting fact IDs", () => {
    assert.throws(
      () => assertSafeProposalText("MOQ chỉ 50 pcs mỗi màu.", [], ["fact-1"]),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "UNSAFE_CLAIM",
    );
  });

  it("allows an MOQ claim when factIdsUsed resolves against context facts", () => {
    assert.doesNotThrow(() => assertSafeProposalText("MOQ chỉ 50 pcs mỗi màu.", ["fact-1"], ["fact-1"]));
  });

  it("findClaimSafetyViolation reports the violated category", () => {
    const violation = findClaimSafetyViolation("Chúng tôi có nhà máy riêng.", [], []);
    assert.equal(violation?.category, "FACTORY_OWNERSHIP_WITHOUT_FACT");
  });

  it("plain factual text with no claim pattern is unaffected by missing fact ids", () => {
    assert.doesNotThrow(() => assertSafeProposalText("Đây là mô tả tổng quan về quy trình sản xuất.", [], []));
  });
});

describe("content-generation-16-0: structured-output validation", () => {
  it("rejects a media suggestion referencing a media ID not present in context", () => {
    const context = baseContext();
    const raw = {
      suggestions: [
        { mediaAssetId: "media-does-not-exist", placement: "INLINE_AFTER", altText: "x", caption: null, reason: null },
      ],
      warnings: [],
    };
    assert.throws(
      () => validateStructuredOutput("MEDIA_SUGGESTION", raw, context),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "MEDIA_NOT_ALLOWED",
    );
  });

  it("rejects a section referencing a fact ID not present in context", () => {
    const context = baseContext();
    const raw = {
      sectionId: "section-1",
      heading: "Tổng quan",
      html: "<p>Nội dung an toàn.</p>",
      plainText: "Nội dung an toàn.",
      factIdsUsed: ["fact-does-not-exist"],
      mediaIdsUsed: [],
      internalLinkIdsUsed: [],
      wordCount: 3,
      warnings: [],
    };
    assert.throws(
      () => validateStructuredOutput("SECTION_DRAFT", raw, context),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "FACT_NOT_ALLOWED",
    );
  });

  it("rejects an internal-link suggestion referencing a URL not present in context", () => {
    const context = baseContext();
    const raw = { suggestions: [{ url: "https://example.com/unknown", anchorText: "x", targetTopicId: null, sectionId: null, reason: null }], warnings: [] };
    assert.throws(
      () => validateStructuredOutput("INTERNAL_LINK_SUGGESTION", raw, context),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "LINK_NOT_VALID",
    );
  });

  it("accepts a well-formed META_SUGGESTION output", () => {
    const context = baseContext();
    const raw = { metaTitle: "OEM áo thun | ATTD", metaDescription: "Mô tả meta hợp lệ.", warnings: [] };
    const validated = validateStructuredOutput("META_SUGGESTION", raw, context) as { metaTitle: string };
    assert.equal(validated.metaTitle, "OEM áo thun | ATTD");
  });
});

describe("content-generation-16-0: prompt registry", () => {
  it("returns a template with required fields for every ContentGenerationType", () => {
    for (const type of CONTENT_GENERATION_TYPES as readonly ContentGenerationType[]) {
      const tpl = getPromptTemplate(type);
      assert.equal(tpl.type, type);
      assert.ok(tpl.id.length > 0);
      assert.ok(tpl.version.length > 0);
      assert.ok(tpl.systemInstruction.length > 0);
      assert.ok(tpl.outputSchema.length > 0);
      assert.ok(tpl.maxOutputLength > 0);
      assert.ok(Array.isArray(tpl.prohibitedClaims) && tpl.prohibitedClaims.length > 0);
    }
  });

  it("listPromptTemplates returns one template per generation type", () => {
    const templates = listPromptTemplates();
    assert.equal(templates.length, CONTENT_GENERATION_TYPES.length);
  });

  it("throws TYPE_NOT_ALLOWED for an unknown type", () => {
    assert.throws(
      () => getPromptTemplate("NOT_A_REAL_TYPE" as ContentGenerationType),
      (err: unknown) => err instanceof ContentGenerationError && err.code === "TYPE_NOT_ALLOWED",
    );
  });
});
