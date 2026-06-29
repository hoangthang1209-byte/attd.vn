-- Sprint D3: Dealer RFQ center

-- CreateEnum
CREATE TYPE "DealerRFQProjectType" AS ENUM ('BLANK_APPAREL', 'UNIFORM', 'CORPORATE_GIFT', 'EVENT_MERCH', 'OEM_PRIVATE_LABEL', 'PRINT_SERVICE', 'SAMPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "DealerRFQStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWING', 'NEED_MORE_INFO', 'PRICING', 'QUOTED', 'WON', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DealerRFQPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DealerRFQArtworkStatus" AS ENUM ('NOT_PROVIDED', 'PROVIDED', 'NEED_REVIEW', 'APPROVED', 'REVISION_REQUIRED');

-- CreateTable
CREATE TABLE "DealerRFQ" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dealerCompanyId" TEXT NOT NULL,
    "dealerUserId" TEXT,
    "customerId" TEXT,
    "leadId" TEXT,
    "quoteId" TEXT,
    "pricingCalculationId" TEXT,
    "title" TEXT NOT NULL,
    "projectType" "DealerRFQProjectType" NOT NULL DEFAULT 'OTHER',
    "status" "DealerRFQStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "DealerRFQPriority" NOT NULL DEFAULT 'NORMAL',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "companyName" TEXT,
    "productSummary" TEXT,
    "quantity" INTEGER,
    "targetBudget" DECIMAL(12,2),
    "deadline" TIMESTAMP(3),
    "deliveryLocation" TEXT,
    "artworkStatus" "DealerRFQArtworkStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "artworkUrls" JSONB,
    "note" TEXT,
    "internalNote" TEXT,
    "assignedToAdminUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "quotedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerRFQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerRFQItem" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "skuSnapshot" TEXT,
    "colorSnapshot" TEXT,
    "quantity" INTEGER NOT NULL,
    "decorationType" TEXT,
    "position" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerRFQItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealerRFQ_code_key" ON "DealerRFQ"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DealerRFQ_leadId_key" ON "DealerRFQ"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerRFQ_quoteId_key" ON "DealerRFQ"("quoteId");

-- CreateIndex
CREATE INDEX "DealerRFQ_dealerCompanyId_idx" ON "DealerRFQ"("dealerCompanyId");

-- CreateIndex
CREATE INDEX "DealerRFQ_status_idx" ON "DealerRFQ"("status");

-- CreateIndex
CREATE INDEX "DealerRFQ_priority_idx" ON "DealerRFQ"("priority");

-- CreateIndex
CREATE INDEX "DealerRFQ_assignedToAdminUserId_idx" ON "DealerRFQ"("assignedToAdminUserId");

-- CreateIndex
CREATE INDEX "DealerRFQ_createdAt_idx" ON "DealerRFQ"("createdAt");

-- CreateIndex
CREATE INDEX "DealerRFQ_deadline_idx" ON "DealerRFQ"("deadline");

-- CreateIndex
CREATE INDEX "DealerRFQItem_rfqId_idx" ON "DealerRFQItem"("rfqId");

-- CreateIndex
CREATE INDEX "DealerRFQItem_productId_idx" ON "DealerRFQItem"("productId");

-- CreateIndex
CREATE INDEX "DealerRFQItem_variantId_idx" ON "DealerRFQItem"("variantId");

-- AddForeignKey
ALTER TABLE "DealerRFQ" ADD CONSTRAINT "DealerRFQ_dealerCompanyId_fkey" FOREIGN KEY ("dealerCompanyId") REFERENCES "DealerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQ" ADD CONSTRAINT "DealerRFQ_dealerUserId_fkey" FOREIGN KEY ("dealerUserId") REFERENCES "DealerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQ" ADD CONSTRAINT "DealerRFQ_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQ" ADD CONSTRAINT "DealerRFQ_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQ" ADD CONSTRAINT "DealerRFQ_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQ" ADD CONSTRAINT "DealerRFQ_pricingCalculationId_fkey" FOREIGN KEY ("pricingCalculationId") REFERENCES "PricingCalculation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQ" ADD CONSTRAINT "DealerRFQ_assignedToAdminUserId_fkey" FOREIGN KEY ("assignedToAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQItem" ADD CONSTRAINT "DealerRFQItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "DealerRFQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQItem" ADD CONSTRAINT "DealerRFQItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRFQItem" ADD CONSTRAINT "DealerRFQItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
