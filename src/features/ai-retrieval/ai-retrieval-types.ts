import type {
  KnowledgeBaseClaimStatus,
  KnowledgeBaseEntryType,
  KnowledgeBaseVisibility,
} from "@prisma/client";

export type AiRetrievalConsumer =
  | "SEO_CONTENT"
  | "SEO_BRIEF"
  | "SEO_TOPIC_PLANNER"
  | "SALES_COPILOT"
  | "SUPPORT_COPILOT"
  | "QUOTATION_ASSISTANT"
  | "MANUFACTURING_ASSISTANT"
  | "PROCUREMENT_ASSISTANT"
  | "INTERNAL_SEARCH"
  | "BUSINESS_INTELLIGENCE"
  | "ADMIN";

export type AiRetrievalPurpose =
  | "RESEARCH"
  | "CONTENT_PLANNING"
  | "CONTENT_WRITING"
  | "CONTENT_REVIEW"
  | "SALES_RESPONSE"
  | "CUSTOMER_SUPPORT"
  | "QUOTATION"
  | "MANUFACTURING_GUIDANCE"
  | "PROCUREMENT"
  | "INTERNAL_ANALYSIS"
  | "PUBLIC_OUTPUT";

export type AiRetrievalSourceType =
  | "KNOWLEDGE_BASE"
  | "PRODUCT"
  | "CATEGORY"
  | "MANUFACTURING_ASSET"
  | "MATERIAL"
  | "TRIM"
  | "PRINT_METHOD"
  | "TECH_PACK"
  | "PATTERN"
  | "MEDIA_ASSET"
  | "MEDIA_BUNDLE"
  | "SEO_TOPIC"
  | "SEO_BRIEF"
  | "BLOG_POST"
  | "CUSTOMER"
  | "QUOTE"
  | "PRICING_POLICY"
  | "OTHER";

export type KnowledgeVisibility = KnowledgeBaseVisibility;
export type KnowledgeClaimStatus = KnowledgeBaseClaimStatus;

export const AI_RETRIEVAL_CONSUMERS: AiRetrievalConsumer[] = [
  "SEO_CONTENT",
  "SEO_BRIEF",
  "SEO_TOPIC_PLANNER",
  "SALES_COPILOT",
  "SUPPORT_COPILOT",
  "QUOTATION_ASSISTANT",
  "MANUFACTURING_ASSISTANT",
  "PROCUREMENT_ASSISTANT",
  "INTERNAL_SEARCH",
  "BUSINESS_INTELLIGENCE",
  "ADMIN",
];

export const AI_RETRIEVAL_PURPOSES: AiRetrievalPurpose[] = [
  "RESEARCH",
  "CONTENT_PLANNING",
  "CONTENT_WRITING",
  "CONTENT_REVIEW",
  "SALES_RESPONSE",
  "CUSTOMER_SUPPORT",
  "QUOTATION",
  "MANUFACTURING_GUIDANCE",
  "PROCUREMENT",
  "INTERNAL_ANALYSIS",
  "PUBLIC_OUTPUT",
];

export const AI_RETRIEVAL_SOURCE_TYPES: AiRetrievalSourceType[] = [
  "KNOWLEDGE_BASE",
  "PRODUCT",
  "CATEGORY",
  "MANUFACTURING_ASSET",
  "MATERIAL",
  "TRIM",
  "PRINT_METHOD",
  "TECH_PACK",
  "PATTERN",
  "MEDIA_ASSET",
  "MEDIA_BUNDLE",
  "SEO_TOPIC",
  "SEO_BRIEF",
  "BLOG_POST",
  "CUSTOMER",
  "QUOTE",
  "PRICING_POLICY",
  "OTHER",
];

/** Consumers enabled for Sprint 11.0B APIs. Others return not-enabled. */
export const AI_RETRIEVAL_ENABLED_CONSUMERS: AiRetrievalConsumer[] = [
  "SEO_CONTENT",
  "SEO_BRIEF",
  "SEO_TOPIC_PLANNER",
  "INTERNAL_SEARCH",
  "ADMIN",
];

