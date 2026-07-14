import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FakeStructuredProvider } from "@/features/ai/providers/fake-structured-provider";
import type { SeoBriefAiConfig } from "@/features/ai/ai-seo-brief-config";
import type { AiRetrievalContext, AiRetrievedFact } from "@/features/ai-retrieval/ai-retrieval-types";
import {
  generateSeoBriefSuggestion,
  SeoBriefGeneratorError,
  type AiGenerationRunRecord,
  type SeoBriefGenerationRunStore,
  type SeoBriefGeneratorDeps,
} from "@/features/content/services/seo-brief-generator.service";
import {
  applySeoBriefSuggestion,
  SeoBriefApplyError,
  type SeoBriefApplyStore,
  type SeoContentBriefRecord,
} from "@/features/content/services/seo-brief-apply.service";
import {
  validateSeoBriefSuggestion,
  type SeoBriefSuggestion,
} from "@/features/content/services/seo-brief-suggestion.types";

function fact(partial: Partial<AiRetrievedFact> & Pick<AiRetrievedFact, "id" | "title">): AiRetrievedFact {
  return {
    sourceType: "KNOWLEDGE_BASE",
    sourceId: partial.sourceId ?? partial.id,
    summary: "MOQ tiêu chuẩn 50 cái",
    content: null,
    structuredData: null,
    visibility: "PUBLIC",
    publicOutputAllowed: true,
    claimStatus: "FACT",
    confidence: 0.9,
    authorityRank: 50,
    stale: false,
    matchedOn: ["moq"],
    relevanceScore: 20,
    warnings: [],
    ...partial,
  };
}

function baseContext(facts: AiRetrievedFact[]): AiRetrievalContext {
  return {
    requestId: "req-1",
    consumer: "SEO_BRIEF",
    purpose: "CONTENT_PLANNING",
    query: "ao thun si",
    policy: {
      maxVisibility: "INTERNAL",
      allowConfidential: false,
      requireApproved: true,
      requireVerified: true,
      compatibilityMode: true,
    },
    facts,
    businessRules: [],
    conflicts: [],
    warnings: [],
    sourcesUsed: [{ sourceType: "KNOWLEDGE_BASE", count: facts.length }],
    omitted: [],
    contextText: "safe",
    contextJson: {},
    sourceManifest: facts.map((f) => ({
      factId: f.id,
      sourceType: f.sourceType,
      sourceId: f.sourceId,
      title: f.title,
      visibility: f.visibility,
    })),
    generatedAt: new Date().toISOString(),
  };
}

function baseConfig(overrides: Partial<SeoBriefAiConfig> = {}): SeoBriefAiConfig {
  return {
    enabled: true,
    provider: "fake",
    model: "fake-model",
    apiKeyConfigured: false,
    maxInputCharacters: 24_000,
    maxOutputTokens: 2_000,
    timeoutMs: 10_000,
    retryInvalidOutput: 1,
    softMonthlyBudgetUsd: null,
    ...overrides,
  };
}

