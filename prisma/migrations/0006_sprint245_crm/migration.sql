-- Sprint 24.5 — CRM Lead pipeline

CREATE TYPE "LeadSource" AS ENUM ('CONTACT', 'DEALER', 'OEM', 'SOURCING', 'LANDING_PAGE');

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMP(3);

ALTER TABLE "Lead" RENAME COLUMN "name" TO "fullName";

ALTER TABLE "Lead" DROP COLUMN IF EXISTS "productInterest";

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "source_new" "LeadSource";

UPDATE "Lead"
SET "source_new" = CASE
  WHEN "source" ILIKE '%DEALER%' THEN 'DEALER'::"LeadSource"
  WHEN "source" ILIKE '%OEM%' THEN 'OEM'::"LeadSource"
  WHEN "source" ILIKE '%WHOLESALE%' OR "source" ILIKE '%SOURC%' THEN 'SOURCING'::"LeadSource"
  WHEN "source" ILIKE '%LANDING%' OR "source" ILIKE '%CORPORATE%' THEN 'LANDING_PAGE'::"LeadSource"
  ELSE 'CONTACT'::"LeadSource"
END
WHERE "source_new" IS NULL;

ALTER TABLE "Lead" DROP COLUMN IF EXISTS "source";
ALTER TABLE "Lead" RENAME COLUMN "source_new" TO "source";
ALTER TABLE "Lead" ALTER COLUMN "source" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "source" SET DEFAULT 'CONTACT';

CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'CONTACTED', 'QUOTING', 'NEGOTIATING', 'WON', 'LOST');

ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING (
  CASE "status"::text
    WHEN 'NEW' THEN 'NEW'::"LeadStatus_new"
    WHEN 'PROCESSING' THEN 'CONTACTED'::"LeadStatus_new"
    WHEN 'QUOTED' THEN 'QUOTING'::"LeadStatus_new"
    WHEN 'WON' THEN 'WON'::"LeadStatus_new"
    WHEN 'LOST' THEN 'LOST'::"LeadStatus_new"
    ELSE 'NEW'::"LeadStatus_new"
  END
);

DROP TYPE "LeadStatus";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEW';

CREATE TABLE IF NOT EXISTS "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadNote_leadId_createdAt_idx" ON "LeadNote"("leadId", "createdAt");

ALTER TABLE "LeadNote"
  ADD CONSTRAINT "LeadNote_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_source_idx" ON "Lead"("source");
CREATE INDEX IF NOT EXISTS "Lead_followUpAt_idx" ON "Lead"("followUpAt");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");