export type AiRetrievalPolicy = {
  consumer: AiRetrievalConsumer;
  allowedPurposes: AiRetrievalPurpose[];
  maxVisibility: KnowledgeVisibility;
  allowedKnowledgeDomains?: string[];
  allowedKnowledgeTypes?: KnowledgeBaseEntryType[];
  allowedClaimStatuses: KnowledgeClaimStatus[];
  requireApproved: boolean;
  requireVerified: boolean;
  requireEvidenceForMarketingClaims: boolean;
  allowStaleKnowledge: boolean;
  allowConfidential: boolean;
  allowCustomerData: boolean;
  allowPricingCostData: boolean;
  allowInternalNotes: boolean;
  /** Allow verified FACT legacy entries without approvedAt (with warning). */
  allowLegacyVerifiedWithoutApproval: boolean;
  sourceScopes: AiRetrievalSourceType[];
  maxItems: number;
  maxContextCharacters: number;
  enabled: boolean;
};

export type AiRetrievedFact = {
  id: string;
  sourceType: AiRetrievalSourceType;
  sourceId: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  structuredData?: Record<string, unknown> | null;

  visibility: KnowledgeVisibility;
  publicOutputAllowed: boolean;

  claimStatus?: KnowledgeClaimStatus | null;
  confidence?: number | null;
  evidenceUrl?: string | null;

  sourceName?: string | null;
  sourceUrl?: string | null;
  adminRoute?: string | null;

  authoritativeDomain?: string | null;
  authorityRank: number;
  authorityReason?: string | null;

  version?: number | null;
  approvedAt?: string | null;
  lastVerifiedAt?: string | null;
  expiresAt?: string | null;
  stale: boolean;
  reviewDue?: boolean;
  legacyVerifiedNotApproved?: boolean;

  matchedOn: string[];
  relevanceScore: number;
  warnings: string[];

  relatedMediaBundleIds?: string[];
  relatedMediaAssetIds?: string[];
  relatedEntityIds?: string[];
};

export type AiRetrievalConflict = {
  key: string;
  domain: string;
  facts: {
    factId: string;
    sourceType: AiRetrievalSourceType;
    value: unknown;
    authorityRank: number;
    lastVerifiedAt?: string | null;
  }[];
  resolution: "HIGHER_AUTHORITY_SELECTED" | "NEWER_VERIFIED_SELECTED" | "UNRESOLVED";
  selectedFactId?: string | null;
  warning: string;
};

export type AiBusinessRule = {
  id: string;
  title: string;
  condition?: Record<string, unknown> | null;
  outcome: Record<string, unknown>;
  exceptions?: Record<string, unknown>[];
  appliesTo?: string[];
  priority: number;
  visibility: KnowledgeVisibility;
  sourceEntryId: string;
  approved: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
};

export type AiRetrievalRequest = {
  consumer: AiRetrievalConsumer;
  purpose: AiRetrievalPurpose;
  query: string;

  sourceTypes?: AiRetrievalSourceType[];
  domains?: string[];
  entityIds?: string[];
  productIds?: string[];
  mediaBundleIds?: string[];
  seoTopicIds?: string[];
  knowledgeEntryIds?: string[];

  language?: string;
  maxItems?: number;
  maxContextCharacters?: number;

  includeMedia?: boolean;
  includeBusinessRules?: boolean;
  includeConflicts?: boolean;
  includeWarnings?: boolean;

  /** Prefer verified FACT without approvedAt for public output (with warning). */
  compatibilityMode?: boolean;

  userId?: string | null;
};

export type AiRetrievalContext = {
  requestId: string;
  consumer: AiRetrievalConsumer;
  purpose: AiRetrievalPurpose;
  query: string;
  policy: {
    maxVisibility: KnowledgeVisibility;
    allowConfidential: boolean;
    requireApproved: boolean;
    requireVerified: boolean;
    compatibilityMode: boolean;
  };

  facts: AiRetrievedFact[];
  businessRules: AiBusinessRule[];
  conflicts: AiRetrievalConflict[];
  warnings: string[];

  sourcesUsed: {
    sourceType: AiRetrievalSourceType;
    count: number;
  }[];

  omitted: {
    reason: string;
    count: number;
  }[];

  contextText: string;
  contextJson: Record<string, unknown>;
  sourceManifest: Array<{
    factId: string;
    sourceType: AiRetrievalSourceType;
    sourceId: string;
    title: string;
    visibility: KnowledgeVisibility;
    adminRoute?: string | null;
  }>;

  generatedAt: string;
};

export type AiRetrievalOmittedBucket = {
  reason: string;
  count: number;
};
