-- Lean Production Approval Truth P0 (additive only)

CREATE TYPE "OrderItemProductionApprovalStatus" AS ENUM ('PENDING', 'NEEDS_REVISION', 'RELEASED');

CREATE TABLE "OrderItemProductionApproval" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "status" "OrderItemProductionApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "sampleRequired" BOOLEAN NOT NULL DEFAULT true,
    "artworkFileId" TEXT,
    "sampleFileId" TEXT,
    "evidenceMediaAssetId" TEXT,
    "techPackId" TEXT,
    "approvedByContactId" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "releasedByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItemProductionApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderItemProductionApproval_orderItemId_key" ON "OrderItemProductionApproval"("orderItemId");
CREATE INDEX "OrderItemProductionApproval_status_idx" ON "OrderItemProductionApproval"("status");
CREATE INDEX "OrderItemProductionApproval_artworkFileId_idx" ON "OrderItemProductionApproval"("artworkFileId");
CREATE INDEX "OrderItemProductionApproval_sampleFileId_idx" ON "OrderItemProductionApproval"("sampleFileId");
CREATE INDEX "OrderItemProductionApproval_techPackId_idx" ON "OrderItemProductionApproval"("techPackId");
CREATE INDEX "OrderItemProductionApproval_approvedByContactId_idx" ON "OrderItemProductionApproval"("approvedByContactId");

ALTER TABLE "OrderItemProductionApproval"
  ADD CONSTRAINT "OrderItemProductionApproval_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItemProductionApproval"
  ADD CONSTRAINT "OrderItemProductionApproval_artworkFileId_fkey"
  FOREIGN KEY ("artworkFileId") REFERENCES "OrderProductionFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItemProductionApproval"
  ADD CONSTRAINT "OrderItemProductionApproval_sampleFileId_fkey"
  FOREIGN KEY ("sampleFileId") REFERENCES "OrderProductionFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItemProductionApproval"
  ADD CONSTRAINT "OrderItemProductionApproval_evidenceMediaAssetId_fkey"
  FOREIGN KEY ("evidenceMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItemProductionApproval"
  ADD CONSTRAINT "OrderItemProductionApproval_techPackId_fkey"
  FOREIGN KEY ("techPackId") REFERENCES "TechPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItemProductionApproval"
  ADD CONSTRAINT "OrderItemProductionApproval_approvedByContactId_fkey"
  FOREIGN KEY ("approvedByContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItemProductionApproval"
  ADD CONSTRAINT "OrderItemProductionApproval_releasedByAdminUserId_fkey"
  FOREIGN KEY ("releasedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OrderItemProductionApprovalBypass" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productionItemId" TEXT,
    "stageId" TEXT,
    "stageKey" TEXT,
    "reason" TEXT NOT NULL,
    "actorAdminUserId" TEXT,
    "actorUsernameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemProductionApprovalBypass_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItemProductionApprovalBypass_orderItemId_createdAt_idx"
  ON "OrderItemProductionApprovalBypass"("orderItemId", "createdAt");
CREATE INDEX "OrderItemProductionApprovalBypass_actorAdminUserId_idx"
  ON "OrderItemProductionApprovalBypass"("actorAdminUserId");

ALTER TABLE "OrderItemProductionApprovalBypass"
  ADD CONSTRAINT "OrderItemProductionApprovalBypass_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItemProductionApprovalBypass"
  ADD CONSTRAINT "OrderItemProductionApprovalBypass_actorAdminUserId_fkey"
  FOREIGN KEY ("actorAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
