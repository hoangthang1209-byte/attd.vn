-- Additive: structured rich product description blocks (nullable JSON).
-- Existing products keep legacy plain `description`; no backfill.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "descriptionBlocks" JSONB;
