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
import { retrieveKnowledgeFacts } from "@/features/ai-retrieval/sources/knowledge-source";
import { retrieveProductFacts } from "@/features/ai-retrieval/sources/product-source";
import { retrieveManufacturingFacts } from "@/features/ai-retrieval/sources/manufacturing-source";
import { retrieveMediaFacts } from "@/features/ai-retrieval/sources/media-source";
import { retrieveSeoFacts } from "@/features/ai-retrieval/sources/seo-source";

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
): { facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[] } {
  if (purpose !== "PUBLIC_OUTPUT") return { facts, omitted: [] };

  const omittedMap = new Map<string, number>();
  const bump = (reason: string) => omittedMap.set(reason, (omittedMap.get(reason) ?? 0) + 1);

  const unresolvedUnsafe = new Set(
    conflicts
      .filter((c) => c.resolution === "UNRESOLVED")
      .flatMap((c) => c.facts.map((f) => f.factId))
  );

  const filtered = facts.filter((fact) => {
    if (fact.visibility !== "PUBLIC") {
      bump("non_public_visibility");
      return false;
    }
    if (!fact.publicOutputAllowed) {
      bump("public_output_not_allowed");
      return false;
    }
    if (unresolvedUnsafe.has(fact.id) && fact.authoritativeDomain === "moq") {
      bump("unresolved_conflict_omitted");
      return false;
    }
    if (fact.structuredData) {
      const forbidden = ["costPrice", "cost", "margin", "supplierCost", "internalNote"];
      for (const key of forbidden) {
        if (key in fact.structuredData) {
          delete fact.structuredData[key];
          fact.warnings.push(`stripped_${key}`);
        }
      }
    }
    return true;
  });

  return {
    facts: filtered,
    omitted: [...omittedMap.entries()].map(([reason, count]) => ({ reason, count })),
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

export async function retrieveEnterpriseAiContext(
  rawRequest: unknown
): Promise<{ ok: true; context: AiRetrievalContext } | { ok: false; errors: string[] }> {
  const validated = validateAiRetrievalRequest(rawRequest);
  if (!validated.ok) return validated;

  const request = validated.request;
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

  await runIf("KNOWLEDGE_BASE", () => retrieveKnowledgeFacts(request, policy));
  await runIf("PRODUCT", () => retrieveProductFacts(request, policy));
  await runIf("MANUFACTURING_ASSET", () => retrieveManufacturingFacts(request, policy));
  if (sourceTypes.includes("MEDIA_BUNDLE") || sourceTypes.includes("MEDIA_ASSET")) {
    const media = await retrieveMediaFacts(request, policy);
    facts.push(...media.facts);
    omittedGroups.push(media.omitted);
    warningGroups.push(media.warnings);
  }
  if (sourceTypes.includes("SEO_TOPIC") || sourceTypes.includes("SEO_BRIEF")) {
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

  return { ok: true, context };
}
