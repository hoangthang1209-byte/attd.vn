-- Actual Cost / Margin Close P0 (additive only)

CREATE TYPE "OrderActualCostCloseStatus" AS ENUM ('DRAFT', 'CLOSED');

CREATE TYPE "OrderActualCostCategory" AS ENUM (
  'PRODUCTION',
  'PRINT_EMBROIDERY',
  'MATERIAL',
  'PACKAGING',
  'SHIPPING',
  'OTHER'
);

CREATE TABLE "OrderActualCostClose" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderActualCostCloseStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedCommercialValue" DECIMAL(12,2) NOT NULL,
    "estimatedCost" DECIMAL(12,2),
    "estimatedGrossMargin" DECIMAL(12,2),
    "estimatedGrossMarginRate" DECIMAL(8,4),
    "actualCostTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualGrossMargin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualGrossMarginRate" DECIMAL(8,4),
    "costVariance" DECIMAL(12,2),
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderActualCostClose_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderActualCostClose_orderId_key" ON "OrderActualCostClose"("orderId");
CREATE INDEX "OrderActualCostClose_status_idx" ON "OrderActualCostClose"("status");
CREATE INDEX "OrderActualCostClose_closedByUserId_idx" ON "OrderActualCostClose"("closedByUserId");
CREATE INDEX "OrderActualCostClose_reopenedByUserId_idx" ON "OrderActualCostClose"("reopenedByUserId");

ALTER TABLE "OrderActualCostClose"
  ADD CONSTRAINT "OrderActualCostClose_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderActualCostClose"
  ADD CONSTRAINT "OrderActualCostClose_closedByUserId_fkey"
  FOREIGN KEY ("closedByUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderActualCostClose"
  ADD CONSTRAINT "OrderActualCostClose_reopenedByUserId_fkey"
  FOREIGN KEY ("reopenedByUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OrderActualCostEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "category" "OrderActualCostCategory" NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderActualCostEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderActualCostEntry_orderId_createdAt_idx" ON "OrderActualCostEntry"("orderId", "createdAt");
CREATE INDEX "OrderActualCostEntry_orderItemId_idx" ON "OrderActualCostEntry"("orderItemId");
CREATE INDEX "OrderActualCostEntry_category_idx" ON "OrderActualCostEntry"("category");
CREATE INDEX "OrderActualCostEntry_createdByUserId_idx" ON "OrderActualCostEntry"("createdByUserId");

ALTER TABLE "OrderActualCostEntry"
  ADD CONSTRAINT "OrderActualCostEntry_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restrict: prevent silent cascade wipe when OrderItems are replaced during order edit.
ALTER TABLE "OrderActualCostEntry"
  ADD CONSTRAINT "OrderActualCostEntry_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderActualCostEntry"
  ADD CONSTRAINT "OrderActualCostEntry_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
