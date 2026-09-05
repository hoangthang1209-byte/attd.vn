-- BigBang-C3.6: Costing Batch → many Quotes + changed-since-quote fingerprint

ALTER TABLE "PricingCostingBatch"
  ADD COLUMN IF NOT EXISTS "lastQuotedFingerprint" TEXT,
  ADD COLUMN IF NOT EXISTS "lastQuotedAt" TIMESTAMP(3);

ALTER TABLE "Quote"
  ADD COLUMN IF NOT EXISTS "pricingCostingBatchId" TEXT;

CREATE INDEX IF NOT EXISTS "Quote_pricingCostingBatchId_idx" ON "Quote"("pricingCostingBatchId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Quote_pricingCostingBatchId_fkey'
  ) THEN
    ALTER TABLE "Quote"
      ADD CONSTRAINT "Quote_pricingCostingBatchId_fkey"
      FOREIGN KEY ("pricingCostingBatchId") REFERENCES "PricingCostingBatch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill history FK from existing latest-quote pointer (generic, no hardcoded IDs).
UPDATE "Quote" q
SET "pricingCostingBatchId" = b.id
FROM "PricingCostingBatch" b
WHERE b."quoteId" = q.id
  AND q."pricingCostingBatchId" IS NULL;
