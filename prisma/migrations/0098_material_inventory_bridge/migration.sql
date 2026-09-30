-- Material Management V2 Phase 2
-- Additive bridge only: no data backfill, no destructive rewrite.

ALTER TABLE "ProductionMaterial"
ADD COLUMN "inventoryMaterialId" TEXT;

ALTER TABLE "ProductionTrim"
ADD COLUMN "inventoryMaterialId" TEXT;

CREATE UNIQUE INDEX "ProductionMaterial_inventoryMaterialId_key"
ON "ProductionMaterial"("inventoryMaterialId");

CREATE UNIQUE INDEX "ProductionTrim_inventoryMaterialId_key"
ON "ProductionTrim"("inventoryMaterialId");

CREATE INDEX "ProductionMaterial_inventoryMaterialId_idx"
ON "ProductionMaterial"("inventoryMaterialId");

CREATE INDEX "ProductionTrim_inventoryMaterialId_idx"
ON "ProductionTrim"("inventoryMaterialId");

ALTER TABLE "ProductionMaterial"
ADD CONSTRAINT "ProductionMaterial_inventoryMaterialId_fkey"
FOREIGN KEY ("inventoryMaterialId")
REFERENCES "Material"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ProductionTrim"
ADD CONSTRAINT "ProductionTrim_inventoryMaterialId_fkey"
FOREIGN KEY ("inventoryMaterialId")
REFERENCES "Material"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
