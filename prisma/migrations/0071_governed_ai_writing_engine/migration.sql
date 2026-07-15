-- Sprint 11.3 — Governed AI Writing Engine

CREATE TYPE "WritingContentType" AS ENUM (
  'SEO_ARTICLE',
  'LANDING_PAGE',
  'PRODUCT_GUIDE',
  'CASE_STUDY',
  'KNOWLEDGE_ARTICLE',
  'FAQ_PAGE',
  'CAPABILITY_PAGE',
  'OTHER'
);

CREATE TYPE "WritingPlanStatus" AS ENUM (
  'DRAFT',
  'READY',
  'INVALID',
  'SUPERSEDED',
  'ARCHIVED'
);

CREATE TYPE "WritingDraftStatus" AS ENUM (
  'PLANNED',
  'GENERATING',
  'GENERATED',
  'QA_FAILED',
  'REVIEW_READY',
  'APPROVED',
  'REJECTED',
  'SUPERSEDED'
);

CREATE TABLE "WritingPlanRecord" (
  "id" TEXT NOT NULL,
  "contextBuildId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "briefId" TEXT,
  "contentType" "WritingContentType" NOT NULL,
  "status" "WritingPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "version" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "planHash" TEXT,
  "planJson" JSONB,
  "readinessScore" INTEGER,
  "readinessErrors" JSONB,
  "readinessWarnings" JSONB,
  "requestedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WritingPlanRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingDraftRecord" (
  "id" TEXT NOT NULL,
  "writingPlanId" TEXT NOT NULL,
  "status" "WritingDraftStatus" NOT NULL DEFAULT 'PLANNED',
  "structuredDraft" JSONB,
  "renderedHtml" TEXT,
  "renderedMarkdown" TEXT,
  "qaReport" JSONB,
  "providerRunIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WritingDraftRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WritingPlanRecord_topicId_contentType_createdAt_idx" ON "WritingPlanRecord"("topicId", "contentType", "createdAt");
CREATE INDEX "WritingPlanRecord_contextBuildId_idx" ON "WritingPlanRecord"("contextBuildId");
CREATE INDEX "WritingPlanRecord_inputHash_idx" ON "WritingPlanRecord"("inputHash");
CREATE INDEX "WritingPlanRecord_status_idx" ON "WritingPlanRecord"("status");

CREATE INDEX "WritingDraftRecord_writingPlanId_createdAt_idx" ON "WritingDraftRecord"("writingPlanId", "createdAt");
CREATE INDEX "WritingDraftRecord_status_createdAt_idx" ON "WritingDraftRecord"("status", "createdAt");

ALTER TABLE "WritingDraftRecord" ADD CONSTRAINT "WritingDraftRecord_writingPlanId_fkey" FOREIGN KEY ("writingPlanId") REFERENCES "WritingPlanRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
