-- Sprint 10.4: Media Content Intelligence, Bundles & Coverage Planning
-- Additive: no storage/URL mutations; no auto-inferred suitability backfill.

CREATE TYPE "MediaContentSuitability" AS ENUM (
  'FEATURED_IMAGE',
  'LANDING_HERO',
  'BLOG_INLINE',
  'BLOG_COVER',
  'PRODUCT_GALLERY',
  'PRODUCT_DETAIL',
  'COMPARISON',
  'PROCESS_STEP',
  'MATERIAL_DETAIL',
  'TECHNIQUE_DETAIL',
  'FACTORY_STORY',
  'CASE_STUDY',
  'TESTIMONIAL',
  'TEAM_PROFILE',
  'TIMELINE',
  'BEFORE_AFTER',
  'SPECIFICATION',
  'SOCIAL_POST',
  'OG_IMAGE',
  'BACKGROUND',
  'CATALOGUE',
  'PRESENTATION',
  'DOCUMENTATION'
);

CREATE TYPE "MediaBundleStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');

CREATE TYPE "MediaBundleContentType" AS ENUM (
  'BLOG_ARTICLE',
  'LANDING_PAGE',
  'PRODUCT_CONTENT',
  'CASE_STUDY',
  'CAMPAIGN',
  'SOCIAL',
  'PRESENTATION',
  'GENERAL'
);

CREATE TYPE "MediaBundleSlotType" AS ENUM (
  'HERO',
  'FEATURED',
  'COVER',
  'GALLERY',
  'INLINE',
  'PRODUCT',
  'FACTORY',
  'PROCESS',
  'MATERIAL',
  'TECHNIQUE',
  'PACKAGING',
  'CUSTOMER',
  'TEAM',
  'TESTIMONIAL',
  'BEFORE_AFTER',
  'TIMELINE',
  'OG_IMAGE',
  'BACKGROUND',
  'DOCUMENTATION',
  'OTHER'
);

ALTER TABLE "MediaAsset"
  ADD COLUMN "contentSuitabilities" "MediaContentSuitability"[] DEFAULT ARRAY[]::"MediaContentSuitability"[];

CREATE TABLE "MediaBundle" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "MediaBundleStatus" NOT NULL DEFAULT 'DRAFT',
  "contentType" "MediaBundleContentType" NOT NULL DEFAULT 'GENERAL',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "query" TEXT,
  "subjectTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "industryTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "useCaseTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "techniqueTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MediaBundle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaBundle_code_key" ON "MediaBundle"("code");
CREATE INDEX "MediaBundle_status_idx" ON "MediaBundle"("status");
CREATE INDEX "MediaBundle_contentType_isActive_sortOrder_idx" ON "MediaBundle"("contentType", "isActive", "sortOrder");
CREATE INDEX "MediaBundle_name_idx" ON "MediaBundle"("name");

CREATE TABLE "MediaBundleSlot" (
  "id" TEXT NOT NULL,
  "mediaBundleId" TEXT NOT NULL,
  "slotType" "MediaBundleSlotType" NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "minAssets" INTEGER NOT NULL DEFAULT 1,
  "maxAssets" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "MediaBundleSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaBundleSlot_mediaBundleId_sortOrder_idx" ON "MediaBundleSlot"("mediaBundleId", "sortOrder");
CREATE INDEX "MediaBundleSlot_slotType_idx" ON "MediaBundleSlot"("slotType");

ALTER TABLE "MediaBundleSlot"
  ADD CONSTRAINT "MediaBundleSlot_mediaBundleId_fkey"
  FOREIGN KEY ("mediaBundleId") REFERENCES "MediaBundle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MediaBundleSlotAsset" (
  "mediaBundleSlotId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MediaBundleSlotAsset_pkey" PRIMARY KEY ("mediaBundleSlotId","mediaAssetId")
);

CREATE INDEX "MediaBundleSlotAsset_mediaAssetId_idx" ON "MediaBundleSlotAsset"("mediaAssetId");
CREATE INDEX "MediaBundleSlotAsset_mediaBundleSlotId_sortOrder_idx" ON "MediaBundleSlotAsset"("mediaBundleSlotId", "sortOrder");

ALTER TABLE "MediaBundleSlotAsset"
  ADD CONSTRAINT "MediaBundleSlotAsset_mediaBundleSlotId_fkey"
  FOREIGN KEY ("mediaBundleSlotId") REFERENCES "MediaBundleSlot"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaBundleSlotAsset"
  ADD CONSTRAINT "MediaBundleSlotAsset_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
