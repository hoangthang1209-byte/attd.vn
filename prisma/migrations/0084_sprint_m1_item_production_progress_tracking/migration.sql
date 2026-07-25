-- Sprint M1: Item production progress tracking

CREATE TYPE "ItemProductionStageKey" AS ENUM (
  'MATERIAL_SYNC',
  'CUTTING',
  'PRINT_EMBROIDERY',
  'SEWING',
  'WASHING',
  'FINISHING',
  'IRONING',
  'QC',
  'PACKING',
  'READY_TO_SHIP'
);

CREATE TYPE "ItemProductionStatus" AS ENUM (
  'DRAFT',
  'PLANNED',
  'IN_PRODUCTION',
  'FINISHING',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED'
);

CREATE TYPE "ItemProductionStageStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'SKIPPED'
);

CREATE TYPE "ItemProductionDeliveryStatus" AS ENUM (
  'NOT_READY',
  'PARTIALLY_READY',
  'READY',
  'PARTIALLY_SHIPPED',
  'SHIPPED'
);

CREATE TYPE "ItemProductionRiskStatus" AS ENUM (
  'ON_TRACK',
  'NEEDS_ATTENTION',
  'AT_RISK',
  'DELAYED',
  'BLOCKED'
);

CREATE TYPE "ItemProductionProgressEventType" AS ENUM (
  'START',
  'PROGRESS_UPDATE',
  'COMPLETE',
  'BLOCK',
  'UNBLOCK',
  'REOPEN',
  'SKIP',
  'NOTE'
);

CREATE TABLE "ItemProductionWorkflowTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItemProductionWorkflowTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemProductionWorkflowTemplate_code_key" ON "ItemProductionWorkflowTemplate"("code");
CREATE INDEX "ItemProductionWorkflowTemplate_isActive_sortOrder_idx" ON "ItemProductionWorkflowTemplate"("isActive", "sortOrder");

CREATE TABLE "ItemProductionWorkflowTemplateStep" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "stageKey" "ItemProductionStageKey" NOT NULL,
  "label" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 10,
  "isApplicable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItemProductionWorkflowTemplateStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemProductionWorkflowTemplateStep_templateId_stageKey_key" ON "ItemProductionWorkflowTemplateStep"("templateId", "stageKey");
CREATE INDEX "ItemProductionWorkflowTemplateStep_templateId_sequence_idx" ON "ItemProductionWorkflowTemplateStep"("templateId", "sequence");

ALTER TABLE "ItemProductionWorkflowTemplateStep"
  ADD CONSTRAINT "ItemProductionWorkflowTemplateStep_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ItemProductionWorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ItemProductionTracking" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "workflowTemplateId" TEXT,
  "supplierId" TEXT,
  "assignedEmployeeId" TEXT,
  "productionStatus" "ItemProductionStatus" NOT NULL DEFAULT 'DRAFT',
  "deliveryStatus" "ItemProductionDeliveryStatus" NOT NULL DEFAULT 'NOT_READY',
  "riskStatus" "ItemProductionRiskStatus" NOT NULL DEFAULT 'ON_TRACK',
  "orderedQuantity" INTEGER NOT NULL,
  "plannedQuantity" INTEGER NOT NULL,
  "readyQuantity" INTEGER NOT NULL DEFAULT 0,
  "currentStageKey" "ItemProductionStageKey",
  "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "promisedDeliveryDate" TIMESTAMP(3),
  "actualCompletedAt" TIMESTAMP(3),
  "lastProgressAt" TIMESTAMP(3),
  "note" TEXT,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItemProductionTracking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemProductionTracking_orderItemId_key" ON "ItemProductionTracking"("orderItemId");
CREATE INDEX "ItemProductionTracking_productionStatus_idx" ON "ItemProductionTracking"("productionStatus");
CREATE INDEX "ItemProductionTracking_deliveryStatus_idx" ON "ItemProductionTracking"("deliveryStatus");
CREATE INDEX "ItemProductionTracking_riskStatus_idx" ON "ItemProductionTracking"("riskStatus");
CREATE INDEX "ItemProductionTracking_supplierId_idx" ON "ItemProductionTracking"("supplierId");
CREATE INDEX "ItemProductionTracking_assignedEmployeeId_idx" ON "ItemProductionTracking"("assignedEmployeeId");
CREATE INDEX "ItemProductionTracking_promisedDeliveryDate_idx" ON "ItemProductionTracking"("promisedDeliveryDate");
CREATE INDEX "ItemProductionTracking_lastProgressAt_idx" ON "ItemProductionTracking"("lastProgressAt");
CREATE INDEX "ItemProductionTracking_currentStageKey_idx" ON "ItemProductionTracking"("currentStageKey");
CREATE INDEX "ItemProductionTracking_workflowTemplateId_idx" ON "ItemProductionTracking"("workflowTemplateId");

ALTER TABLE "ItemProductionTracking"
  ADD CONSTRAINT "ItemProductionTracking_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemProductionTracking"
  ADD CONSTRAINT "ItemProductionTracking_workflowTemplateId_fkey"
  FOREIGN KEY ("workflowTemplateId") REFERENCES "ItemProductionWorkflowTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItemProductionTracking"
  ADD CONSTRAINT "ItemProductionTracking_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItemProductionTracking"
  ADD CONSTRAINT "ItemProductionTracking_assignedEmployeeId_fkey"
  FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ItemProductionStage" (
  "id" TEXT NOT NULL,
  "productionItemId" TEXT NOT NULL,
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
  CONSTRAINT "ItemProductionStage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemProductionStage_productionItemId_stageKey_key" ON "ItemProductionStage"("productionItemId", "stageKey");
CREATE INDEX "ItemProductionStage_productionItemId_sequence_idx" ON "ItemProductionStage"("productionItemId", "sequence");
CREATE INDEX "ItemProductionStage_status_idx" ON "ItemProductionStage"("status");
CREATE INDEX "ItemProductionStage_supplierId_idx" ON "ItemProductionStage"("supplierId");

ALTER TABLE "ItemProductionStage"
  ADD CONSTRAINT "ItemProductionStage_productionItemId_fkey"
  FOREIGN KEY ("productionItemId") REFERENCES "ItemProductionTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemProductionStage"
  ADD CONSTRAINT "ItemProductionStage_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ItemProductionProgressEntry" (
  "id" TEXT NOT NULL,
  "productionStageId" TEXT NOT NULL,
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
  CONSTRAINT "ItemProductionProgressEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ItemProductionProgressEntry_productionStageId_happenedAt_idx" ON "ItemProductionProgressEntry"("productionStageId", "happenedAt");
CREATE INDEX "ItemProductionProgressEntry_createdByAdminUserId_idx" ON "ItemProductionProgressEntry"("createdByAdminUserId");
CREATE INDEX "ItemProductionProgressEntry_eventType_idx" ON "ItemProductionProgressEntry"("eventType");

ALTER TABLE "ItemProductionProgressEntry"
  ADD CONSTRAINT "ItemProductionProgressEntry_productionStageId_fkey"
  FOREIGN KEY ("productionStageId") REFERENCES "ItemProductionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemProductionProgressEntry"
  ADD CONSTRAINT "ItemProductionProgressEntry_createdByAdminUserId_fkey"
  FOREIGN KEY ("createdByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
