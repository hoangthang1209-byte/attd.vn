-- CreateEnum
CREATE TYPE "DealerCompanyType" AS ENUM ('DEALER', 'AGENCY', 'PRINTING_COMPANY', 'EVENT_COMPANY', 'CORPORATE_BUYER', 'OEM_CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DealerCompanyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DealerLevel" AS ENUM ('STANDARD', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "DealerUserRole" AS ENUM ('OWNER', 'MANAGER', 'SALES', 'PURCHASING', 'VIEWER');

-- CreateEnum
CREATE TYPE "DealerUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "DealerActivityType" AS ENUM ('CREATED', 'UPDATED', 'APPROVED', 'REJECTED', 'USER_ADDED', 'CRM_LINKED', 'PRICE_GROUP_ASSIGNED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "DealerCompany" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxCode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Vietnam',
    "type" "DealerCompanyType" NOT NULL DEFAULT 'DEALER',
    "status" "DealerCompanyStatus" NOT NULL DEFAULT 'PENDING',
    "level" "DealerLevel" NOT NULL DEFAULT 'STANDARD',
    "customerId" TEXT,
    "priceGroupId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerUser" (
    "id" TEXT NOT NULL,
    "dealerCompanyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "DealerUserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "DealerUserStatus" NOT NULL DEFAULT 'INVITED',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerActivity" (
    "id" TEXT NOT NULL,
    "dealerCompanyId" TEXT NOT NULL,
    "dealerUserId" TEXT,
    "type" "DealerActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealerCompany_code_key" ON "DealerCompany"("code");

-- CreateIndex
CREATE INDEX "DealerCompany_status_idx" ON "DealerCompany"("status");

-- CreateIndex
CREATE INDEX "DealerCompany_type_idx" ON "DealerCompany"("type");

-- CreateIndex
CREATE INDEX "DealerCompany_level_idx" ON "DealerCompany"("level");

-- CreateIndex
CREATE INDEX "DealerCompany_customerId_idx" ON "DealerCompany"("customerId");

-- CreateIndex
CREATE INDEX "DealerCompany_priceGroupId_idx" ON "DealerCompany"("priceGroupId");

-- CreateIndex
CREATE INDEX "DealerCompany_code_idx" ON "DealerCompany"("code");

-- CreateIndex
CREATE INDEX "DealerCompany_name_idx" ON "DealerCompany"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DealerUser_email_key" ON "DealerUser"("email");

-- CreateIndex
CREATE INDEX "DealerUser_dealerCompanyId_idx" ON "DealerUser"("dealerCompanyId");

-- CreateIndex
CREATE INDEX "DealerUser_status_idx" ON "DealerUser"("status");

-- CreateIndex
CREATE INDEX "DealerActivity_dealerCompanyId_createdAt_idx" ON "DealerActivity"("dealerCompanyId", "createdAt");

-- AddForeignKey
ALTER TABLE "DealerCompany" ADD CONSTRAINT "DealerCompany_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerCompany" ADD CONSTRAINT "DealerCompany_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "PriceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerUser" ADD CONSTRAINT "DealerUser_dealerCompanyId_fkey" FOREIGN KEY ("dealerCompanyId") REFERENCES "DealerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerActivity" ADD CONSTRAINT "DealerActivity_dealerCompanyId_fkey" FOREIGN KEY ("dealerCompanyId") REFERENCES "DealerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerActivity" ADD CONSTRAINT "DealerActivity_dealerUserId_fkey" FOREIGN KEY ("dealerUserId") REFERENCES "DealerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
