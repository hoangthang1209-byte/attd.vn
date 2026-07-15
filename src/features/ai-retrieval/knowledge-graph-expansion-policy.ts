import type { KnowledgeGraphRelationshipType } from "@prisma/client";
import type { AiRetrievalConsumer } from "@/features/ai-retrieval/ai-retrieval-types";

/** Safe allowlisted relationship types per Retrieval consumer. */
export const KNOWLEDGE_GRAPH_EXPANSION_POLICY: Partial<
  Record<AiRetrievalConsumer, KnowledgeGraphRelationshipType[]>
> = {
  SEO_CONTENT: [
    "BELONGS_TO",
    "MADE_FROM",
    "COMPATIBLE_WITH",
    "SUPPORTS",
    "APPLIES_TO",
    "TARGETS",
    "SUITABLE_FOR",
    "HAS_CAPABILITY",
    "HAS_POLICY",
    "HAS_MEDIA",
    "HAS_CASE_STUDY",
    "HAS_SEO_TOPIC",
    "LINKS_TO",
  ],
  SEO_BRIEF: [
    "BELONGS_TO",
    "MADE_FROM",
    "COMPATIBLE_WITH",
    "SUPPORTS",
    "APPLIES_TO",
    "TARGETS",
    "SUITABLE_FOR",
    "HAS_CAPABILITY",
    "HAS_POLICY",
    "HAS_MEDIA",
    "HAS_CASE_STUDY",
    "HAS_SEO_TOPIC",
    "LINKS_TO",
  ],
  SEO_TOPIC_PLANNER: [
    "BELONGS_TO",
    "HAS_MEDIA",
    "HAS_SEO_TOPIC",
    "LINKS_TO",
    "RELATED_TO",
  ],
  ADMIN: [
    "BELONGS_TO",
    "MADE_FROM",
    "COMPATIBLE_WITH",
    "SUPPORTS",
    "APPLIES_TO",
    "TARGETS",
    "SUITABLE_FOR",
    "HAS_CAPABILITY",
    "HAS_POLICY",
    "HAS_MEDIA",
    "HAS_CASE_STUDY",
    "HAS_SEO_TOPIC",
    "LINKS_TO",
    "RELATED_TO",
    "DOCUMENTED_BY",
    "EVIDENCED_BY",
  ],
};

/** Relationship types that must never expand into public SEO paths. */
export const SEO_UNSAFE_RELATIONSHIP_TYPES: KnowledgeGraphRelationshipType[] = [
  "REQUIRES",
  "NOT_COMPATIBLE_WITH",
];

export function getAllowedGraphRelationshipsForConsumer(
  consumer: AiRetrievalConsumer
): KnowledgeGraphRelationshipType[] {
  return KNOWLEDGE_GRAPH_EXPANSION_POLICY[consumer] ?? [];
}

export function isRelationshipAllowedForConsumer(
  consumer: AiRetrievalConsumer,
  relationshipType: KnowledgeGraphRelationshipType
): boolean {
  if (
    (consumer === "SEO_CONTENT" ||
      consumer === "SEO_BRIEF" ||
      consumer === "SEO_TOPIC_PLANNER") &&
    SEO_UNSAFE_RELATIONSHIP_TYPES.includes(relationshipType)
  ) {
    return false;
  }
  const allowed = getAllowedGraphRelationshipsForConsumer(consumer);
  return allowed.includes(relationshipType);
}
