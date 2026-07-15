/**
 * Knowledge Graph expansion source for AI Retrieval.
 *
 * Feature flags (all default false):
 * - KNOWLEDGE_GRAPH_EXPANSION_ENABLED (global kill switch)
 * - KNOWLEDGE_GRAPH_EXPANSION_SEO_TOPIC_PLANNER
 * - KNOWLEDGE_GRAPH_EXPANSION_SEO_BRIEF
 * - KNOWLEDGE_GRAPH_EXPANSION_SEO_CONTENT
 *
 * Evaluation override: enabledForEvaluation — admin/test only, never via public request body.
 * Graph nodes enrich scope only. Authoritative facts never come from graph metadata.
 */

import type { KnowledgeBaseVisibility } from "@prisma/client";
import type {
  AiRetrievedFact,
  AiRetrievalRequest,
  AiRetrievalPolicy,
  AiRetrievalOmittedBucket,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { isRelationshipAllowedForConsumer } from "@/features/ai-retrieval/knowledge-graph-expansion-policy";
import { GRAPH_SCORING_BONUSES } from "@/features/knowledge-graph/knowledge-graph-types";
import { resolveEffectiveMaxVisibility } from "@/features/ai-retrieval/ai-retrieval-policy";
import {
  isKnowledgeGraphExpansionEnabledForConsumer,
  isKnowledgeGraphExpansionGlobalEnabled,
} from "@/features/knowledge-graph/evaluation/graph-expansion-flags";

/** Global flag only — production consumers use isKnowledgeGraphExpansionEnabledForConsumer. */
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

export type GraphExpansionResult = {
  enabled: boolean;
  queried: boolean;
  evaluationMode: boolean;
  scopeEntityIds: string[];
  provenance: GraphExpansionProvenance[];
  /** Bounded relevance bonuses keyed by authoritative source id — never replaces fact scores. */
  bonusesBySourceId: Record<string, number>;
  warnings: string[];
};

export type GraphExpansionOptions = {
  enabledForEvaluation?: boolean;
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

/**
 * Expand retrieval scope via the Knowledge Graph.
 * Returns empty / no-op when production flags are off (unless evaluation override).
 */
export async function expandRetrievalScopeViaKnowledgeGraph(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy,
  options?: GraphExpansionOptions
): Promise<GraphExpansionResult> {
  const evaluationMode = Boolean(options?.enabledForEvaluation);
  const enabled = isKnowledgeGraphExpansionEnabledForConsumer(request.consumer, {
    enabledForEvaluation: evaluationMode,
  });

  if (!enabled) {
    return DISABLED_RESULT;
  }

  const warnings: string[] = [];
  if (evaluationMode) {
    warnings.push("graph_expansion_evaluation_mode");
  }

  const maxVisibility = resolveEffectiveMaxVisibility(policy, request.purpose);

  const hasExplicitScope =
    Boolean(request.productIds?.length) ||
    Boolean(request.knowledgeEntryIds?.length) ||
    Boolean(request.seoTopicIds?.length);

  if (!hasExplicitScope) {
    warnings.push("graph_expansion_skipped_no_entity_scope");
    return {
      enabled: true,
      queried: false,
      evaluationMode,
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

    const allowedRels = (
      await import("@/features/ai-retrieval/knowledge-graph-expansion-policy")
    ).getAllowedGraphRelationshipsForConsumer(request.consumer);

    const sourcePairs: Array<{ sourceType: string; sourceId: string }> = [
      ...(request.productIds ?? []).map((id) => ({ sourceType: "Product", sourceId: id })),
      ...(request.knowledgeEntryIds ?? []).map((id) => ({
        sourceType: "KnowledgeBaseEntry",
        sourceId: id,
      })),
      ...(request.seoTopicIds ?? []).map((id) => ({ sourceType: "SeoTopic", sourceId: id })),
    ];

    const provenance: GraphExpansionProvenance[] = [];
    const scopeEntityIds: string[] = [];
    const bonusesBySourceId: Record<string, number> = {};
    const depth = Math.min(2, Math.max(1, options?.depth ?? 1));
    const maxNodes = options?.maxNodes ?? 100;
    const maxEdges = options?.maxEdges ?? 150;

    for (const pair of sourcePairs.slice(0, 10)) {
      const entity = await prisma.knowledgeGraphEntity.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: pair.sourceType,
            sourceId: pair.sourceId,
          },
        },
      });
      if (!entity || entity.status !== "ACTIVE") continue;
      if (entity.visibility === "CONFIDENTIAL" && maxVisibility !== "CONFIDENTIAL") continue;
      if (entity.visibility === "INTERNAL" && maxVisibility === "PUBLIC") continue;

      const neighbours = await traverseKnowledgeGraph({
        entityId: entity.id,
        depth,
        maxVisibility,
        relationshipTypes: allowedRels.filter((t) =>
          isRelationshipAllowedForConsumer(request.consumer, t)
        ),
      });

      for (const node of neighbours.nodes) {
        if (scopeEntityIds.length >= maxNodes) {
          warnings.push("graph_max_nodes_reached");
          break;
        }
        if (!scopeEntityIds.includes(node.id)) scopeEntityIds.push(node.id);
      }

      let edgeBudget = maxEdges;
      for (const path of neighbours.paths ?? []) {
        if (edgeBudget <= 0) {
          warnings.push("graph_max_edges_reached");
          break;
        }
        const edges = neighbours.edges.filter((e) => path.relationshipIds.includes(e.id));
        edgeBudget -= edges.length;
        const hop = path.entityIds.length - 1;
        let bonus = hop <= 1 ? GRAPH_SCORING_BONUSES.oneHop : GRAPH_SCORING_BONUSES.twoHop;
        for (const edge of edges) {
          if (edge.origin === "CURATED" && edge.evidenceUrl) {
            bonus += GRAPH_SCORING_BONUSES.evidenceBackedCurated;
          }
          if (edge.origin === "SYSTEM_DERIVED") {
            bonus += GRAPH_SCORING_BONUSES.systemDerivedAuthoritative;
          }
        }

        const targetNode = neighbours.nodes.find(
          (n) => n.id === path.entityIds[path.entityIds.length - 1]
        );
        if (targetNode) {
          const key = `${targetNode.sourceType}:${targetNode.sourceId}`;
          bonusesBySourceId[key] = Math.max(bonusesBySourceId[key] ?? 0, Math.min(bonus, 20));
        }

        const matchedOn = edges.map(
          (e) =>
            `graph:${neighbours.nodes.find((n) => n.id === e.fromEntityId)?.entityType ?? "?"}` +
            `→${e.relationshipType}→` +
            `${neighbours.nodes.find((n) => n.id === e.toEntityId)?.entityType ?? "?"}`
        );

        provenance.push({
          rootEntityId: entity.id,
          pathEntityIds: path.entityIds,
          relationshipIds: path.relationshipIds,
          relationshipTypes: edges.map((e) => e.relationshipType),
          edgeOrigins: edges.map((e) => e.origin),
          evidenceUrls: edges.map((e) => e.evidenceUrl ?? null),
          visibility: entity.visibility,
          authorityRank: Math.max(...edges.map((e) => e.authorityRank), 0),
          matchedOn,
        });
      }
    }

    return {
      enabled: true,
      queried: true,
      evaluationMode,
      scopeEntityIds,
      provenance,
      bonusesBySourceId,
      warnings,
    };
  } catch (err) {
    return {
      enabled: true,
      queried: false,
      evaluationMode,
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

/**
 * Apply graph provenance onto matchedOn of already-retrieved facts.
 * Does not invent business facts from graph nodes.
 */
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
    const matchedOn = bonus > 0 ? [...fact.matchedOn, ...pathHints.slice(0, 3)] : fact.matchedOn;
    return {
      ...fact,
      matchedOn: [...new Set(matchedOn)],
      relevanceScore: fact.relevanceScore + Math.min(bonus, fact.relevanceScore > 0 ? 8 : 0),
      warnings: bonus
        ? [...fact.warnings, "graph_scope_enrichment_only"]
        : fact.warnings,
    };
  });

  return { facts: next, omitted: [] };
}

