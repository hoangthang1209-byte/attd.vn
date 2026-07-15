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
  // Evaluation override is server-option only — cannot come from request body.
  let graphExpansion: Awaited<
    ReturnType<
      typeof import("@/features/ai-retrieval/sources/knowledge-graph-source").expandRetrievalScopeViaKnowledgeGraph
    >
  > | null = null;
  try {
    const {
      expandRetrievalScopeViaKnowledgeGraph,
      attachGraphProvenanceToFacts,
      mergeGraphScopesIntoRequest,
    } = await import("@/features/ai-retrieval/sources/knowledge-graph-source");
    graphExpansion = await expandRetrievalScopeViaKnowledgeGraph(request, policy, {
      enabledForEvaluation: options?.enabledForEvaluation,
      depth: options?.graphExpansionDepth ?? 1,
    });
    warningGroups.push(graphExpansion.warnings);
    if (graphExpansion.enabled && graphExpansion.queried && graphExpansion.scopeEntityIds.length) {
      const { prisma: db } = await import("@/lib/prisma");
      const scoped = await db.knowledgeGraphEntity.findMany({
        where: { id: { in: graphExpansion.scopeEntityIds.slice(0, 100) } },
        select: { sourceType: true, sourceId: true, visibility: true },
      });
      request = mergeGraphScopesIntoRequest(request, graphExpansion, scoped);
    }
    // attach later after facts gathered
    void attachGraphProvenanceToFacts;
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

  if (graphExpansion?.enabled && graphExpansion.queried) {
    const { attachGraphProvenanceToFacts } = await import(
      "@/features/ai-retrieval/sources/knowledge-graph-source"
    );
    const attached = attachGraphProvenanceToFacts(facts, graphExpansion);
    facts = attached.facts;
    omittedGroups.push(attached.omitted);
  }

  // Rescore with unified scoring
  facts = facts.map((fact) => {
    const scored = scoreFactRelevance(fact, request.query, {
      productIds: request.productIds,
      mediaBundleIds: request.mediaBundleIds,
      seoTopicIds: request.seoTopicIds,
      entityIds: request.entityIds,
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

  const businessRules =
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

  const omitted = mergeOmitted(omittedGroups);
  const warnings = [...new Set(warningGroups.flat())].filter(Boolean);
  if (request.includeWarnings === false) {
    // keep governance critical only
  }

  const built = buildAiRetrievalContextParts({
    requestId,
    consumer: request.consumer,
    purpose: request.purpose,
    query: request.query,
    facts,
    businessRules,
    conflicts,
    warnings,
    omitted,
    maxContextCharacters: request.maxContextCharacters ?? policy.maxContextCharacters,
  });

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
    warnings: request.includeWarnings === false ? warnings.filter((w) => w.startsWith("legacy_")) : warnings,
    sourcesUsed: [...sourcesUsedMap.entries()].map(([sourceType, count]) => ({
      sourceType,
      count,
    })),
    omitted,
    contextText: built.contextText,
    contextJson: built.contextJson,
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
