/**
 * Relationship value classification + consumer/intent expansion policies (Sprint 12.3).
 * Path version is reported in diagnostics; does not enable production expansion.
 */

import type { KnowledgeGraphRelationshipType } from "@prisma/client";
import type { AiRetrievalConsumer } from "@/features/ai-retrieval/ai-retrieval-types";

export const GRAPH_PATH_POLICY_VERSION = "12.4.0";

export type RelationshipValueClass =
  | "CORE"
  | "SUPPORTING"
  | "CONTEXTUAL"
  | "NOISY_BY_DEFAULT"
  | "DISABLED";

export const RELATIONSHIP_VALUE_CLASS: Record<
  KnowledgeGraphRelationshipType,
  RelationshipValueClass
> = {
  SUITABLE_FOR: "CORE",
  TARGETS: "CORE",
  HAS_CAPABILITY: "CORE",
  SUPPORTS: "CORE",
  COMPATIBLE_WITH: "CORE",
  NOT_COMPATIBLE_WITH: "CORE",
  HAS_MEDIA: "CORE",
  HAS_CASE_STUDY: "CORE",
  EVIDENCED_BY: "CORE",
  LINKS_TO: "CORE",
  MADE_FROM: "SUPPORTING",
  APPLIES_TO: "SUPPORTING",
  HAS_POLICY: "SUPPORTING",
  HAS_SEO_TOPIC: "SUPPORTING",
  DOCUMENTED_BY: "SUPPORTING",
  FEATURED_IN: "CONTEXTUAL",
  RELATED_TO: "CONTEXTUAL",
  BELONGS_TO: "NOISY_BY_DEFAULT",
  IS_A: "NOISY_BY_DEFAULT",
  PART_OF: "NOISY_BY_DEFAULT",
  USES: "SUPPORTING",
  USED_IN: "CONTEXTUAL",
  REQUIRES: "DISABLED",
  ALTERNATIVE_TO: "CONTEXTUAL",
};

export type GraphQueryIntent =
  | "PRODUCT_COMMERCIAL"
  | "MANUFACTURING_CAPABILITY"
  | "TECHNIQUE"
  | "OEM_PRIVATE_LABEL"
  | "CORPORATE_GIFT"
  | "INDUSTRY_UNIFORM"
  | "GENERAL";

/** Consumer allowlists — BELONGS_TO removed from normal expansion (root discovery only). */
export const CONSUMER_EXPANSION_RELATIONSHIPS: Partial<
  Record<AiRetrievalConsumer, KnowledgeGraphRelationshipType[]>
> = {
  SEO_TOPIC_PLANNER: [
    "SUITABLE_FOR",
    "TARGETS",
    "HAS_CAPABILITY",
    "APPLIES_TO",
    "HAS_CASE_STUDY",
    "HAS_SEO_TOPIC",
    "LINKS_TO",
    "FEATURED_IN",
    "HAS_MEDIA",
    "SUPPORTS",
  ],
  SEO_BRIEF: [
    "HAS_CAPABILITY",
    "SUPPORTS",
    "MADE_FROM",
    "COMPATIBLE_WITH",
    "NOT_COMPATIBLE_WITH",
    "HAS_POLICY",
    "HAS_MEDIA",
    "EVIDENCED_BY",
    "LINKS_TO",
    "SUITABLE_FOR",
    "TARGETS",
    "FEATURED_IN",
    "DOCUMENTED_BY",
  ],
  SEO_CONTENT: [
    // Kept for future; consumer remains disabled via flags.
    "SUPPORTS",
    "MADE_FROM",
    "COMPATIBLE_WITH",
    "HAS_MEDIA",
    "EVIDENCED_BY",
  ],
  ADMIN: [
    "SUITABLE_FOR",
    "TARGETS",
    "HAS_CAPABILITY",
    "SUPPORTS",
    "COMPATIBLE_WITH",
    "NOT_COMPATIBLE_WITH",
    "HAS_MEDIA",
    "HAS_CASE_STUDY",
    "EVIDENCED_BY",
    "LINKS_TO",
    "MADE_FROM",
    "APPLIES_TO",
    "HAS_POLICY",
    "HAS_SEO_TOPIC",
    "DOCUMENTED_BY",
    "FEATURED_IN",
  ],
};

/** Intent may remove relationship families that caused measured noise. */
export const INTENT_EXCLUDED_RELATIONSHIPS: Partial<
  Record<GraphQueryIntent, KnowledgeGraphRelationshipType[]>
