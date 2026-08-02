-- Sprint 14.5: Enterprise MediaAsset lifecycle management
-- Backfill all existing assets to ACTIVE / UNKNOWN rights.
-- Does not mutate URL, storageKey, publicId, or consumer references.

CREATE TYPE "MediaLifecycleStatus" AS ENUM (
  'ACTIVE',
  'REVIEW_REQUIRED',
  'DEPRECATED',
  'ARCHIVED',
  'RETIRED'
);

CREATE TYPE "MediaRightsStatus" AS ENUM (
  'OWNED',
  'LICENSED',
  'CUSTOMER_PROVIDED',
  'PARTNER_PROVIDED',
  'UNKNOWN'
);

CREATE TYPE "MediaLifecycleAction" AS ENUM (
  'MARK_REVIEW_REQUIRED',
  'RESTORE',
  'DEPRECATE',
  'ARCHIVE',
  'RETIRE',
  'SELECT_REPLACEMENT',
  'CLEAR_REPLACEMENT',
  'SET_SUPERSEDES',
  'SET_RIGHTS',
  'SET_REVIEW_DATES',
  'REPLACE_PLAN',
  'REPLACE_APPLY',
  'BULK_UPDATE'
);

ALTER TABLE "MediaAsset"
  ADD COLUMN "lifecycleStatus" "MediaLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "deprecatedAt" TIMESTAMP(3),
  ADD COLUMN "deprecatedBy" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedBy" TEXT,
  ADD COLUMN "retiredAt" TIMESTAMP(3),
  ADD COLUMN "retiredBy" TEXT,
  ADD COLUMN "lifecycleReason" TEXT,
  ADD COLUMN "replacementAssetId" TEXT,
  ADD COLUMN "supersedesAssetId" TEXT,
  ADD COLUMN "rightsStatus" "MediaRightsStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "rightsExpiresAt" TIMESTAMP(3),
  ADD COLUMN "rightsOwner" TEXT,
  ADD COLUMN "rightsNotes" TEXT,
  ADD COLUMN "usageRestriction" TEXT,
  ADD COLUMN "lastLifecycleReviewAt" TIMESTAMP(3),
  ADD COLUMN "nextLifecycleReviewAt" TIMESTAMP(3);

CREATE TABLE "MediaAssetLifecycleEvent" (
  "id" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "action" "MediaLifecycleAction" NOT NULL,
  "fromStatus" "MediaLifecycleStatus",
  "toStatus" "MediaLifecycleStatus",
  "actorId" TEXT,
  "reason" TEXT,
  "replacementAssetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAssetLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_lifecycleStatus_idx" ON "MediaAsset"("lifecycleStatus");
CREATE INDEX "MediaAsset_rightsStatus_idx" ON "MediaAsset"("rightsStatus");
CREATE INDEX "MediaAsset_rightsExpiresAt_idx" ON "MediaAsset"("rightsExpiresAt");
CREATE INDEX "MediaAsset_replacementAssetId_idx" ON "MediaAsset"("replacementAssetId");
CREATE INDEX "MediaAsset_supersedesAssetId_idx" ON "MediaAsset"("supersedesAssetId");
CREATE INDEX "MediaAsset_nextLifecycleReviewAt_idx" ON "MediaAsset"("nextLifecycleReviewAt");
CREATE INDEX "MediaAssetLifecycleEvent_mediaAssetId_createdAt_idx" ON "MediaAssetLifecycleEvent"("mediaAssetId", "createdAt");
CREATE INDEX "MediaAssetLifecycleEvent_action_createdAt_idx" ON "MediaAssetLifecycleEvent"("action", "createdAt");

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_replacementAssetId_fkey"
  FOREIGN KEY ("replacementAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_supersedesAssetId_fkey"
  FOREIGN KEY ("supersedesAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAssetLifecycleEvent"
  ADD CONSTRAINT "MediaAssetLifecycleEvent_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
