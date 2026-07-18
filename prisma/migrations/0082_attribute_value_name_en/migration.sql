-- Non-destructive bilingual support for shared product attributes.
ALTER TABLE "ProductAttribute" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "ProductAttributeValue" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
