-- Homepage CMS expansion: Company Reality + Workshop Gallery
-- Safe defaults keep the public homepage rendering immediately after deploy.

CREATE TYPE "HomepageCompanyRealityLayout" AS ENUM ('FEATURED_PLUS_SUPPORTING', 'FOUR_EQUAL_ITEMS');

CREATE TYPE "HomepageCompanyRealityIcon" AS ENUM (
  'TIMER',
  'PACKAGE',
  'BUILDING',
  'FACTORY',
  'SETTINGS',
  'USERS',
  'TRUCK'
);

CREATE TYPE "HomepageWorkshopGalleryLayout" AS ENUM ('EDITORIAL_GRID', 'COMPACT_GRID', 'HORIZONTAL_STRIP');

CREATE TYPE "HomepageWorkshopActivity" AS ENUM (
  'warehouse',
  'production',
  'cutting',
  'sewing',
  'printing',
  'embroidery',
  'qc',
  'packing',
  'delivery',
  'material_sample',
  'real_order'
);

ALTER TABLE "HomepageSettings"
  ADD COLUMN "companyRealityEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "companyRealityEyebrow" TEXT NOT NULL DEFAULT 'Thông tin công ty',
  ADD COLUMN "companyRealityTitle" TEXT NOT NULL DEFAULT 'ATTD trong thực tế',
  ADD COLUMN "companyRealityDescription" TEXT NOT NULL DEFAULT 'Những điểm cốt lõi giúp đối tác B2B đánh giá năng lực công ty trước khi hợp tác.',
  ADD COLUMN "companyRealityLayout" "HomepageCompanyRealityLayout" NOT NULL DEFAULT 'FEATURED_PLUS_SUPPORTING',
  ADD COLUMN "workshopGalleryEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "workshopGalleryEyebrow" TEXT NOT NULL DEFAULT 'Hình ảnh vận hành',
  ADD COLUMN "workshopGalleryTitle" TEXT NOT NULL DEFAULT 'Góc nhìn từ xưởng',
  ADD COLUMN "workshopGalleryDescription" TEXT NOT NULL DEFAULT 'Một vài hình ảnh thực tế từ kho, xưởng và quy trình chuẩn bị đơn hàng tại ATTD.',
  ADD COLUMN "workshopGalleryLayout" "HomepageWorkshopGalleryLayout" NOT NULL DEFAULT 'EDITORIAL_GRID',
  ADD COLUMN "workshopGalleryMaxItems" INTEGER NOT NULL DEFAULT 6;

CREATE TABLE "HomepageCompanyRealityItem" (
  "id" TEXT NOT NULL,
  "homepageSettingsId" TEXT NOT NULL DEFAULT 'default',
  "itemKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "iconKey" "HomepageCompanyRealityIcon" NOT NULL,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,

  CONSTRAINT "HomepageCompanyRealityItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageWorkshopMedia" (
  "id" TEXT NOT NULL,
  "homepageSettingsId" TEXT NOT NULL DEFAULT 'default',
  "mediaAssetId" TEXT NOT NULL,
  "caption" TEXT,
  "altText" TEXT,
  "activity" "HomepageWorkshopActivity",
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  "href" TEXT,

  CONSTRAINT "HomepageWorkshopMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageCompanyRealityItem_homepageSettingsId_itemKey_key"
  ON "HomepageCompanyRealityItem"("homepageSettingsId", "itemKey");

CREATE INDEX "HomepageCompanyRealityItem_homepageSettingsId_sortOrder_idx"
  ON "HomepageCompanyRealityItem"("homepageSettingsId", "sortOrder");

CREATE INDEX "HomepageWorkshopMedia_homepageSettingsId_sortOrder_idx"
  ON "HomepageWorkshopMedia"("homepageSettingsId", "sortOrder");

CREATE INDEX "HomepageWorkshopMedia_mediaAssetId_idx"
  ON "HomepageWorkshopMedia"("mediaAssetId");

ALTER TABLE "HomepageCompanyRealityItem"
  ADD CONSTRAINT "HomepageCompanyRealityItem_homepageSettingsId_fkey"
  FOREIGN KEY ("homepageSettingsId") REFERENCES "HomepageSettings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomepageWorkshopMedia"
  ADD CONSTRAINT "HomepageWorkshopMedia_homepageSettingsId_fkey"
  FOREIGN KEY ("homepageSettingsId") REFERENCES "HomepageSettings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomepageWorkshopMedia"
  ADD CONSTRAINT "HomepageWorkshopMedia_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
