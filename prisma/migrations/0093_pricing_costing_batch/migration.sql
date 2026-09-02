-- CreateEnum
CREATE TYPE "PricingCostingBatchStatus" AS ENUM ('WORKING', 'QUOTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "PricingCostingBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "status" "PricingCostingBatchStatus" NOT NULL DEFAULT 'WORKING',
    "leadId" TEXT,
    "customerId" TEXT,
    "contactId" TEXT,
    "quoteId" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCostingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCostingBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "pricingCalculationId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "groupLabel" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCostingBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingCostingBatch_code_key" ON "PricingCostingBatch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCostingBatch_quoteId_key" ON "PricingCostingBatch"("quoteId");

-- CreateIndex
CREATE INDEX "PricingCostingBatch_code_idx" ON "PricingCostingBatch"("code");

-- CreateIndex
CREATE INDEX "PricingCostingBatch_customerId_idx" ON "PricingCostingBatch"("customerId");

-- CreateIndex
CREATE INDEX "PricingCostingBatch_leadId_idx" ON "PricingCostingBatch"("leadId");

-- CreateIndex
CREATE INDEX "PricingCostingBatch_status_idx" ON "PricingCostingBatch"("status");

-- CreateIndex
CREATE INDEX "PricingCostingBatch_createdAt_idx" ON "PricingCostingBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCostingBatchItem_pricingCalculationId_key" ON "PricingCostingBatchItem"("pricingCalculationId");

-- CreateIndex
CREATE INDEX "PricingCostingBatchItem_batchId_idx" ON "PricingCostingBatchItem"("batchId");

-- CreateIndex
CREATE INDEX "PricingCostingBatchItem_sortOrder_idx" ON "PricingCostingBatchItem"("sortOrder");

-- AddForeignKey
ALTER TABLE "PricingCostingBatch" ADD CONSTRAINT "PricingCostingBatch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCostingBatch" ADD CONSTRAINT "PricingCostingBatch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCostingBatch" ADD CONSTRAINT "PricingCostingBatch_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCostingBatch" ADD CONSTRAINT "PricingCostingBatch_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCostingBatchItem" ADD CONSTRAINT "PricingCostingBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PricingCostingBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCostingBatchItem" ADD CONSTRAINT "PricingCostingBatchItem_pricingCalculationId_fkey" FOREIGN KEY ("pricingCalculationId") REFERENCES "PricingCalculation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
