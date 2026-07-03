-- Sprint 26.3.20 — Production Planning Module

CREATE TYPE "ProductionPlanStatus" AS ENUM (
  'NOT_PLANNED',
  'WAITING_DOCUMENTS',
  'WAITING_MATERIALS',
  'READY_TO_START',
  'IN_PROGRESS',
  'WAITING_QC',
  'REWORK',
  'COMPLETED',
  'ON_HOLD'
);

CREATE TYPE "ProductionPlanPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TABLE "ProductionPlan" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "planCode" TEXT NOT NULL,
  "status" "ProductionPlanStatus" NOT NULL DEFAULT 'NOT_PLANNED',
  "priority" "ProductionPlanPriority" NOT NULL DEFAULT 'NORMAL',
  "plannedStartAt" TIMESTAMP(3),
  "plannedEndAt" TIMESTAMP(3),
  "actualStartAt" TIMESTAMP(3),
  "actualEndAt" TIMESTAMP(3),
  "internalDeadlineAt" TIMESTAMP(3),
  "productionOwnerId" TEXT,
  "productionTeamName" TEXT,
  "estimatedLeadDays" INTEGER,
  "planningNote" TEXT,
  "riskNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionPlan_orderItemId_key" ON "ProductionPlan"("orderItemId");
CREATE INDEX "ProductionPlan_productionOwnerId_idx" ON "ProductionPlan"("productionOwnerId");
CREATE INDEX "ProductionPlan_status_idx" ON "ProductionPlan"("status");
CREATE INDEX "ProductionPlan_priority_idx" ON "ProductionPlan"("priority");
CREATE INDEX "ProductionPlan_plannedStartAt_idx" ON "ProductionPlan"("plannedStartAt");
CREATE INDEX "ProductionPlan_plannedEndAt_idx" ON "ProductionPlan"("plannedEndAt");
CREATE INDEX "ProductionPlan_internalDeadlineAt_idx" ON "ProductionPlan"("internalDeadlineAt");

ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_productionOwnerId_fkey" FOREIGN KEY ("productionOwnerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
