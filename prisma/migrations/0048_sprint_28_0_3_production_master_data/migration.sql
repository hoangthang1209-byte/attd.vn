-- Sprint 28.0.3: Production Master Data

CREATE TYPE "ProductionMaterialCategory" AS ENUM ('MAIN_FABRIC', 'RIB', 'LINING', 'INTERLINING', 'MESH', 'ACCESSORY', 'OTHER');
CREATE TYPE "ProductionTrimCategory" AS ENUM ('BUTTON', 'ZIPPER', 'LABEL', 'THREAD', 'ELASTIC', 'DRAWCORD', 'TAPE', 'ACCESSORY', 'OTHER');
CREATE TYPE "PrintMethodCategory" AS ENUM ('SCREEN_PRINT', 'DTG', 'DTF', 'EMBROIDERY', 'HEAT_TRANSFER', 'SUBLIMATION', 'PATCH', 'OTHER');

CREATE TABLE "ProductionSupplier" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionMaterial" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "ProductionMaterialCategory" NOT NULL DEFAULT 'OTHER',
  "composition" TEXT,
  "gsm" TEXT,
  "width" TEXT,
  "supplierId" TEXT,
  "defaultColor" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionTrim" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "ProductionTrimCategory" NOT NULL DEFAULT 'OTHER',
  "supplierId" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionTrim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintMethod" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "PrintMethodCategory" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrintMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionSupplier_code_key" ON "ProductionSupplier"("code");
CREATE INDEX "ProductionSupplier_code_idx" ON "ProductionSupplier"("code");
CREATE INDEX "ProductionSupplier_isActive_idx" ON "ProductionSupplier"("isActive");

CREATE UNIQUE INDEX "ProductionMaterial_code_key" ON "ProductionMaterial"("code");
CREATE INDEX "ProductionMaterial_code_idx" ON "ProductionMaterial"("code");
CREATE INDEX "ProductionMaterial_isActive_idx" ON "ProductionMaterial"("isActive");
CREATE INDEX "ProductionMaterial_category_idx" ON "ProductionMaterial"("category");
CREATE INDEX "ProductionMaterial_supplierId_idx" ON "ProductionMaterial"("supplierId");

CREATE UNIQUE INDEX "ProductionTrim_code_key" ON "ProductionTrim"("code");
CREATE INDEX "ProductionTrim_code_idx" ON "ProductionTrim"("code");
CREATE INDEX "ProductionTrim_isActive_idx" ON "ProductionTrim"("isActive");
CREATE INDEX "ProductionTrim_category_idx" ON "ProductionTrim"("category");
CREATE INDEX "ProductionTrim_supplierId_idx" ON "ProductionTrim"("supplierId");

CREATE UNIQUE INDEX "PrintMethod_code_key" ON "PrintMethod"("code");
CREATE INDEX "PrintMethod_code_idx" ON "PrintMethod"("code");
CREATE INDEX "PrintMethod_isActive_idx" ON "PrintMethod"("isActive");
CREATE INDEX "PrintMethod_category_idx" ON "PrintMethod"("category");

ALTER TABLE "ProductionMaterial" ADD CONSTRAINT "ProductionMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionTrim" ADD CONSTRAINT "ProductionTrim_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Pattern" ADD COLUMN "productionMaterialCategory" "ProductionMaterialCategory";

ALTER TABLE "TechPackBomItem" ADD COLUMN "materialId" TEXT;
ALTER TABLE "TechPackBomItem" ADD COLUMN "trimId" TEXT;
ALTER TABLE "TechPackBomItem" ADD COLUMN "supplierId" TEXT;

CREATE INDEX "TechPackBomItem_materialId_idx" ON "TechPackBomItem"("materialId");
CREATE INDEX "TechPackBomItem_trimId_idx" ON "TechPackBomItem"("trimId");
CREATE INDEX "TechPackBomItem_supplierId_idx" ON "TechPackBomItem"("supplierId");

ALTER TABLE "TechPackBomItem" ADD CONSTRAINT "TechPackBomItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ProductionMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPackBomItem" ADD CONSTRAINT "TechPackBomItem_trimId_fkey" FOREIGN KEY ("trimId") REFERENCES "ProductionTrim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechPackBomItem" ADD CONSTRAINT "TechPackBomItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TechPackArtworkPlacement" ADD COLUMN "printMethodId" TEXT;
CREATE INDEX "TechPackArtworkPlacement_printMethodId_idx" ON "TechPackArtworkPlacement"("printMethodId");
ALTER TABLE "TechPackArtworkPlacement" ADD CONSTRAINT "TechPackArtworkPlacement_printMethodId_fkey" FOREIGN KEY ("printMethodId") REFERENCES "PrintMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
