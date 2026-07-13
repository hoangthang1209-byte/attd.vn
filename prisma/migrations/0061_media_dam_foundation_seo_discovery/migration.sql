-- Sprint 10.1: Media DAM Foundation + SEO Asset Discovery
-- Safe additive migration: no storage/URL/relation field mutations.

CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'PRIVATE');
CREATE TYPE "MediaOrientation" AS ENUM ('SQUARE', 'LANDSCAPE', 'PORTRAIT', 'UNKNOWN');

CREATE TABLE "MediaLibrary" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MediaLibrary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaLibrary_code_key" ON "MediaLibrary"("code");
CREATE INDEX "MediaLibrary_isActive_sortOrder_idx" ON "MediaLibrary"("isActive", "sortOrder");

CREATE TABLE "MediaRole" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MediaRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaRole_code_key" ON "MediaRole"("code");
CREATE INDEX "MediaRole_isActive_sortOrder_idx" ON "MediaRole"("isActive", "sortOrder");

ALTER TABLE "MediaAsset"
  ADD COLUMN "libraryId" TEXT,
  ADD COLUMN "roleId" TEXT,
  ADD COLUMN "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "caption" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "dominantColor" TEXT,
  ADD COLUMN "orientation" "MediaOrientation" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "contentLanguage" TEXT;

CREATE INDEX "MediaAsset_libraryId_idx" ON "MediaAsset"("libraryId");
CREATE INDEX "MediaAsset_roleId_idx" ON "MediaAsset"("roleId");
CREATE INDEX "MediaAsset_visibility_idx" ON "MediaAsset"("visibility");
CREATE INDEX "MediaAsset_orientation_idx" ON "MediaAsset"("orientation");

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_libraryId_fkey"
  FOREIGN KEY ("libraryId") REFERENCES "MediaLibrary"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "MediaRole"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed system Libraries (deterministic IDs)
