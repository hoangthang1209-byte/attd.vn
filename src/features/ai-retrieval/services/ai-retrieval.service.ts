import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type {
  AiRetrievedFact,
  AiRetrievalContext,
  AiRetrievalOmittedBucket,
  AiRetrievalRequest,
  AiRetrievalSourceType,
} from "@/features/ai-retrieval/ai-retrieval-types";
import {
  getAiRetrievalPolicy,
  resolveEffectiveMaxVisibility,
} from "@/features/ai-retrieval/ai-retrieval-policy";
import { validateAiRetrievalRequest } from "@/features/ai-retrieval/ai-retrieval-validation";
import {
  detectFactConflicts,
  suppressLowerAuthorityDuplicates,
} from "@/features/ai-retrieval/ai-authority";
import { scoreFactRelevance, sortFactsByScore } from "@/features/ai-retrieval/ai-retrieval-scoring";
import { extractBusinessRulesFromKnowledge } from "@/features/ai-retrieval/ai-retrieval-business-rules";
import { buildAiRetrievalContextParts } from "@/features/ai-retrieval/services/ai-context-builder.service";

function mergeOmitted(buckets: AiRetrievalOmittedBucket[][]): AiRetrievalOmittedBucket[] {
  const map = new Map<string, number>();
  for (const group of buckets) {
    for (const item of group) {
      map.set(item.reason, (map.get(item.reason) ?? 0) + item.count);
    }
  }
  return [...map.entries()].map(([reason, count]) => ({ reason, count }));
}

function applyPublicOutputSafety(
  facts: AiRetrievedFact[],
  purpose: AiRetrievalRequest["purpose"],
  conflicts: ReturnType<typeof detectFactConflicts>
): { facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[]; warnings: string[] } {
  if (purpose !== "PUBLIC_OUTPUT") return { facts, omitted: [], warnings: [] };

  const omittedMap = new Map<string, number>();
  const bump = (reason: string) => omittedMap.set(reason, (omittedMap.get(reason) ?? 0) + 1);
  const warnings: string[] = [];

  const unresolvedKeys = new Set(
    conflicts.filter((c) => c.resolution === "UNRESOLVED").map((c) => c.key)
  );

  const conflictKeyToStructuredKeys: Record<string, string[]> = {
    MOQ: ["moqValue", "defaultMoq", "moq"],
    lead_time: ["leadTimeMinDays", "leadTimeMaxDays", "leadTime"],
    material: ["material", "materialComposition"],
    capacity: ["capacity"],
    public_pricing_policy: ["pricingPolicy", "publicPriceHint"],
    technique_compatibility: [
      "printCompatibility",
      "embroideryCompatibility",
      "washCompatibility",
    ],
  };

  const filtered = facts
    .map((fact) => {
      const next: AiRetrievedFact = {
        ...fact,
        structuredData: fact.structuredData ? { ...fact.structuredData } : null,
        warnings: [...fact.warnings],
      };

      if (next.visibility !== "PUBLIC") {
        bump("non_public_visibility");
        return null;
      }
      if (!next.publicOutputAllowed) {
        bump("public_output_not_allowed");
        return null;
      }

      if (next.structuredData) {
        const forbidden = ["costPrice", "cost", "margin", "supplierCost", "internalNote"];
        for (const key of forbidden) {
          if (key in next.structuredData) {
            delete next.structuredData[key];
            next.warnings.push(`stripped_${key}`);
          }
        }

        // Unresolved conflicts: strip disputed structured keys (do not drop whole fact).
        for (const conflictKey of unresolvedKeys) {
          const keys = conflictKeyToStructuredKeys[conflictKey] ?? [];
          let stripped = false;
          for (const key of keys) {
            if (next.structuredData && key in next.structuredData) {
              delete next.structuredData[key];
              stripped = true;
            }
          }
          if (stripped) {
            next.warnings.push(`unresolved_${conflictKey}_omitted_from_structured_data`);
            warnings.push(`unresolved_conflict:${conflictKey}`);
          }
        }
      }

      return next;
    })
    .filter((fact): fact is AiRetrievedFact => fact != null);

  return {
    facts: filtered,
    omitted: [...omittedMap.entries()].map(([reason, count]) => ({ reason, count })),
    warnings: [...new Set(warnings)],
  };
}

