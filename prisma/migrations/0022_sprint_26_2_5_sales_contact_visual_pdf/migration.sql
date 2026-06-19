-- Sprint 26.2.5 — Sales module, contact linking, visual quote PDF

-- CreateTable
CREATE TABLE "SalesRepresentative" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "zalo" TEXT,
    "address" TEXT,
    "avatarMediaAssetId" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRepresentative_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "salesRepresentativeId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "salesTitleSnapshot" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SalesRepresentative_code_key" ON "SalesRepresentative"("code");
CREATE INDEX IF NOT EXISTS "SalesRepresentative_isActive_idx" ON "SalesRepresentative"("isActive");
CREATE INDEX IF NOT EXISTS "SalesRepresentative_isDefault_idx" ON "SalesRepresentative"("isDefault");
CREATE INDEX IF NOT EXISTS "SalesRepresentative_code_idx" ON "SalesRepresentative"("code");
CREATE INDEX IF NOT EXISTS "Quote_salesRepresentativeId_idx" ON "Quote"("salesRepresentativeId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "SalesRepresentative" ADD CONSTRAINT "SalesRepresentative_avatarMediaAssetId_fkey" FOREIGN KEY ("avatarMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_salesRepresentativeId_fkey" FOREIGN KEY ("salesRepresentativeId") REFERENCES "SalesRepresentative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