INSERT INTO "MediaLibrary" ("id", "code", "name", "description", "sortOrder", "isActive", "isSystem", "updatedAt") VALUES
  ('ml_product', 'PRODUCT', 'Sản phẩm', 'Ảnh thuộc nhóm sản phẩm / catalog', 10, true, true, CURRENT_TIMESTAMP),
  ('ml_manufacturing', 'MANUFACTURING', 'Sản xuất', 'Ảnh xưởng, quy trình, sản xuất', 20, true, true, CURRENT_TIMESTAMP),
  ('ml_marketing', 'MARKETING', 'Marketing', 'Ảnh marketing / truyền thông', 30, true, true, CURRENT_TIMESTAMP),
  ('ml_branding', 'BRANDING', 'Nhận diện thương hiệu', 'Logo, brand kit, nhận diện', 40, true, true, CURRENT_TIMESTAMP),
  ('ml_blog', 'BLOG', 'Bài viết', 'Ảnh cho blog / bài viết', 50, true, true, CURRENT_TIMESTAMP),
  ('ml_homepage', 'HOMEPAGE', 'Trang chủ', 'Ảnh trang chủ / homepage CMS', 60, true, true, CURRENT_TIMESTAMP),
  ('ml_customer', 'CUSTOMER', 'Khách hàng', 'Logo / ảnh khách hàng', 70, true, true, CURRENT_TIMESTAMP),
  ('ml_case_study', 'CASE_STUDY', 'Case study / Dự án', 'Ảnh dự án / case study', 80, true, true, CURRENT_TIMESTAMP),
  ('ml_dealer', 'DEALER', 'Đại lý', 'Ảnh liên quan đại lý', 90, true, true, CURRENT_TIMESTAMP),
  ('ml_corporate_gift', 'CORPORATE_GIFT', 'Quà tặng doanh nghiệp', 'Ảnh quà tặng / gift', 100, true, true, CURRENT_TIMESTAMP),
  ('ml_uniform', 'UNIFORM', 'Đồng phục', 'Ảnh đồng phục', 110, true, true, CURRENT_TIMESTAMP),
  ('ml_tech_pack', 'TECH_PACK', 'Tech Pack', 'Ảnh / tài liệu Tech Pack', 120, true, true, CURRENT_TIMESTAMP),
  ('ml_general', 'GENERAL', 'Chung', 'Thư viện chung / chưa phân loại', 999, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Seed system Roles (deterministic IDs)
INSERT INTO "MediaRole" ("id", "code", "name", "description", "sortOrder", "isActive", "isSystem", "updatedAt") VALUES
  ('mr_hero', 'HERO', 'Hero', NULL, 10, true, true, CURRENT_TIMESTAMP),
  ('mr_featured', 'FEATURED', 'Ảnh đại diện', NULL, 20, true, true, CURRENT_TIMESTAMP),
  ('mr_thumbnail', 'THUMBNAIL', 'Thumbnail', NULL, 30, true, true, CURRENT_TIMESTAMP),
  ('mr_gallery', 'GALLERY', 'Gallery', NULL, 40, true, true, CURRENT_TIMESTAMP),
  ('mr_product_main', 'PRODUCT_MAIN', 'Ảnh chính sản phẩm', NULL, 50, true, true, CURRENT_TIMESTAMP),
  ('mr_product_detail', 'PRODUCT_DETAIL', 'Chi tiết sản phẩm', NULL, 60, true, true, CURRENT_TIMESTAMP),
  ('mr_cover', 'COVER', 'Ảnh bìa', NULL, 70, true, true, CURRENT_TIMESTAMP),
  ('mr_background', 'BACKGROUND', 'Ảnh nền', NULL, 80, true, true, CURRENT_TIMESTAMP),
  ('mr_logo', 'LOGO', 'Logo', NULL, 90, true, true, CURRENT_TIMESTAMP),
  ('mr_icon', 'ICON', 'Icon', NULL, 100, true, true, CURRENT_TIMESTAMP),
  ('mr_illustration', 'ILLUSTRATION', 'Minh họa', NULL, 110, true, true, CURRENT_TIMESTAMP),
  ('mr_process', 'PROCESS', 'Quy trình', NULL, 120, true, true, CURRENT_TIMESTAMP),
  ('mr_factory', 'FACTORY', 'Nhà máy', NULL, 130, true, true, CURRENT_TIMESTAMP),
  ('mr_material', 'MATERIAL', 'Vật liệu', NULL, 140, true, true, CURRENT_TIMESTAMP),
  ('mr_printing', 'PRINTING', 'In ấn', NULL, 150, true, true, CURRENT_TIMESTAMP),
  ('mr_embroidery', 'EMBROIDERY', 'Thêu', NULL, 160, true, true, CURRENT_TIMESTAMP),
  ('mr_customer_logo', 'CUSTOMER_LOGO', 'Logo khách hàng', NULL, 170, true, true, CURRENT_TIMESTAMP),
  ('mr_case_study', 'CASE_STUDY', 'Case study', NULL, 180, true, true, CURRENT_TIMESTAMP),
  ('mr_social', 'SOCIAL', 'Social media', NULL, 190, true, true, CURRENT_TIMESTAMP),
  ('mr_og_image', 'OG_IMAGE', 'Ảnh chia sẻ SEO', NULL, 200, true, true, CURRENT_TIMESTAMP),
  ('mr_documentation', 'DOCUMENTATION', 'Tài liệu', NULL, 210, true, true, CURRENT_TIMESTAMP),
  ('mr_general', 'GENERAL', 'Chung', NULL, 999, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Backfill libraryId from legacy folder (metadata only)
UPDATE "MediaAsset" SET "libraryId" = 'ml_product' WHERE "folder" IN ('PRODUCTS', 'CATEGORIES') AND "libraryId" IS NULL;
UPDATE "MediaAsset" SET "libraryId" = 'ml_customer' WHERE "folder" = 'CLIENTS' AND "libraryId" IS NULL;
UPDATE "MediaAsset" SET "libraryId" = 'ml_case_study' WHERE "folder" = 'CASE_STUDIES' AND "libraryId" IS NULL;
UPDATE "MediaAsset" SET "libraryId" = 'ml_branding' WHERE "folder" = 'BRANDING' AND "libraryId" IS NULL;
UPDATE "MediaAsset" SET "libraryId" = 'ml_blog' WHERE "folder" = 'BLOG' AND "libraryId" IS NULL;
UPDATE "MediaAsset" SET "libraryId" = 'ml_general' WHERE "folder" = 'GENERAL' AND "libraryId" IS NULL;
UPDATE "MediaAsset" SET "libraryId" = 'ml_general' WHERE "libraryId" IS NULL;

-- Backfill roleId from legacy usageType (metadata only)
UPDATE "MediaAsset" SET "roleId" = 'mr_product_main' WHERE "usageType" = 'PRODUCT' AND "roleId" IS NULL;
UPDATE "MediaAsset" SET "roleId" = 'mr_featured' WHERE "usageType" = 'BLOG' AND "roleId" IS NULL;
UPDATE "MediaAsset" SET "roleId" = 'mr_documentation' WHERE "usageType" = 'KNOWLEDGE_BASE' AND "roleId" IS NULL;
UPDATE "MediaAsset" SET "roleId" = 'mr_general' WHERE "usageType" = 'GENERAL' AND "roleId" IS NULL;
UPDATE "MediaAsset" SET "roleId" = 'mr_general' WHERE "roleId" IS NULL;

-- Backfill orientation from dimensions
UPDATE "MediaAsset" SET "orientation" = 'SQUARE'
WHERE "width" IS NOT NULL AND "height" IS NOT NULL AND "width" = "height";

UPDATE "MediaAsset" SET "orientation" = 'LANDSCAPE'
WHERE "width" IS NOT NULL AND "height" IS NOT NULL AND "width" > "height";

UPDATE "MediaAsset" SET "orientation" = 'PORTRAIT'
WHERE "width" IS NOT NULL AND "height" IS NOT NULL AND "height" > "width";

-- visibility already defaults to PUBLIC; orientation UNKNOWN remains for missing dims
