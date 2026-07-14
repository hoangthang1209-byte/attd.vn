-- Sprint 11.1: Governed AI SEO Brief generation + audit trails
-- Additive only. No auto-approve. No brief/content mutation.

CREATE TYPE "AiGenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AiGenerationType" AS ENUM ('SEO_BRIEF');

CREATE TABLE "AiGenerationRun" (
  "id" TEXT NOT NULL,
  "type" "AiGenerationType" NOT NULL,
  "status" "AiGenerationStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "retrievalRequestId" TEXT,
  "inputHash" TEXT,
  "inputSummary" JSONB,
  "output" JSONB,
  "warnings" JSONB,
  "errorMessage" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "estimatedCostUsd" DECIMAL(12,6),
  "requestedBy" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiGenerationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiGenerationRun_type_entityType_entityId_createdAt_idx"
  ON "AiGenerationRun"("type", "entityType", "entityId", "createdAt");
CREATE INDEX "AiGenerationRun_status_createdAt_idx" ON "AiGenerationRun"("status", "createdAt");
CREATE INDEX "AiGenerationRun_requestedBy_createdAt_idx" ON "AiGenerationRun"("requestedBy", "createdAt");
CREATE INDEX "AiGenerationRun_inputHash_idx" ON "AiGenerationRun"("inputHash");

ALTER TABLE "SeoContentBrief" ADD COLUMN "lastAppliedGenerationRunId" TEXT;
CREATE INDEX "SeoContentBrief_lastAppliedGenerationRunId_idx" ON "SeoContentBrief"("lastAppliedGenerationRunId");
