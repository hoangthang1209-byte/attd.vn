-- CreateEnum
CREATE TYPE "MediaFolder" AS ENUM ('PRODUCTS', 'CATEGORIES', 'CLIENTS', 'CASE_STUDIES');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'DRAFT');

-- CreateEnum
CREATE TYPE "DealerLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LeadPipelineStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "folder" "MediaFolder" NOT NULL,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLogoRecord" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "imageUrl" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLogoRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudyRecord" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStudyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "brandName" TEXT NOT NULL DEFAULT 'ATTD',
    "legalName" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "hotlineRaw" TEXT NOT NULL DEFAULT '',
    "hotlineDisplay" TEXT NOT NULL DEFAULT '',
    "zaloPhone" TEXT NOT NULL DEFAULT '',
    "zaloUrl" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "taxCode" TEXT NOT NULL DEFAULT '',
    "workingHours" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustMetricsSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "clientsCount" INTEGER,
    "partnerCount" INTEGER,
    "provinceCount" INTEGER,
    "experienceYears" INTEGER,
    "sectionTitle" TEXT NOT NULL DEFAULT 'Tại sao đại lý và doanh nghiệp chọn ATTD?',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustMetricsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_folder_idx" ON "MediaAsset"("folder");

-- CreateIndex
CREATE INDEX "MediaAsset_filename_idx" ON "MediaAsset"("filename");
