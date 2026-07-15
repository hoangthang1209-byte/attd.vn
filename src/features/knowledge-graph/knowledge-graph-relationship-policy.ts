import type {
  KnowledgeBaseVisibility,
  KnowledgeGraphEntityType,
  KnowledgeGraphRelationshipOrigin,
  KnowledgeGraphRelationshipType,
} from "@prisma/client";
import { strictestVisibility } from "@/features/knowledge-graph/knowledge-graph-visibility";

export type RelationshipPolicyRule = {
  relationshipType: KnowledgeGraphRelationshipType;
  allowedFrom: KnowledgeGraphEntityType[];
  allowedTo: KnowledgeGraphEntityType[];
  inverseType?: KnowledgeGraphRelationshipType | null;
  /** When true, inverse is stored as a separate edge; otherwise derived on read. */
  storeInverse: boolean;
  allowedOrigins: KnowledgeGraphRelationshipOrigin[];
  approvalRequired: boolean;
  evidenceRequired: boolean;
  temporalAllowed: boolean;
  defaultAuthorityRank: number;
  allowSelfLoop: boolean;
  defaultVisibility: KnowledgeBaseVisibility | "STRICTEST";
};

function rule(
  partial: Omit<RelationshipPolicyRule, "storeInverse" | "allowSelfLoop" | "temporalAllowed"> &
    Partial<Pick<RelationshipPolicyRule, "storeInverse" | "allowSelfLoop" | "temporalAllowed">>
): RelationshipPolicyRule {
  return {
    storeInverse: false,
    allowSelfLoop: false,
    temporalAllowed: true,
    ...partial,
  };
}

const ALL_CONTENT: KnowledgeGraphEntityType[] = [
  "PRODUCT",
  "PRODUCT_CATEGORY",
  "MATERIAL",
  "TRIM",
  "PRINT_METHOD",
  "TECHNIQUE",
  "CAPABILITY",
  "INDUSTRY",
  "AUDIENCE",
  "USE_CASE",
  "CASE_STUDY",
  "POLICY",
  "FAQ",
  "MEDIA_BUNDLE",
  "SEO_TOPIC",
  "BLOG_POST",
  "TECH_PACK",
  "PATTERN",
  "KNOWLEDGE_ENTRY",
];

export const RELATIONSHIP_POLICY: Record<
  KnowledgeGraphRelationshipType,
  RelationshipPolicyRule
