-- Sprint 16.0 — Governed AI Content Engine Foundation
-- Additive only: expands AiGenerationType, adds AiProposalStatus, and adds
-- nullable proposal-governance columns to AiGenerationRun. Does not touch
-- published content, WritingDraftRecord, or MediaAsset metadata.
--
-- NOTE: PostgreSQL requires each `ALTER TYPE ... ADD VALUE` to run outside of
-- a transaction that also uses the new value. Existing migrations in this
-- repo (e.g. 0072, 0074) apply ADD VALUE statements sequentially in the same
-- file safely because they are not referenced until later migrations/queries.
-- We follow the same convention here.

-- AlterEnum: AiGenerationType (additive; keep SEO_BRIEF)
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'BRIEF_SUGGESTION';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'OUTLINE_SUGGESTION';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'SECTION_DRAFT';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'SECTION_REWRITE';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'SECTION_SHORTEN';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'SECTION_EXPAND';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'SECTION_TONE_CHANGE';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'SECTION_EXAMPLE';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'FAQ_SUGGESTION';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'CTA_SUGGESTION';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'META_SUGGESTION';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'INTERNAL_LINK_SUGGESTION';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'MEDIA_SUGGESTION';
ALTER TYPE "AiGenerationType" ADD VALUE IF NOT EXISTS 'ALT_CAPTION_SUGGESTION';

-- CreateEnum: AiProposalStatus
CREATE TYPE "AiProposalStatus" AS ENUM (
  'REQUESTED',
  'RUNNING',
  'GENERATED',
  'VALIDATION_FAILED',
  'APPLIED',
  'EDITED_AND_APPLIED',
  'REJECTED',
  'FAILED',
  'CANCELLED'
);

-- AlterTable: AiGenerationRun (all additive / nullable — no data migration needed)
ALTER TABLE "AiGenerationRun"
  ADD COLUMN IF NOT EXISTS "proposalStatus" "AiProposalStatus",
  ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "appliedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "sectionId" TEXT,
  ADD COLUMN IF NOT EXISTS "writingDraftId" TEXT,
  ADD COLUMN IF NOT EXISTS "writingPlanId" TEXT,
  ADD COLUMN IF NOT EXISTS "contextBuildId" TEXT,
  ADD COLUMN IF NOT EXISTS "templateId" TEXT,
  ADD COLUMN IF NOT EXISTS "templateVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "factIdsUsed" JSONB,
  ADD COLUMN IF NOT EXISTS "mediaIdsUsed" JSONB;

CREATE INDEX IF NOT EXISTS "AiGenerationRun_proposalStatus_createdAt_idx" ON "AiGenerationRun"("proposalStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "AiGenerationRun_writingDraftId_createdAt_idx" ON "AiGenerationRun"("writingDraftId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiGenerationRun_contextBuildId_idx" ON "AiGenerationRun"("contextBuildId");
