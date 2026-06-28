-- Sprint 28.0.2: Structured BOM, Artwork Placements, Measurement Templates, Release Audit

CREATE TYPE "TechPackBomCategory" AS ENUM (
  'MAIN_FABRIC',
  'RIB',
  'COLLAR',
  'CUFF',
  'NECK_LABEL',
  'CARE_LABEL',
  'HANG_TAG',
  'POLY_BAG',
  'CARTON',
  'THREAD',
  'BUTTON',
  'ZIPPER',
  'DRAWCORD',
  'ELASTIC',
  'ACCESSORY',
  'OTHER'
);

CREATE TYPE "ArtworkPlacementType" AS ENUM (
  'PRINT',
  'EMBROIDERY',
  'LABEL',
  'PATCH',
  'HEAT_TRANSFER',
  'SUBLIMATION',
  'OTHER'
);

CREATE TYPE "TechPackReleaseAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'RELEASED',
  'SUPERSEDED',
  'NEW_VERSION',
  'SELECT_PATTERN',
  'COPY_TEMPLATE'
);

ALTER TABLE "TechPack" ADD COLUMN "patternExceptionReason" TEXT;

CREATE TABLE "TechPackBomItem" (
  "id" TEXT NOT NULL,
  "techPackId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "category" "TechPackBomCategory" NOT NULL DEFAULT 'OTHER',
  "itemName" TEXT NOT NULL,
  "specification" TEXT,
  "color" TEXT,
  "supplier" TEXT,
  "unit" TEXT,
  "consumption" TEXT,
  "wastePercent" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechPackBomItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechPackArtworkPlacement" (
  "id" TEXT NOT NULL,
  "techPackId" TEXT NOT NULL,
  "artworkAssetId" TEXT,
  "placementType" "ArtworkPlacementType" NOT NULL DEFAULT 'OTHER',
  "title" TEXT,
  "bodyPart" TEXT,
  "width" TEXT,
  "height" TEXT,
  "measurementUnit" TEXT,
  "printMethod" TEXT,
  "embroideryMethod" TEXT,
  "inkColors" TEXT,
  "threadColors" TEXT,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechPackArtworkPlacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechPackReleaseHistory" (
  "id" TEXT NOT NULL,
  "techPackId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" "TechPackReleaseAction" NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "snapshotJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechPackReleaseHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeasurementTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "productCategoryId" TEXT,
  "baseSize" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeasurementTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeasurementTemplateItem" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "pointOfMeasure" TEXT NOT NULL,
  "description" TEXT,
  "tolerance" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeasurementTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeasurementTemplateValue" (
  "id" TEXT NOT NULL,
  "measurementId" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeasurementTemplateValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeasurementTemplate_code_key" ON "MeasurementTemplate"("code");
CREATE INDEX "TechPackBomItem_techPackId_idx" ON "TechPackBomItem"("techPackId");
CREATE INDEX "TechPackBomItem_sortOrder_idx" ON "TechPackBomItem"("sortOrder");
CREATE INDEX "TechPackArtworkPlacement_techPackId_idx" ON "TechPackArtworkPlacement"("techPackId");
CREATE INDEX "TechPackArtworkPlacement_artworkAssetId_idx" ON "TechPackArtworkPlacement"("artworkAssetId");
CREATE INDEX "TechPackReleaseHistory_techPackId_idx" ON "TechPackReleaseHistory"("techPackId");
CREATE INDEX "TechPackReleaseHistory_createdAt_idx" ON "TechPackReleaseHistory"("createdAt");
CREATE INDEX "MeasurementTemplate_productCategoryId_idx" ON "MeasurementTemplate"("productCategoryId");
CREATE INDEX "MeasurementTemplateItem_templateId_idx" ON "MeasurementTemplateItem"("templateId");
CREATE INDEX "MeasurementTemplateValue_measurementId_idx" ON "MeasurementTemplateValue"("measurementId");
CREATE UNIQUE INDEX "MeasurementTemplateValue_measurementId_size_key" ON "MeasurementTemplateValue"("measurementId", "size");

ALTER TABLE "TechPackBomItem" ADD CONSTRAINT "TechPackBomItem_techPackId_fkey" FOREIGN KEY ("techPackId") REFERENCES "TechPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechPackArtworkPlacement" ADD CONSTRAINT "TechPackArtworkPlacement_techPackId_fkey" FOREIGN KEY ("techPackId") REFERENCES "TechPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechPackArtworkPlacement" ADD CONSTRAINT "TechPackArtworkPlacement_artworkAssetId_fkey" FOREIGN KEY ("artworkAssetId") REFERENCES "TechPackAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPackReleaseHistory" ADD CONSTRAINT "TechPackReleaseHistory_techPackId_fkey" FOREIGN KEY ("techPackId") REFERENCES "TechPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeasurementTemplate" ADD CONSTRAINT "MeasurementTemplate_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeasurementTemplateItem" ADD CONSTRAINT "MeasurementTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MeasurementTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeasurementTemplateValue" ADD CONSTRAINT "MeasurementTemplateValue_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "MeasurementTemplateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