> = {
  IS_A: rule({
    relationshipType: "IS_A",
    allowedFrom: ["PRODUCT", "MATERIAL", "CAPABILITY"],
    allowedTo: ["PRODUCT_CATEGORY", "MATERIAL", "CAPABILITY"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 40,
    defaultVisibility: "STRICTEST",
  }),
  PART_OF: rule({
    relationshipType: "PART_OF",
    allowedFrom: ["PRODUCT", "MATERIAL", "TRIM", "PATTERN"],
    allowedTo: ["PRODUCT", "PRODUCT_CATEGORY", "TECH_PACK"],
    inverseType: "BELONGS_TO",
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 50,
    defaultVisibility: "STRICTEST",
  }),
  BELONGS_TO: rule({
    relationshipType: "BELONGS_TO",
    allowedFrom: ["PRODUCT", "SEO_TOPIC", "MATERIAL", "PATTERN"],
    allowedTo: ["PRODUCT_CATEGORY", "SEO_TOPIC"],
    inverseType: "PART_OF",
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 80,
    defaultVisibility: "STRICTEST",
  }),
  USES: rule({
    relationshipType: "USES",
    allowedFrom: ["PRODUCT", "TECH_PACK", "CAPABILITY"],
    allowedTo: ["MATERIAL", "TRIM", "PRINT_METHOD", "TECHNIQUE"],
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 70,
    defaultVisibility: "STRICTEST",
  }),
  MADE_FROM: rule({
    relationshipType: "MADE_FROM",
    allowedFrom: ["PRODUCT", "TECH_PACK"],
    allowedTo: ["MATERIAL"],
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 75,
    defaultVisibility: "STRICTEST",
  }),
  COMPATIBLE_WITH: rule({
    relationshipType: "COMPATIBLE_WITH",
    allowedFrom: ["MATERIAL", "PRODUCT", "PRINT_METHOD"],
    allowedTo: ["PRINT_METHOD", "MATERIAL", "PRODUCT", "TECHNIQUE"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 60,
    defaultVisibility: "STRICTEST",
  }),
  NOT_COMPATIBLE_WITH: rule({
    relationshipType: "NOT_COMPATIBLE_WITH",
    allowedFrom: ["MATERIAL", "PRODUCT", "PRINT_METHOD"],
    allowedTo: ["PRINT_METHOD", "MATERIAL", "PRODUCT", "TECHNIQUE"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: true,
    defaultAuthorityRank: 65,
    defaultVisibility: "STRICTEST",
  }),
  SUPPORTS: rule({
    relationshipType: "SUPPORTS",
    allowedFrom: ["PRINT_METHOD", "CAPABILITY", "TECHNIQUE", "PRODUCT"],
    allowedTo: ["MATERIAL", "USE_CASE", "PRODUCT", "CAPABILITY", "PRINT_METHOD"],
    allowedOrigins: ["CURATED", "SYSTEM_DERIVED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 55,
    defaultVisibility: "STRICTEST",
  }),
  REQUIRES: rule({
    relationshipType: "REQUIRES",
    allowedFrom: ["CAPABILITY", "PRINT_METHOD", "PRODUCT", "TECH_PACK"],
    allowedTo: ["MATERIAL", "TRIM", "TECHNIQUE", "CAPABILITY", "PRINT_METHOD"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 55,
    defaultVisibility: "STRICTEST",
  }),
  APPLIES_TO: rule({
    relationshipType: "APPLIES_TO",
    allowedFrom: ["POLICY", "FAQ", "KNOWLEDGE_ENTRY"],
    allowedTo: ["PRODUCT", "USE_CASE", "AUDIENCE", "INDUSTRY", "PRODUCT_CATEGORY"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 50,
    defaultVisibility: "STRICTEST",
  }),
  TARGETS: rule({
    relationshipType: "TARGETS",
    allowedFrom: ["PRODUCT", "CAPABILITY", "SEO_TOPIC", "BLOG_POST"],
    allowedTo: ["AUDIENCE", "INDUSTRY", "USE_CASE"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 50,
    defaultVisibility: "STRICTEST",
  }),
  SUITABLE_FOR: rule({
    relationshipType: "SUITABLE_FOR",
    allowedFrom: ["PRODUCT", "MATERIAL", "CAPABILITY"],
    allowedTo: ["USE_CASE", "AUDIENCE", "INDUSTRY"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 50,
    defaultVisibility: "STRICTEST",
  }),
  USED_IN: rule({
    relationshipType: "USED_IN",
    allowedFrom: ["MATERIAL", "TRIM", "PRINT_METHOD", "TECHNIQUE"],
    allowedTo: ["PRODUCT", "TECH_PACK", "CASE_STUDY"],
    allowedOrigins: ["CURATED", "IMPORTED", "SYSTEM_DERIVED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 45,
    defaultVisibility: "STRICTEST",
  }),
  FEATURED_IN: rule({
    relationshipType: "FEATURED_IN",
    allowedFrom: ["PRODUCT", "CAPABILITY", "CASE_STUDY"],
    allowedTo: ["BLOG_POST", "CASE_STUDY", "MEDIA_BUNDLE"],
    allowedOrigins: ["CURATED", "IMPORTED", "SYSTEM_DERIVED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 40,
    defaultVisibility: "STRICTEST",
  }),
  DOCUMENTED_BY: rule({
    relationshipType: "DOCUMENTED_BY",
    allowedFrom: ALL_CONTENT.filter((t) => t !== "KNOWLEDGE_ENTRY"),
    allowedTo: ["KNOWLEDGE_ENTRY", "CASE_STUDY", "FAQ", "POLICY"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 45,
    defaultVisibility: "STRICTEST",
  }),
  EVIDENCED_BY: rule({
    relationshipType: "EVIDENCED_BY",
    allowedFrom: ["CAPABILITY", "PRODUCT", "MATERIAL", "PRINT_METHOD", "POLICY", "KNOWLEDGE_ENTRY"],
    allowedTo: ["CASE_STUDY", "KNOWLEDGE_ENTRY", "MEDIA_BUNDLE"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: true,
    defaultAuthorityRank: 55,
    defaultVisibility: "STRICTEST",
  }),
  RELATED_TO: rule({
    relationshipType: "RELATED_TO",
    allowedFrom: ["KNOWLEDGE_ENTRY", "PRODUCT", "SEO_TOPIC", "BLOG_POST", "CASE_STUDY", "FAQ", "POLICY"],
    allowedTo: ["KNOWLEDGE_ENTRY", "PRODUCT", "SEO_TOPIC", "BLOG_POST", "CASE_STUDY", "FAQ", "POLICY"],
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 30,
    defaultVisibility: "STRICTEST",
  }),
  ALTERNATIVE_TO: rule({
    relationshipType: "ALTERNATIVE_TO",
    allowedFrom: ["PRODUCT", "MATERIAL", "PRINT_METHOD"],
    allowedTo: ["PRODUCT", "MATERIAL", "PRINT_METHOD"],
    storeInverse: true,
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 40,
    defaultVisibility: "STRICTEST",
  }),
  HAS_CAPABILITY: rule({
    relationshipType: "HAS_CAPABILITY",
    allowedFrom: ["PRODUCT", "PRODUCT_CATEGORY"],
    allowedTo: ["CAPABILITY"],
    allowedOrigins: ["CURATED", "SYSTEM_DERIVED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 50,
    defaultVisibility: "STRICTEST",
  }),
  HAS_POLICY: rule({
    relationshipType: "HAS_POLICY",
    allowedFrom: ["PRODUCT", "PRODUCT_CATEGORY", "USE_CASE"],
    allowedTo: ["POLICY", "KNOWLEDGE_ENTRY"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 55,
    defaultVisibility: "STRICTEST",
  }),
  HAS_MEDIA: rule({
    relationshipType: "HAS_MEDIA",
    allowedFrom: ["SEO_TOPIC", "BLOG_POST", "PRODUCT", "CAPABILITY", "KNOWLEDGE_ENTRY", "CASE_STUDY"],
    allowedTo: ["MEDIA_BUNDLE"],
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 70,
    defaultVisibility: "STRICTEST",
  }),
  HAS_CASE_STUDY: rule({
    relationshipType: "HAS_CASE_STUDY",
    allowedFrom: ["PRODUCT", "CAPABILITY", "USE_CASE", "INDUSTRY"],
    allowedTo: ["CASE_STUDY"],
    allowedOrigins: ["CURATED", "IMPORTED"],
    approvalRequired: true,
    evidenceRequired: false,
    defaultAuthorityRank: 50,
    defaultVisibility: "STRICTEST",
  }),
  HAS_SEO_TOPIC: rule({
    relationshipType: "HAS_SEO_TOPIC",
    allowedFrom: ["KNOWLEDGE_ENTRY", "PRODUCT", "USE_CASE", "BLOG_POST"],
    allowedTo: ["SEO_TOPIC"],
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 60,
    defaultVisibility: "STRICTEST",
  }),
  LINKS_TO: rule({
    relationshipType: "LINKS_TO",
    allowedFrom: ["SEO_TOPIC", "BLOG_POST", "KNOWLEDGE_ENTRY"],
    allowedTo: ["BLOG_POST", "SEO_TOPIC", "PRODUCT"],
    allowedOrigins: ["SYSTEM_DERIVED", "CURATED", "IMPORTED"],
    approvalRequired: false,
    evidenceRequired: false,
    defaultAuthorityRank: 65,
    defaultVisibility: "STRICTEST",
  }),
};

export function getRelationshipPolicy(
  relationshipType: string
): RelationshipPolicyRule | null {
  if (!(relationshipType in RELATIONSHIP_POLICY)) return null;
  return RELATIONSHIP_POLICY[relationshipType as KnowledgeGraphRelationshipType];
}

export type RelationshipPolicyValidation =
  | { ok: true; policy: RelationshipPolicyRule }
  | { ok: false; error: string };

export function validateRelationshipPair(input: {
  relationshipType: string;
  fromEntityType: KnowledgeGraphEntityType;
  toEntityType: KnowledgeGraphEntityType;
  origin: KnowledgeGraphRelationshipOrigin;
  fromEntityId?: string;
  toEntityId?: string;
}): RelationshipPolicyValidation {
  const policy = getRelationshipPolicy(input.relationshipType);
  if (!policy) {
    return { ok: false, error: `Relationship type not allowlisted: ${input.relationshipType}` };
  }
  if (
    input.fromEntityId &&
    input.toEntityId &&
    input.fromEntityId === input.toEntityId &&
    !policy.allowSelfLoop
  ) {
    return { ok: false, error: "Self-loop relationships are not allowed" };
  }
  if (!policy.allowedFrom.includes(input.fromEntityType)) {
    return {
      ok: false,
      error: `${input.relationshipType} cannot start from ${input.fromEntityType}`,
    };
  }
  if (!policy.allowedTo.includes(input.toEntityType)) {
    return {
      ok: false,
      error: `${input.relationshipType} cannot target ${input.toEntityType}`,
    };
  }
  if (!policy.allowedOrigins.includes(input.origin)) {
    return {
      ok: false,
      error: `Origin ${input.origin} not allowed for ${input.relationshipType}`,
    };
  }
  return { ok: true, policy };
}

export function resolveRelationshipVisibility(input: {
  policy: RelationshipPolicyRule;
  fromVisibility: KnowledgeBaseVisibility;
  toVisibility: KnowledgeBaseVisibility;
  override?: KnowledgeBaseVisibility | null;
}): KnowledgeBaseVisibility {
  const base =
    input.policy.defaultVisibility === "STRICTEST"
      ? strictestVisibility(input.fromVisibility, input.toVisibility)
      : strictestVisibility(input.policy.defaultVisibility, input.fromVisibility, input.toVisibility);
  if (!input.override) return base;
  return strictestVisibility(base, input.override);
}

/** Origin precedence for indistinguishable active duplicates (higher wins). */
export function relationshipOriginPrecedence(
  origin: KnowledgeGraphRelationshipOrigin,
  hasEvidence: boolean
): number {
  if (origin === "SYSTEM_DERIVED") return 300;
  if (origin === "CURATED" && hasEvidence) return 200;
  if (origin === "CURATED") return 150;
  if (origin === "IMPORTED") return 100;
  return 0;
}
