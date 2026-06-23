-- Sprint 27.3.1 — shared product attribute catalog
-- Non-destructive: existing product-specific ProductOption/ProductOptionValue rows remain valid.

CREATE TYPE "ProductAttributeDisplayType" AS ENUM ('TEXT', 'COLOR_SWATCH', 'SIZE', 'SELECT', 'IMAGE_SWATCH');
CREATE TYPE "SharedProductAttributeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "ProductAttribute" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayType" "ProductAttributeDisplayType" NOT NULL DEFAULT 'TEXT',
  "isVariantAttribute" BOOLEAN NOT NULL DEFAULT true,
  "isSpecificationAttribute" BOOLEAN NOT NULL DEFAULT false,
  "status" "SharedProductAttributeStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttributeValue" (
  "id" TEXT NOT NULL,
  "attributeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "hexCode" TEXT,
  "imageUrl" TEXT,
  "status" "SharedProductAttributeStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductOption" ADD COLUMN "attributeId" TEXT;
ALTER TABLE "ProductOptionValue" ADD COLUMN "attributeValueId" TEXT;

CREATE UNIQUE INDEX "ProductAttribute_code_key" ON "ProductAttribute"("code");
CREATE UNIQUE INDEX "ProductAttribute_slug_key" ON "ProductAttribute"("slug");
CREATE INDEX "ProductAttribute_status_idx" ON "ProductAttribute"("status");
CREATE INDEX "ProductAttribute_sortOrder_idx" ON "ProductAttribute"("sortOrder");

CREATE UNIQUE INDEX "ProductAttributeValue_attributeId_code_key" ON "ProductAttributeValue"("attributeId", "code");
CREATE UNIQUE INDEX "ProductAttributeValue_attributeId_slug_key" ON "ProductAttributeValue"("attributeId", "slug");
CREATE INDEX "ProductAttributeValue_attributeId_status_idx" ON "ProductAttributeValue"("attributeId", "status");
CREATE INDEX "ProductAttributeValue_sortOrder_idx" ON "ProductAttributeValue"("sortOrder");

CREATE INDEX "ProductOption_attributeId_idx" ON "ProductOption"("attributeId");
CREATE INDEX "ProductOptionValue_attributeValueId_idx" ON "ProductOptionValue"("attributeValueId");

ALTER TABLE "ProductAttributeValue"
  ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductOptionValue"
  ADD CONSTRAINT "ProductOptionValue_attributeValueId_fkey"
  FOREIGN KEY ("attributeValueId") REFERENCES "ProductAttributeValue"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
