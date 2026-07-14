import type {
  AiRetrievalConsumer,
  AiRetrievalPolicy,
  AiRetrievalPurpose,
  AiRetrievalSourceType,
  KnowledgeVisibility,
} from "@/features/ai-retrieval/ai-retrieval-types";

const SEO_PUBLIC_SOURCES: AiRetrievalSourceType[] = [
  "KNOWLEDGE_BASE",
  "PRODUCT",
  "CATEGORY",
  "MANUFACTURING_ASSET",
  "MEDIA_ASSET",
  "MEDIA_BUNDLE",
  "SEO_TOPIC",
  "SEO_BRIEF",
  "BLOG_POST",
];

const INTERNAL_CONTENT_SOURCES: AiRetrievalSourceType[] = [
  ...SEO_PUBLIC_SOURCES,
  "MATERIAL",
  "PRINT_METHOD",
  "OTHER",
];

const ADMIN_SOURCES: AiRetrievalSourceType[] = [
  ...INTERNAL_CONTENT_SOURCES,
  "TRIM",
  "TECH_PACK",
  "PATTERN",
  "PRICING_POLICY",
];

const SAFE_CLAIMS = ["FACT", "VERIFIED_CLAIM"] as const;

function baseSeoPolicy(
  consumer: AiRetrievalConsumer,
  overrides: Partial<AiRetrievalPolicy> = {}
): AiRetrievalPolicy {
  return {
    consumer,
    allowedPurposes: [
      "RESEARCH",
      "CONTENT_PLANNING",
      "CONTENT_WRITING",
      "CONTENT_REVIEW",
      "PUBLIC_OUTPUT",
    ],
    maxVisibility: "PUBLIC",
    allowedClaimStatuses: [...SAFE_CLAIMS],
    requireApproved: true,
    requireVerified: true,
    requireEvidenceForMarketingClaims: true,
    allowStaleKnowledge: false,
    allowConfidential: false,
    allowCustomerData: false,
    allowPricingCostData: false,
    allowInternalNotes: false,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: SEO_PUBLIC_SOURCES,
    maxItems: 30,
    maxContextCharacters: 12000,
    enabled: true,
    ...overrides,
  };
}