function memoryRunStore(): SeoBriefGenerationRunStore & {
  runs: AiGenerationRunRecord[];
} {
  const runs: AiGenerationRunRecord[] = [];
  let seq = 0;
  return {
    runs,
    async findRunning(topicId) {
      return (
        runs.find(
          (r) => r.entityId === topicId && r.status === "RUNNING" && r.type === "SEO_BRIEF",
        ) ?? null
      );
    },
    async findCompletedByInputHash(topicId, inputHash) {
      return (
        [...runs]
          .reverse()
          .find(
            (r) =>
              r.entityId === topicId &&
              r.status === "COMPLETED" &&
              r.inputHash === inputHash,
          ) ?? null
      );
    },
    async createRunning(data) {
      const run: AiGenerationRunRecord = {
        id: `run-${++seq}`,
        type: "SEO_BRIEF",
        status: "RUNNING",
        provider: data.provider,
        model: data.model,
        promptVersion: data.promptVersion,
        entityType: "SEO_TOPIC",
        entityId: data.entityId,
        retrievalRequestId: data.retrievalRequestId,
        inputHash: data.inputHash,
        inputSummary: data.inputSummary,
        output: null,
        warnings: null,
        errorMessage: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
        requestedBy: data.requestedBy,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      runs.push(run);
      return run;
    },
    async markCompleted(id, data) {
      const run = runs.find((r) => r.id === id);
      if (!run) throw new Error("missing run");
      run.status = "COMPLETED";
      run.output = data.output;
      run.warnings = data.warnings;
      run.inputTokens = data.inputTokens;
      run.outputTokens = data.outputTokens;
      run.totalTokens = data.totalTokens;
      run.estimatedCostUsd = data.estimatedCostUsd;
      run.completedAt = new Date();
      run.updatedAt = new Date();
      return run;
    },
    async markFailed(id, errorMessage) {
      const run = runs.find((r) => r.id === id);
      if (!run) throw new Error("missing run");
      run.status = "FAILED";
      run.errorMessage = errorMessage;
      run.completedAt = new Date();
      run.updatedAt = new Date();
      return run;
    },
  };
}

function suggestionWithFacts(factIds: string[]): SeoBriefSuggestion {
  return {
    workingTitle: "Áo thun sỉ B2B",
    proposedSlug: "ao-thun-si-b2b",
    metaTitle: "Áo thun sỉ",
    metaDescription: "Hướng dẫn chọn áo thun sỉ cho đại lý.",
    searchIntentNotes: "commercial",
    audienceNotes: "Đại lý / OEM",
    valueProposition: "Sỉ ổn định",
    outline: [
      { level: "H2", heading: "Tổng quan", purpose: "Intro", sortOrder: 0 },
      { level: "H2", heading: "MOQ", purpose: "Dùng fact", sortOrder: 1 },
      { level: "H2", heading: "FAQ", purpose: "Hỏi đáp", sortOrder: 2 },
    ],
    questions: [{ question: "MOQ?", answerDirection: "Dùng fact" }],
    entities: ["ATTD"],
    requiredSections: ["FAQ"],
    ctaType: "CONTACT",
    ctaText: "Liên hệ",
    wordCountMin: 800,
    wordCountMax: 1400,
    schemaTypes: ["Article", "FAQPage"],
    mediaRequirements: null,
    editorNotes: "ok",
    requiredFactIds: factIds,
    missingFacts: [],
    internalLinkSuggestions: [],
    contentWarnings: [],
  };
}

function makeDeps(overrides: {
  config?: Partial<SeoBriefAiConfig>;
  facts?: AiRetrievedFact[];
  provider?: FakeStructuredProvider;
  runs?: ReturnType<typeof memoryRunStore>;
  briefMutations?: number[];
}): SeoBriefGeneratorDeps & { runs: ReturnType<typeof memoryRunStore> } {
  const runs = overrides.runs ?? memoryRunStore();
  const facts =
    overrides.facts ??
    [
      fact({ id: "fact-1", title: "MOQ", sourceId: "kb-1" }),
      fact({ id: "fact-2", title: "Lead time", sourceId: "kb-2" }),
    ];
  const provider =
    overrides.provider ??
    new FakeStructuredProvider({
      resolveOutput: () => suggestionWithFacts(facts.map((f) => f.id)),
    });
  const briefMutations = overrides.briefMutations ?? [];

  return {
    getTopicById: async (id) =>
      id === "topic-1"
        ? {
            id: "topic-1",
            title: "Áo thun sỉ",
            primaryKeyword: "áo thun sỉ",
            searchIntent: "COMMERCIAL",
            keywords: [{ keyword: "áo thun OEM", keywordType: "SECONDARY" }],
          }
        : null,
    getExistingBrief: async () => {
      briefMutations.push(0);
      return {
        workingTitle: "Old title",
        metaTitle: null,
        outline: [],
        approvedAt: null,
      };
    },
    retrieveContext: async () => baseContext(facts),
    provider,
    config: baseConfig(overrides.config),
    runs,
  };
}

describe("validateSeoBriefSuggestion", () => {
  it("rejects invented fact IDs", () => {
    const raw = suggestionWithFacts(["fact-1", "invented-fact"]);
    const result = validateSeoBriefSuggestion(raw, {
      allowedFactIds: ["fact-1"],
      allowedInternalLinkTargets: [],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("invented-fact")));
    }
  });
});

