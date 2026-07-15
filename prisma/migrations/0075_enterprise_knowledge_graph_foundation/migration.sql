-- Sprint 12.0 — Enterprise Knowledge Graph Foundation (thin overlay; no backfill)

CREATE TYPE "KnowledgeGraphEntityType" AS ENUM (
  'PRODUCT', 'PRODUCT_CATEGORY', 'MATERIAL', 'TRIM', 'PRINT_METHOD', 'TECHNIQUE',
  'CAPABILITY', 'INDUSTRY', 'AUDIENCE', 'USE_CASE', 'CASE_STUDY', 'POLICY', 'FAQ',
  'MEDIA_BUNDLE', 'SEO_TOPIC', 'BLOG_POST', 'TECH_PACK', 'PATTERN', 'KNOWLEDGE_ENTRY'
);

CREATE TYPE "KnowledgeGraphRelationshipType" AS ENUM (
  'IS_A', 'PART_OF', 'BELONGS_TO', 'USES', 'MADE_FROM', 'COMPATIBLE_WITH', 'NOT_COMPATIBLE_WITH',
  'SUPPORTS', 'REQUIRES', 'APPLIES_TO', 'TARGETS', 'SUITABLE_FOR', 'USED_IN', 'FEATURED_IN',
  'DOCUMENTED_BY', 'EVIDENCED_BY', 'RELATED_TO', 'ALTERNATIVE_TO', 'HAS_CAPABILITY', 'HAS_POLICY',
  'HAS_MEDIA', 'HAS_CASE_STUDY', 'HAS_SEO_TOPIC', 'LINKS_TO'
);

CREATE TYPE "KnowledgeGraphEntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ORPHANED', 'ARCHIVED');

CREATE TYPE "KnowledgeGraphRelationshipStatus" AS ENUM (
  'DRAFT', 'SUGGESTED', 'ACTIVE', 'REJECTED', 'SUPERSEDED', 'ARCHIVED'
);

CREATE TYPE "KnowledgeGraphRelationshipOrigin" AS ENUM (
  'SYSTEM_DERIVED', 'CURATED', 'IMPORTED'
);

CREATE TABLE "KnowledgeGraphEntity" (
  "id" TEXT NOT NULL,
  "entityType" "KnowledgeGraphEntityType" NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "visibility" "KnowledgeBaseVisibility" NOT NULL,
  "status" "KnowledgeGraphEntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeGraphEntity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeGraphEntity_sourceType_sourceId_key" ON "KnowledgeGraphEntity"("sourceType", "sourceId");
CREATE UNIQUE INDEX "KnowledgeGraphEntity_entityType_canonicalKey_key" ON "KnowledgeGraphEntity"("entityType", "canonicalKey");
CREATE INDEX "KnowledgeGraphEntity_entityType_visibility_status_idx" ON "KnowledgeGraphEntity"("entityType", "visibility", "status");
CREATE INDEX "KnowledgeGraphEntity_displayName_idx" ON "KnowledgeGraphEntity"("displayName");
CREATE INDEX "KnowledgeGraphEntity_lastSyncedAt_idx" ON "KnowledgeGraphEntity"("lastSyncedAt");

CREATE TABLE "KnowledgeGraphRelationship" (
  "id" TEXT NOT NULL,
  "fromEntityId" TEXT NOT NULL,
  "toEntityId" TEXT NOT NULL,
  "relationshipType" "KnowledgeGraphRelationshipType" NOT NULL,
  "status" "KnowledgeGraphRelationshipStatus" NOT NULL DEFAULT 'DRAFT',
  "origin" "KnowledgeGraphRelationshipOrigin" NOT NULL,
  "visibility" "KnowledgeBaseVisibility" NOT NULL,
  "authorityRank" INTEGER NOT NULL DEFAULT 0,
  "confidence" INTEGER,
  "sourceEntryId" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "evidenceUrl" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "lastVerifiedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeGraphRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeGraphRelationship_fromEntityId_toEntityId_relationshipType_key"
  ON "KnowledgeGraphRelationship"("fromEntityId", "toEntityId", "relationshipType");
CREATE INDEX "KnowledgeGraphRelationship_fromEntityId_relationshipType_status_idx"
  ON "KnowledgeGraphRelationship"("fromEntityId", "relationshipType", "status");
CREATE INDEX "KnowledgeGraphRelationship_toEntityId_relationshipType_status_idx"
  ON "KnowledgeGraphRelationship"("toEntityId", "relationshipType", "status");
CREATE INDEX "KnowledgeGraphRelationship_status_visibility_idx"
  ON "KnowledgeGraphRelationship"("status", "visibility");
CREATE INDEX "KnowledgeGraphRelationship_origin_status_idx"
  ON "KnowledgeGraphRelationship"("origin", "status");
CREATE INDEX "KnowledgeGraphRelationship_validUntil_idx"
  ON "KnowledgeGraphRelationship"("validUntil");

ALTER TABLE "KnowledgeGraphRelationship"
  ADD CONSTRAINT "KnowledgeGraphRelationship_fromEntityId_fkey"
  FOREIGN KEY ("fromEntityId") REFERENCES "KnowledgeGraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeGraphRelationship"
  ADD CONSTRAINT "KnowledgeGraphRelationship_toEntityId_fkey"
  FOREIGN KEY ("toEntityId") REFERENCES "KnowledgeGraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
