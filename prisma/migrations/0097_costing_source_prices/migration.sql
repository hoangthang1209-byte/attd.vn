-- Costing source pricing foundation (additive only)
-- Current reference price per source + ProductionSupplier.
-- Explicit nullable FKs + CHECK: exactly one source is set.

CREATE TYPE "CostingSourceType" AS ENUM (
  'PRODUCTION_MATERIAL',
  'PRODUCTION_TRIM',
  'COST_LIBRARY'
);

ALTER TABLE "PricingCostLibraryItem"
  ADD COLUMN "legacyBuiltinId" TEXT;

CREATE UNIQUE INDEX "PricingCostLibraryItem_legacyBuiltinId_key"
  ON "PricingCostLibraryItem"("legacyBuiltinId")
  WHERE "legacyBuiltinId" IS NOT NULL;

CREATE TABLE "CostingSourcePrice" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceType" "CostingSourceType" NOT NULL,
    "productionMaterialId" TEXT,
    "productionTrimId" TEXT,
    "costLibraryItemId" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "calculationType" "PricingCalculationType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostingSourcePrice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CostingSourcePrice"
  ADD CONSTRAINT "CostingSourcePrice_one_source_chk"
  CHECK (
    (
      "sourceType" = 'PRODUCTION_MATERIAL'
      AND "productionMaterialId" IS NOT NULL
      AND "productionTrimId" IS NULL
      AND "costLibraryItemId" IS NULL
      AND "calculationType" IS NULL
    )
    OR (
      "sourceType" = 'PRODUCTION_TRIM'
      AND "productionTrimId" IS NOT NULL
      AND "productionMaterialId" IS NULL
      AND "costLibraryItemId" IS NULL
      AND "calculationType" IS NULL
    )
    OR (
      "sourceType" = 'COST_LIBRARY'
      AND "costLibraryItemId" IS NOT NULL
      AND "productionMaterialId" IS NULL
      AND "productionTrimId" IS NULL
      AND "calculationType" IS NOT NULL
    )
  );

CREATE INDEX "CostingSourcePrice_supplierId_idx" ON "CostingSourcePrice"("supplierId");
CREATE INDEX "CostingSourcePrice_sourceType_isActive_idx" ON "CostingSourcePrice"("sourceType", "isActive");
CREATE INDEX "CostingSourcePrice_productionMaterialId_idx" ON "CostingSourcePrice"("productionMaterialId");
CREATE INDEX "CostingSourcePrice_productionTrimId_idx" ON "CostingSourcePrice"("productionTrimId");
CREATE INDEX "CostingSourcePrice_costLibraryItemId_idx" ON "CostingSourcePrice"("costLibraryItemId");

-- Current-price uniqueness is independent of isActive: one row per source + supplier.
-- Deactivate/reactivate/edit reuse that row; this is not a price ledger.
CREATE UNIQUE INDEX "CostingSourcePrice_material_supplier_key"
  ON "CostingSourcePrice"("productionMaterialId", "supplierId")
  WHERE "productionMaterialId" IS NOT NULL;

CREATE UNIQUE INDEX "CostingSourcePrice_trim_supplier_key"
  ON "CostingSourcePrice"("productionTrimId", "supplierId")
  WHERE "productionTrimId" IS NOT NULL;

CREATE UNIQUE INDEX "CostingSourcePrice_library_supplier_key"
  ON "CostingSourcePrice"("costLibraryItemId", "supplierId")
  WHERE "costLibraryItemId" IS NOT NULL;

ALTER TABLE "CostingSourcePrice"
  ADD CONSTRAINT "CostingSourcePrice_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "ProductionSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CostingSourcePrice"
  ADD CONSTRAINT "CostingSourcePrice_productionMaterialId_fkey"
  FOREIGN KEY ("productionMaterialId") REFERENCES "ProductionMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CostingSourcePrice"
  ADD CONSTRAINT "CostingSourcePrice_productionTrimId_fkey"
  FOREIGN KEY ("productionTrimId") REFERENCES "ProductionTrim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CostingSourcePrice"
  ADD CONSTRAINT "CostingSourcePrice_costLibraryItemId_fkey"
  FOREIGN KEY ("costLibraryItemId") REFERENCES "PricingCostLibraryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
