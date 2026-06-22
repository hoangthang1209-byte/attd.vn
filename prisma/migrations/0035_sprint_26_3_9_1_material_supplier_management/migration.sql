-- CreateTable
CREATE TABLE "MaterialSupplier" (
    "id" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSupplierLink" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierMaterialCode" TEXT,
    "supplierMaterialName" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSupplierLink_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "PurchaseRequest" ADD COLUMN "supplierNameSnapshot" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSupplier_supplierCode_key" ON "MaterialSupplier"("supplierCode");

-- CreateIndex
CREATE INDEX "MaterialSupplier_supplierCode_idx" ON "MaterialSupplier"("supplierCode");

-- CreateIndex
CREATE INDEX "MaterialSupplier_isActive_idx" ON "MaterialSupplier"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSupplierLink_materialId_supplierId_key" ON "MaterialSupplierLink"("materialId", "supplierId");

-- CreateIndex
CREATE INDEX "MaterialSupplierLink_materialId_idx" ON "MaterialSupplierLink"("materialId");

-- CreateIndex
CREATE INDEX "MaterialSupplierLink_supplierId_idx" ON "MaterialSupplierLink"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_supplierId_idx" ON "PurchaseRequest"("supplierId");

-- AddForeignKey
ALTER TABLE "MaterialSupplierLink" ADD CONSTRAINT "MaterialSupplierLink_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSupplierLink" ADD CONSTRAINT "MaterialSupplierLink_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "MaterialSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "MaterialSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
