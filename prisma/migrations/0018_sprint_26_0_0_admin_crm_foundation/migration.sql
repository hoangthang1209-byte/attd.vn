-- Sprint 26.0.0 — Admin CRM Foundation

-- New enums
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "CustomerType" AS ENUM ('DEALER', 'AGENCY', 'PRINTER', 'EVENT_COMPANY', 'BUSINESS', 'RETAIL', 'SUPPLIER', 'OTHER');
CREATE TYPE "CustomerStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'VIP', 'BLACKLISTED');
CREATE TYPE "CRMActivityType" AS ENUM ('CALL', 'ZALO', 'EMAIL', 'MEETING', 'NOTE', 'FOLLOW_UP', 'QUOTE_REQUEST', 'SAMPLE_REQUEST', 'STATUS_CHANGE');

-- Extend LeadSource
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'WEBSITE';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'ZALO';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'FACEBOOK';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'PHONE';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'REFERRAL';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'OLD_CUSTOMER';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'DIRECT';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'OTHER';

-- Extend LeadStatus
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'QUALIFIED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'NEED_PRICING';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'QUOTED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'NOT_FIT';

-- Customer table
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'BUSINESS',
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "province" TEXT,
    "district" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'PROSPECT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_code_idx" ON "Customer"("code");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_type_idx" ON "Customer"("type");
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- Contact table
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "zalo" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Contact_customerId_idx" ON "Contact"("customerId");

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "zalo" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "sourceDetail" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "demand" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextFollowUpAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_code_key" ON "Lead"("code");
CREATE INDEX IF NOT EXISTS "Lead_code_idx" ON "Lead"("code");
CREATE INDEX IF NOT EXISTS "Lead_priority_idx" ON "Lead"("priority");
CREATE INDEX IF NOT EXISTS "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email");
CREATE INDEX IF NOT EXISTS "Lead_customerId_idx" ON "Lead"("customerId");
CREATE INDEX IF NOT EXISTS "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill Lead fields from legacy columns
UPDATE "Lead" SET "contactName" = "fullName" WHERE "contactName" IS NULL;
UPDATE "Lead" SET "companyName" = "company" WHERE "companyName" IS NULL AND "company" IS NOT NULL;
UPDATE "Lead" SET "demand" = "message" WHERE "demand" IS NULL AND "message" IS NOT NULL;
UPDATE "Lead" SET "nextFollowUpAt" = "followUpAt" WHERE "nextFollowUpAt" IS NULL AND "followUpAt" IS NOT NULL;

-- Backfill lead codes
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn FROM "Lead" WHERE "code" IS NULL
)
UPDATE "Lead" l SET "code" = 'LEAD-' || LPAD(n.rn::text, 6, '0')
FROM numbered n WHERE l.id = n.id;

-- CRMActivity
CREATE TABLE "CRMActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "customerId" TEXT,
    "contactId" TEXT,
    "type" "CRMActivityType" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "outcome" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CRMActivity_leadId_idx" ON "CRMActivity"("leadId");
CREATE INDEX "CRMActivity_customerId_idx" ON "CRMActivity"("customerId");
CREATE INDEX "CRMActivity_createdAt_idx" ON "CRMActivity"("createdAt");

ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CRMProductInterest
CREATE TABLE "CRMProductInterest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "customerId" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "productNameSnapshot" TEXT,
    "quantity" INTEGER,
    "unit" TEXT DEFAULT 'cái',
    "requirementNote" TEXT,
    "serviceNeeds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMProductInterest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CRMProductInterest_leadId_idx" ON "CRMProductInterest"("leadId");
CREATE INDEX "CRMProductInterest_customerId_idx" ON "CRMProductInterest"("customerId");
CREATE INDEX "CRMProductInterest_productId_idx" ON "CRMProductInterest"("productId");

ALTER TABLE "CRMProductInterest" ADD CONSTRAINT "CRMProductInterest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMProductInterest" ADD CONSTRAINT "CRMProductInterest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMProductInterest" ADD CONSTRAINT "CRMProductInterest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMProductInterest" ADD CONSTRAINT "CRMProductInterest_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
