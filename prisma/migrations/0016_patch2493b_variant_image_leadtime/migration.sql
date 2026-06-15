-- Patch 24.9.3b: Variant images, product lead time

-- Product: add lead time field
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "leadTime" TEXT;

-- ProductVariant: add variant image
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