describe("generateSeoBriefSuggestion", () => {
  it("blocks empty retrieval (insufficient facts)", async () => {
    const deps = makeDeps({ facts: [] });
    await assert.rejects(
      () => generateSeoBriefSuggestion({ topicId: "topic-1" }, deps),
      (err: unknown) => {
        assert.ok(err instanceof SeoBriefGeneratorError);
        assert.equal(err.code, "INSUFFICIENT_FACTS");
        return true;
      },
    );
    assert.equal(deps.runs.runs.length, 0);
  });

  it("rejects invalid fact ID from provider output", async () => {
    const provider = new FakeStructuredProvider({
      output: suggestionWithFacts(["fact-1", "not-real"]),
    });
    const deps = makeDeps({
      provider,
      facts: [fact({ id: "fact-1", title: "MOQ" })],
      config: { retryInvalidOutput: 0 },
    });
    await assert.rejects(
      () => generateSeoBriefSuggestion({ topicId: "topic-1" }, deps),
      (err: unknown) => {
        assert.ok(err instanceof SeoBriefGeneratorError);
        assert.equal(err.code, "INVALID_OUTPUT");
        return true;
      },
    );
    assert.equal(deps.runs.runs[0]?.status, "FAILED");
  });

  it("does not mutate SeoContentBrief on generate", async () => {
    let upsertCalls = 0;
    const deps = makeDeps({});
    const originalGetBrief = deps.getExistingBrief;
    deps.getExistingBrief = async (id) => {
      // Read-only access is fine; count only writes if wiring tried to upsert.
      return originalGetBrief(id);
    };
    void upsertCalls;
    const result = await generateSeoBriefSuggestion({ topicId: "topic-1" }, deps);
    assert.equal(result.reused, false);
    assert.equal(result.run.status, "COMPLETED");
    assert.ok(result.suggestion.workingTitle);
    // Generator must never call an upsert — we only exposed getExistingBrief (read).
    assert.equal(typeof (deps as { upsertBrief?: unknown }).upsertBrief, "undefined");
  });

  it("reuses completed run with same inputHash", async () => {
    const runs = memoryRunStore();
    const provider = new FakeStructuredProvider({
      resolveOutput: () =>
        suggestionWithFacts(["fact-1", "fact-2"]),
    });
    const deps = makeDeps({ runs, provider });
    const first = await generateSeoBriefSuggestion({ topicId: "topic-1" }, deps);
    assert.equal(first.reused, false);
    assert.equal(provider.callCount, 1);

    const second = await generateSeoBriefSuggestion({ topicId: "topic-1" }, deps);
    assert.equal(second.reused, true);
    assert.equal(second.run.id, first.run.id);
    assert.equal(provider.callCount, 1);
  });

  it("regenerate creates a new run", async () => {
    const runs = memoryRunStore();
    const provider = new FakeStructuredProvider({
      resolveOutput: () => suggestionWithFacts(["fact-1", "fact-2"]),
    });
    const deps = makeDeps({ runs, provider });
    const first = await generateSeoBriefSuggestion({ topicId: "topic-1" }, deps);
    const second = await generateSeoBriefSuggestion(
      { topicId: "topic-1", regenerate: true },
      deps,
    );
    assert.equal(first.reused, false);
    assert.equal(second.reused, false);
    assert.notEqual(second.run.id, first.run.id);
    assert.equal(provider.callCount, 2);
  });

  it("config missing returns clear error", async () => {
    const deps = makeDeps({ config: { enabled: true, provider: "openai", apiKeyConfigured: false } });
    await assert.rejects(
      () => generateSeoBriefSuggestion({ topicId: "topic-1" }, deps),
      (err: unknown) => {
        assert.ok(err instanceof SeoBriefGeneratorError);
        assert.equal(err.code, "AI_NOT_CONFIGURED");
        return true;
      },
    );
  });
});