const POLICIES: Record<AiRetrievalConsumer, AiRetrievalPolicy> = {
  SEO_CONTENT: baseSeoPolicy("SEO_CONTENT", {
    allowedPurposes: ["CONTENT_WRITING", "PUBLIC_OUTPUT", "CONTENT_REVIEW"],
  }),
  SEO_BRIEF: baseSeoPolicy("SEO_BRIEF", {
    allowedPurposes: ["CONTENT_PLANNING", "RESEARCH", "PUBLIC_OUTPUT"],
    maxVisibility: "INTERNAL",
    allowInternalNotes: false,
    requireApproved: true,
    sourceScopes: SEO_PUBLIC_SOURCES,
  }),
  SEO_TOPIC_PLANNER: baseSeoPolicy("SEO_TOPIC_PLANNER", {
    allowedPurposes: ["CONTENT_PLANNING", "RESEARCH"],
    maxVisibility: "INTERNAL",
    requireApproved: false,
    requireVerified: false,
    allowLegacyVerifiedWithoutApproval: true,
  }),
  SALES_COPILOT: {
    consumer: "SALES_COPILOT",
    allowedPurposes: ["SALES_RESPONSE", "RESEARCH", "INTERNAL_ANALYSIS"],
    maxVisibility: "INTERNAL",
    allowedClaimStatuses: [...SAFE_CLAIMS],
    requireApproved: false,
    requireVerified: true,
    requireEvidenceForMarketingClaims: true,
    allowStaleKnowledge: false,
    allowConfidential: false,
    allowCustomerData: true,
    allowPricingCostData: false,
    allowInternalNotes: true,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: [
      "KNOWLEDGE_BASE",
      "PRODUCT",
      "MANUFACTURING_ASSET",
      "MEDIA_BUNDLE",
      "MATERIAL",
      "PRINT_METHOD",
    ],
    maxItems: 40,
    maxContextCharacters: 16000,
    enabled: false,
  },
  SUPPORT_COPILOT: {
    consumer: "SUPPORT_COPILOT",
    allowedPurposes: ["CUSTOMER_SUPPORT", "RESEARCH"],
    maxVisibility: "INTERNAL",
    allowedClaimStatuses: [...SAFE_CLAIMS],
    requireApproved: false,
    requireVerified: true,
    requireEvidenceForMarketingClaims: true,
    allowStaleKnowledge: false,
    allowConfidential: false,
    allowCustomerData: true,
    allowPricingCostData: false,
    allowInternalNotes: true,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: ["KNOWLEDGE_BASE", "PRODUCT", "MEDIA_BUNDLE", "BLOG_POST"],
    maxItems: 30,
    maxContextCharacters: 12000,
    enabled: false,
  },
  QUOTATION_ASSISTANT: {
    consumer: "QUOTATION_ASSISTANT",
    allowedPurposes: ["QUOTATION", "RESEARCH"],
    maxVisibility: "INTERNAL",
    allowedClaimStatuses: [...SAFE_CLAIMS],
    requireApproved: false,
    requireVerified: true,
    requireEvidenceForMarketingClaims: true,
    allowStaleKnowledge: false,
    allowConfidential: false,
    allowCustomerData: true,
    allowPricingCostData: false,
    allowInternalNotes: false,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: ["KNOWLEDGE_BASE", "PRODUCT", "PRICING_POLICY", "MATERIAL", "PRINT_METHOD"],
    maxItems: 40,
    maxContextCharacters: 16000,
    enabled: false,
  },
  MANUFACTURING_ASSISTANT: {
    consumer: "MANUFACTURING_ASSISTANT",
    allowedPurposes: ["MANUFACTURING_GUIDANCE", "RESEARCH"],
    maxVisibility: "INTERNAL",
    allowedClaimStatuses: [...SAFE_CLAIMS],
    requireApproved: false,
    requireVerified: false,
    requireEvidenceForMarketingClaims: true,
    allowStaleKnowledge: true,
    allowConfidential: false,
    allowCustomerData: false,
    allowPricingCostData: false,
    allowInternalNotes: true,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: [
      "KNOWLEDGE_BASE",
      "PRODUCT",
      "MANUFACTURING_ASSET",
      "MATERIAL",
      "TRIM",
      "PRINT_METHOD",
      "TECH_PACK",
      "PATTERN",
      "MEDIA_BUNDLE",
    ],
    maxItems: 50,
    maxContextCharacters: 20000,
    enabled: false,
  },
  PROCUREMENT_ASSISTANT: {
    consumer: "PROCUREMENT_ASSISTANT",
    allowedPurposes: ["PROCUREMENT", "RESEARCH"],
    maxVisibility: "INTERNAL",
    allowedClaimStatuses: [...SAFE_CLAIMS],
    requireApproved: false,
    requireVerified: false,
    requireEvidenceForMarketingClaims: true,
    allowStaleKnowledge: true,
    allowConfidential: false,
    allowCustomerData: false,
    allowPricingCostData: false,
    allowInternalNotes: true,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: ["KNOWLEDGE_BASE", "MATERIAL", "TRIM", "PRODUCT"],
    maxItems: 40,
    maxContextCharacters: 16000,
    enabled: false,
  },
  INTERNAL_SEARCH: {
    consumer: "INTERNAL_SEARCH",
    allowedPurposes: ["RESEARCH", "INTERNAL_ANALYSIS"],
    maxVisibility: "INTERNAL",
    allowedClaimStatuses: [...SAFE_CLAIMS, "OPINION", "MARKETING_CLAIM", "NEEDS_EVIDENCE"],
    requireApproved: false,
    requireVerified: false,
    requireEvidenceForMarketingClaims: false,
    allowStaleKnowledge: true,
    allowConfidential: false,
    allowCustomerData: false,
    allowPricingCostData: false,
    allowInternalNotes: true,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: INTERNAL_CONTENT_SOURCES,
    maxItems: 40,
    maxContextCharacters: 16000,
    enabled: true,
  },
  BUSINESS_INTELLIGENCE: {
    consumer: "BUSINESS_INTELLIGENCE",
    allowedPurposes: ["INTERNAL_ANALYSIS", "RESEARCH"],
    maxVisibility: "INTERNAL",
    allowedClaimStatuses: [...SAFE_CLAIMS],
    requireApproved: false,
    requireVerified: false,
    requireEvidenceForMarketingClaims: true,
    allowStaleKnowledge: true,
    allowConfidential: false,
    allowCustomerData: false,
    allowPricingCostData: false,
    allowInternalNotes: true,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: INTERNAL_CONTENT_SOURCES,
    maxItems: 50,
    maxContextCharacters: 20000,
    enabled: false,
  },
  ADMIN: {
    consumer: "ADMIN",
    allowedPurposes: [
      "RESEARCH",
      "INTERNAL_ANALYSIS",
      "CONTENT_PLANNING",
      "CONTENT_REVIEW",
      "PUBLIC_OUTPUT",
    ],
    maxVisibility: "CONFIDENTIAL",
    allowedClaimStatuses: [...SAFE_CLAIMS, "OPINION", "MARKETING_CLAIM", "NEEDS_EVIDENCE"],
    requireApproved: false,
    requireVerified: false,
    requireEvidenceForMarketingClaims: false,
    allowStaleKnowledge: true,
    allowConfidential: true,
    allowCustomerData: false,
    allowPricingCostData: false,
    allowInternalNotes: true,
    allowLegacyVerifiedWithoutApproval: true,
    sourceScopes: ADMIN_SOURCES,
    maxItems: 60,
    maxContextCharacters: 24000,
    enabled: true,
  },
};

export function getAiRetrievalPolicy(consumer: AiRetrievalConsumer): AiRetrievalPolicy {
  return { ...POLICIES[consumer] };
}

export function isPurposeAllowed(policy: AiRetrievalPolicy, purpose: AiRetrievalPurpose): boolean {
  return policy.allowedPurposes.includes(purpose);
}

export function isSourceTypeAllowed(
  policy: AiRetrievalPolicy,
  sourceType: AiRetrievalSourceType
): boolean {
  return policy.sourceScopes.includes(sourceType);
}

export function resolveEffectiveMaxVisibility(
  policy: AiRetrievalPolicy,
  purpose: AiRetrievalPurpose
): KnowledgeVisibility {
  if (purpose === "PUBLIC_OUTPUT") return "PUBLIC";
  return policy.maxVisibility;
}

export function listAiRetrievalPolicies(): AiRetrievalPolicy[] {
  return Object.values(POLICIES).map((p) => ({ ...p }));
}
