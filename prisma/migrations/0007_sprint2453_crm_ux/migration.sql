-- Sprint 24.5.3 — CRM UX: attribution + pipeline value

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "estimatedValue" DECIMAL(12, 2);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "landingPage" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "referrer" TEXT;

UPDATE "Lead" AS l
SET
  "landingPage" = d."landingPage",
  "utmSource" = d."utmSource",
  "utmMedium" = d."utmMedium",
  "utmCampaign" = d."utmCampaign",
  "referrer" = d."referrer",
  "estimatedValue" = d."estimatedValue"
FROM "DealerLead" AS d
WHERE l."id" = d."id";
