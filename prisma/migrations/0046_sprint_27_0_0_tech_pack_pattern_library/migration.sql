-- Sprint 27.0.0: Tech Pack & Pattern Library Foundation

CREATE TYPE "TechPackStatus" AS ENUM ('DRAFT', 'RELEASED', 'SUPERSEDED');
CREATE TYPE "TechPackAssetType" AS ENUM (
  'FLAT_SKETCH_FRONT',
  'FLAT_SKETCH_BACK',
  'LOGO_PLACEMENT',
  'PRINT_PLACEMENT',
  'EMBROIDERY_PLACEMENT',
  'CONSTRUCTION_CALLOUT',
  'MEASUREMENT_DIAGRAM',
  'ARTWORK_REFERENCE',
  'OTHER'
);
CREATE TYPE "TechPackAssetFileType" AS ENUM (
  'IMAGE',
  'PDF',
  'AI',
  'PSD',
  'CDR',
  'EPS',
  'PLT',
  'DXF',
  'ZIP',
  'OTHER'
);
CREATE TYPE "PatternStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');
CREATE TYPE "PatternFileType" AS ENUM ('PLT', 'DXF', 'PDF', 'AI', 'ZIP', 'IMAGE', 'OTHER');

CREATE TABLE "TechPack" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "orderItemId" TEXT,
  "quoteItemId" TEXT,
  "customerId" TEXT,
  "productId" TEXT,
  "productVariantId" TEXT,
  "patternId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "TechPackStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "customerNameSnapshot" TEXT,
  "orderCodeSnapshot" TEXT,
  "orderItemCodeSnapshot" TEXT,
  "productNameSnapshot" TEXT,
  "productSkuSnapshot" TEXT,
  "colorSnapshot" TEXT,
  "sizeSnapshot" TEXT,
  "quantitySnapshot" INTEGER,
  "sourceType" TEXT,
  "processingMethod" TEXT,
  "bomNotes" TEXT,
  "trimsNotes" TEXT,
  "printMethodNotes" TEXT,
  "embroideryNotes" TEXT,
  "deadline" TIMESTAMP(3),
  "qcNotes" TEXT,
  "productionNotes" TEXT,
  "internalNotes" TEXT,
  "patternCodeSnapshot" TEXT,
  "patternVersionSnapshot" TEXT,
  "releasedAt" TIMESTAMP(3),
  "releasedBy" TEXT,
  "supersededById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TechPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechPackAsset" (
  "id" TEXT NOT NULL,
  "techPackId" TEXT NOT NULL,
  "type" "TechPackAssetType" NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "cloudinaryPublicId" TEXT,
  "previewUrl" TEXT,
  "r2ObjectKey" TEXT,
  "originalFileName" TEXT,
  "mimeType" TEXT,
  "fileType" "TechPackAssetFileType" NOT NULL DEFAULT 'OTHER',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TechPackAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechPackMeasurement" (
  "id" TEXT NOT NULL,
  "techPackId" TEXT NOT NULL,
  "pointOfMeasure" TEXT NOT NULL,
  "description" TEXT,
  "baseSize" TEXT,
  "tolerance" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TechPackMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechPackMeasurementValue" (
  "id" TEXT NOT NULL,
  "measurementId" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TechPackMeasurementValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pattern" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "productCategoryId" TEXT,
  "productId" TEXT,
  "baseSize" TEXT,
  "sizeRange" TEXT,
  "gradingRule" TEXT,
  "status" "PatternStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdBy" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatternFile" (
  "id" TEXT NOT NULL,
  "patternId" TEXT NOT NULL,
  "type" "PatternFileType" NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "r2ObjectKey" TEXT,
  "cloudinaryPublicId" TEXT,
  "previewUrl" TEXT,
  "originalFileName" TEXT,
  "mimeType" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatternFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatternMeasurement" (
  "id" TEXT NOT NULL,
  "patternId" TEXT NOT NULL,
  "pointOfMeasure" TEXT NOT NULL,
  "description" TEXT,
  "baseSize" TEXT,
  "tolerance" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatternMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatternMeasurementValue" (
  "id" TEXT NOT NULL,
  "measurementId" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatternMeasurementValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TechPack_code_key" ON "TechPack"("code");
CREATE INDEX "TechPack_orderItemId_idx" ON "TechPack"("orderItemId");
CREATE INDEX "TechPack_quoteItemId_idx" ON "TechPack"("quoteItemId");
CREATE INDEX "TechPack_customerId_idx" ON "TechPack"("customerId");
CREATE INDEX "TechPack_productId_idx" ON "TechPack"("productId");
CREATE INDEX "TechPack_productVariantId_idx" ON "TechPack"("productVariantId");
CREATE INDEX "TechPack_patternId_idx" ON "TechPack"("patternId");
CREATE INDEX "TechPack_status_idx" ON "TechPack"("status");
CREATE INDEX "TechPack_deadline_idx" ON "TechPack"("deadline");

CREATE INDEX "TechPackAsset_techPackId_idx" ON "TechPackAsset"("techPackId");
CREATE INDEX "TechPackAsset_type_idx" ON "TechPackAsset"("type");

CREATE INDEX "TechPackMeasurement_techPackId_idx" ON "TechPackMeasurement"("techPackId");

CREATE INDEX "TechPackMeasurementValue_measurementId_idx" ON "TechPackMeasurementValue"("measurementId");
CREATE UNIQUE INDEX "TechPackMeasurementValue_measurementId_size_key" ON "TechPackMeasurementValue"("measurementId", "size");

CREATE UNIQUE INDEX "Pattern_code_key" ON "Pattern"("code");
CREATE INDEX "Pattern_productCategoryId_idx" ON "Pattern"("productCategoryId");
CREATE INDEX "Pattern_productId_idx" ON "Pattern"("productId");
CREATE INDEX "Pattern_status_idx" ON "Pattern"("status");

CREATE INDEX "PatternFile_patternId_idx" ON "PatternFile"("patternId");

CREATE INDEX "PatternMeasurement_patternId_idx" ON "PatternMeasurement"("patternId");

CREATE INDEX "PatternMeasurementValue_measurementId_idx" ON "PatternMeasurementValue"("measurementId");
CREATE UNIQUE INDEX "PatternMeasurementValue_measurementId_size_key" ON "PatternMeasurementValue"("measurementId", "size");

ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "TechPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TechPackAsset" ADD CONSTRAINT "TechPackAsset_techPackId_fkey" FOREIGN KEY ("techPackId") REFERENCES "TechPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechPackMeasurement" ADD CONSTRAINT "TechPackMeasurement_techPackId_fkey" FOREIGN KEY ("techPackId") REFERENCES "TechPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechPackMeasurementValue" ADD CONSTRAINT "TechPackMeasurementValue_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "TechPackMeasurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pattern" ADD CONSTRAINT "Pattern_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Pattern" ADD CONSTRAINT "Pattern_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatternFile" ADD CONSTRAINT "PatternFile_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatternMeasurement" ADD CONSTRAINT "PatternMeasurement_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatternMeasurementValue" ADD CONSTRAINT "PatternMeasurementValue_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "PatternMeasurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
