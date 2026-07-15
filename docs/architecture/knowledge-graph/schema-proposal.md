# Knowledge Graph — Proposed Prisma Schema (not migrated)

Sprint 12.0A design proposal. **Do not apply** until Sprint 12.0 implementation.

Aligned with ADR-0005. Reuse existing enum **`KnowledgeBaseVisibility`** (`PUBLIC | INTERNAL | CONFIDENTIAL`) for graph entity and relationship visibility — do not invent a parallel `KnowledgeVisibility` enum.

```prisma
enum KnowledgeGraphEntityType {
  PRODUCT
  PRODUCT_CATEGORY
  MATERIAL
  TRIM
  PRINT_METHOD
  TECHNIQUE
  PROCESS
  CAPABILITY
  SUPPLIER
  CUSTOMER
  INDUSTRY
  AUDIENCE
  USE_CASE
  CASE_STUDY
  POLICY
  FAQ
  MEDIA_ASSET
  MEDIA_BUNDLE
  SEO_TOPIC
  BLOG_POST
  TECH_PACK
  PATTERN
  KNOWLEDGE_ENTRY
  OTHER
}

enum KnowledgeGraphRelationStatus {
  DRAFT
  SUGGESTED
  ACTIVE
  REJECTED
  SUPERSEDED
  ARCHIVED
}

enum KnowledgeGraphRelationOrigin {
  SYSTEM_DERIVED
  CURATED
  AI_SUGGESTED
  IMPORTED
}

/// Allowlisted relationshipType values enforced in application code (not free DB enum for V1 flexibility).
/// V1 allowlist:
/// BELONGS_TO, PART_OF, USES, MADE_FROM, COMPATIBLE_WITH, NOT_COMPATIBLE_WITH,
/// SUPPORTS, REQUIRES, SUITABLE_FOR, TARGETS, APPLIES_TO,
/// HAS_CAPABILITY, HAS_MEDIA, FEATURED_IN, DOCUMENTED_BY, EVIDENCED_BY,
/// HAS_SEO_TOPIC, LINKS_TO, RELATED_TO, ALTERNATIVE_TO,
/// HAS_POLICY, HAS_MOQ_POLICY, HAS_LEAD_TIME_POLICY

model KnowledgeGraphEntity {
  id           String                   @id @default(cuid())
  entityType   KnowledgeGraphEntityType
  sourceType   String
  sourceId     String
  canonicalKey String
  displayName  String
  visibility   KnowledgeBaseVisibility
  /// Non-authoritative hints only (search boosters, icons). Never MOQ/price/lead-time/BOM.
  metadata     Json?
  createdAt    DateTime                 @default(now())
  updatedAt    DateTime                 @updatedAt

  outgoing KnowledgeGraphRelationship[] @relation("GraphOutgoing")
  incoming KnowledgeGraphRelationship[] @relation("GraphIncoming")

  @@unique([sourceType, sourceId])
  @@unique([entityType, canonicalKey])
  @@index([entityType, visibility])
  @@index([displayName])
}

model KnowledgeGraphRelationship {
  id               String                        @id @default(cuid())
  fromEntityId     String
  toEntityId       String
  relationshipType String
  status           KnowledgeGraphRelationStatus  @default(DRAFT)
  origin           KnowledgeGraphRelationOrigin
  visibility       KnowledgeBaseVisibility
  authorityRank    Int                           @default(0)
  confidence       Int?
  sourceEntryId    String?
  evidenceUrl      String?
  validFrom        DateTime?
  validUntil       DateTime?
  lastVerifiedAt   DateTime?
  approvedBy       String?
  approvedAt       DateTime?
  metadata         Json?
  createdBy        String?
  createdAt        DateTime                      @default(now())
  updatedAt        DateTime                      @updatedAt

  fromEntity KnowledgeGraphEntity @relation("GraphOutgoing", fields: [fromEntityId], references: [id], onDelete: Cascade)
  toEntity   KnowledgeGraphEntity @relation("GraphIncoming", fields: [toEntityId], references: [id], onDelete: Cascade)

  @@unique([fromEntityId, toEntityId, relationshipType])
  @@index([fromEntityId, relationshipType, status])
  @@index([toEntityId, relationshipType, status])
  @@index([status, visibility, origin])
  @@index([sourceEntryId])
}
```

