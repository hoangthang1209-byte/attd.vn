-- Sprint 24.6 — Blog CMS

ALTER TYPE "MediaFolder" ADD VALUE IF NOT EXISTS 'BLOG';

CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED');

CREATE TABLE IF NOT EXISTS "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogCategory_slug_key" ON "BlogCategory"("slug");

CREATE TABLE IF NOT EXISTS "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "featuredImageUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogImageUrl" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_status_idx" ON "BlogPost"("status");
CREATE INDEX IF NOT EXISTS "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");
CREATE INDEX IF NOT EXISTS "BlogPost_createdAt_idx" ON "BlogPost"("createdAt");

CREATE TABLE IF NOT EXISTS "BlogPostCategory" (
    "postId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "BlogPostCategory_pkey" PRIMARY KEY ("postId", "categoryId")
);

CREATE INDEX IF NOT EXISTS "BlogPostCategory_categoryId_idx" ON "BlogPostCategory"("categoryId");

ALTER TABLE "BlogPostCategory"
  ADD CONSTRAINT "BlogPostCategory_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlogPostCategory"
  ADD CONSTRAINT "BlogPostCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "BlogPost" (
    "id", "title", "slug", "excerpt", "content", "featuredImageUrl",
    "metaTitle", "metaDescription", "status", "publishedAt", "createdAt", "updatedAt"
)
SELECT
    "id",
    "title",
    "slug",
    "excerpt",
    "content",
    "imageUrl",
    "seoTitle",
    "seoDescription",
    CASE WHEN "status"::text = 'PUBLISHED' THEN 'PUBLISHED'::"BlogPostStatus" ELSE 'DRAFT'::"BlogPostStatus" END,
    CASE WHEN "status"::text = 'PUBLISHED' THEN "createdAt" ELSE NULL END,
    "createdAt",
    "updatedAt"
FROM "Post"
ON CONFLICT ("id") DO NOTHING;
