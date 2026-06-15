-- Sprint 24.8.3 — extend KnowledgeBaseImportJob

CREATE TYPE "KnowledgeBaseImportJobStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'PARTIAL');

ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "fileType" TEXT NOT NULL DEFAULT 'csv';
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "validRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "invalidRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "updatedRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "duplicateRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "status" "KnowledgeBaseImportJobStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "KnowledgeBaseImportJob" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill from legacy columns if present
UPDATE "KnowledgeBaseImportJob"
SET "validRows" = COALESCE("imported", 0),
    "updatedAt" = COALESCE("updatedAt", "createdAt")
WHERE "validRows" = 0;
