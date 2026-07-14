-- Sprint 11.0: SEO Content Platform Foundation (strategy, clusters, topics, briefs)
-- Additive: no fake metrics, no Blog/Media mutations.

CREATE TYPE "SeoStrategyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

CREATE TYPE "SeoTopicStatus" AS ENUM (
  'IDEA', 'RESEARCHING', 'APPROVED', 'BRIEF_READY', 'DRAFTING', 'REVIEW',
  'PUBLISHED', 'PAUSED', 'REJECTED', 'ARCHIVED'
);

CREATE TYPE "SeoSearchIntent" AS ENUM (
  'INFORMATIONAL', 'COMMERCIAL', 'TRANSACTIONAL', 'NAVIGATIONAL', 'LOCAL', 'MIXED'
);

CREATE TYPE "SeoContentType" AS ENUM (
  'BLOG_ARTICLE', 'LANDING_PAGE', 'CATEGORY_PAGE', 'PRODUCT_GUIDE', 'CASE_STUDY',
  'KNOWLEDGE_BASE', 'COMPARISON', 'GLOSSARY', 'FAQ', 'CAPABILITY_PAGE', 'DEALER_CONTENT', 'OTHER'
);

CREATE TYPE "SeoFunnelStage" AS ENUM ('AWARENESS', 'CONSIDERATION', 'DECISION', 'RETENTION');

CREATE TYPE "SeoTopicPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

CREATE TYPE "SeoKeywordType" AS ENUM (
  'PRIMARY', 'SECONDARY', 'LONG_TAIL', 'QUESTION', 'ENTITY', 'SUPPORTING', 'NEGATIVE'
);

CREATE TYPE "SeoTargetEntityType" AS ENUM (
  'BLOG_POST', 'LANDING_PAGE', 'PRODUCT', 'CATEGORY', 'MANUFACTURING_ASSET', 'DEALER_PAGE', 'EXTERNAL', 'NONE'
);

CREATE TYPE "SeoInternalLinkStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED');

CREATE TABLE "SeoStrategy" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "SeoStrategyStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "ownerId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoStrategy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoStrategy_code_key" ON "SeoStrategy"("code");
CREATE INDEX "SeoStrategy_status_sortOrder_idx" ON "SeoStrategy"("status", "sortOrder");
CREATE INDEX "SeoStrategy_createdAt_idx" ON "SeoStrategy"("createdAt");

