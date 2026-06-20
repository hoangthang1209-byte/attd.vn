-- AlterEnum
ALTER TYPE "OrderActivityType" ADD VALUE 'PAYMENT_EDITED';
ALTER TYPE "OrderActivityType" ADD VALUE 'ORDER_EDITED';
ALTER TYPE "OrderActivityType" ADD VALUE 'PRODUCTION_UPDATED';
ALTER TYPE "OrderActivityType" ADD VALUE 'DELIVERY_UPDATED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "productionDueDate" TIMESTAMP(3),
ADD COLUMN "productionOwnerName" TEXT,
ADD COLUMN "productionNote" TEXT,
ADD COLUMN "deliveryMethod" TEXT,
ADD COLUMN "deliveryRecipientName" TEXT,
ADD COLUMN "deliveryRecipientPhone" TEXT,
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "deliveryTrackingCode" TEXT,
ADD COLUMN "deliveryCarrier" TEXT,
ADD COLUMN "deliveryNote" TEXT,
ADD COLUMN "deliveryExpectedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderPayment" ADD COLUMN "editReason" TEXT,
ADD COLUMN "editedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_productionDueDate_idx" ON "Order"("productionDueDate");

-- CreateIndex
CREATE INDEX "Order_deliveryExpectedAt_idx" ON "Order"("deliveryExpectedAt");

-- CreateIndex
CREATE INDEX "OrderPayment_editedAt_idx" ON "OrderPayment"("editedAt");
