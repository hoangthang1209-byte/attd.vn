-- Phase 1A v2: Lead intake foundation (additive only)
-- Issue #71

ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'GMAIL';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'MANUAL';

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "sourceRef" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "intakeMetadata" JSONB;

CREATE INDEX IF NOT EXISTS "Lead_assignedTo_idx" ON "Lead"("assignedTo");
CREATE INDEX IF NOT EXISTS "Lead_sourceRef_idx" ON "Lead"("sourceRef");

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_source_sourceRef_key" ON "Lead"("source", "sourceRef");
