/**
 * Knowledge Graph expansion source for AI Retrieval (Sprint 12.3 precision).
 *
 * Flags default false. Evaluation/admin override is server-option only.
 * Graph nodes enrich scope only — never invent business facts.
 */

import type { KnowledgeBaseVisibility } from "@prisma/client";
import type {
  AiRetrievedFact,
  AiRetrievalRequest,
  AiRetrievalPolicy,
  AiRetrievalOmittedBucket,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { GRAPH_SCORING_BONUSES } from "@/features/knowledge-graph/knowledge-graph-types";
import { resolveEffectiveMaxVisibility } from "@/features/ai-retrieval/ai-retrieval-policy";
import {
  isKnowledgeGraphExpansionEnabledForConsumer,
  isKnowledgeGraphExpansionGlobalEnabled,
} from "@/features/knowledge-graph/evaluation/graph-expansion-flags";
import {
  GRAPH_PATH_POLICY_VERSION,
  maxRootsForConsumer,
  resolveAllowedRelationshipsForExpansion,
  resolveGraphQueryIntent,
  type GraphQueryIntent,
} from "@/features/knowledge-graph/evaluation/graph-expansion-path-policy";
import {
  getAddedFactBudget,
  getSourceBudgets,
  mapSourceTypeToBudgetKey,
  GRAPH_CONTEXT_GROWTH,
} from "@/features/knowledge-graph/evaluation/graph-expansion-budgets";
import {
  applySourceScopeBudgets,
  pruneGraphPaths,
  type PruneReason,
  type RawGraphPath,
} from "@/features/knowledge-graph/evaluation/graph-path-pruning";

export function isKnowledgeGraphExpansionEnabled(): boolean {
  return isKnowledgeGraphExpansionGlobalEnabled();
}

export type GraphExpansionProvenance = {
  rootEntityId: string;
  pathEntityIds: string[];
  relationshipIds: string[];
  relationshipTypes: string[];
  edgeOrigins: string[];
  evidenceUrls: Array<string | null>;
  visibility: KnowledgeBaseVisibility;
  authorityRank: number;
  matchedOn: string[];
};

export type GraphExpansionDiagnostics = {
  policyVersion: string;
  intent: GraphQueryIntent;
  rootSelections: Array<{ sourceType: string; sourceId: string; reason: string }>;
  rawPathCount: number;
  prunedPathCount: number;
  rejected: Array<{ reason: PruneReason; count: number }>;
  droppedByBudget: number;
  proposedScopeCount: number;
  acceptedScopeCount: number;
};

export type GraphExpansionResult = {
  enabled: boolean;
  queried: boolean;
  evaluationMode: boolean;
  scopeEntityIds: string[];
  provenance: GraphExpansionProvenance[];
  bonusesBySourceId: Record<string, number>;
  warnings: string[];
  diagnostics?: GraphExpansionDiagnostics;
};

export type GraphExpansionOptions = {
  enabledForEvaluation?: boolean;
  /** Explicit admin Retrieval Inspector pilot (authorized caller only). */
  enabledForAdminPilot?: boolean;
  depth?: number;
  maxNeighbours?: number;
  maxNodes?: number;
  maxEdges?: number;
};

const DISABLED_RESULT: GraphExpansionResult = {
  enabled: false,
  queried: false,
  evaluationMode: false,
  scopeEntityIds: [],
  provenance: [],
  bonusesBySourceId: {},
  warnings: [],
};

function selectRoots(
  pairs: Array<{ sourceType: string; sourceId: string }>,
  consumer: AiRetrievalRequest["consumer"]
): Array<{ sourceType: string; sourceId: string; reason: string }> {
  const max = maxRootsForConsumer(consumer);
  const selected: Array<{ sourceType: string; sourceId: string; reason: string }> = [];
  const seenProducts = new Set<string>();

  // Prefer Products, then SeoTopic, then KB
  const ordered = [
    ...pairs.filter((p) => p.sourceType === "Product"),
    ...pairs.filter((p) => p.sourceType === "SeoTopic"),
    ...pairs.filter((p) => p.sourceType === "KnowledgeBaseEntry"),
  ];

  for (const pair of ordered) {
    if (selected.length >= max) break;
    if (pair.sourceType === "Product") {
      if (seenProducts.has(pair.sourceId)) continue;
      seenProducts.add(pair.sourceId);
      selected.push({ ...pair, reason: "explicit_product_scope" });
      continue;
    }
    if (pair.sourceType === "SeoTopic") {
      selected.push({ ...pair, reason: "explicit_seo_topic_scope" });
      continue;
    }
    // Generic KB roots: only if we have room and fewer than 1 so far
    if (selected.filter((s) => s.sourceType === "KnowledgeBaseEntry").length >= 1) continue;
    selected.push({ ...pair, reason: "explicit_knowledge_scope" });
  }

  return selected;
}

export async function expandRetrievalScopeViaKnowledgeGraph(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy,
  options?: GraphExpansionOptions
): Promise<GraphExpansionResult> {
  const evaluationMode = Boolean(options?.enabledForEvaluation);
  const adminPilot = Boolean(options?.enabledForAdminPilot);
  const enabled = isKnowledgeGraphExpansionEnabledForConsumer(request.consumer, {
    enabledForEvaluation: evaluationMode || adminPilot,
  });

  if (!enabled) {
    return DISABLED_RESULT;
  }

  const warnings: string[] = [];
  if (evaluationMode) warnings.push("graph_expansion_evaluation_mode");
  if (adminPilot) warnings.push("graph_expansion_admin_pilot");
  warnings.push(`graph_path_policy:${GRAPH_PATH_POLICY_VERSION}`);

  const maxVisibility = resolveEffectiveMaxVisibility(policy, request.purpose);
  const intent = resolveGraphQueryIntent({
    query: request.query,
    consumer: request.consumer,
  });
  warnings.push(`graph_intent:${intent}`);

  const hasExplicitScope =
    Boolean(request.productIds?.length) ||
    Boolean(request.knowledgeEntryIds?.length) ||
    Boolean(request.seoTopicIds?.length);

  if (!hasExplicitScope) {
    warnings.push("graph_expansion_skipped_no_entity_scope");
    return {
      enabled: true,
      queried: false,
      evaluationMode: evaluationMode || adminPilot,
      scopeEntityIds: [],
      provenance: [],
      bonusesBySourceId: {},
      warnings,
    };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { traverseKnowledgeGraph } = await import(
      "@/features/knowledge-graph/services/knowledge-graph-query.service"
    );

    const allowedRels = resolveAllowedRelationshipsForExpansion({
      consumer: request.consumer,
      intent,
    });

    const sourcePairs = [
      ...(request.productIds ?? []).map((id) => ({ sourceType: "Product", sourceId: id })),
      ...(request.seoTopicIds ?? []).map((id) => ({ sourceType: "SeoTopic", sourceId: id })),
      ...(request.knowledgeEntryIds ?? []).map((id) => ({
        sourceType: "KnowledgeBaseEntry",
        sourceId: id,
      })),
    ];

    const roots = selectRoots(sourcePairs, request.consumer);
    const baselineSourceKeys = new Set(sourcePairs.map((p) => `${p.sourceType}:${p.sourceId}`));

    const rawPaths: RawGraphPath[] = [];
    const depth = Math.min(2, Math.max(1, options?.depth ?? 1));
    // Prefer depth 1 unless technique/manufacturing needs 2
    const effectiveDepth =
      intent === "TECHNIQUE" || intent === "MANUFACTURING_CAPABILITY" ? depth : Math.min(depth, 1);

    for (const root of roots) {
      const entity = await prisma.knowledgeGraphEntity.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: root.sourceType,
            sourceId: root.sourceId,
          },
        },
      });
      if (!entity || entity.status !== "ACTIVE") continue;
      if (entity.visibility === "CONFIDENTIAL" && maxVisibility !== "CONFIDENTIAL") continue;
      if (entity.visibility === "INTERNAL" && maxVisibility === "PUBLIC") continue;

      const neighbours = await traverseKnowledgeGraph({
        entityId: entity.id,
        depth: effectiveDepth,
        maxVisibility,
        relationshipTypes: allowedRels,
      });

      for (const path of neighbours.paths ?? []) {
        const edges = neighbours.edges.filter((e) => path.relationshipIds.includes(e.id));
        if (!edges.length) continue;
        const targetNode = neighbours.nodes.find(
          (n) => n.id === path.entityIds[path.entityIds.length - 1]
        );
        if (!targetNode) continue;

        const matchedOn = edges.map((e) => {
          const from = neighbours.nodes.find((n) => n.id === e.fromEntityId);
          const to = neighbours.nodes.find((n) => n.id === e.toEntityId);
          return `graph:${from?.entityType ?? "?"}→${e.relationshipType}→${to?.entityType ?? "?"}`;
        });

        rawPaths.push({
          rootEntityId: entity.id,
          pathEntityIds: path.entityIds,
          relationshipIds: path.relationshipIds,
          relationshipTypes: edges.map((e) => e.relationshipType),
          edgeOrigins: edges.map((e) => e.origin),
          evidenceUrls: edges.map((e) => e.evidenceUrl ?? null),
          confidences: edges.map((e) => e.confidence ?? null),
          fromTypes: edges.map(
            (e) =>
              neighbours.nodes.find((n) => n.id === e.fromEntityId)?.entityType ?? "?"
          ),
          toTypes: edges.map(
            (e) => neighbours.nodes.find((n) => n.id === e.toEntityId)?.entityType ?? "?"
          ),
          endpointSourceType: targetNode.sourceType,
          endpointSourceId: targetNode.sourceId,
          endpointEntityType: targetNode.entityType,
          endpointVisibility: targetNode.visibility,
          matchedOn,
          hop: path.entityIds.length - 1,
        });
      }
    }

    const pruned = pruneGraphPaths({
      paths: rawPaths,
      consumer: request.consumer,
      intent,
      maxVisibility,
      baselineSourceKeys,
    });

    const budgets = getSourceBudgets(request.consumer);
    const budgeted = applySourceScopeBudgets({
      paths: pruned.accepted,
      consumer: request.consumer,
      budgets: budgets as Record<string, number>,
    });

    const rejectCounts = new Map<PruneReason, number>();
    for (const r of pruned.rejected) {
      rejectCounts.set(r.reason, (rejectCounts.get(r.reason) ?? 0) + 1);
    }

    const provenance: GraphExpansionProvenance[] = [];
    const scopeEntityIds: string[] = [];
    const bonusesBySourceId: Record<string, number> = {};

    for (const path of budgeted.accepted) {
      if (!scopeEntityIds.includes(path.pathEntityIds[path.pathEntityIds.length - 1]!)) {
        scopeEntityIds.push(path.pathEntityIds[path.pathEntityIds.length - 1]!);
      }
      // also include intermediate concept nodes that are not facts
      for (const id of path.pathEntityIds.slice(1)) {
        if (!scopeEntityIds.includes(id)) scopeEntityIds.push(id);
      }

      const hop = path.hop;
      let bonus = hop <= 1 ? GRAPH_SCORING_BONUSES.oneHop : GRAPH_SCORING_BONUSES.twoHop;
      if (path.tier === "TIER_1") bonus += 4;
      if (path.tier === "TIER_2") bonus += 2;

      const key = `${path.endpointSourceType}:${path.endpointSourceId}`;
      bonusesBySourceId[key] = Math.max(bonusesBySourceId[key] ?? 0, Math.min(bonus, 20));

      provenance.push({
        rootEntityId: path.rootEntityId,
        pathEntityIds: path.pathEntityIds,
        relationshipIds: path.relationshipIds,
        relationshipTypes: path.relationshipTypes,
        edgeOrigins: path.edgeOrigins,
        evidenceUrls: path.evidenceUrls,
        visibility: path.endpointVisibility as KnowledgeBaseVisibility,
        authorityRank: path.tier === "TIER_1" ? 80 : path.tier === "TIER_2" ? 60 : 40,
        matchedOn: path.matchedOn,
      });
    }

    if (budgeted.droppedByBudget.length) {
      warnings.push(`graph_scope_budget_trimmed:${budgeted.droppedByBudget.length}`);
    }

    return {
      enabled: true,
      queried: true,
      evaluationMode: evaluationMode || adminPilot,
      scopeEntityIds,
      provenance,
      bonusesBySourceId,
      warnings,
      diagnostics: {
        policyVersion: GRAPH_PATH_POLICY_VERSION,
        intent,
        rootSelections: roots,
        rawPathCount: rawPaths.length,
        prunedPathCount: pruned.accepted.length,
        rejected: [...rejectCounts.entries()].map(([reason, count]) => ({ reason, count })),
        droppedByBudget: budgeted.droppedByBudget.length,
        proposedScopeCount: pruned.accepted.length,
        acceptedScopeCount: budgeted.accepted.length,
      },
    };
  } catch (err) {
    return {
      enabled: true,
      queried: false,
      evaluationMode: evaluationMode || adminPilot,
      scopeEntityIds: [],
      provenance: [],
      bonusesBySourceId: {},
      warnings: [
        ...warnings,
        `graph_expansion_failed:${err instanceof Error ? err.message : String(err)}`,
        "graph_fallback_to_baseline",
      ],
    };
  }
}

