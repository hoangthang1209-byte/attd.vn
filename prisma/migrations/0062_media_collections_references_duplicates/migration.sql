-- Sprint 10.2: Media Collections, Usage References & Duplicate Detection
-- Additive migration: no storage/URL mutations, no hashing of existing files.

CREATE TYPE "MediaDuplicateStatus" AS ENUM ('UNIQUE', 'POSSIBLE_DUPLICATE', 'CONFIRMED_DUPLICATE', 'IGNORED');

CREATE TABLE "MediaCollection" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MediaCollection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaCollection_code_key" ON "MediaCollection"("code");
CREATE INDEX "MediaCollection_isActive_sortOrder_idx" ON "MediaCollection"("isActive", "sortOrder");
CREATE INDEX "MediaCollection_name_idx" ON "MediaCollection"("name");

CREATE TABLE "MediaAssetCollection" (
  "mediaAssetId" TEXT NOT NULL,
  "mediaCollectionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MediaAssetCollection_pkey" PRIMARY KEY ("mediaAssetId","mediaCollectionId")
);

CREATE INDEX "MediaAssetCollection_mediaCollectionId_idx" ON "MediaAssetCollection"("mediaCollectionId");

ALTER TABLE "MediaAssetCollection"
  ADD CONSTRAINT "MediaAssetCollection_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAssetCollection"
  ADD CONSTRAINT "MediaAssetCollection_mediaCollectionId_fkey"
  FOREIGN KEY ("mediaCollectionId") REFERENCES "MediaCollection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "perceptualHash" TEXT,
  ADD COLUMN "duplicateOfId" TEXT,
  ADD COLUMN "duplicateStatus" "MediaDuplicateStatus" NOT NULL DEFAULT 'UNIQUE';

CREATE INDEX "MediaAsset_contentHash_idx" ON "MediaAsset"("contentHash");
CREATE INDEX "MediaAsset_perceptualHash_idx" ON "MediaAsset"("perceptualHash");
CREATE INDEX "MediaAsset_duplicateOfId_idx" ON "MediaAsset"("duplicateOfId");
CREATE INDEX "MediaAsset_duplicateStatus_idx" ON "MediaAsset"("duplicateStatus");

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_duplicateOfId_fkey"
  FOREIGN KEY ("duplicateOfId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
