-- Sprint 11.0A: Knowledge Base architecture hardening (visibility, claims, versioning, relations)
-- Additive only — existing rows keep defaults.

CREATE TYPE "KnowledgeBaseVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL');

CREATE TYPE "KnowledgeBaseClaimStatus" AS ENUM (
  'FACT', 'OPINION', 'MARKETING_CLAIM', 'VERIFIED_CLAIM', 'NEEDS_EVIDENCE'
);

CREATE TYPE "KnowledgeBaseConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TYPE "ContentMediaEntityType" ADD VALUE 'KNOWLEDGE_BASE_ENTRY';

ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "relatedMediaBundleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "relatedSeoTopicIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "relatedEntryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "visibility" "KnowledgeBaseVisibility" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "claimStatus" "KnowledgeBaseClaimStatus" NOT NULL DEFAULT 'FACT';
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "confidence" "KnowledgeBaseConfidence" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'vi';
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "domain" TEXT;
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "authorName" TEXT;
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "evidenceUrl" TEXT;
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);
ALTER TABLE "KnowledgeBaseEntry" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "KnowledgeBaseEntry_visibility_idx" ON "KnowledgeBaseEntry"("visibility");
CREATE INDEX "KnowledgeBaseEntry_claimStatus_idx" ON "KnowledgeBaseEntry"("claimStatus");
CREATE INDEX "KnowledgeBaseEntry_domain_idx" ON "KnowledgeBaseEntry"("domain");

CREATE TABLE "KnowledgeBaseEntryVersion" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "changeNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeBaseEntryVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeBaseEntryVersion_entryId_version_key" ON "KnowledgeBaseEntryVersion"("entryId", "version");
CREATE INDEX "KnowledgeBaseEntryVersion_entryId_idx" ON "KnowledgeBaseEntryVersion"("entryId");

ALTER TABLE "KnowledgeBaseEntryVersion" ADD CONSTRAINT "KnowledgeBaseEntryVersion_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "KnowledgeBaseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill verification timestamps from existing verifiedAt where present.
UPDATE "KnowledgeBaseEntry"
SET "lastVerifiedAt" = "verifiedAt"
WHERE "isVerified" = true AND "verifiedAt" IS NOT NULL;

-- Public FAQ scope entries default to PUBLIC visibility.
UPDATE "KnowledgeBaseEntry"
SET "visibility" = 'PUBLIC'
WHERE 'PUBLIC_FAQ' = ANY("usageScope");
