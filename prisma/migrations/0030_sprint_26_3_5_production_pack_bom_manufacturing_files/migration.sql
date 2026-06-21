-- CreateEnum
CREATE TYPE "ProductionFileType" AS ENUM ('DESIGN_ARTWORK', 'VECTOR_SOURCE', 'TECH_PACK', 'SIZE_CHART', 'MOCKUP_REFERENCE', 'MATERIAL_BOM', 'QC_GUIDE', 'PACKING_GUIDE', 'PRODUCTION_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductionFileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('MAIN_FABRIC', 'RIB_FABRIC', 'LINING', 'THREAD', 'ZIPPER', 'BUTTON', 'LABEL', 'HANGTAG', 'PRINTING', 'EMBROIDERY', 'PACKAGING', 'CARTON', 'ACCESSORY', 'OTHER');

-- CreateTable
CREATE TABLE "OrderProductionFile" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "mediaAssetId" TEXT NOT NULL,
    "type" "ProductionFileType" NOT NULL,
    "status" "ProductionFileStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "note" TEXT,
    "appliesToColorId" TEXT,
    "appliesToColorName" TEXT,
    "appliesToSize" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderProductionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMaterialRequirement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "materialType" "MaterialType" NOT NULL,
    "materialName" TEXT NOT NULL,
    "materialCode" TEXT,
    "unit" TEXT NOT NULL,
    "consumptionPerUnit" DECIMAL(12,4) NOT NULL,
    "wastagePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemMaterialRequirement" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "sourceProductMaterialRequirementId" TEXT,
    "materialType" "MaterialType" NOT NULL,
    "materialName" TEXT NOT NULL,
    "materialCode" TEXT,
    "unit" TEXT NOT NULL,
    "consumptionPerUnit" DECIMAL(12,4) NOT NULL,
    "wastagePercent" DECIMAL(5,2) NOT NULL,
    "requiredQuantity" DECIMAL(12,4) NOT NULL,
    "requiredQuantityOverridden" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItemMaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderProductionFile_orderId_idx" ON "OrderProductionFile"("orderId");

-- CreateIndex
CREATE INDEX "OrderProductionFile_orderItemId_idx" ON "OrderProductionFile"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderProductionFile_mediaAssetId_idx" ON "OrderProductionFile"("mediaAssetId");

-- CreateIndex
CREATE INDEX "OrderProductionFile_status_idx" ON "OrderProductionFile"("status");

-- CreateIndex
CREATE INDEX "ProductMaterialRequirement_productId_idx" ON "ProductMaterialRequirement"("productId");

-- CreateIndex
CREATE INDEX "ProductMaterialRequirement_variantId_idx" ON "ProductMaterialRequirement"("variantId");

-- CreateIndex
CREATE INDEX "ProductMaterialRequirement_isActive_idx" ON "ProductMaterialRequirement"("isActive");

-- CreateIndex
CREATE INDEX "OrderItemMaterialRequirement_orderItemId_idx" ON "OrderItemMaterialRequirement"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemMaterialRequirement_materialCode_idx" ON "OrderItemMaterialRequirement"("materialCode");

-- AddForeignKey
ALTER TABLE "OrderProductionFile" ADD CONSTRAINT "OrderProductionFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProductionFile" ADD CONSTRAINT "OrderProductionFile_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProductionFile" ADD CONSTRAINT "OrderProductionFile_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProductionFile" ADD CONSTRAINT "OrderProductionFile_appliesToColorId_fkey" FOREIGN KEY ("appliesToColorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaterialRequirement" ADD CONSTRAINT "ProductMaterialRequirement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaterialRequirement" ADD CONSTRAINT "ProductMaterialRequirement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemMaterialRequirement" ADD CONSTRAINT "OrderItemMaterialRequirement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