export function attachGraphProvenanceToFacts(
  facts: AiRetrievedFact[],
  expansion: GraphExpansionResult
): { facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[] } {
  if (!expansion.enabled || !expansion.queried) {
    return { facts, omitted: [] };
  }

  const pathHints = expansion.provenance.flatMap((p) => p.matchedOn).slice(0, 12);

  const next = facts.map((fact) => {
    const key = `${mapSourceType(fact.sourceType)}:${fact.sourceId}`;
    const bonus = expansion.bonusesBySourceId[key] ?? 0;
    // Graph bonus must not dominate — capped and only if fact already matched
    const applied =
      bonus > 0 && fact.relevanceScore > 0
        ? Math.min(bonus, 6)
        : bonus > 0
          ? Math.min(bonus, 3)
          : 0;
    const matchedOn = applied > 0 ? [...fact.matchedOn, ...pathHints.slice(0, 2)] : fact.matchedOn;
    return {
      ...fact,
      matchedOn: [...new Set(matchedOn)],
      relevanceScore: fact.relevanceScore + applied,
      warnings: applied
        ? [...fact.warnings, "graph_scope_enrichment_only"]
        : fact.warnings,
    };
  });

  return { facts: next, omitted: [] };
}

/**
 * Bound graph-added facts while preserving baseline facts first.
 */
