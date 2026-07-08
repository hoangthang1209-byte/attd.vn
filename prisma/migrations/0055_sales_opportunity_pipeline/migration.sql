-- CreateEnum
CREATE TYPE "SalesOpportunityStage" AS ENUM ('NEW', 'CONTACTED', 'CONSULTING', 'COSTING', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "SalesOpportunityPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "SalesOpportunity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "SalesOpportunityStage" NOT NULL DEFAULT 'NEW',
    "priority" "SalesOpportunityPriority" NOT NULL DEFAULT 'NORMAL',
    "leadId" TEXT,
    "customerId" TEXT,
    "contactId" TEXT,
    "quoteId" TEXT,
    "pricingCalculationId" TEXT,
    "estimatedValue" DECIMAL(12,2),
    "probability" INTEGER NOT NULL DEFAULT 30,
    "expectedCloseDate" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "source" TEXT,
    "note" TEXT,
    "lostReason" TEXT,
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesOpportunity_code_key" ON "SalesOpportunity"("code");

-- CreateIndex
CREATE INDEX "SalesOpportunity_stage_idx" ON "SalesOpportunity"("stage");

-- CreateIndex
CREATE INDEX "SalesOpportunity_priority_idx" ON "SalesOpportunity"("priority");

-- CreateIndex
CREATE INDEX "SalesOpportunity_leadId_idx" ON "SalesOpportunity"("leadId");

-- CreateIndex
CREATE INDEX "SalesOpportunity_customerId_idx" ON "SalesOpportunity"("customerId");

-- CreateIndex
CREATE INDEX "SalesOpportunity_quoteId_idx" ON "SalesOpportunity"("quoteId");

-- CreateIndex
CREATE INDEX "SalesOpportunity_nextFollowUpAt_idx" ON "SalesOpportunity"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "SalesOpportunity_expectedCloseDate_idx" ON "SalesOpportunity"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "SalesOpportunity_createdAt_idx" ON "SalesOpportunity"("createdAt");

-- AddForeignKey
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_pricingCalculationId_fkey" FOREIGN KEY ("pricingCalculationId") REFERENCES "PricingCalculation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
