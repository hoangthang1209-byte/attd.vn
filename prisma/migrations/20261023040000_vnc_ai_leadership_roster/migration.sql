-- VNC AI Leadership Team roster. Identity data only; does not activate agents.
CREATE TABLE IF NOT EXISTS "VncAiManager" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "reportsToId" TEXT NULL REFERENCES "VncAiManager"("id") ON DELETE RESTRICT,
  "runtimeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "VncAiManager" ("id","name","role","department","reportsToId","runtimeEnabled") VALUES
('VNC_AI_CEO','Alex','AI CEO','Executive',NULL,false),
('VNC_AI_CTO','Ethan','AI CTO','Technology','VNC_AI_CEO',false),
('VNC_AI_SALES','Olivia','AI Sales Manager','International B2B Sales','VNC_AI_CEO',false),
('VNC_AI_SOURCING','Daniel','AI Sourcing Manager','Suppliers & Procurement','VNC_AI_CEO',false),
('VNC_AI_PRODUCT','Sophia','AI Product Manager','Product Development & Sampling','VNC_AI_CEO',false),
('VNC_AI_OPERATIONS','Marcus','AI Operations Manager','Production, QC & Logistics','VNC_AI_CEO',false),
('VNC_AI_FINANCE','Victor','AI Finance Manager','Costing, P&L & Finance','VNC_AI_CEO',false),
('VNC_AI_MARKETING','Emma','AI Marketing Manager','B2B Marketing & SEO','VNC_AI_CEO',false)
ON CONFLICT ("id") DO UPDATE SET
  "name"=EXCLUDED."name",
  "role"=EXCLUDED."role",
  "department"=EXCLUDED."department",
  "reportsToId"=EXCLUDED."reportsToId";
-- Intentionally do not update runtimeEnabled: identity provisioning != live execution.