/**
 * Merge graph-discovered source scopes into the request for expanded fact retrieval.
 */
export function mergeGraphScopesIntoRequest(
  request: AiRetrievalRequest,
  expansion: GraphExpansionResult,
  entities: Array<{ sourceType: string; sourceId: string; visibility: string }>
): AiRetrievalRequest {
  if (!expansion.enabled || !expansion.queried) return request;

  const productIds = new Set(request.productIds ?? []);
  const knowledgeEntryIds = new Set(request.knowledgeEntryIds ?? []);
  const mediaBundleIds = new Set(request.mediaBundleIds ?? []);
  const seoTopicIds = new Set(request.seoTopicIds ?? []);
  const entityIds = new Set(request.entityIds ?? []);

  let added = 0;
  const maxAdded = 12;
  for (const ent of entities) {
    if (added >= maxAdded) break;
    if (ent.visibility === "CONFIDENTIAL") continue;
    if (ent.sourceType === "Product" && !productIds.has(ent.sourceId)) {
      productIds.add(ent.sourceId);
      added += 1;
    } else if (ent.sourceType === "KnowledgeBaseEntry" && !knowledgeEntryIds.has(ent.sourceId)) {
      knowledgeEntryIds.add(ent.sourceId);
      added += 1;
    } else if (ent.sourceType === "MediaBundle" && !mediaBundleIds.has(ent.sourceId)) {
      mediaBundleIds.add(ent.sourceId);
      added += 1;
    } else if (ent.sourceType === "SeoTopic" && !seoTopicIds.has(ent.sourceId)) {
      seoTopicIds.add(ent.sourceId);
      added += 1;
    } else if (ent.sourceType === "BlogPost" && !entityIds.has(ent.sourceId)) {
      entityIds.add(ent.sourceId);
      added += 1;
    } else if (ent.sourceType === "ManufacturingAsset" && !entityIds.has(ent.sourceId)) {
      entityIds.add(ent.sourceId);
      added += 1;
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