export function applyGraphAddedFactBudget(input: {
  baselineFactIds: Set<string>;
  facts: AiRetrievedFact[];
  consumer: AiRetrievalRequest["consumer"];
}): {
  facts: AiRetrievedFact[];
  report: {
    proposed: number;
    accepted: number;
    droppedByBudget: number;
    droppedAsDuplicate: number;
    droppedByRelevance: number;
  };
} {
  const budget = getAddedFactBudget(input.consumer);
  const baseline = input.facts.filter((f) => input.baselineFactIds.has(f.id));
  const graphAdded = input.facts.filter((f) => !input.baselineFactIds.has(f.id));

  let droppedByBudget = 0;
  let droppedAsDuplicate = 0;
  let droppedByRelevance = 0;
  const acceptedAdded: AiRetrievedFact[] = [];
  const perType: Record<string, number> = {};
  const perEndpoint: Record<string, number> = {};
  const seenKeys = new Set(baseline.map((f) => `${f.sourceType}:${f.sourceId}`));

  const sorted = [...graphAdded].sort((a, b) => b.relevanceScore - a.relevanceScore);

  for (const fact of sorted) {
    const key = `${fact.sourceType}:${fact.sourceId}`;
    if (seenKeys.has(key)) {
      droppedAsDuplicate += 1;
      continue;
    }
    if (fact.relevanceScore < budget.minRelevance) {
      droppedByRelevance += 1;
      continue;
    }
    const typeCount = perType[fact.sourceType] ?? 0;
    if (typeCount >= budget.maxPerSourceType) {
      droppedByBudget += 1;
      continue;
    }
    const endpointCount = perEndpoint[fact.sourceId] ?? 0;
    if (endpointCount >= budget.maxPerEndpoint) {
      droppedByBudget += 1;
      continue;
    }
    if (acceptedAdded.length >= budget.maxTotal) {
      droppedByBudget += 1;
      continue;
    }
    seenKeys.add(key);
    perType[fact.sourceType] = typeCount + 1;
    perEndpoint[fact.sourceId] = endpointCount + 1;
    acceptedAdded.push(fact);
  }

  return {
    facts: [...baseline, ...acceptedAdded],
    report: {
      proposed: graphAdded.length,
      accepted: acceptedAdded.length,
      droppedByBudget,
      droppedAsDuplicate,
      droppedByRelevance,
    },
  };
}

