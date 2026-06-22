-- AlterTable
ALTER TABLE "DeliveryMethod" ADD COLUMN "requiresProofOfDelivery" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "DeliveryExecutionStatus" AS ENUM ('DRAFT', 'READY_TO_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'PARTIALLY_DELIVERED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNING', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryAttemptResult" AS ENUM ('PENDING', 'DELIVERED', 'PARTIAL', 'FAILED', 'REFUSED', 'NO_RECIPIENT', 'WRONG_ADDRESS', 'DAMAGED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DeliveryProofType" AS ENUM ('SIGNED_RECEIPT', 'DELIVERY_PHOTO', 'RECIPIENT_CONFIRMATION', 'DAMAGE_EVIDENCE', 'RETURN_DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "OrderDeliveryExecution" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "executionCode" TEXT NOT NULL,
    "status" "DeliveryExecutionStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryMethodId" TEXT,
    "deliveryCarrierId" TEXT,
    "carrierNameSnapshot" TEXT,
    "trackingCode" TEXT,
    "assignedEmployeeId" TEXT,
    "recipientNameSnapshot" TEXT,
    "recipientPhoneSnapshot" TEXT,
    "recipientAddressSnapshot" TEXT,
    "expectedDeliveryAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "totalDispatchedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "totalDeliveredQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "totalReturnedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDeliveryExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDeliveryExecutionItem" (
    "id" TEXT NOT NULL,
    "deliveryExecutionId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "orderItemVariantId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "colorNameSnapshot" TEXT,
    "sizeValueSnapshot" TEXT,
    "skuSnapshot" TEXT,
    "unitSnapshot" TEXT,
    "plannedQuantity" DECIMAL(12,4) NOT NULL,
    "dispatchedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "deliveredQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "returnedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "damagedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDeliveryExecutionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "deliveryExecutionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "attemptedAt" TIMESTAMP(3),
    "attemptedByEmployeeId" TEXT,
    "result" "DeliveryAttemptResult" NOT NULL DEFAULT 'PENDING',
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "note" TEXT,
    "failureReason" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDeliveryProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryExecutionId" TEXT NOT NULL,
    "deliveryAttemptId" TEXT,
    "mediaAssetId" TEXT NOT NULL,
    "proofType" "DeliveryProofType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDeliveryProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderDeliveryExecution_executionCode_key" ON "OrderDeliveryExecution"("executionCode");

-- CreateIndex
CREATE INDEX "OrderDeliveryExecution_orderId_idx" ON "OrderDeliveryExecution"("orderId");

-- CreateIndex
CREATE INDEX "OrderDeliveryExecution_status_idx" ON "OrderDeliveryExecution"("status");

-- CreateIndex
CREATE INDEX "OrderDeliveryExecution_deliveryCarrierId_idx" ON "OrderDeliveryExecution"("deliveryCarrierId");

-- CreateIndex
CREATE INDEX "OrderDeliveryExecution_assignedEmployeeId_idx" ON "OrderDeliveryExecution"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "OrderDeliveryExecutionItem_deliveryExecutionId_idx" ON "OrderDeliveryExecutionItem"("deliveryExecutionId");

-- CreateIndex
CREATE INDEX "OrderDeliveryExecutionItem_orderItemId_idx" ON "OrderDeliveryExecutionItem"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderDeliveryExecutionItem_orderItemVariantId_idx" ON "OrderDeliveryExecutionItem"("orderItemVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderDeliveryAttempt_deliveryExecutionId_attemptNumber_key" ON "OrderDeliveryAttempt"("deliveryExecutionId", "attemptNumber");

-- CreateIndex
CREATE INDEX "OrderDeliveryAttempt_deliveryExecutionId_idx" ON "OrderDeliveryAttempt"("deliveryExecutionId");

-- CreateIndex
CREATE INDEX "OrderDeliveryProof_orderId_idx" ON "OrderDeliveryProof"("orderId");

-- CreateIndex
CREATE INDEX "OrderDeliveryProof_deliveryExecutionId_idx" ON "OrderDeliveryProof"("deliveryExecutionId");

-- CreateIndex
CREATE INDEX "OrderDeliveryProof_deliveryAttemptId_idx" ON "OrderDeliveryProof"("deliveryAttemptId");

-- CreateIndex
CREATE INDEX "OrderDeliveryProof_mediaAssetId_idx" ON "OrderDeliveryProof"("mediaAssetId");

-- AddForeignKey
ALTER TABLE "OrderDeliveryExecution" ADD CONSTRAINT "OrderDeliveryExecution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryExecution" ADD CONSTRAINT "OrderDeliveryExecution_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliveryMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryExecution" ADD CONSTRAINT "OrderDeliveryExecution_deliveryCarrierId_fkey" FOREIGN KEY ("deliveryCarrierId") REFERENCES "DeliveryCarrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryExecution" ADD CONSTRAINT "OrderDeliveryExecution_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryExecutionItem" ADD CONSTRAINT "OrderDeliveryExecutionItem_deliveryExecutionId_fkey" FOREIGN KEY ("deliveryExecutionId") REFERENCES "OrderDeliveryExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryExecutionItem" ADD CONSTRAINT "OrderDeliveryExecutionItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryExecutionItem" ADD CONSTRAINT "OrderDeliveryExecutionItem_orderItemVariantId_fkey" FOREIGN KEY ("orderItemVariantId") REFERENCES "OrderItemVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryAttempt" ADD CONSTRAINT "OrderDeliveryAttempt_deliveryExecutionId_fkey" FOREIGN KEY ("deliveryExecutionId") REFERENCES "OrderDeliveryExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryAttempt" ADD CONSTRAINT "OrderDeliveryAttempt_attemptedByEmployeeId_fkey" FOREIGN KEY ("attemptedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryProof" ADD CONSTRAINT "OrderDeliveryProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryProof" ADD CONSTRAINT "OrderDeliveryProof_deliveryExecutionId_fkey" FOREIGN KEY ("deliveryExecutionId") REFERENCES "OrderDeliveryExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryProof" ADD CONSTRAINT "OrderDeliveryProof_deliveryAttemptId_fkey" FOREIGN KEY ("deliveryAttemptId") REFERENCES "OrderDeliveryAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliveryProof" ADD CONSTRAINT "OrderDeliveryProof_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill proof requirement flags
UPDATE "DeliveryMethod" SET "requiresProofOfDelivery" = true WHERE "name" IN ('Giao qua đơn vị vận chuyển', 'Giao xe tải / chành xe');
UPDATE "DeliveryMethod" SET "requiresProofOfDelivery" = false WHERE "name" IN ('Giao nội bộ', 'Khách tự nhận');