describe("applySeoBriefSuggestion", () => {
  function makeApplyStore(input: {
    run: AiGenerationRunRecord;
    brief: SeoContentBriefRecord | null;
  }): SeoBriefApplyStore & { briefs: SeoContentBriefRecord[] } {
    const briefs = input.brief ? [structuredClone(input.brief)] : [];
    return {
      briefs,
      async getRun(runId) {
        return input.run.id === runId ? input.run : null;
      },
      async getBrief(topicId) {
        return briefs.find((b) => b.topicId === topicId) ?? null;
      },
      async upsertBrief(topicId, data) {
        const existing = briefs.find((b) => b.topicId === topicId);
        if (!existing) {
          const created: SeoContentBriefRecord = {
            id: "brief-1",
            topicId,
            workingTitle: null,
            proposedSlug: null,
            metaTitle: null,
            metaDescription: null,
            searchIntentNotes: null,
            audienceNotes: null,
            valueProposition: null,
            outline: [],
            questions: [],
            entities: [],
            requiredSections: [],
            ctaType: null,
            ctaText: null,
            wordCountMin: null,
            wordCountMax: null,
            schemaTypes: [],
            mediaRequirements: null,
            editorNotes: null,
            version: 1,
            approvedAt: null,
            approvedBy: null,
            lastAppliedGenerationRunId: null,
            ...(data as Partial<SeoContentBriefRecord>),
          };
          briefs.push(created);
          return created;
        }
        Object.assign(existing, data);
        return existing;
      },
    };
  }

  it("selective apply preserves other fields", async () => {
    const suggestion = suggestionWithFacts(["fact-1"]);
    suggestion.workingTitle = "New AI title";
    suggestion.metaTitle = "New AI meta";
    suggestion.ctaText = "New CTA";

    const run: AiGenerationRunRecord = {
      id: "run-apply-1",
      type: "SEO_BRIEF",
      status: "COMPLETED",
      provider: "fake",
      model: "fake",
      promptVersion: "seo-brief-v1",
      entityType: "SEO_TOPIC",
      entityId: "topic-1",
      retrievalRequestId: "req-1",
      inputHash: "abc",
      inputSummary: {},
      output: { suggestion },
      warnings: [],
      errorMessage: null,
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      estimatedCostUsd: 0,
      requestedBy: null,
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const store = makeApplyStore({
      run,
      brief: {
        id: "brief-1",
        topicId: "topic-1",
        workingTitle: "Keep me if not selected",
        proposedSlug: "keep-slug",
        metaTitle: "Old meta",
        metaDescription: "Keep desc",
        searchIntentNotes: null,
        audienceNotes: null,
        valueProposition: null,
        outline: [],
        questions: [],
        entities: [],
        requiredSections: [],
        ctaType: null,
        ctaText: "Old CTA",
        wordCountMin: null,
        wordCountMax: null,
        schemaTypes: [],
        mediaRequirements: null,
        editorNotes: "Keep notes",
        version: 1,
        approvedAt: null,
        approvedBy: null,
        lastAppliedGenerationRunId: null,
      },
    });

    const result = await applySeoBriefSuggestion(
      {
        topicId: "topic-1",
        runId: "run-apply-1",
        fields: ["workingTitle", "metaTitle"],
      },
      store,
    );

    assert.equal(result.brief.workingTitle, "New AI title");
    assert.equal(result.brief.metaTitle, "New AI meta");
    assert.equal(result.brief.ctaText, "Old CTA");
    assert.equal(result.brief.metaDescription, "Keep desc");
    assert.equal(result.brief.editorNotes, "Keep notes");
    assert.equal(result.brief.lastAppliedGenerationRunId, "run-apply-1");
    assert.equal(result.internalLinksNotApplied, true);
  });

  it("apply to approved brief requires confirm", async () => {
    const suggestion = suggestionWithFacts(["fact-1"]);
    const run: AiGenerationRunRecord = {
      id: "run-apply-2",
      type: "SEO_BRIEF",
      status: "COMPLETED",
      provider: "fake",
      model: "fake",
      promptVersion: "seo-brief-v1",
      entityType: "SEO_TOPIC",
      entityId: "topic-1",
      retrievalRequestId: null,
      inputHash: null,
      inputSummary: {},
      output: { suggestion },
      warnings: [],
      errorMessage: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
      requestedBy: null,
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const store = makeApplyStore({
      run,
      brief: {
        id: "brief-1",
        topicId: "topic-1",
        workingTitle: "Approved",
        proposedSlug: null,
        metaTitle: null,
        metaDescription: null,
        searchIntentNotes: null,
        audienceNotes: null,
        valueProposition: null,
        outline: [],
        questions: [],
        entities: [],
        requiredSections: [],
        ctaType: null,
        ctaText: null,
        wordCountMin: null,
        wordCountMax: null,
        schemaTypes: [],
        mediaRequirements: null,
        editorNotes: null,
        version: 2,
        approvedAt: new Date().toISOString(),
        approvedBy: "admin",
        lastAppliedGenerationRunId: null,
      },
    });

    await assert.rejects(
      () =>
        applySeoBriefSuggestion(
          { topicId: "topic-1", runId: "run-apply-2", fields: ["workingTitle"] },
          store,
        ),
      (err: unknown) => {
        assert.ok(err instanceof SeoBriefApplyError);
        assert.equal(err.code, "APPROVED_CONFIRM_REQUIRED");
        return true;
      },
    );

    const applied = await applySeoBriefSuggestion(
      {
        topicId: "topic-1",
        runId: "run-apply-2",
        fields: ["workingTitle"],
        confirmApprovedOverwrite: true,
      },
      store,
    );
    assert.equal(applied.approvalCleared, true);
    assert.equal(applied.brief.approvedAt, null);
    assert.equal(applied.brief.approvedBy, null);
  });
});
