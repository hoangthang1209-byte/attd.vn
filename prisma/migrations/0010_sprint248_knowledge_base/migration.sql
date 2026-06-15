-- Sprint 24.8 — Business Knowledge Base

CREATE TYPE "KnowledgeBaseEntryType" AS ENUM (
  'COMPANY',
  'PRODUCT',
  'MATERIAL',
  'MANUFACTURING',
  'OEM',
  'WHOLESALE',
  'DEALER',
  'PRICING',
  'POLICY',
  'CASE_STUDY',
  'FAQ',
  'SALES_SCRIPT',
  'SEO_CONTEXT',
  'BRAND_VOICE',
  'LOGISTICS',
  'QUALITY_CONTROL',
  'CUSTOMER_SEGMENT',
  'COMPETITOR_NOTE'
);

CREATE TYPE "KnowledgeBaseEntryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "KnowledgeBasePriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TYPE "KnowledgeBaseSourceType" AS ENUM (
  'INTERNAL',
  'WEBSITE',
  'DOCUMENT',
  'STAFF_NOTE',
  'CUSTOMER_FEEDBACK',
  'MANUAL_INPUT'
);

CREATE TABLE IF NOT EXISTS "KnowledgeBaseCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeBaseCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeBaseCategory_slug_key" ON "KnowledgeBaseCategory"("slug");
CREATE INDEX IF NOT EXISTS "KnowledgeBaseCategory_sortOrder_idx" ON "KnowledgeBaseCategory"("sortOrder");

CREATE TABLE IF NOT EXISTS "KnowledgeBaseSource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "KnowledgeBaseSourceType" NOT NULL,
  "url" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeBaseSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "KnowledgeBaseEntry" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "summary" TEXT,
  "content" TEXT,
  "structuredData" JSONB,
  "categoryId" TEXT NOT NULL,
  "type" "KnowledgeBaseEntryType" NOT NULL,
  "status" "KnowledgeBaseEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" "KnowledgeBasePriority" NOT NULL DEFAULT 'MEDIUM',
  "sourceId" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "relatedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "relatedLandingPageSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "relatedBlogPostIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "usageScope" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeBaseEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeBaseEntry_slug_key" ON "KnowledgeBaseEntry"("slug");
CREATE INDEX IF NOT EXISTS "KnowledgeBaseEntry_categoryId_idx" ON "KnowledgeBaseEntry"("categoryId");
CREATE INDEX IF NOT EXISTS "KnowledgeBaseEntry_type_idx" ON "KnowledgeBaseEntry"("type");
CREATE INDEX IF NOT EXISTS "KnowledgeBaseEntry_status_idx" ON "KnowledgeBaseEntry"("status");
CREATE INDEX IF NOT EXISTS "KnowledgeBaseEntry_priority_idx" ON "KnowledgeBaseEntry"("priority");
CREATE INDEX IF NOT EXISTS "KnowledgeBaseEntry_isVerified_idx" ON "KnowledgeBaseEntry"("isVerified");

ALTER TABLE "KnowledgeBaseEntry"
  ADD CONSTRAINT "KnowledgeBaseEntry_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "KnowledgeBaseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KnowledgeBaseEntry"
  ADD CONSTRAINT "KnowledgeBaseEntry_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KnowledgeBaseSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "KnowledgeBaseUsageLog" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "usedFor" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeBaseUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "KnowledgeBaseUsageLog_entryId_idx" ON "KnowledgeBaseUsageLog"("entryId");
CREATE INDEX IF NOT EXISTS "KnowledgeBaseUsageLog_createdAt_idx" ON "KnowledgeBaseUsageLog"("createdAt");

ALTER TABLE "KnowledgeBaseUsageLog"
  ADD CONSTRAINT "KnowledgeBaseUsageLog_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "KnowledgeBaseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
