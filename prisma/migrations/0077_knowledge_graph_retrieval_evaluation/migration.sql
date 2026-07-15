-- Sprint 12.2 — Knowledge Graph retrieval evaluation persistence

CREATE TYPE "KnowledgeGraphEvaluationStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "KnowledgeGraphEvaluationAnnotationLabel" AS ENUM ('RELEVANT', 'IRRELEVANT', 'DUPLICATE', 'NEEDS_REVIEW');
CREATE TYPE "KnowledgeGraphRolloutMode" AS ENUM ('OFF', 'EVALUATION_ONLY', 'ADMIN_PILOT', 'ENABLED');

CREATE TABLE "KnowledgeGraphEvaluationRun" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "benchmarkSet" TEXT NOT NULL,
  "consumer" TEXT NOT NULL,
  "status" "KnowledgeGraphEvaluationStatus" NOT NULL DEFAULT 'RUNNING',
  "baselineSummary" JSONB,
  "expandedSummary" JSONB,
  "resultSummary" JSONB,
  "thresholdResult" TEXT,
  "requestedBy" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeGraphEvaluationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeGraphEvaluationRun_consumer_createdAt_idx"
  ON "KnowledgeGraphEvaluationRun"("consumer", "createdAt");
CREATE INDEX "KnowledgeGraphEvaluationRun_status_createdAt_idx"
  ON "KnowledgeGraphEvaluationRun"("status", "createdAt");

CREATE TABLE "KnowledgeGraphEvaluationAnnotation" (
  "id" TEXT NOT NULL,
  "runId" TEXT,
  "benchmarkId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetKey" TEXT NOT NULL,
  "label" "KnowledgeGraphEvaluationAnnotationLabel" NOT NULL,
  "note" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeGraphEvaluationAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeGraphEvaluationAnnotation_benchmarkId_targetType_targetKey_label_key"
  ON "KnowledgeGraphEvaluationAnnotation"("benchmarkId", "targetType", "targetKey", "label");
CREATE INDEX "KnowledgeGraphEvaluationAnnotation_benchmarkId_targetType_idx"
  ON "KnowledgeGraphEvaluationAnnotation"("benchmarkId", "targetType");
CREATE INDEX "KnowledgeGraphEvaluationAnnotation_runId_createdAt_idx"
  ON "KnowledgeGraphEvaluationAnnotation"("runId", "createdAt");

ALTER TABLE "KnowledgeGraphEvaluationAnnotation"
  ADD CONSTRAINT "KnowledgeGraphEvaluationAnnotation_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "KnowledgeGraphEvaluationRun"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
