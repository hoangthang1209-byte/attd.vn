import { retrieveEnterpriseAiContext } from "@/features/ai-retrieval/services/ai-retrieval.service";
import type { AiRetrievalContext } from "@/features/ai-retrieval/ai-retrieval-types";
import { getSeoTopicById } from "@/features/content/services/seo-topic.service";
import { AiRetrievalConsumerNotEnabledError } from "@/features/ai-retrieval/ai-retrieval-errors";

export { AiRetrievalConsumerNotEnabledError };

export async function retrieveContextForSeoTopic(
  topicId: string,
  opts?: { userId?: string | null; compatibilityMode?: boolean }
): Promise<AiRetrievalContext> {
  const topic = await getSeoTopicById(topicId);
  if (!topic) throw new Error("SEO topic not found");

  const result = await retrieveEnterpriseAiContext({
    consumer: "SEO_TOPIC_PLANNER",
    purpose: "CONTENT_PLANNING",
    query: `${topic.title} ${topic.primaryKeyword}`.trim(),
    seoTopicIds: [topicId],
    mediaBundleIds: topic.mediaBundleId ? [topic.mediaBundleId] : undefined,
    productIds: topic.targetEntityType === "PRODUCT" && topic.targetEntityId
      ? [topic.targetEntityId]
      : undefined,
    sourceTypes: [
      "SEO_TOPIC",
      "SEO_BRIEF",
      "KNOWLEDGE_BASE",
      "PRODUCT",
      "MANUFACTURING_ASSET",
      "MEDIA_BUNDLE",
    ],
    includeMedia: true,
    includeBusinessRules: true,
    includeConflicts: true,
    compatibilityMode: opts?.compatibilityMode !== false,
    userId: opts?.userId ?? null,
    maxItems: 30,
  });

  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.context;
}

export async function retrieveContextForSeoBrief(
  topicId: string,
  opts?: { userId?: string | null; compatibilityMode?: boolean }
): Promise<AiRetrievalContext> {
  const topic = await getSeoTopicById(topicId);
  if (!topic) throw new Error("SEO topic not found");

  const result = await retrieveEnterpriseAiContext({
    consumer: "SEO_BRIEF",
    purpose: "CONTENT_PLANNING",
    query: `${topic.title} ${topic.primaryKeyword}`.trim(),
    seoTopicIds: [topicId],
    mediaBundleIds: topic.mediaBundleId ? [topic.mediaBundleId] : undefined,
    productIds: topic.targetEntityType === "PRODUCT" && topic.targetEntityId
      ? [topic.targetEntityId]
      : undefined,
    sourceTypes: [
      "SEO_TOPIC",
      "SEO_BRIEF",
      "KNOWLEDGE_BASE",
      "PRODUCT",
      "MANUFACTURING_ASSET",
      "MEDIA_BUNDLE",
      "MEDIA_ASSET",
    ],
    includeMedia: true,
    includeBusinessRules: true,
    includeConflicts: true,
    compatibilityMode: opts?.compatibilityMode !== false,
    userId: opts?.userId ?? null,
    maxItems: 30,
  });

  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.context;
}

export async function retrieveContextForContentDraft(topicId: string): Promise<never> {
  void topicId;
  throw new AiRetrievalConsumerNotEnabledError("SEO_CONTENT drafting pipeline");
}

export async function retrieveContextForProduct(productId: string): Promise<never> {
  void productId;
  throw new AiRetrievalConsumerNotEnabledError("SALES_COPILOT / PRODUCT context");
}

export async function retrieveContextForManufacturing(
  query: string,
  scopes?: Record<string, unknown>
): Promise<never> {
  void query;
  void scopes;
  throw new AiRetrievalConsumerNotEnabledError("MANUFACTURING_ASSISTANT");
}
