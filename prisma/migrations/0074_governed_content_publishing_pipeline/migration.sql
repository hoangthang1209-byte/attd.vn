-- Sprint 11.6 — Governed Content Publishing Pipeline

ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "BlogPost"
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastPublishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastUnpublishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduledBy" TEXT,
  ADD COLUMN IF NOT EXISTS "publishVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastPublishedContentHash" TEXT,
  ADD COLUMN IF NOT EXISTS "publishReadinessAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishReadinessAcknowledgedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "publishAckNote" TEXT,
  ADD COLUMN IF NOT EXISTS "needsContentReview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "BlogPost_scheduledAt_status_idx" ON "BlogPost"("scheduledAt", "status");

DO $$ BEGIN
  CREATE TYPE "ContentPublishAction" AS ENUM ('PUBLISH_NOW', 'SCHEDULE', 'RESCHEDULE', 'CANCEL_SCHEDULE', 'UNPUBLISH', 'ARCHIVE', 'RESTORE_DRAFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContentPublishEventStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ContentPublishEvent" (
    "id" TEXT NOT NULL,
    "blogPostId" TEXT NOT NULL,
    "action" "ContentPublishAction" NOT NULL,
    "status" "ContentPublishEventStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "previousStatus" TEXT,
    "nextStatus" TEXT,
    "readinessSnapshot" JSONB,
    "sourceHandoffId" TEXT,
    "sourceWritingDraftId" TEXT,
    "sourceDraftVersion" INTEGER,
    "contentSnapshotHash" TEXT,
    "idempotencyHash" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPublishEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContentPublishEvent_blogPostId_createdAt_idx" ON "ContentPublishEvent"("blogPostId", "createdAt");
CREATE INDEX IF NOT EXISTS "ContentPublishEvent_action_status_createdAt_idx" ON "ContentPublishEvent"("action", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ContentPublishEvent_scheduledFor_status_idx" ON "ContentPublishEvent"("scheduledFor", "status");
CREATE INDEX IF NOT EXISTS "ContentPublishEvent_requestedBy_createdAt_idx" ON "ContentPublishEvent"("requestedBy", "createdAt");
CREATE INDEX IF NOT EXISTS "ContentPublishEvent_idempotencyHash_idx" ON "ContentPublishEvent"("idempotencyHash");
