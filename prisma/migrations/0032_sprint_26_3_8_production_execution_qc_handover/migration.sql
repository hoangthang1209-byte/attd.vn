-- CreateEnum
CREATE TYPE "ProductionStageType" AS ENUM ('CUTTING', 'SEWING', 'PRINTING', 'EMBROIDERY', 'FINISHING', 'QC', 'PACKING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductionStageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "QcInspectionStatus" AS ENUM ('DRAFT', 'PASSED', 'PASSED_WITH_NOTE', 'FAILED', 'REWORK_REQUIRED');

-- CreateEnum
CREATE TYPE "QcEvidenceType" AS ENUM ('DEFECT', 'PASSED_SAMPLE', 'PACKING', 'FINAL_PRODUCT', 'OTHER');

-- CreateTable
CREATE TABLE "OrderProductionStage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stageType" "ProductionStageType" NOT NULL,
    "status" "ProductionStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignedEmployeeId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "plannedQuantity" DECIMAL(12,4),
    "completedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "passedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "defectQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "reworkQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "scrapQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderProductionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderQcInspection" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "inspectedByEmployeeId" TEXT,
    "status" "QcInspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "inspectedAt" TIMESTAMP(3),
    "inspectedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "passedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "defectQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "reworkQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "scrapQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "summary" TEXT,
    "correctiveAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderQcInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderQcEvidence" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "qcInspectionId" TEXT,
    "mediaAssetId" TEXT NOT NULL,
    "title" TEXT,
    "note" TEXT,
    "evidenceType" "QcEvidenceType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderQcEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderProductionStage_orderId_idx" ON "OrderProductionStage"("orderId");

-- CreateIndex
CREATE INDEX "OrderProductionStage_stageType_idx" ON "OrderProductionStage"("stageType");

-- CreateIndex
CREATE UNIQUE INDEX "OrderProductionStage_orderId_stageType_key" ON "OrderProductionStage"("orderId", "stageType");

-- CreateIndex
CREATE UNIQUE INDEX "OrderQcInspection_orderId_key" ON "OrderQcInspection"("orderId");

-- CreateIndex
CREATE INDEX "OrderQcInspection_orderId_idx" ON "OrderQcInspection"("orderId");

-- CreateIndex
CREATE INDEX "OrderQcEvidence_orderId_idx" ON "OrderQcEvidence"("orderId");

-- CreateIndex
CREATE INDEX "OrderQcEvidence_qcInspectionId_idx" ON "OrderQcEvidence"("qcInspectionId");

-- CreateIndex
CREATE INDEX "OrderQcEvidence_mediaAssetId_idx" ON "OrderQcEvidence"("mediaAssetId");

-- AddForeignKey
ALTER TABLE "OrderProductionStage" ADD CONSTRAINT "OrderProductionStage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProductionStage" ADD CONSTRAINT "OrderProductionStage_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcInspection" ADD CONSTRAINT "OrderQcInspection_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcInspection" ADD CONSTRAINT "OrderQcInspection_inspectedByEmployeeId_fkey" FOREIGN KEY ("inspectedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcEvidence" ADD CONSTRAINT "OrderQcEvidence_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcEvidence" ADD CONSTRAINT "OrderQcEvidence_qcInspectionId_fkey" FOREIGN KEY ("qcInspectionId") REFERENCES "OrderQcInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQcEvidence" ADD CONSTRAINT "OrderQcEvidence_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