CREATE TABLE "SeoTopicCluster" (
  "id" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "parentId" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "description" TEXT,
  "pillarTopic" TEXT,
  "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "businessGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoTopicCluster_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeoTopicCluster_strategyId_sortOrder_idx" ON "SeoTopicCluster"("strategyId", "sortOrder");
CREATE INDEX "SeoTopicCluster_parentId_idx" ON "SeoTopicCluster"("parentId");
CREATE INDEX "SeoTopicCluster_isActive_idx" ON "SeoTopicCluster"("isActive");

ALTER TABLE "SeoTopicCluster"
  ADD CONSTRAINT "SeoTopicCluster_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "SeoStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeoTopicCluster"
  ADD CONSTRAINT "SeoTopicCluster_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "SeoTopicCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SeoTopic" (
  "id" TEXT NOT NULL,
  "clusterId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT,
  "description" TEXT,
  "primaryKeyword" TEXT NOT NULL,
  "searchIntent" "SeoSearchIntent" NOT NULL,
  "contentType" "SeoContentType" NOT NULL,
  "funnelStage" "SeoFunnelStage" NOT NULL,
  "priority" "SeoTopicPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SeoTopicStatus" NOT NULL DEFAULT 'IDEA',
  "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "businessValue" INTEGER NOT NULL DEFAULT 0,
  "relevanceScore" INTEGER NOT NULL DEFAULT 0,
  "opportunityScore" INTEGER NOT NULL DEFAULT 0,
  "confidenceScore" INTEGER NOT NULL DEFAULT 0,
  "targetEntityType" "SeoTargetEntityType" NOT NULL DEFAULT 'NONE',
  "targetEntityId" TEXT,
  "targetUrl" TEXT,
  "existingUrl" TEXT,
  "canonicalUrl" TEXT,
  "notes" TEXT,
  "assignedTo" TEXT,
  "dueDate" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "mediaBundleId" TEXT,
  "mediaPlanScore" INTEGER,
  "mediaPlanStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoTopic_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeoTopic_clusterId_status_priority_idx" ON "SeoTopic"("clusterId", "status", "priority");
CREATE INDEX "SeoTopic_searchIntent_idx" ON "SeoTopic"("searchIntent");
CREATE INDEX "SeoTopic_contentType_idx" ON "SeoTopic"("contentType");
CREATE INDEX "SeoTopic_funnelStage_idx" ON "SeoTopic"("funnelStage");
CREATE INDEX "SeoTopic_targetEntityType_targetEntityId_idx" ON "SeoTopic"("targetEntityType", "targetEntityId");
CREATE INDEX "SeoTopic_mediaBundleId_idx" ON "SeoTopic"("mediaBundleId");
CREATE INDEX "SeoTopic_dueDate_idx" ON "SeoTopic"("dueDate");
CREATE INDEX "SeoTopic_primaryKeyword_idx" ON "SeoTopic"("primaryKeyword");

ALTER TABLE "SeoTopic"
  ADD CONSTRAINT "SeoTopic_clusterId_fkey"
  FOREIGN KEY ("clusterId") REFERENCES "SeoTopicCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeoTopic"
  ADD CONSTRAINT "SeoTopic_mediaBundleId_fkey"
  FOREIGN KEY ("mediaBundleId") REFERENCES "MediaBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SeoKeyword" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "normalized" TEXT NOT NULL,
  "keywordType" "SeoKeywordType" NOT NULL,
  "searchIntent" "SeoSearchIntent",
  "source" TEXT,
  "searchVolume" INTEGER,
  "keywordDifficulty" DECIMAL(5,2),
  "cpc" DECIMAL(12,2),
  "priority" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoKeyword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoKeyword_topicId_normalized_key" ON "SeoKeyword"("topicId", "normalized");
CREATE INDEX "SeoKeyword_normalized_idx" ON "SeoKeyword"("normalized");
CREATE INDEX "SeoKeyword_keywordType_idx" ON "SeoKeyword"("keywordType");

ALTER TABLE "SeoKeyword"
  ADD CONSTRAINT "SeoKeyword_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "SeoTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SeoContentBrief" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "workingTitle" TEXT,
  "proposedSlug" TEXT,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "searchIntentNotes" TEXT,
  "audienceNotes" TEXT,
  "valueProposition" TEXT,
  "outline" JSONB NOT NULL DEFAULT '[]',
  "questions" JSONB NOT NULL DEFAULT '[]',
  "entities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requiredSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "ctaType" TEXT,
  "ctaText" TEXT,
  "wordCountMin" INTEGER,
  "wordCountMax" INTEGER,
  "schemaTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "mediaRequirements" JSONB,
  "editorNotes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoContentBrief_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoContentBrief_topicId_key" ON "SeoContentBrief"("topicId");

ALTER TABLE "SeoContentBrief"
  ADD CONSTRAINT "SeoContentBrief_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "SeoTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SeoInternalLinkOpportunity" (
  "id" TEXT NOT NULL,
  "sourceTopicId" TEXT NOT NULL,
  "targetTopicId" TEXT NOT NULL,
  "anchorText" TEXT,
  "context" TEXT,
  "relevanceScore" INTEGER NOT NULL DEFAULT 0,
  "status" "SeoInternalLinkStatus" NOT NULL DEFAULT 'SUGGESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoInternalLinkOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoInternalLinkOpportunity_sourceTopicId_targetTopicId_key"
  ON "SeoInternalLinkOpportunity"("sourceTopicId", "targetTopicId");
CREATE INDEX "SeoInternalLinkOpportunity_targetTopicId_status_idx"
  ON "SeoInternalLinkOpportunity"("targetTopicId", "status");

ALTER TABLE "SeoInternalLinkOpportunity"
  ADD CONSTRAINT "SeoInternalLinkOpportunity_sourceTopicId_fkey"
  FOREIGN KEY ("sourceTopicId") REFERENCES "SeoTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeoInternalLinkOpportunity"
  ADD CONSTRAINT "SeoInternalLinkOpportunity_targetTopicId_fkey"
  FOREIGN KEY ("targetTopicId") REFERENCES "SeoTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