> = {
  TECHNIQUE: ["SUITABLE_FOR", "TARGETS", "HAS_POLICY", "DOCUMENTED_BY", "FEATURED_IN"],
  MANUFACTURING_CAPABILITY: ["TARGETS", "FEATURED_IN"],
  CORPORATE_GIFT: ["HAS_POLICY", "SUPPORTS", "COMPATIBLE_WITH"],
  INDUSTRY_UNIFORM: ["HAS_POLICY", "SUPPORTS", "FEATURED_IN"],
  OEM_PRIVATE_LABEL: ["SUPPORTS", "FEATURED_IN"],
  PRODUCT_COMMERCIAL: ["SUPPORTS", "COMPATIBLE_WITH"],
  GENERAL: ["HAS_POLICY", "SUPPORTS", "FEATURED_IN"],
};

export const INTENT_PREFERRED_RELATIONSHIPS: Partial<
  Record<GraphQueryIntent, KnowledgeGraphRelationshipType[]>
> = {
  TECHNIQUE: ["SUPPORTS", "COMPATIBLE_WITH", "HAS_CAPABILITY", "EVIDENCED_BY"],
  MANUFACTURING_CAPABILITY: ["HAS_CAPABILITY", "SUPPORTS", "EVIDENCED_BY", "DOCUMENTED_BY"],
  OEM_PRIVATE_LABEL: ["HAS_CAPABILITY", "DOCUMENTED_BY", "TARGETS", "HAS_POLICY"],
  CORPORATE_GIFT: ["SUITABLE_FOR", "TARGETS", "FEATURED_IN", "LINKS_TO"],
  INDUSTRY_UNIFORM: ["TARGETS", "SUITABLE_FOR", "FEATURED_IN", "HAS_SEO_TOPIC", "LINKS_TO"],
  PRODUCT_COMMERCIAL: ["SUITABLE_FOR", "TARGETS", "HAS_CAPABILITY", "FEATURED_IN", "DOCUMENTED_BY"],
  GENERAL: ["SUITABLE_FOR", "TARGETS", "HAS_CAPABILITY"],
};

export function getRelationshipValueClass(
  type: KnowledgeGraphRelationshipType
): RelationshipValueClass {
  return RELATIONSHIP_VALUE_CLASS[type] ?? "CONTEXTUAL";
}

export function resolveAllowedRelationshipsForExpansion(input: {
  consumer: AiRetrievalConsumer;
  intent: GraphQueryIntent;
}): KnowledgeGraphRelationshipType[] {
  const base = CONSUMER_EXPANSION_RELATIONSHIPS[input.consumer] ?? [];
  const excluded = new Set(INTENT_EXCLUDED_RELATIONSHIPS[input.intent] ?? []);
  return base.filter((t) => !excluded.has(t) && getRelationshipValueClass(t) !== "DISABLED");
}

/** Resolve deterministic query intent without LLM. */
export function resolveGraphQueryIntent(input: {
  query: string;
  consumer: AiRetrievalConsumer;
  searchIntent?: string | null;
}): GraphQueryIntent {
  const q = input.query.toLowerCase();

  if (
    /\bin\s*lụa\b|\bin\s*lua\b|screen\s*print|in\s*lụa|dtg|dtf|thêu|embroidery/.test(q)
  ) {
    return "TECHNIQUE";
  }
  if (/oem|private\s*label|private-label/.test(q)) {
    return "OEM_PRIVATE_LABEL";
  }
  if (/qu[àa]\s*t[ặa]ng|gift|merchandise|combo/.test(q)) {
    return "CORPORATE_GIFT";
  }
  if (/ng[âa]n\s*h[àa]ng|bank|industry|ngành/.test(q) && /đồng\s*phục|dong\s*phuc|uniform/.test(q)) {
    return "INDUSTRY_UNIFORM";
  }
  if (/xưởng|xuong|số\s*lượng\s*lớn|so\s*luong\s*lon|bulk|may\s*áo|factory|sản\s*xuất/.test(q)) {
    return "MANUFACTURING_CAPABILITY";
  }
  if (/đồng\s*phục|dong\s*phuc|polo|áo\s*thun|commercial|b2b/.test(q)) {
    return "PRODUCT_COMMERCIAL";
  }
  if (input.searchIntent === "COMMERCIAL" || input.searchIntent === "TRANSACTIONAL") {
    return "PRODUCT_COMMERCIAL";
  }
  return "GENERAL";
}

export function maxRootsForConsumer(consumer: AiRetrievalConsumer): number {
  if (consumer === "SEO_TOPIC_PLANNER") return 4;
  if (consumer === "SEO_BRIEF") return 3;
  if (consumer === "ADMIN") return 6;
  return 3;
}
