-- AlterTable
ALTER TABLE "DeliveryMethod" ADD COLUMN "requiresCarrier" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DeliveryCarrier" (
    "id" TEXT NOT NULL,
    "carrierCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "apiProviderKey" TEXT,
    "apiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCarrier_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryCarrierId" TEXT,
ADD COLUMN "deliveryCarrierName" TEXT;

-- Backfill carrier name snapshot from legacy free-text field
UPDATE "Order"
SET "deliveryCarrierName" = "deliveryCarrier"
WHERE "deliveryCarrierName" IS NULL
  AND "deliveryCarrier" IS NOT NULL
  AND TRIM("deliveryCarrier") <> '';

-- Mark external carrier delivery method
UPDATE "DeliveryMethod"
SET "requiresCarrier" = true
WHERE "name" = 'Giao qua đơn vị vận chuyển';

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCarrier_carrierCode_key" ON "DeliveryCarrier"("carrierCode");

-- CreateIndex
CREATE INDEX "DeliveryCarrier_carrierCode_idx" ON "DeliveryCarrier"("carrierCode");

-- CreateIndex
CREATE INDEX "DeliveryCarrier_isActive_idx" ON "DeliveryCarrier"("isActive");

-- CreateIndex
CREATE INDEX "Order_deliveryCarrierId_idx" ON "Order"("deliveryCarrierId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryCarrierId_fkey" FOREIGN KEY ("deliveryCarrierId") REFERENCES "DeliveryCarrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
