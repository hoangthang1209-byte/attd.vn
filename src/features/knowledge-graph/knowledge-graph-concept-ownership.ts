import type {
  KnowledgeGraphEntityType,
  KnowledgeGraphRelationshipType,
} from "@prisma/client";

/**
 * Concept entity ownership (Sprint 12.1).
 * Prefer managed vocabulary / manufacturing library — no free-floating text nodes.
 */
export const CONCEPT_ENTITY_OWNERSHIP = {
  USE_CASE: {
    sourceType: "MediaVocabularyTerm",
    vocabType: "USE_CASE",
    systemSyncSupported: true,
    manualCreationAllowed: false,
  },
  AUDIENCE: {
    sourceType: "MediaVocabularyTerm",
    vocabType: "AUDIENCE",
    systemSyncSupported: true,
    manualCreationAllowed: false,
  },
  INDUSTRY: {
    sourceType: "MediaVocabularyTerm",
    vocabType: "INDUSTRY",
    systemSyncSupported: true,
    manualCreationAllowed: false,
  },
  CAPABILITY: {
    sourceType: "ManufacturingAsset",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    fallback: "KnowledgeBaseEntry only when no canonical capability library record exists",
  },
  TECHNIQUE: {
    sourceType: "MediaVocabularyTerm",
    vocabType: "TECHNIQUE",
    systemSyncSupported: true,
    manualCreationAllowed: false,
  },
} as const;

export const CONCEPT_SYNC_SOURCES = [
  "MediaVocabularyTerm",
  "ManufacturingAsset",
] as const;

export const CONTENT_SYNC_SOURCES = [
  "SeoTopic",
  "MediaBundle",
  "BlogPost",
] as const;

export type RelationshipTemplate = {
  id: string;
  label: string;
  group: string;
  relationshipType: KnowledgeGraphRelationshipType;
  fromEntityType: KnowledgeGraphEntityType;
  toEntityType: KnowledgeGraphEntityType;
  description: string;
};

/** UX helpers only — never auto-create. */
export const RELATIONSHIP_TEMPLATES: RelationshipTemplate[] = [
  {
    id: "product-suitable-use-case",
    label: "Product → Use Case",
    group: "Product suitability",
    relationshipType: "SUITABLE_FOR",
    fromEntityType: "PRODUCT",
    toEntityType: "USE_CASE",
    description: "Sản phẩm phù hợp use case",
  },
  {
    id: "product-targets-audience",
    label: "Product → Audience",
    group: "Product suitability",
    relationshipType: "TARGETS",
    fromEntityType: "PRODUCT",
    toEntityType: "AUDIENCE",
    description: "Sản phẩm nhắm đối tượng",
  },
  {
    id: "product-targets-industry",
    label: "Product → Industry",
    group: "Product suitability",
    relationshipType: "TARGETS",
    fromEntityType: "PRODUCT",
    toEntityType: "INDUSTRY",
    description: "Sản phẩm nhắm ngành",
  },
  {
    id: "product-has-capability",
    label: "Product → Capability",
    group: "Capability",
    relationshipType: "HAS_CAPABILITY",
    fromEntityType: "PRODUCT",
    toEntityType: "CAPABILITY",
    description: "Sản phẩm có năng lực gia công",
  },
  {
    id: "capability-has-media",
    label: "Capability → Media Bundle",
    group: "Capability",
    relationshipType: "HAS_MEDIA",
    fromEntityType: "CAPABILITY",
    toEntityType: "MEDIA_BUNDLE",
    description: "Năng lực có gói media",
  },
  {
    id: "capability-evidenced",
    label: "Capability → Case Study",
    group: "Capability",
    relationshipType: "EVIDENCED_BY",
    fromEntityType: "CAPABILITY",
    toEntityType: "CASE_STUDY",
    description: "Năng lực chứng minh bằng case study",
  },
  {
    id: "capability-applies-use-case",
    label: "Capability → Use Case",
    group: "Capability",
    relationshipType: "SUITABLE_FOR",
    fromEntityType: "CAPABILITY",
    toEntityType: "USE_CASE",
    description: "Năng lực phù hợp use case",
  },
  {
    id: "product-made-from",
    label: "Product → Material",
    group: "Material / technique",
    relationshipType: "MADE_FROM",
    fromEntityType: "PRODUCT",
    toEntityType: "MATERIAL",
    description: "Sản phẩm làm từ vật liệu",
  },
  {
    id: "material-compatible-print",
    label: "Material ↔ Print Method",
    group: "Material / technique",
    relationshipType: "COMPATIBLE_WITH",
    fromEntityType: "MATERIAL",
    toEntityType: "PRINT_METHOD",
    description: "Vật liệu tương thích in",
  },
  {
    id: "material-not-compatible-print",
    label: "Material ↮ Print Method",
    group: "Material / technique",
    relationshipType: "NOT_COMPATIBLE_WITH",
    fromEntityType: "MATERIAL",
    toEntityType: "PRINT_METHOD",
    description: "Vật liệu không tương thích in",
  },
  {
    id: "product-supports-print",
    label: "Product → Print Method",
    group: "Material / technique",
    relationshipType: "SUPPORTS",
    fromEntityType: "PRODUCT",
    toEntityType: "PRINT_METHOD",
    description: "Sản phẩm hỗ trợ phương pháp in",
  },
  {
    id: "seo-has-media",
    label: "SEO Topic → Media Bundle",
    group: "SEO / media",
    relationshipType: "HAS_MEDIA",
    fromEntityType: "SEO_TOPIC",
    toEntityType: "MEDIA_BUNDLE",
    description: "Topic gắn media bundle",
  },
  {
    id: "seo-links-blog",
    label: "SEO Topic → Blog",
    group: "SEO / media",
    relationshipType: "LINKS_TO",
    fromEntityType: "SEO_TOPIC",
    toEntityType: "BLOG_POST",
    description: "Topic liên kết bài blog",
  },
  {
    id: "blog-has-media",
    label: "Blog → Media Bundle",
    group: "SEO / media",
    relationshipType: "HAS_MEDIA",
    fromEntityType: "BLOG_POST",
    toEntityType: "MEDIA_BUNDLE",
    description: "Blog gắn media bundle",
  },
];

export function templatesForEntityType(
  entityType: KnowledgeGraphEntityType
): RelationshipTemplate[] {
  return RELATIONSHIP_TEMPLATES.filter((t) => t.fromEntityType === entityType);
}

export function getTemplateById(id: string): RelationshipTemplate | undefined {
  return RELATIONSHIP_TEMPLATES.find((t) => t.id === id);
}
