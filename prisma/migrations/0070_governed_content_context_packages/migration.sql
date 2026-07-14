-- Sprint 11.2: Governed Content Context Package builds (no auto-build, no AI)

CREATE TYPE "ContentContextPurpose" AS ENUM (
  'SEO_ARTICLE',
  'SEO_LANDING_PAGE',
  'PRODUCT_GUIDE',
  'CASE_STUDY',
  'KNOWLEDGE_ARTICLE',
  'CONTENT_REVIEW'
);

CREATE TYPE "ContentContextBuildStatus" AS ENUM (
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'SUPERSEDED'
);

CREATE TABLE "ContentContextBuild" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "briefId" TEXT,
  "purpose" "ContentContextPurpose" NOT NULL,
  "status" "ContentContextBuildStatus" NOT NULL DEFAULT 'RUNNING',
  "version" TEXT NOT NULL,
  "retrievalRequestId" TEXT,
  "inputHash" TEXT NOT NULL,
  "packageHash" TEXT,
  "readinessScore" INTEGER,
  "readinessErrors" JSONB,
  "readinessWarnings" JSONB,
  "sourceManifest" JSONB,
  "budgetSummary" JSONB,
  "packageJson" JSONB,
  "errorMessage" TEXT,
  "requestedBy" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentContextBuild_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentContextBuild_topicId_purpose_createdAt_idx"
  ON "ContentContextBuild"("topicId", "purpose", "createdAt");
CREATE INDEX "ContentContextBuild_status_createdAt_idx"
  ON "ContentContextBuild"("status", "createdAt");
CREATE INDEX "ContentContextBuild_inputHash_idx"
  ON "ContentContextBuild"("inputHash");
CREATE INDEX "ContentContextBuild_topicId_purpose_status_idx"
  ON "ContentContextBuild"("topicId", "purpose", "status");