export function mergeGraphScopesIntoRequest(
  request: AiRetrievalRequest,
  expansion: GraphExpansionResult,
  entities: Array<{ sourceType: string; sourceId: string; visibility: string }>
): AiRetrievalRequest {
  if (!expansion.enabled || !expansion.queried) return request;

  const budgets = getSourceBudgets(request.consumer);
  const counts: Record<string, number> = {};

  const productIds = new Set(request.productIds ?? []);
  const knowledgeEntryIds = new Set(request.knowledgeEntryIds ?? []);
  const mediaBundleIds = new Set(request.mediaBundleIds ?? []);
  const seoTopicIds = new Set(request.seoTopicIds ?? []);
  const entityIds = new Set(request.entityIds ?? []);

  const tryAdd = (budgetKey: string, fn: () => void) => {
    const max = (budgets as Record<string, number>)[budgetKey] ?? 2;
    counts[budgetKey] = counts[budgetKey] ?? 0;
    if (counts[budgetKey]! >= max) return;
    fn();
    counts[budgetKey]! += 1;
  };

  for (const ent of entities) {
    if (ent.visibility === "CONFIDENTIAL") continue;
    // Never add ProductCategory scopes by default (budget 0)
    if (ent.sourceType === "Category" || ent.sourceType === "ProductCategory") continue;

    const budgetKey = mapSourceTypeToBudgetKey(ent.sourceType);
    if (ent.sourceType === "Product" && !productIds.has(ent.sourceId)) {
      tryAdd(budgetKey, () => productIds.add(ent.sourceId));
    } else if (ent.sourceType === "KnowledgeBaseEntry" && !knowledgeEntryIds.has(ent.sourceId)) {
      tryAdd(budgetKey, () => knowledgeEntryIds.add(ent.sourceId));
    } else if (ent.sourceType === "MediaBundle" && !mediaBundleIds.has(ent.sourceId)) {
      tryAdd(budgetKey, () => mediaBundleIds.add(ent.sourceId));
    } else if (ent.sourceType === "SeoTopic" && !seoTopicIds.has(ent.sourceId)) {
      tryAdd(budgetKey, () => seoTopicIds.add(ent.sourceId));
    } else if (
      (ent.sourceType === "BlogPost" ||
        ent.sourceType === "ManufacturingAsset" ||
        ent.sourceType === "PrintMethod") &&
      !entityIds.has(ent.sourceId)
    ) {
      tryAdd(budgetKey, () => entityIds.add(ent.sourceId));
    }
  }

  return {
    ...request,
    productIds: [...productIds],
    knowledgeEntryIds: [...knowledgeEntryIds],
    mediaBundleIds: [...mediaBundleIds],
    seoTopicIds: [...seoTopicIds],
    entityIds: [...entityIds],
  };
}

export function estimateContextGrowthPercent(baselineChars: number, expandedChars: number): number {
  if (baselineChars <= 0) return expandedChars > 0 ? 100 : 0;
  return ((expandedChars - baselineChars) / baselineChars) * 100;
}

export function getContextGrowthCaps() {
  return GRAPH_CONTEXT_GROWTH;
}

function mapSourceType(sourceType: string): string {
  switch (sourceType) {
    case "PRODUCT":
      return "Product";
    case "KNOWLEDGE":
    case "KNOWLEDGE_ENTRY":
    case "KNOWLEDGE_BASE":
      return "KnowledgeBaseEntry";
    case "SEO_TOPIC":
      return "SeoTopic";
    case "MEDIA_BUNDLE":
      return "MediaBundle";
    default:
      return sourceType;
  }
}
