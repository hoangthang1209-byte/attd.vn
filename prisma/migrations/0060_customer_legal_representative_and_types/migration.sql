-- CRM-1: Customer legal representative fields + CustomerType master data

ALTER TYPE "CustomerType" RENAME TO "CustomerLegacyType";

CREATE TYPE "CustomerRepresentativeSalutation" AS ENUM ('MR', 'MRS', 'MS', 'OTHER');

CREATE TABLE "CustomerType" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerType_code_key" ON "CustomerType"("code");
CREATE INDEX "CustomerType_isActive_sortOrder_idx" ON "CustomerType"("isActive", "sortOrder");

ALTER TABLE "Customer"
  ADD COLUMN "customerTypeId" TEXT,
  ADD COLUMN "representativeName" TEXT,
  ADD COLUMN "representativeSalutation" "CustomerRepresentativeSalutation",
  ADD COLUMN "representativeTitle" TEXT,
  ADD COLUMN "authorizationDocumentNo" TEXT;

CREATE INDEX "Customer_customerTypeId_idx" ON "Customer"("customerTypeId");

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_customerTypeId_fkey"
  FOREIGN KEY ("customerTypeId") REFERENCES "CustomerType"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default customer types
INSERT INTO "CustomerType" ("id", "code", "name", "description", "sortOrder", "isActive", "isSystem", "updatedAt") VALUES
  ('ct_business', 'BUSINESS', 'Doanh nghiệp', NULL, 10, true, true, CURRENT_TIMESTAMP),
  ('ct_dealer', 'DEALER', 'Đại lý', NULL, 20, true, true, CURRENT_TIMESTAMP),
  ('ct_agency', 'AGENCY', 'Agency', NULL, 30, true, true, CURRENT_TIMESTAMP),
  ('ct_print_shop', 'PRINT_SHOP', 'Xưởng in', NULL, 40, true, true, CURRENT_TIMESTAMP),
  ('ct_distributor', 'DISTRIBUTOR', 'Nhà phân phối', NULL, 50, true, true, CURRENT_TIMESTAMP),
  ('ct_trading', 'TRADING', 'Thương mại / Trading', NULL, 60, true, true, CURRENT_TIMESTAMP),
  ('ct_brand', 'BRAND', 'Brand / Nhãn hàng', NULL, 70, true, true, CURRENT_TIMESTAMP),
  ('ct_organization', 'ORGANIZATION', 'Tổ chức / Trường học', NULL, 80, true, true, CURRENT_TIMESTAMP),
  ('ct_individual', 'INDIVIDUAL', 'Khách hàng cá nhân', NULL, 90, true, true, CURRENT_TIMESTAMP),
  ('ct_other', 'OTHER', 'Khác', NULL, 100, true, true, CURRENT_TIMESTAMP);

-- Map legacy enum values to new customer types
UPDATE "Customer" SET "customerTypeId" = 'ct_dealer' WHERE "type" = 'DEALER';
UPDATE "Customer" SET "customerTypeId" = 'ct_agency' WHERE "type" = 'AGENCY';
UPDATE "Customer" SET "customerTypeId" = 'ct_print_shop' WHERE "type" = 'PRINTER';
UPDATE "Customer" SET "customerTypeId" = 'ct_organization' WHERE "type" = 'EVENT_COMPANY';
UPDATE "Customer" SET "customerTypeId" = 'ct_business' WHERE "type" = 'BUSINESS';
UPDATE "Customer" SET "customerTypeId" = 'ct_individual' WHERE "type" = 'RETAIL';
UPDATE "Customer" SET "customerTypeId" = 'ct_distributor' WHERE "type" = 'SUPPLIER';
UPDATE "Customer" SET "customerTypeId" = 'ct_other' WHERE "type" = 'OTHER';
