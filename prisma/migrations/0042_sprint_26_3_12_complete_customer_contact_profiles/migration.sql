-- Sprint 26.3.12 — Complete Customer CRM Profiles & Order Autofill

CREATE TABLE "AdministrativeProvince" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdministrativeProvince_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdministrativeProvince_code_key" ON "AdministrativeProvince"("code");
CREATE INDEX "AdministrativeProvince_code_idx" ON "AdministrativeProvince"("code");
CREATE INDEX "AdministrativeProvince_name_idx" ON "AdministrativeProvince"("name");

CREATE TABLE "AdministrativeWard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdministrativeWard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdministrativeWard_code_key" ON "AdministrativeWard"("code");
CREATE INDEX "AdministrativeWard_provinceId_idx" ON "AdministrativeWard"("provinceId");
CREATE INDEX "AdministrativeWard_code_idx" ON "AdministrativeWard"("code");
CREATE INDEX "AdministrativeWard_name_idx" ON "AdministrativeWard"("name");

ALTER TABLE "AdministrativeWard"
ADD CONSTRAINT "AdministrativeWard_provinceId_fkey"
FOREIGN KEY ("provinceId") REFERENCES "AdministrativeProvince"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "provinceId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "wardId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "provinceNameSnapshot" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "wardNameSnapshot" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "internalNote" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "billingNote" TEXT;

CREATE INDEX IF NOT EXISTS "Customer_provinceId_idx" ON "Customer"("provinceId");
CREATE INDEX IF NOT EXISTS "Customer_wardId_idx" ON "Customer"("wardId");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_provinceId_fkey"
FOREIGN KEY ("provinceId") REFERENCES "AdministrativeProvince"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_wardId_fkey"
FOREIGN KEY ("wardId") REFERENCES "AdministrativeWard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "department" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerNameSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerLegalNameSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhoneSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerEmailSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerWebsiteSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerProvinceNameSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerWardNameSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerAddressLine1Snapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "contactDepartment" TEXT;
