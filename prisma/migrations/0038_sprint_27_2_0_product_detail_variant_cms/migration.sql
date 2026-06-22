-- Sprint 27.2.0 — Product detail variant CMS: options, specs, customization

ALTER TABLE "ProductVariant"
  ADD COLUMN "displayLabel" TEXT,
  ADD COLUMN "moqOverride" INTEGER,
  ADD COLUMN "leadTimeOverride" TEXT,
  ADD COLUMN "materialOverride" TEXT;

CREATE TABLE "ProductOption" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOptionValue" (
  "id" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "valueCode" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantOptionValue" (
  "variantId" TEXT NOT NULL,
  "optionValueId" TEXT NOT NULL,
  CONSTRAINT "ProductVariantOptionValue_pkey" PRIMARY KEY ("variantId", "optionValueId")
);

CREATE TABLE "ProductSpecification" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSpecification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductCustomizationCapability" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCustomizationCapability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductOption_productId_slug_key" ON "ProductOption"("productId", "slug");
CREATE INDEX "ProductOption_productId_sortOrder_idx" ON "ProductOption"("productId", "sortOrder");
CREATE INDEX "ProductOptionValue_optionId_sortOrder_idx" ON "ProductOptionValue"("optionId", "sortOrder");
CREATE INDEX "ProductVariantOptionValue_optionValueId_idx" ON "ProductVariantOptionValue"("optionValueId");
CREATE INDEX "ProductSpecification_productId_sortOrder_idx" ON "ProductSpecification"("productId", "sortOrder");
CREATE INDEX "ProductCustomizationCapability_productId_sortOrder_idx" ON "ProductCustomizationCapability"("productId", "sortOrder");

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOptionValue"
  ADD CONSTRAINT "ProductOptionValue_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_optionValueId_fkey"
  FOREIGN KEY ("optionValueId") REFERENCES "ProductOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSpecification"
  ADD CONSTRAINT "ProductSpecification_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCustomizationCapability"
  ADD CONSTRAINT "ProductCustomizationCapability_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'PRODUCT_INQUIRY';
