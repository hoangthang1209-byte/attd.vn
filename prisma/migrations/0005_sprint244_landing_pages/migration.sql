-- Sprint 24.4 — LandingPageContent

CREATE TABLE IF NOT EXISTS "LandingPageContent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "heroTitle" TEXT NOT NULL DEFAULT '',
    "heroDescription" TEXT NOT NULL DEFAULT '',
    "seoContent" TEXT NOT NULL DEFAULT '',
    "faqJson" JSONB NOT NULL DEFAULT '[]',
    "primaryCtaLabel" TEXT NOT NULL DEFAULT '',
    "primaryCtaHref" TEXT NOT NULL DEFAULT '',
    "secondaryCtaLabel" TEXT NOT NULL DEFAULT '',
    "secondaryCtaHref" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LandingPageContent_slug_key" ON "LandingPageContent"("slug");
