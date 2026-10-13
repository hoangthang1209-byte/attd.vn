-- GROWTH-1: normalized marketing attribution on canonical CRM leads (additive)

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "utmTerm" TEXT,
  ADD COLUMN IF NOT EXISTS "utmContent" TEXT,
  ADD COLUMN IF NOT EXISTS "marketingChannel" TEXT,
  ADD COLUMN IF NOT EXISTS "marketingCampaign" TEXT;

CREATE INDEX IF NOT EXISTS "Lead_marketingChannel_idx" ON "Lead"("marketingChannel");
CREATE INDEX IF NOT EXISTS "Lead_marketingChannel_marketingCampaign_idx"
  ON "Lead"("marketingChannel", "marketingCampaign");
