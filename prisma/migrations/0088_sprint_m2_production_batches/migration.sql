-- CreateEnum
CREATE TYPE "ItemProductionBatchStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemProductionBatchAuditAction" AS ENUM ('CREATED', 'QUANTITY_CHANGED', 'SUPPLIER_ASSIGNED', 'SUPPLIER_REASSIGNED', 'PIC_ASSIGNED', 'PIC_CHANGED', 'ACTIVATED', 'COMPLETED', 'CANCELLED', 'NOTES_CHANGED', 'PLANNED_DATES_CHANGED');

-- CreateTable
CREATE TABLE "ItemProductionBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "itemProductionTrackingId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT,
    "plannedQuantity" INTEGER NOT NULL,
    "supplierId" TEXT,
    "picEmployeeId" TEXT,
    "status" "ItemProductionBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "readyQuantity" INTEGER NOT NULL DEFAULT 0,
    "riskStatus" "ItemProductionRiskStatus" NOT NULL DEFAULT 'ON_TRACK',
    "currentStageKey" "ItemProductionStageKey",
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "lastProgressAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdByAdminUserId" TEXT,
    "updatedByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemProductionBatchStage" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "stageKey" "ItemProductionStageKey" NOT NULL,
    "labelSnapshot" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "isApplicable" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "status" "ItemProductionStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "inProgressQuantity" INTEGER NOT NULL DEFAULT 0,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "reworkQuantity" INTEGER NOT NULL DEFAULT 0,
    "wasteQuantity" INTEGER NOT NULL DEFAULT 0,
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "supplierId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemProductionBatchStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemProductionBatchProgressEntry" (
    "id" TEXT NOT NULL,
    "batchStageId" TEXT NOT NULL,
    "eventType" "ItemProductionProgressEventType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL DEFAULT 0,
    "acceptedQuantityDelta" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantityDelta" INTEGER NOT NULL DEFAULT 0,
    "reworkQuantityDelta" INTEGER NOT NULL DEFAULT 0,
    "wasteQuantityDelta" INTEGER NOT NULL DEFAULT 0,
    "previousStatus" "ItemProductionStageStatus",
    "nextStatus" "ItemProductionStageStatus",
    "note" TEXT,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemProductionBatchProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemProductionBatchAuditEntry" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "action" "ItemProductionBatchAuditAction" NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "note" TEXT,
    "createdByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemProductionBatchAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemProductionBatch_itemProductionTrackingId_idx" ON "ItemProductionBatch"("itemProductionTrackingId");

-- CreateIndex
CREATE INDEX "ItemProductionBatch_supplierId_idx" ON "ItemProductionBatch"("supplierId");

-- CreateIndex
CREATE INDEX "ItemProductionBatch_status_idx" ON "ItemProductionBatch"("status");

-- CreateIndex
CREATE INDEX "ItemProductionBatch_plannedEndAt_idx" ON "ItemProductionBatch"("plannedEndAt");

-- CreateIndex
CREATE INDEX "ItemProductionBatch_updatedAt_idx" ON "ItemProductionBatch"("updatedAt");

-- CreateIndex
CREATE INDEX "ItemProductionBatch_itemProductionTrackingId_sequence_idx" ON "ItemProductionBatch"("itemProductionTrackingId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ItemProductionBatch_itemProductionTrackingId_code_key" ON "ItemProductionBatch"("itemProductionTrackingId", "code");

-- CreateIndex
CREATE INDEX "ItemProductionBatchStage_batchId_sequence_idx" ON "ItemProductionBatchStage"("batchId", "sequence");

-- CreateIndex
CREATE INDEX "ItemProductionBatchStage_status_idx" ON "ItemProductionBatchStage"("status");

-- CreateIndex
CREATE INDEX "ItemProductionBatchStage_supplierId_idx" ON "ItemProductionBatchStage"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemProductionBatchStage_batchId_stageKey_key" ON "ItemProductionBatchStage"("batchId", "stageKey");

-- CreateIndex
CREATE INDEX "ItemProductionBatchProgressEntry_batchStageId_happenedAt_idx" ON "ItemProductionBatchProgressEntry"("batchStageId", "happenedAt");

-- CreateIndex
CREATE INDEX "ItemProductionBatchProgressEntry_createdByAdminUserId_idx" ON "ItemProductionBatchProgressEntry"("createdByAdminUserId");

-- CreateIndex
CREATE INDEX "ItemProductionBatchProgressEntry_eventType_idx" ON "ItemProductionBatchProgressEntry"("eventType");

-- CreateIndex
CREATE INDEX "ItemProductionBatchAuditEntry_batchId_createdAt_idx" ON "ItemProductionBatchAuditEntry"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemProductionBatchAuditEntry_createdByAdminUserId_idx" ON "ItemProductionBatchAuditEntry"("createdByAdminUserId");

-- CreateIndex
CREATE INDEX "ItemProductionBatchAuditEntry_action_idx" ON "ItemProductionBatchAuditEntry"("action");

-- AddForeignKey
ALTER TABLE "ItemProductionBatch" ADD CONSTRAINT "ItemProductionBatch_itemProductionTrackingId_fkey" FOREIGN KEY ("itemProductionTrackingId") REFERENCES "ItemProductionTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatch" ADD CONSTRAINT "ItemProductionBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatch" ADD CONSTRAINT "ItemProductionBatch_picEmployeeId_fkey" FOREIGN KEY ("picEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatch" ADD CONSTRAINT "ItemProductionBatch_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatch" ADD CONSTRAINT "ItemProductionBatch_updatedByAdminUserId_fkey" FOREIGN KEY ("updatedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatchStage" ADD CONSTRAINT "ItemProductionBatchStage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ItemProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatchStage" ADD CONSTRAINT "ItemProductionBatchStage_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatchProgressEntry" ADD CONSTRAINT "ItemProductionBatchProgressEntry_batchStageId_fkey" FOREIGN KEY ("batchStageId") REFERENCES "ItemProductionBatchStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatchProgressEntry" ADD CONSTRAINT "ItemProductionBatchProgressEntry_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatchAuditEntry" ADD CONSTRAINT "ItemProductionBatchAuditEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ItemProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProductionBatchAuditEntry" ADD CONSTRAINT "ItemProductionBatchAuditEntry_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
