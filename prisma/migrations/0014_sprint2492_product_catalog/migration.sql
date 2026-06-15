-- Sprint 24.9.2: B2B Product Catalog & SKU Management

-- Category: add skuCode and sortOrder
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "skuCode" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Product: add B2B fields
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "form" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "defaultMoq" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "useCases" TEXT[] DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "targetCustomers" TEXT[] DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "supportsPrinting" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "supportsEmbroidery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "supportsOem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "featuredImage" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- ProductStatus: add INACTIVE variant
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';

-- StockStatus: add PREORDER variant
ALTER TYPE "StockStatus" ADD VALUE IF NOT EXISTS 'PREORDER';

-- VariantStatus enum
DO $$ BEGIN
  CREATE TYPE "VariantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ProductVariant: add B2B fields
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "colorName" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "colorCode" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "sizeName" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "dimensions" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "capacity" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "wholesalePrice" DECIMAL(12,2);
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(12,2);
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "priceTiers" JSONB;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(8,3);
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "internalNote" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "variantStatus" "VariantStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Indexes
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "ProductVariant_stockStatus_idx" ON "ProductVariant"("stockStatus");
CREATE INDEX IF NOT EXISTS "ProductVariant_variantStatus_idx" ON "ProductVariant"("variantStatus");

-- ProductImportJobStatus enum
DO $$ BEGIN
  CREATE TYPE "ProductImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ProductImportJob table
CREATE TABLE IF NOT EXISTS "ProductImportJob" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "status" "ProductImportJobStatus" NOT NULL DEFAULT 'PENDING',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "createdProducts" INTEGER NOT NULL DEFAULT 0,
  "updatedProducts" INTEGER NOT NULL DEFAULT 0,
  "createdVariants" INTEGER NOT NULL DEFAULT 0,
  "updatedVariants" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "duplicateRows" INTEGER NOT NULL DEFAULT 0,
  "createdCategories" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImportJob_pkey" PRIMARY KEY ("id")
);
