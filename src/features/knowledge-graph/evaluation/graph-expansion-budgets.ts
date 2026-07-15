/**
 * Relation quality tiers + expansion budgets (Sprint 12.3).
 */

import type { AiRetrievalConsumer } from "@/features/ai-retrieval/ai-retrieval-types";
import type { KnowledgeGraphRelationshipOrigin } from "@prisma/client";
import { getRelationshipValueClass } from "@/features/knowledge-graph/evaluation/graph-expansion-path-policy";
import type { KnowledgeGraphRelationshipType } from "@prisma/client";

export type RelationQualityTier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";

export function resolveRelationQualityTier(input: {
  origin: KnowledgeGraphRelationshipOrigin | string;
  relationshipType: KnowledgeGraphRelationshipType | string;
  evidenceUrl?: string | null;
  confidence?: number | null;
}): RelationQualityTier {
  const valueClass = getRelationshipValueClass(
    input.relationshipType as KnowledgeGraphRelationshipType
  );
  if (valueClass === "NOISY_BY_DEFAULT") return "TIER_4";

  if (input.origin === "SYSTEM_DERIVED") {
    return valueClass === "CORE" || valueClass === "SUPPORTING" ? "TIER_1" : "TIER_4";
  }
  if (input.origin === "CURATED") {
    if (input.evidenceUrl) return "TIER_1";
    if ((input.confidence ?? 0) >= 80) return "TIER_2";
    return "TIER_3";
  }
  if (input.origin === "IMPORTED") {
    if ((input.confidence ?? 100) >= 90) return "TIER_2";
    return "TIER_3";
  }
  return "TIER_3";
}

/** Only TIER_1/2 normally expand source facts; TIER_3 may in planner; TIER_4 discovery-only. */
export function tierMayExpandSourceFacts(
  tier: RelationQualityTier,
  consumer: AiRetrievalConsumer
): boolean {
  if (tier === "TIER_1" || tier === "TIER_2") return true;
  if (tier === "TIER_3" && consumer === "SEO_TOPIC_PLANNER") return true;
  if (tier === "TIER_3" && consumer === "ADMIN") return true;
  return false;
}

export type SourceTypeBudgetKey =
  | "Product"
  | "ProductCategory"
  | "ManufacturingAsset"
  | "MediaVocabularyTerm"
  | "BlogPost"
  | "MediaBundle"
  | "KnowledgeBaseEntry"
  | "SeoTopic"
  | "PrintMethod"
  | "Other";

export type ConsumerSourceBudgets = Partial<Record<SourceTypeBudgetKey, number>>;

export const GRAPH_SOURCE_BUDGETS: Record<string, ConsumerSourceBudgets> = {
  SEO_TOPIC_PLANNER: {
    Product: 5,
    ProductCategory: 0, // category scopes excluded from expansion by default
    ManufacturingAsset: 5,
    MediaVocabularyTerm: 8,
    BlogPost: 2,
    MediaBundle: 3,
    KnowledgeBaseEntry: 3,
    SeoTopic: 3,
    PrintMethod: 3,
    Other: 2,
  },
  SEO_BRIEF: {
    Product: 4,
    ProductCategory: 0,
    ManufacturingAsset: 4,
    MediaVocabularyTerm: 6,
    BlogPost: 2,
    MediaBundle: 3,
    KnowledgeBaseEntry: 5,
    SeoTopic: 2,
    PrintMethod: 4,
    Other: 2,
  },
  ADMIN: {
    Product: 8,
    ProductCategory: 2,
    ManufacturingAsset: 8,
    MediaVocabularyTerm: 12,
    BlogPost: 5,
    MediaBundle: 5,
    KnowledgeBaseEntry: 8,
    SeoTopic: 5,
    PrintMethod: 5,
    Other: 4,
  },
};

export const GRAPH_ADDED_FACT_BUDGETS = {
  SEO_TOPIC_PLANNER: { maxTotal: 12, maxPerSourceType: 4, maxPerEndpoint: 3, minRelevance: 8 },
  SEO_BRIEF: { maxTotal: 14, maxPerSourceType: 5, maxPerEndpoint: 3, minRelevance: 10 },
  ADMIN: { maxTotal: 20, maxPerSourceType: 6, maxPerEndpoint: 4, minRelevance: 5 },
} as const;

export const GRAPH_CONTEXT_GROWTH = {
  /** Soft/target cap used for PASS and pre-assembly allowance. */
  targetPercent: 30,
  /** Absolute hard ceiling before forced baseline fallback. */
  hardMaxPercent: 35,
} as const;

export function mapSourceTypeToBudgetKey(sourceType: string): SourceTypeBudgetKey {
  switch (sourceType) {
    case "Product":
      return "Product";
    case "Category":
    case "ProductCategory":
      return "ProductCategory";
    case "ManufacturingAsset":
      return "ManufacturingAsset";
    case "MediaVocabularyTerm":
      return "MediaVocabularyTerm";
    case "BlogPost":
      return "BlogPost";
    case "MediaBundle":
      return "MediaBundle";
    case "KnowledgeBaseEntry":
      return "KnowledgeBaseEntry";
    case "SeoTopic":
      return "SeoTopic";
    case "PrintMethod":
      return "PrintMethod";
    default:
      return "Other";
  }
}

export function getSourceBudgets(consumer: AiRetrievalConsumer): ConsumerSourceBudgets {
  return GRAPH_SOURCE_BUDGETS[consumer] ?? GRAPH_SOURCE_BUDGETS.SEO_BRIEF!;
}

export function getAddedFactBudget(consumer: AiRetrievalConsumer) {
  return (
    GRAPH_ADDED_FACT_BUDGETS[consumer as keyof typeof GRAPH_ADDED_FACT_BUDGETS] ??
    GRAPH_ADDED_FACT_BUDGETS.SEO_BRIEF
  );
}
