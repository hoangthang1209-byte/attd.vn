-- Patch 24.9.4e — Product import history & feedback files

ALTER TYPE "ProductImportJobStatus" ADD VALUE IF NOT EXISTS 'UPLOADED';
ALTER TYPE "ProductImportJobStatus" ADD VALUE IF NOT EXISTS 'PREVIEWED';
ALTER TYPE "ProductImportJobStatus" ADD VALUE IF NOT EXISTS 'VALIDATED';
ALTER TYPE "ProductImportJobStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "ProductImportJobStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "fileType" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "preset" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "duplicateStrategy" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "validRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "errorCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "warningCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "originalFileKey" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "feedbackFileUrl" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "feedbackFileKey" TEXT;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "summaryJson" JSONB;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "errorsJson" JSONB;
ALTER TABLE "ProductImportJob" ADD COLUMN IF NOT EXISTS "warningsJson" JSONB;

CREATE INDEX IF NOT EXISTS "ProductImportJob_createdAt_idx" ON "ProductImportJob"("createdAt");
CREATE INDEX IF NOT EXISTS "ProductImportJob_status_idx" ON "ProductImportJob"("status");
