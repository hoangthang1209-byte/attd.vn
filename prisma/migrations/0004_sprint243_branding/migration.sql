-- Sprint 24.3 — BrandingSettings + MediaFolder.BRANDING

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'MediaFolder' AND e.enumlabel = 'BRANDING'
    ) THEN
        ALTER TYPE "MediaFolder" ADD VALUE 'BRANDING';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BrandingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "headerLogoUrl" TEXT,
    "footerLogoUrl" TEXT,
    "faviconUrl" TEXT,
    "defaultOgImageUrl" TEXT,
    "companyTagline" TEXT NOT NULL DEFAULT '',
    "facebookUrl" TEXT,
    "zaloUrl" TEXT,
    "youtubeUrl" TEXT,
    "tiktokUrl" TEXT,
    "linkedinUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandingSettings_pkey" PRIMARY KEY ("id")
);
