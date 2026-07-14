-- Sprint 10.5: Content media assignments + optional Blog ↔ Media Bundle link
-- Additive: preserves Blog URL fields and MediaAsset storage/URL fields.

CREATE TYPE "ContentMediaEntityType" AS ENUM (
  'BLOG_POST',
  'LANDING_PAGE',
  'SEO_DRAFT',
  'CASE_STUDY',
  'OTHER'
);

CREATE TYPE "ContentMediaPlacement" AS ENUM (
  'FEATURED',
  'COVER',
  'OG_IMAGE',
  'INLINE',
  'HERO',
  'GALLERY',
  'BACKGROUND',
  'PROCESS',
  'MATERIAL',
  'TECHNIQUE',
  'FACTORY',
  'OTHER'
);

CREATE TABLE "ContentMediaAssignment" (
  "id" TEXT NOT NULL,
  "entityType" "ContentMediaEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "placement" "ContentMediaPlacement" NOT NULL,
  "slotKey" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "altTextOverride" TEXT,
  "captionOverride" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentMediaAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentMediaAssignment_entityType_entityId_placement_mediaAssetId_slotKey_key"
  ON "ContentMediaAssignment"("entityType", "entityId", "placement", "mediaAssetId", "slotKey");

CREATE INDEX "ContentMediaAssignment_entityType_entityId_idx"
  ON "ContentMediaAssignment"("entityType", "entityId");

CREATE INDEX "ContentMediaAssignment_mediaAssetId_idx"
  ON "ContentMediaAssignment"("mediaAssetId");

CREATE INDEX "ContentMediaAssignment_entityType_entityId_placement_sortOrder_idx"
  ON "ContentMediaAssignment"("entityType", "entityId", "placement", "sortOrder");

ALTER TABLE "ContentMediaAssignment"
  ADD CONSTRAINT "ContentMediaAssignment_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BlogPost"
  ADD COLUMN "mediaBundleId" TEXT;

CREATE INDEX "BlogPost_mediaBundleId_idx" ON "BlogPost"("mediaBundleId");

ALTER TABLE "BlogPost"
  ADD CONSTRAINT "BlogPost_mediaBundleId_fkey"
  FOREIGN KEY ("mediaBundleId") REFERENCES "MediaBundle"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
