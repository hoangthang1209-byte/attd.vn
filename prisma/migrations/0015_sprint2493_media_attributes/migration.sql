-- Sprint 24.9.3: Media Library & Product Catalog Polish

-- MediaFolder: add GENERAL value
ALTER TYPE "MediaFolder" ADD VALUE IF NOT EXISTS 'GENERAL';

-- MediaUsageType enum
DO $$ BEGIN
  CREATE TYPE "MediaUsageType" AS ENUM ('PRODUCT', 'BLOG', 'KNOWLEDGE_BASE', 'GENERAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- MediaAsset: extend with Cloudinary + rich metadata fields
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "originalName" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "format" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "usageType" "MediaUsageType" NOT NULL DEFAULT 'GENERAL';

-- MediaAsset: add usageType index
CREATE INDEX IF NOT EXISTS "MediaAsset_usageType_idx" ON "MediaAsset"("usageType");

-- ProductAttributeType enum
DO $$ BEGIN
  CREATE TYPE "ProductAttributeType" AS ENUM ('COLOR', 'SIZE', 'MATERIAL', 'FORM', 'FIT', 'DIMENSION', 'CAPACITY', 'UNIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ProductAttributeStatus enum
DO $$ BEGIN
  CREATE TYPE "ProductAttributeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ProductAttributeOption table
CREATE TABLE IF NOT EXISTS "ProductAttributeOption" (
  "id" TEXT NOT NULL,
  "type" "ProductAttributeType" NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "value" TEXT,
  "metadata" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "ProductAttributeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAttributeOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductAttributeOption_type_name_key" ON "ProductAttributeOption"("type", "name");
CREATE INDEX IF NOT EXISTS "ProductAttributeOption_type_idx" ON "ProductAttributeOption"("type");
CREATE INDEX IF NOT EXISTS "ProductAttributeOption_status_idx" ON "ProductAttributeOption"("status");

-- Product: add gallery field
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gallery" TEXT[] DEFAULT '{}';
