-- BigBang-C2: quoted cost snapshot on OrderItem + costing finalization metadata

ALTER TABLE "OrderItem" ADD COLUMN "quotedUnitCost" DECIMAL(12,2);
ALTER TABLE "OrderItem" ADD COLUMN "quotedTotalCost" DECIMAL(12,2);
ALTER TABLE "OrderItem" ADD COLUMN "quotedMarginAmount" DECIMAL(12,2);
ALTER TABLE "OrderItem" ADD COLUMN "quotedMarginRate" DECIMAL(8,4);
ALTER TABLE "OrderItem" ADD COLUMN "pricingCalculationItemId" TEXT;

ALTER TABLE "PricingCalculation" ADD COLUMN "isFinal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PricingCalculation" ADD COLUMN "finalizedAt" TIMESTAMP(3);
ALTER TABLE "PricingCalculation" ADD COLUMN "revisionLabel" TEXT;

CREATE INDEX "OrderItem_pricingCalculationItemId_idx" ON "OrderItem"("pricingCalculationItemId");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pricingCalculationItemId_fkey"
  FOREIGN KEY ("pricingCalculationItemId") REFERENCES "PricingCalculationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