async function writeRetrievalLog(input: {
  requestId: string;
  request: AiRetrievalRequest;
  resultCount: number;
  conflictCount: number;
  warningCount: number;
  omittedCount: number;
  maxVisibilityUsed: string;
  sourceTypes: AiRetrievalSourceType[];
}) {
  await prisma.aiRetrievalLog.create({
    data: {
      requestId: input.requestId,
      consumer: input.request.consumer,
      purpose: input.request.purpose,
      query: input.request.query || "(entity-scope)",
      sourceTypes: input.sourceTypes,
      resultCount: input.resultCount,
      conflictCount: input.conflictCount,
      warningCount: input.warningCount,
      omittedCount: input.omittedCount,
      maxVisibilityUsed: input.maxVisibilityUsed,
      userId: input.request.userId ?? null,
      entityScope: {
        productIds: input.request.productIds ?? [],
        mediaBundleIds: input.request.mediaBundleIds ?? [],
        seoTopicIds: input.request.seoTopicIds ?? [],
        entityIds: input.request.entityIds ?? [],
        knowledgeEntryIds: input.request.knowledgeEntryIds ?? [],
      },
      // Never store full confidential context payload
      metadata: {
        includeMedia: input.request.includeMedia ?? true,
        includeBusinessRules: input.request.includeBusinessRules ?? false,
        compatibilityMode: input.request.compatibilityMode !== false,
        loggedFullContext: false,
      },
    },
  });
}

export type RetrieveEnterpriseOptions = {
  /** Admin/evaluation only — never accepted from validated public request body. */
  enabledForEvaluation?: boolean;
  /** Explicit Retrieval Inspector admin pilot toggle (authorized admin only). */
  enabledForAdminPilot?: boolean;
  evaluationMode?: boolean;
  skipRetrievalLog?: boolean;
  graphExpansionDepth?: number;
};

