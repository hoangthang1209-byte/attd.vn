-- Sprint 26.3.13: per-OrderItem production stages and QC (legacy order-level rows preserved)

ALTER TABLE "OrderProductionStage" ADD COLUMN "orderItemId" TEXT;

ALTER TABLE "OrderProductionStage"
  ADD CONSTRAINT "OrderProductionStage_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "OrderProductionStage_orderItemId_idx" ON "OrderProductionStage"("orderItemId");

DROP INDEX IF EXISTS "OrderProductionStage_orderId_stageType_key";

CREATE UNIQUE INDEX "OrderProductionStage_order_level_stageType_key"
  ON "OrderProductionStage"("orderId", "stageType")
  WHERE "orderItemId" IS NULL;

CREATE UNIQUE INDEX "OrderProductionStage_item_level_stageType_key"
  ON "OrderProductionStage"("orderItemId", "stageType")
  WHERE "orderItemId" IS NOT NULL;

ALTER TABLE "OrderQcInspection" ADD COLUMN "orderItemId" TEXT;

ALTER TABLE "OrderQcInspection"
  ADD CONSTRAINT "OrderQcInspection_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "OrderQcInspection_orderItemId_idx" ON "OrderQcInspection"("orderItemId");

DROP INDEX IF EXISTS "OrderQcInspection_orderId_key";

CREATE UNIQUE INDEX "OrderQcInspection_order_level_key"
  ON "OrderQcInspection"("orderId")
  WHERE "orderItemId" IS NULL;

CREATE UNIQUE INDEX "OrderQcInspection_item_level_key"
  ON "OrderQcInspection"("orderItemId")
  WHERE "orderItemId" IS NOT NULL;