## Application-level relationship allowlist matrix (V1)

| relationshipType | From → To (allowed) | Cardinality | Inverse | Origin default |
|------------------|---------------------|-------------|---------|----------------|
| BELONGS_TO | PRODUCT→PRODUCT_CATEGORY; SEO_TOPIC→(cluster via metadata or OTHER) | N:1 | derived PART_OF optional | SYSTEM |
| USES / MADE_FROM | PRODUCT→MATERIAL; TECH_PACK→MATERIAL | N:M | — | SYSTEM/CURATED |
| COMPATIBLE_WITH / NOT_COMPATIBLE_WITH | MATERIAL↔PRINT_METHOD; PRODUCT↔PRINT_METHOD | N:M | optional mirror | CURATED |
| SUITABLE_FOR | PRODUCT/MATERIAL→USE_CASE | N:M | — | CURATED |
| TARGETS | PRODUCT/CAPABILITY→AUDIENCE/INDUSTRY | N:M | — | CURATED |
| HAS_MEDIA | * → MEDIA_ASSET \| MEDIA_BUNDLE | N:M | — | SYSTEM (assignments) |
| DOCUMENTED_BY / EVIDENCED_BY | * → KNOWLEDGE_ENTRY \| CASE_STUDY | N:M | — | CURATED/IMPORTED |
| HAS_SEO_TOPIC | PRODUCT/USE_CASE → SEO_TOPIC | N:M | — | SYSTEM/CURATED |
| FEATURED_IN | PRODUCT → BLOG_POST \| CASE_STUDY | N:M | — | SYSTEM/IMPORTED |
| RELATED_TO | KNOWLEDGE_ENTRY ↔ KNOWLEDGE_ENTRY | N:M | undirected via pair order convention | IMPORTED |
| HAS_MOQ_POLICY / HAS_LEAD_TIME_POLICY | PRODUCT → POLICY (KB) | N:M | — | CURATED |
| HAS_CAPABILITY | PRODUCT → CAPABILITY | N:M | — | CURATED/SYSTEM |
| LINKS_TO | SEO_TOPIC → SEO_TOPIC / BLOG_POST | N:M | — | SYSTEM from SeoInternalLinkOpportunity |
| APPLIES_TO | POLICY/FAQ → PRODUCT/USE_CASE | N:M | — | CURATED |
| SUPPORTS / REQUIRES | PRINT_METHOD→MATERIAL; CAPABILITY→PROCESS | N:M | — | CURATED |
| ALTERNATIVE_TO | PRODUCT↔PRODUCT; MATERIAL↔MATERIAL | N:M | mirror | CURATED |

## Identity mapping examples

| Entity type | sourceType | sourceId | canonicalKey |
|-------------|------------|----------|--------------|
| PRODUCT | `Product` | Product.id | Product.slug or `product:{id}` |
| MATERIAL | `ProductionMaterial` | id | ProductionMaterial.code |
| PRINT_METHOD | `PrintMethod` | id | PrintMethod.code |
| SEO_TOPIC | `SeoTopic` | id | SeoTopic.slug |
| MEDIA_BUNDLE | `MediaBundle` | id | slug or id |
| KNOWLEDGE_ENTRY | `KnowledgeBaseEntry` | id | KnowledgeBaseEntry.slug |
| CUSTOMER | `Customer` | id | Customer.code (INTERNAL) |
| CASE_STUDY | `KnowledgeBaseEntry` or `CaseStudyRecord` | id | typed prefix key |

## Non-goals in schema V1

- No embedding columns  
- No adjacency list denormalized on entity rows  
- No FK from graph tables into every master table (app-level integrity + periodic health jobs)  
- No automatic cascade delete of Product when graph node deletes (source owns lifecycle; graph sync removes orphan projections)