export async function retrieveEnterpriseAiContext(
  rawRequest: unknown,
  options?: RetrieveEnterpriseOptions
): Promise<{ ok: true; context: AiRetrievalContext } | { ok: false; errors: string[] }> {
  const validated = validateAiRetrievalRequest(rawRequest);
  if (!validated.ok) return validated;

  let request = validated.request;
  const originalRequest = { ...validated.request };
  const baselineSourceKeys = new Set<string>([
    ...(originalRequest.productIds ?? []).map((id) => `PRODUCT:${id}`),
    ...(originalRequest.knowledgeEntryIds ?? []).map((id) => `KNOWLEDGE_BASE:${id}`),
    ...(originalRequest.seoTopicIds ?? []).map((id) => `SEO_TOPIC:${id}`),
    ...(originalRequest.mediaBundleIds ?? []).map((id) => `MEDIA_BUNDLE:${id}`),
  ]);
  const policy = getAiRetrievalPolicy(request.consumer);
  const requestId = randomUUID();
  const maxVisibility = resolveEffectiveMaxVisibility(policy, request.purpose);
  const sourceTypes =
    request.sourceTypes && request.sourceTypes.length > 0
      ? request.sourceTypes
      : policy.sourceScopes;

  const omittedGroups: AiRetrievalOmittedBucket[][] = [];
  const warningGroups: string[][] = [];
  let facts: AiRetrievedFact[] = [];

  // Optional Knowledge Graph scope expansion (production flags default false).
  // Evaluation/admin pilot override is server-option only — cannot come from request body.
  let graphExpansion: Awaited<
    ReturnType<
      typeof import("@/features/ai-retrieval/sources/knowledge-graph-source").expandRetrievalScopeViaKnowledgeGraph
    >
  > | null = null;
  const graphAddedSourceKeys = new Set<string>();
  try {
    const {
      expandRetrievalScopeViaKnowledgeGraph,
      mergeGraphScopesIntoRequest,
    } = await import("@/features/ai-retrieval/sources/knowledge-graph-source");
    graphExpansion = await expandRetrievalScopeViaKnowledgeGraph(request, policy, {
      enabledForEvaluation: options?.enabledForEvaluation,
      enabledForAdminPilot: options?.enabledForAdminPilot,
      depth: options?.graphExpansionDepth ?? 1,
    });
    warningGroups.push(graphExpansion.warnings);
    if (graphExpansion.enabled && graphExpansion.queried && graphExpansion.scopeEntityIds.length) {
      const { prisma: db } = await import("@/lib/prisma");
      const scoped = await db.knowledgeGraphEntity.findMany({
        where: { id: { in: graphExpansion.scopeEntityIds.slice(0, 100) } },
        select: { sourceType: true, sourceId: true, visibility: true },
      });
      const before = {
        productIds: new Set(request.productIds ?? []),
        knowledgeEntryIds: new Set(request.knowledgeEntryIds ?? []),
        mediaBundleIds: new Set(request.mediaBundleIds ?? []),
        seoTopicIds: new Set(request.seoTopicIds ?? []),
        entityIds: new Set(request.entityIds ?? []),
      };
      request = mergeGraphScopesIntoRequest(request, graphExpansion, scoped);
      for (const id of request.productIds ?? []) {
        if (!before.productIds.has(id)) graphAddedSourceKeys.add(`PRODUCT:${id}`);
      }
      for (const id of request.knowledgeEntryIds ?? []) {
        if (!before.knowledgeEntryIds.has(id)) graphAddedSourceKeys.add(`KNOWLEDGE_BASE:${id}`);
      }
      for (const id of request.mediaBundleIds ?? []) {
        if (!before.mediaBundleIds.has(id)) graphAddedSourceKeys.add(`MEDIA_BUNDLE:${id}`);
      }
      for (const id of request.seoTopicIds ?? []) {
        if (!before.seoTopicIds.has(id)) graphAddedSourceKeys.add(`SEO_TOPIC:${id}`);
      }
      for (const id of request.entityIds ?? []) {
        if (!before.entityIds.has(id)) {
          graphAddedSourceKeys.add(`BLOG_POST:${id}`);
          graphAddedSourceKeys.add(`MANUFACTURING_ASSET:${id}`);
          graphAddedSourceKeys.add(`PRINT_METHOD:${id}`);
          graphAddedSourceKeys.add(`OTHER:${id}`);
        }
      }
    }
  } catch (err) {
    warningGroups.push([
      `graph_expansion_failed:${err instanceof Error ? err.message : String(err)}`,
      "graph_fallback_to_baseline",
    ]);
    graphExpansion = null;
  }

  const runIf = async (
    type: AiRetrievalSourceType,
    fn: () => Promise<{
      facts: AiRetrievedFact[];
      omitted: AiRetrievalOmittedBucket[];
      warnings: string[];
    }>
  ) => {
    if (!sourceTypes.includes(type)) return;
    // For MEDIA_ASSET and MEDIA_BUNDLE, media adapter handles both
    if (type === "MEDIA_ASSET" && sourceTypes.includes("MEDIA_BUNDLE")) return;
    if (type === "SEO_BRIEF" && sourceTypes.includes("SEO_TOPIC")) return;
    const result = await fn();
    facts.push(...result.facts);
    omittedGroups.push(result.omitted);
    warningGroups.push(result.warnings);
  };

  await runIf("KNOWLEDGE_BASE", async () => {
    const { retrieveKnowledgeFacts } = await import(
      "@/features/ai-retrieval/sources/knowledge-source"
    );
    return retrieveKnowledgeFacts(request, policy);
  });
  await runIf("PRODUCT", async () => {
    const { retrieveProductFacts } = await import(
      "@/features/ai-retrieval/sources/product-source"
    );
    return retrieveProductFacts(request, policy);
  });
  await runIf("MANUFACTURING_ASSET", async () => {
    const { retrieveManufacturingFacts } = await import(
      "@/features/ai-retrieval/sources/manufacturing-source"
    );
    return retrieveManufacturingFacts(request, policy);
  });
  if (sourceTypes.includes("MEDIA_BUNDLE") || sourceTypes.includes("MEDIA_ASSET")) {
    const { retrieveMediaFacts } = await import("@/features/ai-retrieval/sources/media-source");
    const media = await retrieveMediaFacts(request, policy);
    facts.push(...media.facts);
    omittedGroups.push(media.omitted);
    warningGroups.push(media.warnings);
  }
  if (sourceTypes.includes("SEO_TOPIC") || sourceTypes.includes("SEO_BRIEF")) {
    const { retrieveSeoFacts } = await import("@/features/ai-retrieval/sources/seo-source");
    const seo = await retrieveSeoFacts(request, policy);
    facts.push(...seo.facts);
    omittedGroups.push(seo.omitted);
    warningGroups.push(seo.warnings);
  }
  if (sourceTypes.includes("BLOG_POST")) {
    const { retrieveContentFacts } = await import(
      "@/features/ai-retrieval/sources/content-source"
    );
    const content = await retrieveContentFacts(request, policy);
    facts.push(...content.facts);
    omittedGroups.push(content.omitted);
    warningGroups.push(content.warnings);
  }

  // Visibility gate on max visibility
  const rank = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2 } as const;
  facts = facts.filter((fact) => {
    if (rank[fact.visibility] <= rank[maxVisibility]) return true;
    omittedGroups.push([{ reason: "visibility_exceeds_policy", count: 1 }]);
    return false;
  });

  let graphBudgetDiagnostics: Awaited<
    ReturnType<
      typeof import("@/features/ai-retrieval/graph-context-budget.service").enforcePreAssemblyGraphBudget
    >
  >["diagnostics"] | null = null;
  let graphBaselineFactIds: Set<string> | null = null;
  let graphBaselineCharacters = 0;

  if (graphExpansion?.enabled && graphExpansion.queried) {
    const {
      attachGraphProvenanceToFacts,
      applyGraphAddedFactBudget,
    } = await import("@/features/ai-retrieval/sources/knowledge-graph-source");
    const attached = attachGraphProvenanceToFacts(facts, graphExpansion);
    facts = attached.facts;
    omittedGroups.push(attached.omitted);

    const baselineFactIds = new Set(
      facts
        .filter((f) => {
          const key = `${f.sourceType}:${f.sourceId}`;
          // Preserve all non-graph-scope facts as mandatory baseline (query hits included)
          if (!graphAddedSourceKeys.has(key) && !baselineSourceKeys.has(key)) {
            return true;
          }
          return baselineSourceKeys.has(key);
        })
        .map((f) => f.id)
    );
    // Explicit original scopes always baseline
    for (const f of facts) {
      const key = `${f.sourceType}:${f.sourceId}`;
      if (baselineSourceKeys.has(key)) baselineFactIds.add(f.id);
      if (
        (originalRequest.productIds ?? []).includes(f.sourceId) ||
        (originalRequest.knowledgeEntryIds ?? []).includes(f.sourceId) ||
        (originalRequest.mediaBundleIds ?? []).includes(f.sourceId) ||
        (originalRequest.seoTopicIds ?? []).includes(f.sourceId)
      ) {
        baselineFactIds.add(f.id);
      }
      // Query-native hits that merely received graph enrichment bonus remain baseline
      if (
        f.matchedOn.some((m) =>
          /blog_search|product_search|kb_search|entity_scope|query/i.test(m)
        ) &&
        !graphAddedSourceKeys.has(key)
      ) {
        baselineFactIds.add(f.id);
      }
    }

    const budgeted = applyGraphAddedFactBudget({
      baselineFactIds,
      facts,
      consumer: request.consumer,
    });
    facts = budgeted.facts;
    if (budgeted.report.droppedByBudget || budgeted.report.droppedByRelevance) {
      warningGroups.push([
        `graph_fact_budget:accepted=${budgeted.report.accepted};dropped_budget=${budgeted.report.droppedByBudget};dropped_relevance=${budgeted.report.droppedByRelevance};dropped_dup=${budgeted.report.droppedAsDuplicate}`,
      ]);
      omittedGroups.push([
        { reason: "graph_added_fact_budget", count: budgeted.report.droppedByBudget },
        { reason: "graph_added_fact_low_relevance", count: budgeted.report.droppedByRelevance },
      ]);
    }

    const {
      enforcePreAssemblyGraphBudget,
      estimateFactRenderCharacters,
      formatGraphBudgetWarning,
    } = await import("@/features/ai-retrieval/graph-context-budget.service");
    const baselineOnly = facts.filter((f) => baselineFactIds.has(f.id));
    graphBaselineCharacters =
      baselineOnly.reduce((s, f) => s + estimateFactRenderCharacters(f), 0) + 220;
    const preAssembled = enforcePreAssemblyGraphBudget({
      baselineFactIds,
      facts,
      consumer: request.consumer,
      query: originalRequest.query,
      maxContextCharacters: request.maxContextCharacters ?? policy.maxContextCharacters,
      baselineCharactersOverride: graphBaselineCharacters,
    });
    facts = preAssembled.facts;
    graphBudgetDiagnostics = preAssembled.diagnostics;
    graphBaselineFactIds = baselineFactIds;
    warningGroups.push([formatGraphBudgetWarning(preAssembled.diagnostics)]);
    if (preAssembled.diagnostics.factsTrimmed.length) {
      omittedGroups.push([
        {
          reason: "graph_pre_assembly_budget",
          count: preAssembled.diagnostics.factsTrimmed.length,
        },
      ]);
    }
    if (preAssembled.diagnostics.fallbackToBaseline) {
      warningGroups.push(["graph_budget_no_value_fit"]);
    }
  }

  // Rescore with unified scoring
  facts = facts.map((fact) => {
    const scored = scoreFactRelevance(fact, originalRequest.query, {
      productIds: originalRequest.productIds,
      mediaBundleIds: originalRequest.mediaBundleIds,
      seoTopicIds: originalRequest.seoTopicIds,
      entityIds: originalRequest.entityIds,
    });
    return {
      ...fact,
      relevanceScore: Math.max(fact.relevanceScore, scored.score),
      matchedOn: [...new Set([...fact.matchedOn, ...scored.matchedOn])],
    };
  });

  let conflicts = request.includeConflicts === false ? [] : detectFactConflicts(facts);
  const suppressed = suppressLowerAuthorityDuplicates(facts, conflicts);
  facts = suppressed.facts;
  if (suppressed.suppressedIds.length) {
    omittedGroups.push([
      { reason: "lower_authority_duplicate", count: suppressed.suppressedIds.length },
    ]);
  }
  warningGroups.push(suppressed.decisions);

  // Recompute conflicts after suppression
  conflicts = request.includeConflicts === false ? [] : detectFactConflicts(facts);

  const publicSafe = applyPublicOutputSafety(facts, request.purpose, conflicts);
  facts = publicSafe.facts;
  omittedGroups.push(publicSafe.omitted);
  warningGroups.push(publicSafe.warnings);

  // For PUBLIC_OUTPUT omit unresolved conflict facts from context certainty
  if (request.purpose === "PUBLIC_OUTPUT") {
    const unresolved = new Set(
      conflicts.filter((c) => c.resolution === "UNRESOLVED").map((c) => c.selectedFactId)
    );
    void unresolved;
  }

  facts = sortFactsByScore(facts).slice(0, request.maxItems ?? policy.maxItems);

  let businessRules =
    request.includeBusinessRules
      ? extractBusinessRulesFromKnowledge(
          facts
            .filter((f) => f.sourceType === "KNOWLEDGE_BASE")
            .map((f) => ({
              id: f.sourceId,
              title: f.title,
              visibility: f.visibility,
              approvedAt: f.approvedAt,
              structuredData: f.structuredData ?? null,
            }))
        )
      : [];

  let omitted = mergeOmitted(omittedGroups);
  let warnings = [...new Set(warningGroups.flat())].filter(Boolean);
  if (request.includeWarnings === false) {
    // keep governance critical only
  }

  const maxContextCharacters = request.maxContextCharacters ?? policy.maxContextCharacters;
  const { GRAPH_CONTEXT_GROWTH } = await import(
    "@/features/knowledge-graph/evaluation/graph-expansion-budgets"
  );
  const GRAPH_CONTEXT_GROWTH_TARGET = GRAPH_CONTEXT_GROWTH.targetPercent;

  let built = buildAiRetrievalContextParts({
    requestId,
    consumer: request.consumer,
    purpose: request.purpose,
    query: request.query,
    facts,
    businessRules,
    conflicts,
    warnings,
    omitted,
    maxContextCharacters,
  });

  if (graphExpansion?.enabled && graphExpansion.queried && graphBaselineFactIds) {
    const {
      assertAndRepairFinalGraphGrowth,
      formatGraphBudgetWarning,
      mandatoryBaselineChecksum,
    } = await import("@/features/ai-retrieval/graph-context-budget.service");
    const { estimateContextGrowthPercent } = await import(
      "@/features/ai-retrieval/sources/knowledge-graph-source"
    );

    const baselineFactsOnly = facts.filter((f) => graphBaselineFactIds!.has(f.id));
    const baselineRendered = buildAiRetrievalContextParts({
      requestId,
      consumer: request.consumer,
      purpose: request.purpose,
      query: request.query,
      facts: baselineFactsOnly,
      businessRules: [],
      conflicts: request.includeConflicts === false ? [] : detectFactConflicts(baselineFactsOnly),
      warnings: [],
      omitted: [],
      maxContextCharacters,
    });
    const trueBaselineChars = baselineRendered.contextText.length;
    graphBaselineCharacters = trueBaselineChars;

    let repaired = assertAndRepairFinalGraphGrowth({
      baselineFactIds: graphBaselineFactIds,
      facts,
      baselineCharacters: trueBaselineChars,
      finalCharacters: built.contextText.length,
    });

    // If assertion wants a change, rebuild and re-check once against rendered size
    if (
      repaired.secondPassTrimUsed ||
      repaired.fallbackToBaseline ||
      repaired.hardCapFallbackUsed ||
      estimateContextGrowthPercent(trueBaselineChars, built.contextText.length) >
        GRAPH_CONTEXT_GROWTH_TARGET
    ) {
      // Prefer iterative drop using rendered growth
      let workingFacts = repaired.facts;
      let pass = 0;
      while (
        pass < 24 &&
        estimateContextGrowthPercent(
          trueBaselineChars,
          buildAiRetrievalContextParts({
            requestId,
            consumer: request.consumer,
            purpose: request.purpose,
            query: request.query,
            facts: workingFacts,
            businessRules: [],
            conflicts: [],
            warnings: [],
            omitted: [],
            maxContextCharacters,
          }).contextText.length
        ) > GRAPH_CONTEXT_GROWTH_TARGET
      ) {
        const dropCandidate = workingFacts
          .filter((f) => !graphBaselineFactIds!.has(f.id))
          .sort((a, b) => a.relevanceScore - b.relevanceScore)[0];
        if (!dropCandidate) break;
        workingFacts = workingFacts.filter((f) => f.id !== dropCandidate.id);
        pass += 1;
        repaired = {
          ...repaired,
          secondPassTrimUsed: true,
          facts: workingFacts,
          warning: `graph_rendered_trim_pass:${pass}`,
        };
      }
      const stillOver =
        estimateContextGrowthPercent(
          trueBaselineChars,
          buildAiRetrievalContextParts({
            requestId,
            consumer: request.consumer,
            purpose: request.purpose,
            query: request.query,
            facts: workingFacts,
            businessRules: [],
            conflicts: [],
            warnings: [],
            omitted: [],
            maxContextCharacters,
          }).contextText.length
        ) > GRAPH_CONTEXT_GROWTH_TARGET;
      if (stillOver) {
        workingFacts = baselineFactsOnly;
        repaired = {
          facts: workingFacts,
          actualGrowthPercent: 0,
          hardCapFallbackUsed: true,
          secondPassTrimUsed: true,
          fallbackToBaseline: true,
          warning: "graph_budget_fallback_baseline:oversized_after_trim",
        };
      }

      facts = workingFacts;
      if (repaired.warning) warningGroups.push([repaired.warning]);
      conflicts = request.includeConflicts === false ? [] : detectFactConflicts(facts);
      businessRules = request.includeBusinessRules
        ? extractBusinessRulesFromKnowledge(
            facts
              .filter((f) => f.sourceType === "KNOWLEDGE_BASE")
              .map((f) => ({
                id: f.sourceId,
                title: f.title,
                visibility: f.visibility,
                approvedAt: f.approvedAt,
                structuredData: f.structuredData ?? null,
              }))
          )
        : [];
      omitted = mergeOmitted(omittedGroups);
      warnings = [...new Set(warningGroups.flat())].filter(Boolean);
      built = buildAiRetrievalContextParts({
        requestId,
        consumer: request.consumer,
        purpose: request.purpose,
        query: request.query,
        facts,
        businessRules,
        conflicts,
        warnings,
        omitted,
        maxContextCharacters,
      });
    }

    if (graphBudgetDiagnostics) {
      graphBudgetDiagnostics.baselineCharacters = trueBaselineChars;
      graphBudgetDiagnostics.baselineChecksum = mandatoryBaselineChecksum(baselineFactsOnly);
      graphBudgetDiagnostics.mandatoryBaselinePreserved =
        mandatoryBaselineChecksum(
          facts.filter((f) => graphBaselineFactIds!.has(f.id))
        ) === graphBudgetDiagnostics.baselineChecksum;
      graphBudgetDiagnostics.finalCharacters = built.contextText.length;
      graphBudgetDiagnostics.actualGrowthPercent = Number(
        estimateContextGrowthPercent(trueBaselineChars, built.contextText.length).toFixed(2)
      );
      graphBudgetDiagnostics.hardCapFallbackUsed =
        graphBudgetDiagnostics.hardCapFallbackUsed || repaired.hardCapFallbackUsed;
      graphBudgetDiagnostics.secondPassTrimUsed =
        graphBudgetDiagnostics.secondPassTrimUsed || repaired.secondPassTrimUsed;
      graphBudgetDiagnostics.fallbackToBaseline =
        graphBudgetDiagnostics.fallbackToBaseline || repaired.fallbackToBaseline;
      warningGroups.push([formatGraphBudgetWarning(graphBudgetDiagnostics)]);
      warnings = [...new Set(warningGroups.flat())].filter(Boolean);
    }
  }

  const sourcesUsedMap = new Map<AiRetrievalSourceType, number>();
  for (const fact of facts) {
    sourcesUsedMap.set(fact.sourceType, (sourcesUsedMap.get(fact.sourceType) ?? 0) + 1);
  }

  const context: AiRetrievalContext = {
    requestId,
    consumer: request.consumer,
    purpose: request.purpose,
    query: request.query,
    policy: {
      maxVisibility,
      allowConfidential: policy.allowConfidential,
      requireApproved: policy.requireApproved,
      requireVerified: policy.requireVerified,
      compatibilityMode: request.compatibilityMode !== false,
    },
    facts,
    businessRules,
    conflicts,
    warnings:
      request.includeWarnings === false
        ? warnings.filter((w) => w.startsWith("legacy_"))
        : warnings,
    sourcesUsed: [...sourcesUsedMap.entries()].map(([sourceType, count]) => ({
      sourceType,
      count,
    })),
    omitted,
    contextText: built.contextText,
    contextJson: {
      ...built.contextJson,
      ...(graphBudgetDiagnostics ? { graphContextBudget: graphBudgetDiagnostics } : {}),
    },
    sourceManifest: built.sourceManifest,
    generatedAt: new Date().toISOString(),
  };

  if (!options?.skipRetrievalLog) {
    await writeRetrievalLog({
      requestId,
      request,
      resultCount: facts.length,
      conflictCount: conflicts.length,
      warningCount: context.warnings.length,
      omittedCount: omitted.reduce((sum, row) => sum + row.count, 0),
      maxVisibilityUsed: maxVisibility,
      sourceTypes,
    });
  }

  return { ok: true, context };
}
