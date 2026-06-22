-- Sprint 27.1.5 — Homepage CMS: proof strip, sourcing pathways, OEM banner

CREATE TYPE "HomepageProofIcon" AS ENUM ('PACKAGE', 'SETTINGS', 'USERS', 'TRUCK');
CREATE TYPE "HomepagePathwaySlot" AS ENUM ('STOCK', 'OEM', 'DEALER');

ALTER TABLE "HomepageSettings"
  ADD COLUMN "proofStripEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "proofStripOrder" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "sourcingPathwaysEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sourcingPathwaysOrder" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "oemEyebrow" TEXT NOT NULL DEFAULT 'OEM & Private Label',
  ADD COLUMN "oemHeading" TEXT NOT NULL DEFAULT 'Phát triển nguồn hàng theo thương hiệu của bạn',
  ADD COLUMN "oemDescription" TEXT NOT NULL DEFAULT 'Từ sản phẩm sẵn có đến phương án phát triển riêng, ATTD hỗ trợ bạn xác định hướng nguồn hàng phù hợp với nhu cầu triển khai.',
  ADD COLUMN "oemCtaLabel" TEXT NOT NULL DEFAULT 'Tìm hiểu dịch vụ OEM',
  ADD COLUMN "oemCtaUrl" TEXT NOT NULL DEFAULT '/oem',
  ADD COLUMN "oemMediaAssetId" TEXT,
  ADD COLUMN "oemImageAlt" TEXT,
  ADD COLUMN "oemEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "oemSectionOrder" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "HomepageSettings"
  ADD CONSTRAINT "HomepageSettings_oemMediaAssetId_fkey"
  FOREIGN KEY ("oemMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "HomepageProofItem" (
  "id" TEXT NOT NULL,
  "homepageSettingsId" TEXT NOT NULL DEFAULT 'default',
  "itemKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "supportingText" TEXT,
  "iconKey" "HomepageProofIcon" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "HomepageProofItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSourcingPathway" (
  "id" TEXT NOT NULL,
  "homepageSettingsId" TEXT NOT NULL DEFAULT 'default',
  "slot" "HomepagePathwaySlot" NOT NULL,
  "microLabel" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "ctaLabel" TEXT NOT NULL,
  "ctaUrl" TEXT NOT NULL,
  "mediaAssetId" TEXT,
  "imageAlt" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "HomepageSourcingPathway_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageProofItem_homepageSettingsId_itemKey_key"
  ON "HomepageProofItem"("homepageSettingsId", "itemKey");
CREATE INDEX "HomepageProofItem_homepageSettingsId_sortOrder_idx"
  ON "HomepageProofItem"("homepageSettingsId", "sortOrder");

CREATE UNIQUE INDEX "HomepageSourcingPathway_homepageSettingsId_slot_key"
  ON "HomepageSourcingPathway"("homepageSettingsId", "slot");
CREATE INDEX "HomepageSourcingPathway_homepageSettingsId_sortOrder_idx"
  ON "HomepageSourcingPathway"("homepageSettingsId", "sortOrder");

ALTER TABLE "HomepageProofItem"
  ADD CONSTRAINT "HomepageProofItem_homepageSettingsId_fkey"
  FOREIGN KEY ("homepageSettingsId") REFERENCES "HomepageSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomepageSourcingPathway"
  ADD CONSTRAINT "HomepageSourcingPathway_homepageSettingsId_fkey"
  FOREIGN KEY ("homepageSettingsId") REFERENCES "HomepageSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomepageSourcingPathway"
  ADD CONSTRAINT "HomepageSourcingPathway_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed proof items (idempotent via NOT EXISTS)
INSERT INTO "HomepageSettings" ("id", "updatedAt")
SELECT 'default', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "HomepageSettings" WHERE "id" = 'default');

INSERT INTO "HomepageProofItem" ("id", "homepageSettingsId", "itemKey", "title", "iconKey", "enabled", "sortOrder")
SELECT 'hp-proof-stock', 'default', 'stock', 'Hàng sẵn kho', 'PACKAGE', true, 1
WHERE NOT EXISTS (SELECT 1 FROM "HomepageProofItem" WHERE "homepageSettingsId" = 'default' AND "itemKey" = 'stock');

INSERT INTO "HomepageProofItem" ("id", "homepageSettingsId", "itemKey", "title", "iconKey", "enabled", "sortOrder")
SELECT 'hp-proof-oem', 'default', 'oem', 'OEM theo yêu cầu', 'SETTINGS', true, 2
WHERE NOT EXISTS (SELECT 1 FROM "HomepageProofItem" WHERE "homepageSettingsId" = 'default' AND "itemKey" = 'oem');

INSERT INTO "HomepageProofItem" ("id", "homepageSettingsId", "itemKey", "title", "iconKey", "enabled", "sortOrder")
SELECT 'hp-proof-dealer', 'default', 'dealer', 'Dành cho đại lý', 'USERS', true, 3
WHERE NOT EXISTS (SELECT 1 FROM "HomepageProofItem" WHERE "homepageSettingsId" = 'default' AND "itemKey" = 'dealer');

INSERT INTO "HomepageProofItem" ("id", "homepageSettingsId", "itemKey", "title", "iconKey", "enabled", "sortOrder")
SELECT 'hp-proof-delivery', 'default', 'delivery', 'Giao hàng toàn quốc', 'TRUCK', true, 4
WHERE NOT EXISTS (SELECT 1 FROM "HomepageProofItem" WHERE "homepageSettingsId" = 'default' AND "itemKey" = 'delivery');

-- Seed sourcing pathways
INSERT INTO "HomepageSourcingPathway" ("id", "homepageSettingsId", "slot", "microLabel", "title", "description", "ctaLabel", "ctaUrl", "enabled", "sortOrder")
SELECT 'hp-path-stock', 'default', 'STOCK', 'Sẵn sàng triển khai', 'Hàng sẵn kho',
  'Khám phá các nhóm sản phẩm có sẵn để triển khai đơn hàng nhanh và chủ động hơn.',
  'Xem nguồn hàng', '/san-pham', true, 1
WHERE NOT EXISTS (SELECT 1 FROM "HomepageSourcingPathway" WHERE "homepageSettingsId" = 'default' AND "slot" = 'STOCK');

INSERT INTO "HomepageSourcingPathway" ("id", "homepageSettingsId", "slot", "microLabel", "title", "description", "ctaLabel", "ctaUrl", "enabled", "sortOrder")
SELECT 'hp-path-oem', 'default', 'OEM', 'Phát triển theo yêu cầu', 'Đặt hàng OEM',
  'Phát triển sản phẩm theo chất liệu, màu sắc, nhận diện và yêu cầu riêng của thương hiệu.',
  'Tìm hiểu OEM', '/oem', true, 2
WHERE NOT EXISTS (SELECT 1 FROM "HomepageSourcingPathway" WHERE "homepageSettingsId" = 'default' AND "slot" = 'OEM');

INSERT INTO "HomepageSourcingPathway" ("id", "homepageSettingsId", "slot", "microLabel", "title", "description", "ctaLabel", "ctaUrl", "enabled", "sortOrder")
SELECT 'hp-path-dealer', 'default', 'DEALER', 'Kết nối nguồn hàng', 'Nguồn hàng cho đại lý',
  'Tiếp cận danh mục và chính sách phù hợp cho đơn vị kinh doanh, agency và đối tác phân phối.',
  'Dành cho đại lý', '/dai-ly', true, 3
WHERE NOT EXISTS (SELECT 1 FROM "HomepageSourcingPathway" WHERE "homepageSettingsId" = 'default' AND "slot" = 'DEALER');
