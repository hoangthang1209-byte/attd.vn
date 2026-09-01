-- BigBang-C2.2: user-saved costing cost library entries

CREATE TABLE "PricingCostLibraryItem" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameNormalized" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "defaultUnitCost" DECIMAL(12,2) NOT NULL,
  "defaultQuantityFactor" DECIMAL(8,4) NOT NULL DEFAULT 1,
  "defaultNote" TEXT,
  "description" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PricingCostLibraryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PricingCostLibraryItem_nameNormalized_category_key"
  ON "PricingCostLibraryItem"("nameNormalized", "category");

CREATE INDEX "PricingCostLibraryItem_category_idx" ON "PricingCostLibraryItem"("category");
