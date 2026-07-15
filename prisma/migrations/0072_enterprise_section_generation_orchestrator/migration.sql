-- Sprint 11.4 — Enterprise Section Generation Orchestrator

CREATE TYPE "WritingGenerationRunStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'PARTIAL',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "WritingSectionGenerationStatus" AS ENUM (
  'PENDING',
  'READY',
  'RUNNING',
  'GENERATED',
  'VALIDATION_FAILED',
  'QA_FAILED',
  'FAILED',
  'CANCELLED',
  'LOCKED',
  'SUPERSEDED'
);

CREATE TYPE "WritingSectionGenerationTrigger" AS ENUM (
  'INITIAL',
  'RETRY',
  'REGENERATE',
  'REPAIR',
  'MANUAL'
);

CREATE TYPE "WritingSectionLockReason" AS ENUM (
  'USER_EDITED',
  'USER_APPROVED',
  'MANUAL_LOCK',
  'PUBLISHED_SNAPSHOT'
);

ALTER TABLE "WritingDraftRecord"
  ADD COLUMN "sectionLocks" JSONB,
  ADD COLUMN "latestGenerationRunId" TEXT,
  ADD COLUMN "generatedSectionCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failedSectionCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "WritingGenerationRun" (
  "id" TEXT NOT NULL,
  "writingPlanId" TEXT NOT NULL,
  "writingDraftId" TEXT,
  "status" "WritingGenerationRunStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "configurationVersion" TEXT NOT NULL,
  "requestedBy" TEXT,
  "requestedSectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "completedSectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "failedSectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "estimatedCostUsd" DECIMAL(12,6),
  "latencyMs" INTEGER,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WritingGenerationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingSectionGeneration" (
  "id" TEXT NOT NULL,
  "generationRunId" TEXT NOT NULL,
  "writingPlanId" TEXT NOT NULL,
  "writingDraftId" TEXT,
  "sectionId" TEXT NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "status" "WritingSectionGenerationStatus" NOT NULL DEFAULT 'PENDING',
  "trigger" "WritingSectionGenerationTrigger" NOT NULL DEFAULT 'INITIAL',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "requestSnapshot" JSONB,
  "outputJson" JSONB,
  "validationIssues" JSONB,
  "qaIssues" JSONB,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "estimatedCostUsd" DECIMAL(12,6),
  "latencyMs" INTEGER,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WritingSectionGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingDraftVersion" (
  "id" TEXT NOT NULL,
  "writingDraftId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "structuredDraft" JSONB NOT NULL,
  "qaReport" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WritingDraftVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WritingGenerationRun_writingPlanId_createdAt_idx" ON "WritingGenerationRun"("writingPlanId", "createdAt");
CREATE INDEX "WritingGenerationRun_writingDraftId_createdAt_idx" ON "WritingGenerationRun"("writingDraftId", "createdAt");
CREATE INDEX "WritingGenerationRun_status_createdAt_idx" ON "WritingGenerationRun"("status", "createdAt");
CREATE INDEX "WritingGenerationRun_requestedBy_createdAt_idx" ON "WritingGenerationRun"("requestedBy", "createdAt");

CREATE INDEX "WritingSectionGeneration_generationRunId_status_idx" ON "WritingSectionGeneration"("generationRunId", "status");
CREATE INDEX "WritingSectionGeneration_writingPlanId_sectionId_createdAt_idx" ON "WritingSectionGeneration"("writingPlanId", "sectionId", "createdAt");
CREATE INDEX "WritingSectionGeneration_writingDraftId_sectionId_createdAt_idx" ON "WritingSectionGeneration"("writingDraftId", "sectionId", "createdAt");
CREATE INDEX "WritingSectionGeneration_requestHash_idx" ON "WritingSectionGeneration"("requestHash");

CREATE UNIQUE INDEX "WritingDraftVersion_writingDraftId_version_key" ON "WritingDraftVersion"("writingDraftId", "version");
CREATE INDEX "WritingDraftVersion_writingDraftId_createdAt_idx" ON "WritingDraftVersion"("writingDraftId", "createdAt");

ALTER TABLE "WritingGenerationRun" ADD CONSTRAINT "WritingGenerationRun_writingDraftId_fkey" FOREIGN KEY ("writingDraftId") REFERENCES "WritingDraftRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WritingSectionGeneration" ADD CONSTRAINT "WritingSectionGeneration_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "WritingGenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingDraftVersion" ADD CONSTRAINT "WritingDraftVersion_writingDraftId_fkey" FOREIGN KEY ("writingDraftId") REFERENCES "WritingDraftRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
