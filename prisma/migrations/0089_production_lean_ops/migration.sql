-- CreateEnum
CREATE TYPE "ItemProductionSampleStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'APPROVED');

-- CreateEnum
CREATE TYPE "ItemProductionIssueType" AS ENUM ('MISSING_MATERIAL', 'FACTORY_DELAY', 'WRONG_COLOR', 'PRINT_DEFECT', 'EMBROIDERY_DEFECT', 'WASH_DEFECT', 'SEWING_DEFECT', 'QC_DEFECT', 'WAITING_CUSTOMER', 'WAITING_SUPPLIER', 'OTHER');

-- AlterTable
ALTER TABLE "ItemProductionTracking" ADD COLUMN "sampleStatus" "ItemProductionSampleStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- CreateIndex
CREATE INDEX "ItemProductionTracking_sampleStatus_idx" ON "ItemProductionTracking"("sampleStatus");

-- CreateTable
CREATE TABLE "ItemProductionIssue" (
    "id" TEXT NOT NULL,
    "productionItemId" TEXT NOT NULL,
    "issueType" "ItemProductionIssueType" NOT NULL,
    "note" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdByAdminUserId" TEXT,
    "resolvedByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemProductionIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemProductionIssue_productionItemId_isResolved_idx" ON "ItemProductionIssue"("productionItemId", "isResolved");

-- CreateIndex
CREATE INDEX "ItemProductionIssue_createdAt_idx" ON "ItemProductionIssue"("createdAt");

-- CreateIndex
CREATE INDEX "ItemProductionIssue_issueType_idx" ON "ItemProductionIssue"("issueType");

-- AddForeignKey
ALTER TABLE "ItemProductionIssue" ADD CONSTRAINT "ItemProductionIssue_productionItemId_fkey" FOREIGN KEY ("productionItemId") REFERENCES "ItemProductionTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionIssue" ADD CONSTRAINT "ItemProductionIssue_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionIssue" ADD CONSTRAINT "ItemProductionIssue_resolvedByAdminUserId_fkey" FOREIGN KEY ("resolvedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
