-- CreateEnum
CREATE TYPE "MaterialStockAdjustmentType" AS ENUM ('OPENING_BALANCE', 'RECEIVE', 'CORRECTION', 'ISSUE_TO_PRODUCTION', 'RETURN_FROM_PRODUCTION');

-- CreateEnum
CREATE TYPE "OrderMaterialAllocationStatus" AS ENUM ('PENDING', 'PARTIALLY_RESERVED', 'RESERVED', 'PARTIALLY_ISSUED', 'ISSUED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'REQUESTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "materialType" "MaterialType" NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "specification" TEXT,
    "defaultSupplierName" TEXT,
    "reorderPoint" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialWarehouseBalance" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "onHandQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "issuedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "availableQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "lastCountedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialWarehouseBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialStockAdjustment" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "adjustmentType" "MaterialStockAdjustmentType" NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "previousOnHandQuantity" DECIMAL(12,4) NOT NULL,
    "nextOnHandQuantity" DECIMAL(12,4) NOT NULL,
    "note" TEXT,
    "referenceOrderId" TEXT,
    "createdByEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialStockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderMaterialAllocation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "requiredQuantity" DECIMAL(12,4) NOT NULL,
    "reservedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "issuedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "status" "OrderMaterialAllocationStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderMaterialAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedByEmployeeId" TEXT,
    "supplierName" TEXT,
    "requestedAt" TIMESTAMP(3),
    "expectedArrivalAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "materialId" TEXT,
    "materialCodeSnapshot" TEXT,
    "materialNameSnapshot" TEXT NOT NULL,
    "unitSnapshot" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(12,4) NOT NULL,
    "orderedQuantity" DECIMAL(12,4),
    "receivedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "linkedOrderId" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable ProductMaterialRequirement
ALTER TABLE "ProductMaterialRequirement" ADD COLUMN "materialId" TEXT;
ALTER TABLE "ProductMaterialRequirement" ADD COLUMN "materialCodeSnapshot" TEXT;
ALTER TABLE "ProductMaterialRequirement" ADD COLUMN "materialNameSnapshot" TEXT;
ALTER TABLE "ProductMaterialRequirement" ADD COLUMN "unitSnapshot" TEXT;

-- AlterTable OrderItemMaterialRequirement
ALTER TABLE "OrderItemMaterialRequirement" ADD COLUMN "materialId" TEXT;
ALTER TABLE "OrderItemMaterialRequirement" ADD COLUMN "materialCodeSnapshot" TEXT;
ALTER TABLE "OrderItemMaterialRequirement" ADD COLUMN "materialNameSnapshot" TEXT;
ALTER TABLE "OrderItemMaterialRequirement" ADD COLUMN "unitSnapshot" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Material_materialCode_key" ON "Material"("materialCode");
CREATE INDEX "Material_materialCode_idx" ON "Material"("materialCode");
CREATE INDEX "Material_isActive_idx" ON "Material"("isActive");
CREATE INDEX "Material_materialType_idx" ON "Material"("materialType");

CREATE UNIQUE INDEX "MaterialWarehouseBalance_materialId_key" ON "MaterialWarehouseBalance"("materialId");
CREATE INDEX "MaterialWarehouseBalance_materialId_idx" ON "MaterialWarehouseBalance"("materialId");

CREATE INDEX "MaterialStockAdjustment_materialId_idx" ON "MaterialStockAdjustment"("materialId");
CREATE INDEX "MaterialStockAdjustment_referenceOrderId_idx" ON "MaterialStockAdjustment"("referenceOrderId");
CREATE INDEX "MaterialStockAdjustment_createdAt_idx" ON "MaterialStockAdjustment"("createdAt");

CREATE UNIQUE INDEX "OrderMaterialAllocation_orderId_materialId_key" ON "OrderMaterialAllocation"("orderId", "materialId");
CREATE INDEX "OrderMaterialAllocation_orderId_idx" ON "OrderMaterialAllocation"("orderId");
CREATE INDEX "OrderMaterialAllocation_materialId_idx" ON "OrderMaterialAllocation"("materialId");
CREATE INDEX "OrderMaterialAllocation_status_idx" ON "OrderMaterialAllocation"("status");

CREATE UNIQUE INDEX "PurchaseRequest_requestCode_key" ON "PurchaseRequest"("requestCode");
CREATE INDEX "PurchaseRequest_requestCode_idx" ON "PurchaseRequest"("requestCode");
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

CREATE INDEX "PurchaseRequestItem_purchaseRequestId_idx" ON "PurchaseRequestItem"("purchaseRequestId");
CREATE INDEX "PurchaseRequestItem_materialId_idx" ON "PurchaseRequestItem"("materialId");
CREATE INDEX "PurchaseRequestItem_linkedOrderId_idx" ON "PurchaseRequestItem"("linkedOrderId");

CREATE INDEX "ProductMaterialRequirement_materialId_idx" ON "ProductMaterialRequirement"("materialId");
CREATE INDEX "OrderItemMaterialRequirement_materialId_idx" ON "OrderItemMaterialRequirement"("materialId");

-- AddForeignKey
ALTER TABLE "ProductMaterialRequirement" ADD CONSTRAINT "ProductMaterialRequirement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItemMaterialRequirement" ADD CONSTRAINT "OrderItemMaterialRequirement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaterialWarehouseBalance" ADD CONSTRAINT "MaterialWarehouseBalance_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaterialStockAdjustment" ADD CONSTRAINT "MaterialStockAdjustment_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialStockAdjustment" ADD CONSTRAINT "MaterialStockAdjustment_referenceOrderId_fkey" FOREIGN KEY ("referenceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaterialStockAdjustment" ADD CONSTRAINT "MaterialStockAdjustment_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderMaterialAllocation" ADD CONSTRAINT "OrderMaterialAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderMaterialAllocation" ADD CONSTRAINT "OrderMaterialAllocation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
