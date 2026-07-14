import {
  AI_RETRIEVAL_CONSUMERS,
  AI_RETRIEVAL_ENABLED_CONSUMERS,
  AI_RETRIEVAL_PURPOSES,
  AI_RETRIEVAL_SOURCE_TYPES,
  type AiRetrievalRequest,
  type AiRetrievalSourceType,
} from "@/features/ai-retrieval/ai-retrieval-types";
import {
  getAiRetrievalPolicy,
  isPurposeAllowed,
  isSourceTypeAllowed,
} from "@/features/ai-retrieval/ai-retrieval-policy";

export type AiRetrievalValidationResult =
  | { ok: true; request: AiRetrievalRequest }
  | { ok: false; errors: string[] };

const HARD_MAX_ITEMS = 60;
const HARD_MAX_CONTEXT = 24000;

export function validateAiRetrievalRequest(raw: unknown): AiRetrievalValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Request body is required."] };
  }

  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  // Reject client-side access overrides
  if ("maxVisibility" in input || "allowConfidential" in input || "visibility" in input) {
    errors.push("Caller cannot override visibility or confidentiality policy.");
  }
  if ("table" in input || "tables" in input || "sql" in input || "rawQuery" in input) {
    errors.push("Arbitrary database access is not allowed.");
  }

  const consumer = input.consumer;
  if (typeof consumer !== "string" || !AI_RETRIEVAL_CONSUMERS.includes(consumer as never)) {
    errors.push("Invalid consumer.");
  }

  const purpose = input.purpose;
  if (typeof purpose !== "string" || !AI_RETRIEVAL_PURPOSES.includes(purpose as never)) {
    errors.push("Invalid purpose.");
  }

  const query = typeof input.query === "string" ? input.query.trim() : "";
  const hasEntityScope =
    (Array.isArray(input.entityIds) && input.entityIds.length > 0) ||
    (Array.isArray(input.productIds) && input.productIds.length > 0) ||
    (Array.isArray(input.mediaBundleIds) && input.mediaBundleIds.length > 0) ||
    (Array.isArray(input.seoTopicIds) && input.seoTopicIds.length > 0) ||
    (Array.isArray(input.knowledgeEntryIds) && input.knowledgeEntryIds.length > 0);

  if (!query && !hasEntityScope) {
    errors.push("Query or explicit entity scope is required.");
  }

  if (errors.length > 0) return { ok: false, errors };

  const policy = getAiRetrievalPolicy(consumer as AiRetrievalRequest["consumer"]);

  if (!policy.enabled || !AI_RETRIEVAL_ENABLED_CONSUMERS.includes(consumer as never)) {
    return {
      ok: false,
      errors: [`Consumer ${String(consumer)} is not enabled for retrieval in this sprint.`],
    };
  }

  if (!isPurposeAllowed(policy, purpose as AiRetrievalRequest["purpose"])) {
    return {
      ok: false,
      errors: [`Purpose ${String(purpose)} is not allowed for consumer ${String(consumer)}.`],
    };
  }

  let sourceTypes: AiRetrievalSourceType[] | undefined;
  if (Array.isArray(input.sourceTypes)) {
    sourceTypes = [];
    for (const item of input.sourceTypes) {
      if (typeof item !== "string" || !AI_RETRIEVAL_SOURCE_TYPES.includes(item as never)) {
        errors.push(`Unknown source type: ${String(item)}`);
        continue;
      }
      if (!isSourceTypeAllowed(policy, item as AiRetrievalSourceType)) {
        errors.push(`Source type ${item} is not allowed for consumer ${String(consumer)}.`);
        continue;
      }
      sourceTypes.push(item as AiRetrievalSourceType);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const maxItems = Math.min(
    HARD_MAX_ITEMS,
    Math.max(1, typeof input.maxItems === "number" ? input.maxItems : policy.maxItems)
  );
  const maxContextCharacters = Math.min(
    HARD_MAX_CONTEXT,
    Math.max(
      500,
      typeof input.maxContextCharacters === "number"
        ? input.maxContextCharacters
        : policy.maxContextCharacters
    )
  );

  const asIdList = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  };

  return {
    ok: true,
    request: {
      consumer: consumer as AiRetrievalRequest["consumer"],
      purpose: purpose as AiRetrievalRequest["purpose"],
      query,
      sourceTypes,
      domains: asIdList(input.domains),
      entityIds: asIdList(input.entityIds),
      productIds: asIdList(input.productIds),
      mediaBundleIds: asIdList(input.mediaBundleIds),
      seoTopicIds: asIdList(input.seoTopicIds),
      knowledgeEntryIds: asIdList(input.knowledgeEntryIds),
      language: typeof input.language === "string" ? input.language : "vi",
      maxItems,
      maxContextCharacters,
      includeMedia: input.includeMedia !== false,
      includeBusinessRules: Boolean(input.includeBusinessRules),
      includeConflicts: input.includeConflicts !== false,
      includeWarnings: input.includeWarnings !== false,
      compatibilityMode: input.compatibilityMode !== false,
      userId: typeof input.userId === "string" ? input.userId : null,
    },
  };
}
