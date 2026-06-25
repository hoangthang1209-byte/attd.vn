-- Sprint 27.4.1: bilingual category names, active flag (preserve existing name as Vietnamese)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Existing `name` remains the Vietnamese display name; English names are not invented here.
