/**
 * Consumer relationship allowlists — sourced from Sprint 12.3 path policy.
 */

import type { KnowledgeGraphRelationshipType } from "@prisma/client";
import type { AiRetrievalConsumer } from "@/features/ai-retrieval/ai-retrieval-types";
import {
  CONSUMER_EXPANSION_RELATIONSHIPS,
  resolveGraphQueryIntent,
  resolveAllowedRelationshipsForExpansion,
} from "@/features/knowledge-graph/evaluation/graph-expansion-path-policy";

/** @deprecated Prefer resolveAllowedRelationshipsForExpansion with intent. */
export const KNOWLEDGE_GRAPH_EXPANSION_POLICY: Partial<
  Record<AiRetrievalConsumer, KnowledgeGraphRelationshipType[]>
> = CONSUMER_EXPANSION_RELATIONSHIPS;

/** Unsafe for public SEO output unless consumer is ADMIN / internal brief with policy need. */
export const SEO_UNSAFE_RELATIONSHIP_TYPES: KnowledgeGraphRelationshipType[] = ["REQUIRES"];

export function getAllowedGraphRelationshipsForConsumer(
  consumer: AiRetrievalConsumer,
  query = ""
): KnowledgeGraphRelationshipType[] {
  const intent = resolveGraphQueryIntent({ query, consumer });
  return resolveAllowedRelationshipsForExpansion({ consumer, intent });
}

export function isRelationshipAllowedForConsumer(
  consumer: AiRetrievalConsumer,
  relationshipType: KnowledgeGraphRelationshipType,
  query = ""
): boolean {
  if (
    (consumer === "SEO_CONTENT" || consumer === "SEO_TOPIC_PLANNER") &&
    SEO_UNSAFE_RELATIONSHIP_TYPES.includes(relationshipType)
  ) {
    return false;
  }
  const allowed = getAllowedGraphRelationshipsForConsumer(consumer, query);
  return allowed.includes(relationshipType);
}
