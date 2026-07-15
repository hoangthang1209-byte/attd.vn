/**
 * Deterministic graph path pruning (Sprint 12.3).
 */

import type { KnowledgeGraphRelationshipType } from "@prisma/client";
import {
  getRelationshipValueClass,
  type GraphQueryIntent,
} from "@/features/knowledge-graph/evaluation/graph-expansion-path-policy";
import {
  resolveRelationQualityTier,
  tierMayExpandSourceFacts,
  type RelationQualityTier,
} from "@/features/knowledge-graph/evaluation/graph-expansion-budgets";
import type { AiRetrievalConsumer } from "@/features/ai-retrieval/ai-retrieval-types";

export type RawGraphPath = {
  rootEntityId: string;
  pathEntityIds: string[];
  relationshipIds: string[];
  relationshipTypes: string[];
  edgeOrigins: string[];
  evidenceUrls: Array<string | null>;
  confidences: Array<number | null>;
  fromTypes: string[];
  toTypes: string[];
  endpointSourceType: string;
  endpointSourceId: string;
  endpointEntityType: string;
  endpointVisibility: string;
  matchedOn: string[];
  hop: number;
};

export type PruneReason =
  | "noisy_taxonomy"
  | "related_to_chain"
  | "category_loop"
  | "duplicate_endpoint"
  | "visibility_exceeds"
  | "low_tier_no_fact_value"
  | "second_hop_taxonomy"
  | "unavailable_adapter"
  | "cross_intent_noise"
  | "no_new_scope_value";

export type PrunedPathResult = {
  accepted: Array<RawGraphPath & { tier: RelationQualityTier }>;
  rejected: Array<{ path: RawGraphPath; reason: PruneReason; tier: RelationQualityTier }>;
};

const ADAPTER_SOURCE_TYPES = new Set([
  "Product",
  "KnowledgeBaseEntry",
  "MediaBundle",
  "SeoTopic",
  "BlogPost",
  "ManufacturingAsset",
  "PrintMethod",
  "MediaVocabularyTerm", // concept scope only — no fact adapter, but may be useful
]);

export function pruneGraphPaths(input: {
  paths: RawGraphPath[];
  consumer: AiRetrievalConsumer;
  intent: GraphQueryIntent;
  maxVisibility: string;
  baselineSourceKeys: Set<string>;
}): PrunedPathResult {
  const accepted: PrunedPathResult["accepted"] = [];
  const rejected: PrunedPathResult["rejected"] = [];
  const seenEndpoints = new Set<string>();

  for (const path of input.paths) {
    const lastRel = path.relationshipTypes[path.relationshipTypes.length - 1] as
      | KnowledgeGraphRelationshipType
      | undefined;
    const tier = resolveRelationQualityTier({
      origin: path.edgeOrigins[path.edgeOrigins.length - 1] ?? "CURATED",
      relationshipType: lastRel ?? "RELATED_TO",
      evidenceUrl: path.evidenceUrls[path.evidenceUrls.length - 1],
      confidence: path.confidences[path.confidences.length - 1],
    });

    const reject = (reason: PruneReason) => {
      rejected.push({ path, reason, tier });
    };

    if (!lastRel) {
      reject("no_new_scope_value");
      continue;
    }

    const valueClass = getRelationshipValueClass(lastRel);
    if (valueClass === "NOISY_BY_DEFAULT") {
      reject("noisy_taxonomy");
      continue;
    }
    if (lastRel === "RELATED_TO") {
      reject("related_to_chain");
      continue;
    }

    // Category↔Product loops
    const typeSeq = [...path.fromTypes, path.endpointEntityType];
    if (
      typeSeq.includes("PRODUCT_CATEGORY") &&
      typeSeq.filter((t) => t === "PRODUCT").length >= 1 &&
      path.hop >= 2
    ) {
      reject("category_loop");
      continue;
    }

    if (path.hop >= 2 && (lastRel === "BELONGS_TO" || lastRel === "IS_A")) {
      reject("second_hop_taxonomy");
      continue;
    }

    if (input.maxVisibility === "PUBLIC" && path.endpointVisibility !== "PUBLIC") {
      reject("visibility_exceeds");
      continue;
    }
    if (
      input.maxVisibility === "INTERNAL" &&
      path.endpointVisibility === "CONFIDENTIAL"
    ) {
      reject("visibility_exceeds");
      continue;
    }

    const endpointKey = `${path.endpointSourceType}:${path.endpointSourceId}`;
    if (seenEndpoints.has(endpointKey) || input.baselineSourceKeys.has(endpointKey)) {
      reject("duplicate_endpoint");
      continue;
    }

    if (!ADAPTER_SOURCE_TYPES.has(path.endpointSourceType)) {
      reject("unavailable_adapter");
      continue;
    }

    // Cross-intent: technique queries should not keep use-case/audience/industry endpoints
    if (
      input.intent === "TECHNIQUE" &&
      ["USE_CASE", "AUDIENCE", "INDUSTRY"].includes(path.endpointEntityType)
    ) {
      reject("cross_intent_noise");
      continue;
    }

    // Policy endpoints only for commercial/OEM intents
    if (
      path.endpointEntityType === "POLICY" &&
      input.intent !== "OEM_PRIVATE_LABEL" &&
      input.intent !== "PRODUCT_COMMERCIAL" &&
      input.intent !== "MANUFACTURING_CAPABILITY"
    ) {
      reject("cross_intent_noise");
      continue;
    }

    if (!tierMayExpandSourceFacts(tier, input.consumer) && path.endpointSourceType !== "MediaVocabularyTerm") {
      // TIER_4 / low tier: allow concept hints only for vocab; skip others
      if (path.endpointEntityType === "PRODUCT_CATEGORY") {
        reject("low_tier_no_fact_value");
        continue;
      }
      if (tier === "TIER_4") {
        reject("low_tier_no_fact_value");
        continue;
      }
    }

    // Blog value for public consumers: endpoint blog is kept; unpublished filtered at adapter
    seenEndpoints.add(endpointKey);
    accepted.push({ ...path, tier });
  }

  // Prefer one-hop, then higher tier
  accepted.sort((a, b) => {
    const tierRank = { TIER_1: 0, TIER_2: 1, TIER_3: 2, TIER_4: 3 };
    return a.hop - b.hop || tierRank[a.tier] - tierRank[b.tier];
  });

  return { accepted, rejected };
}

export function applySourceScopeBudgets(input: {
  paths: Array<RawGraphPath & { tier: RelationQualityTier }>;
  consumer: AiRetrievalConsumer;
  budgets: Partial<Record<string, number>>;
}): {
  accepted: Array<RawGraphPath & { tier: RelationQualityTier }>;
  droppedByBudget: Array<{ path: RawGraphPath; budgetKey: string }>;
} {
  const counts: Record<string, number> = {};
  const accepted: Array<RawGraphPath & { tier: RelationQualityTier }> = [];
  const droppedByBudget: Array<{ path: RawGraphPath; budgetKey: string }> = [];

  for (const path of input.paths) {
    const key =
      path.endpointSourceType === "Category" ? "ProductCategory" : path.endpointSourceType;
    const budgetKey = key in input.budgets ? key : "Other";
    const max = input.budgets[budgetKey] ?? input.budgets.Other ?? 2;
    counts[budgetKey] = counts[budgetKey] ?? 0;
    if (counts[budgetKey]! >= max) {
      droppedByBudget.push({ path, budgetKey });
      continue;
    }
    counts[budgetKey]! += 1;
    accepted.push(path);
  }

  return { accepted, droppedByBudget };
}
