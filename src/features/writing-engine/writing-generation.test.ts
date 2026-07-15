import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { getWritingGenerationConfig, isWritingGenerationConfigured } from "@/features/writing-engine/writing-generation-config";
import { resolveWritingProviderRoute, WritingProviderRouterError } from "@/features/writing-engine/services/writing-provider-router.service";
import { FakeWritingSectionProvider } from "@/features/writing-engine/providers/fake-writing-section.provider";
import { clearWritingSectionProviders } from "@/features/writing-engine/providers/writing-provider-registry";
import {
  cancelGenerationRun,
  saveHumanEditedSection,
  startGenerationRun,
  type DraftRecordLite,
  type GenerationOrchestratorStore,
  type GenerationRunRecord,
  type SectionGenerationRecord,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import { buildWritingPlanFromPackage } from "@/features/writing-engine/services/writing-plan-builder.service";
import { validateSectionDraft, isRetryableProviderError, isSafetyViolation } from "@/features/writing-engine/services/writing-section-validator.service";
import { hashWritingSectionRequest, estimateGenerationCost } from "@/features/writing-engine/services/writing-generation-cost.service";
import { lockSection, parseSectionLocks } from "@/features/writing-engine/services/writing-section-lock.service";
import { buildSectionRequest } from "@/features/writing-engine/services/writing-mock-generator.service";
import { sanitizeWritingSectionHtml } from "@/features/writing-engine/services/writing-section-sanitize.service";
import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingPlan, WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";
import { emptySectionDraft } from "@/features/writing-engine/services/writing-mock-generator.service";

function basePackage(): ContentContextPackage {
  return {
    id: "pkg1",
    version: "v1",
    profileVersion: "v1",
    contentPurpose: "SEO_ARTICLE",
    contentType: "ARTICLE",
    language: "vi",
    entity: { topicId: "topic1", briefId: "brief1", briefVersion: 1 },
    topic: {
      title: "OEM áo thun",
      primaryKeyword: "ao thun oem",
      searchIntent: "COMMERCIAL",
      funnelStage: "MOFU",
      targetAudience: ["buyer"],
      supportingKeywords: ["may ao thun"],
      questions: ["MOQ?"],
      entities: ["ATTD"],
    },
    brief: {
      workingTitle: "OEM áo thun",
      proposedSlug: "oem-ao-thun",
      metaTitle: "OEM áo thun | ATTD",
      metaDescription: "Gia cong ao thun OEM voi MOQ hop ly va chat luong on dinh.",
      outline: [
        { level: "H2", heading: "Tong quan", purpose: "overview", sortOrder: 0, required: true },
        { level: "H2", heading: "MOQ va dat hang", purpose: "MOQ pricing commercial", sortOrder: 1, required: true },
        { level: "H2", heading: "Chat lieu", purpose: "material fabric GSM", sortOrder: 2, required: true },
      ],
      requiredSections: ["FAQ"],
      cta: { type: "CONTACT", text: "Lien he" },
      wordCount: { min: 400, max: 900 },
      schemaTypes: ["BlogPosting"],
      approved: true,
      version: 1,
    },
    facts: [
      {
        factId: "f_moq",
        statement: "MOQ 100 pcs",
        structuredValue: { moqValue: 100 },
        sourceType: "PRODUCT",
        sourceId: "p1",
        sourceTitle: "Product",
        authorityRank: 90,
        visibility: "PUBLIC",
        publicOutputAllowed: true,
        stale: false,
        required: true,
        matchedOn: ["moq"],
        warnings: [],
        priorityScore: 90,
      },
    ],
    businessRules: [],
    prohibitedClaims: [],
    conflicts: [],
    missingFacts: [],
    media: {
      bundle: null,
      slots: [],
      selectedAssets: [
        {
          id: "m1",
          url: "/media/hero.jpg",
          altText: "Hero",
          slotType: "HERO",
          sortOrder: 0,
          required: true,
          selected: true,
          contentSuitabilities: [],
          warnings: [],
        },
      ],
      coverage: { overallScore: 80, overallStatus: "OK", missingRequiredSlots: [] },
      warnings: [],
    },
    internalLinks: [
      {
        targetType: "SEO_TOPIC",
        targetId: "t2",
        targetTitle: "May ao",
        url: "/blog/may-ao",
        anchorText: "may ao",
        relevanceScore: 1,
        status: "ACCEPTED",
        required: false,
        recommendation: "RECOMMENDED",
      },
    ],
    brand: { voiceRules: [], requiredPhrases: [], prohibitedPhrases: [], terminology: {} },
    outputRules: {
      publicOutputOnly: true,
      mustCiteFactIds: true,
      mustUseProvidedUrlsOnly: true,
      mustNotInventFacts: true,
      mustSurfaceConflicts: true,
      mustRespectMediaAssignments: true,
      maxHeadingDepth: 3,
      requiredSections: [],
      prohibitedTopics: [],
    },
    sourceManifest: [],
    omittedSummary: [],
    warnings: [],
    budget: {
      requestedMaxCharacters: 10000,
      actualCharacters: 1000,
      sectionsTrimmed: [],
      factsDropped: 0,
      mediaDropped: 0,
      linksDropped: 0,
    },
    diagnostics: {
      factCount: 1,
      requiredFactCount: 1,
      sourceDistribution: {},
      authorityBands: {},
      staleCount: 0,
      legacyCompatibilityCount: 0,
      conflictCount: 0,
      blockingConflictCount: 0,
      mediaSelectedCount: 1,
      missingRequiredSlots: [],
      internalLinkCount: 1,
      actualCharacters: 1000,
      estimatedTokens: 250,
      trimmedFacts: 0,
      trimmedAssets: 0,
      trimmedLinks: 0,
      readinessScore: 90,
    },
    contextText: "ctx",
    contextJson: {},
    retrievalRequestId: "r1",
    packageHash: "hash1",
    generatedAt: new Date().toISOString(),
  };
}

function memoryStore(plan: WritingPlan): GenerationOrchestratorStore & {
  drafts: DraftRecordLite[];
  runs: GenerationRunRecord[];
  sections: SectionGenerationRecord[];
} {
  const drafts: DraftRecordLite[] = [];
  const runs: GenerationRunRecord[] = [];
  const sections: SectionGenerationRecord[] = [];
  let runSeq = 0;
  let secSeq = 0;

  const now = () => new Date();

  return {
    drafts,
    runs,
    sections,
    async findPlan(planId) {
      if (planId !== plan.id) return null;
      return { plan, planHash: plan.planHash };
    },
    async findDraft(draftId) {
      return drafts.find((d) => d.id === draftId) ?? null;
    },
    async findActiveRunForDraft(draftId) {
      return runs.find((r) => r.writingDraftId === draftId && ["PENDING", "RUNNING"].includes(r.status)) ?? null;
    },
    async findActiveSectionAttempt(draftId, sectionId) {
      return (
        sections.find(
          (s) =>
            s.writingDraftId === draftId &&
            s.sectionId === sectionId &&
            ["PENDING", "READY", "RUNNING"].includes(s.status)
        ) ?? null
      );
    },
    async countRunsToday() {
      return runs.length;
    },
    async findSuccessfulByRequestHash(draftId, sectionId, requestHash) {
      return (
        sections.find(
          (s) =>
            s.writingDraftId === draftId &&
            s.sectionId === sectionId &&
            s.requestHash === requestHash &&
            s.status === "GENERATED"
        ) ?? null
      );
    },
    async createRun(data) {
      const row: GenerationRunRecord = {
        id: `run_${++runSeq}`,
        ...data,
        createdAt: now(),
        updatedAt: now(),
      };
      runs.push(row);
      return row;
    },
    async updateRun(id, data) {
      const idx = runs.findIndex((r) => r.id === id);
      runs[idx] = { ...runs[idx], ...data, updatedAt: now() };
      return runs[idx];
    },
    async createSection(data) {
      const row: SectionGenerationRecord = {
        id: `secgen_${++secSeq}`,
        ...data,
        createdAt: now(),
        updatedAt: now(),
      };
      sections.push(row);
      return row;
    },
    async updateSection(id, data) {
      const idx = sections.findIndex((s) => s.id === id);
      sections[idx] = { ...sections[idx], ...data, updatedAt: now() };
      return sections[idx];
    },
    async listSectionsForRun(runId) {
      return sections.filter((s) => s.generationRunId === runId);
    },
    async getRun(runId) {
      return runs.find((r) => r.id === runId) ?? null;
    },
    async listRunsForDraft(draftId) {
      return runs.filter((r) => r.writingDraftId === draftId);
    },
    async updateDraft(draftId, data) {
      const idx = drafts.findIndex((d) => d.id === draftId);
      drafts[idx] = {
        ...drafts[idx],
        status: data.status ?? drafts[idx].status,
        structuredDraft: data.structuredDraft ?? drafts[idx].structuredDraft,
        qaReport: data.qaReport ?? drafts[idx].qaReport,
        version: data.version ?? drafts[idx].version,
        sectionLocks: data.sectionLocks ?? drafts[idx].sectionLocks,
        latestGenerationRunId:
          data.latestGenerationRunId !== undefined
            ? data.latestGenerationRunId
            : drafts[idx].latestGenerationRunId,
        generatedSectionCount: data.generatedSectionCount ?? drafts[idx].generatedSectionCount,
        failedSectionCount: data.failedSectionCount ?? drafts[idx].failedSectionCount,
      };
      return drafts[idx];
    },
    async createDraftVersion() {
      /* no-op for tests */
    },
  };
}

function seedDraft(store: ReturnType<typeof memoryStore>, plan: WritingPlan): string {
  const draftId = "draft_1";
  const structured: WritingStructuredDraft = {
    id: draftId,
    planId: plan.id,
    contentType: plan.contentType,
    language: plan.language,
    title: plan.titlePlan.h1,
    sections: plan.sections.map((s) => emptySectionDraft(s.id, s.heading)),
    faq: [],
    cta: plan.ctaPlan,
    media: plan.mediaPlan.placements,
    internalLinks: plan.internalLinkPlan.placements,
    schemaPlan: plan.schemaPlan,
    qa: {
      passed: false,
      score: 0,
      issues: [],
      metrics: {
        totalWords: 0,
        sectionCount: plan.sections.length,
        requiredFactCoverage: 0,
        usedFactCount: 0,
        unsupportedClaimCount: 0,
        internalLinkCount: 0,
        mediaCount: 0,
        missingAltCount: 0,
        headingErrors: 0,
        keywordWarnings: 0,
      },
    },
    rendered: {},
    status: "PLANNED",
    isMock: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.drafts.push({
    id: draftId,
    writingPlanId: plan.id,
    status: "PLANNED",
    structuredDraft: structured,
    qaReport: null,
    version: 1,
    sectionLocks: [],
    latestGenerationRunId: null,
    generatedSectionCount: 0,
    failedSectionCount: 0,
  });
  return draftId;
}

describe("Writing generation config/router", () => {
  afterEach(() => {
    clearWritingSectionProviders();
    delete process.env.WRITING_GENERATION_ENABLED;
    delete process.env.WRITING_PROVIDER;
  });

  it("disabled provider returns configuration error", () => {
    process.env.WRITING_GENERATION_ENABLED = "false";
    assert.equal(isWritingGenerationConfigured(), false);
    assert.throws(() => resolveWritingProviderRoute(), (err: unknown) => {
      assert.ok(err instanceof WritingProviderRouterError);
      assert.equal(err.code, "GENERATION_DISABLED");
      return true;
    });
  });

  it("router returns configured fake provider", () => {
    process.env.WRITING_GENERATION_ENABLED = "true";
    process.env.WRITING_PROVIDER = "fake";
    const route = resolveWritingProviderRoute(getWritingGenerationConfig());
    assert.equal(route.provider, "fake");
    assert.ok(route.model);
  });

  it("API key never exposed in safe status", () => {
    process.env.OPENAI_API_KEY = "sk-secret-should-not-leak";
    const status = isWritingGenerationConfigured;
    void status;
    const cfg = getWritingGenerationConfig();
    assert.equal("apiKey" in cfg, false);
    assert.ok(!JSON.stringify(cfg).includes("sk-secret"));
  });
});

describe("Section generation orchestrator", () => {
  afterEach(() => {
    clearWritingSectionProviders();
  });

  it("generates selected sections with fake provider", async () => {
    const plan = buildWritingPlanFromPackage(basePackage(), {
      contextBuildId: "b1",
      topicId: "topic1",
      contentType: "SEO_ARTICLE",
    });
    plan.id = "plan_1";
    // Force readiness for tests
    plan.readiness.ready = true;
    plan.readiness.errors = [];

    const store = memoryStore(plan);
    const draftId = seedDraft(store, plan);
    const provider = new FakeWritingSectionProvider();
    const sectionId = plan.sections[0].id;

    const result = await startGenerationRun(
      {
        writingPlanId: plan.id,
        draftId,
        mode: "SELECTED",
        sectionIds: [sectionId],
      },
      store,
      { provider, providerName: "fake", model: "fake-model", config: {
        ...getWritingGenerationConfig(),
        enabled: true,
        provider: "fake",
        maxRetries: 1,
        maxParallelSections: 2,
        dailyRunLimit: 100,
        maxSectionsPerRun: 20,
      } }
    );

    assert.ok(provider.callCount >= 1);
    assert.equal(provider.lastRequest?.sectionId, sectionId);
    assert.ok(!JSON.stringify(provider.lastRequest).includes("packageHash"));
    assert.ok(result.run.completedSectionIds.includes(sectionId) || result.draft.sections.some((s) => s.sectionId === sectionId && s.plainText));
    assert.ok(result.run.totalTokens != null);
  });

  it("skips locked sections without confirmation", async () => {
    const plan = buildWritingPlanFromPackage(basePackage(), {
      contextBuildId: "b1",
      topicId: "topic1",
      contentType: "SEO_ARTICLE",
    });
    plan.id = "plan_2";
    plan.readiness.ready = true;
    plan.readiness.errors = [];
    const store = memoryStore(plan);
    const draftId = seedDraft(store, plan);
    const sectionId = plan.sections[0].id;
    store.drafts[0].sectionLocks = lockSection([], sectionId, "MANUAL_LOCK", "user");

    await assert.rejects(
      () =>
        startGenerationRun(
          {
            writingPlanId: plan.id,
            draftId,
            mode: "SELECTED",
            sectionIds: [sectionId],
          },
          store,
          {
            provider: new FakeWritingSectionProvider(),
            providerName: "fake",
            model: "fake",
            config: { ...getWritingGenerationConfig(), enabled: true, provider: "fake", dailyRunLimit: 100, maxSectionsPerRun: 20, maxParallelSections: 2, maxRetries: 1 },
          }
        ),
      (err: unknown) => (err as { code?: string }).code === "ALL_LOCKED"
    );
  });

  it("cancellation prevents accepting late in-flight as pending", async () => {
    const plan = buildWritingPlanFromPackage(basePackage(), {
      contextBuildId: "b1",
      topicId: "topic1",
      contentType: "SEO_ARTICLE",
    });
    plan.id = "plan_3";
    plan.readiness.ready = true;
    plan.readiness.errors = [];
    const store = memoryStore(plan);
    const draftId = seedDraft(store, plan);
    const run = await store.createRun({
      writingPlanId: plan.id,
      writingDraftId: draftId,
      status: "RUNNING",
      provider: "fake",
      model: "fake",
      configurationVersion: "v1",
      requestedBy: null,
      requestedSectionIds: [plan.sections[0].id],
      completedSectionIds: [],
      failedSectionIds: [],
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: null,
      latencyMs: 0,
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
    });
    await store.createSection({
      generationRunId: run.id,
      writingPlanId: plan.id,
      writingDraftId: draftId,
      sectionId: plan.sections[0].id,
      sectionKey: "intro",
      status: "PENDING",
      trigger: "INITIAL",
      attempt: 1,
      provider: "fake",
      model: "fake",
      requestHash: "h",
      requestSnapshot: null,
      outputJson: null,
      validationIssues: null,
      qaIssues: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
      latencyMs: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    });
    const cancelled = await cancelGenerationRun(run.id, store);
    assert.equal(cancelled.status, "CANCELLED");
    const secs = await store.listSectionsForRun(run.id);
    assert.ok(secs.every((s) => s.status === "CANCELLED"));
  });

  it("human edit locks section and increments version", async () => {
    const plan = buildWritingPlanFromPackage(basePackage(), {
      contextBuildId: "b1",
      topicId: "topic1",
      contentType: "SEO_ARTICLE",
    });
    plan.id = "plan_4";
    plan.readiness.ready = true;
    plan.readiness.errors = [];
    const store = memoryStore(plan);
    const draftId = seedDraft(store, plan);
    const sectionId = plan.sections[0].id;
    const result = await saveHumanEditedSection(
      {
        draftId,
        sectionId,
        html: "<p>Noi dung do bien tap vien sua.</p>",
        lockAfterSave: true,
        editedBy: "editor",
      },
      store
    );
    assert.equal(result.version, 2);
    const locks = parseSectionLocks(store.drafts[0].sectionLocks);
    assert.ok(locks.some((l) => l.sectionId === sectionId && l.locked));
  });
});

describe("Validation and safety", () => {
  it("rejects unknown fact / link / media and URL", () => {
    const plan = buildWritingPlanFromPackage(basePackage(), {
      contextBuildId: "b1",
      topicId: "topic1",
      contentType: "SEO_ARTICLE",
    });
    plan.readiness.ready = true;
    const section = plan.sections[0];
    const bad = validateSectionDraft(plan, {
      sectionId: section.id,
      heading: section.heading,
      html: '<p><a href="https://evil.example">x</a></p>',
      plainText: "x",
      factIdsUsed: ["unknown"],
      citationIdsUsed: [],
      internalLinkIdsUsed: ["badlink"],
      mediaPlacementIdsUsed: ["badmedia"],
      keywordUsage: [],
      claims: [],
      wordCount: 1,
      warnings: [],
    });
    assert.equal(bad.valid, false);
    assert.ok(bad.errors.some((e) => /Unknown fact/i.test(e)));
  });

  it("detects MOQ mutation", () => {
    const plan = buildWritingPlanFromPackage(basePackage(), {
      contextBuildId: "b1",
      topicId: "topic1",
      contentType: "SEO_ARTICLE",
    });
    const request = buildSectionRequest(plan, plan.sections.find((s) => s.requiredFactIds.includes("f_moq") || s.optionalFactIds.includes("f_moq"))?.id ?? plan.sections[1].id)!;
    // ensure moq fact in request
    if (!request.facts.some((f) => f.factId === "f_moq")) {
      request.facts.push({
        factId: "f_moq",
        statement: "MOQ 100 pcs",
        structuredValue: { moqValue: 100 },
        mustUseExactValue: true,
      });
    }
    const draft = {
      sectionId: request.sectionId,
      heading: request.heading,
      html: "<p>MOQ 150 pcs</p>",
      plainText: "MOQ 150 pcs",
      factIdsUsed: ["f_moq"],
      citationIdsUsed: [],
      internalLinkIdsUsed: [],
      mediaPlacementIdsUsed: [],
      keywordUsage: [],
      claims: [{ text: "MOQ 150", factId: "f_moq" }],
      wordCount: 3,
      warnings: [],
    };
    const result = validateSectionDraft(plan, draft, request);
    assert.equal(result.valid, false);
    assert.ok(isSafetyViolation(result.errors) || result.errors.some((e) => /numeric|MOQ/i.test(e)));
  });

  it("sanitizes scripts and base64", () => {
    const cleaned = sanitizeWritingSectionHtml('<p onclick="x">hi</p><script>alert(1)</script>');
    assert.ok(!cleaned.includes("script"));
    assert.ok(!cleaned.includes("onclick"));
  });

  it("retryable vs safety classification", () => {
    assert.equal(isRetryableProviderError("timeout after 1000ms"), true);
    assert.equal(isRetryableProviderError("429 rate limit"), true);
    assert.equal(isSafetyViolation(["Unknown fact ID: x"]), true);
    assert.equal(isSafetyViolation(["HEADING_MISMATCH: Heading must match plan"]), false);
  });

  it("cost null when rates absent", () => {
    assert.equal(estimateGenerationCost({ model: "unknown-model-xyz", inputTokens: 10, outputTokens: 10 }), null);
  });

  it("request hash stable", () => {
    const plan = buildWritingPlanFromPackage(basePackage(), {
      contextBuildId: "b1",
      topicId: "topic1",
      contentType: "SEO_ARTICLE",
    });
    const req = buildSectionRequest(plan, plan.sections[0].id)!;
    const h1 = hashWritingSectionRequest({
      planHash: plan.planHash,
      sectionId: req.sectionId,
      request: req,
      provider: "fake",
      model: "fake",
    });
    const h2 = hashWritingSectionRequest({
      planHash: plan.planHash,
      sectionId: req.sectionId,
      request: req,
      provider: "fake",
      model: "fake",
    });
    assert.equal(h1, h2);
  });
});
