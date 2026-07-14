-- Sprint 11.0B: Enterprise AI Retrieval Layer Foundation
-- Additive: KB review/expiration fields + retrieval audit log. No master-data copy.

CREATE TYPE "AiRetrievalConsumer" AS ENUM (
  'SEO_CONTENT',
  'SEO_BRIEF',
  'SEO_TOPIC_PLANNER',
  'SALES_COPILOT',
  'SUPPORT_COPILOT',
  'QUOTATION_ASSISTANT',
  'MANUFACTURING_ASSISTANT',
  'PROCUREMENT_ASSISTANT',
  'INTERNAL_SEARCH',
  'BUSINESS_INTELLIGENCE',
  'ADMIN'
);

CREATE TYPE "AiRetrievalPurpose" AS ENUM (
  'RESEARCH',
  'CONTENT_PLANNING',
  'CONTENT_WRITING',
  'CONTENT_REVIEW',
  'SALES_RESPONSE',
  'CUSTOMER_SUPPORT',
  'QUOTATION',
  'MANUFACTURING_GUIDANCE',
  'PROCUREMENT',
  'INTERNAL_ANALYSIS',
  'PUBLIC_OUTPUT'
);

ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "reviewIntervalDays" INTEGER;
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "nextReviewAt" TIMESTAMP(3);
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "KnowledgeBaseEntry_expiresAt_idx" ON "KnowledgeBaseEntry"("expiresAt");
CREATE INDEX "KnowledgeBaseEntry_nextReviewAt_idx" ON "KnowledgeBaseEntry"("nextReviewAt");

-- Only set nextReviewAt when reviewIntervalDays already exists (none today — no fabricated dates).
UPDATE "KnowledgeBaseEntry"
SET "nextReviewAt" = COALESCE("lastVerifiedAt", "verifiedAt", "updatedAt") + ("reviewIntervalDays" * INTERVAL '1 day')
WHERE "reviewIntervalDays" IS NOT NULL AND "nextReviewAt" IS NULL;

CREATE TABLE "AiRetrievalLog" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "consumer" "AiRetrievalConsumer" NOT NULL,
  "purpose" "AiRetrievalPurpose" NOT NULL,
  "query" TEXT NOT NULL,
  "sourceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "conflictCount" INTEGER NOT NULL DEFAULT 0,
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "omittedCount" INTEGER NOT NULL DEFAULT 0,
  "maxVisibilityUsed" TEXT NOT NULL,
  "userId" TEXT,
  "entityScope" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiRetrievalLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiRetrievalLog_requestId_key" ON "AiRetrievalLog"("requestId");
CREATE INDEX "AiRetrievalLog_consumer_createdAt_idx" ON "AiRetrievalLog"("consumer", "createdAt");
CREATE INDEX "AiRetrievalLog_userId_createdAt_idx" ON "AiRetrievalLog"("userId", "createdAt");
