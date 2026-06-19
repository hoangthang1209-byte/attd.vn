-- CreateEnum
CREATE TYPE "QuotePriceVatType" AS ENUM ('EXCLUDING_VAT', 'INCLUDING_VAT');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN     "priceVatType" "QuotePriceVatType" NOT NULL DEFAULT 'EXCLUDING_VAT',
ADD COLUMN     "customerCompanySnapshot" TEXT,
ADD COLUMN     "customerTaxCodeSnapshot" TEXT,
ADD COLUMN     "customerAddressSnapshot" TEXT,
ADD COLUMN     "customerContactNameSnapshot" TEXT,
ADD COLUMN     "customerContactTitleSnapshot" TEXT,
ADD COLUMN     "customerPhoneSnapshot" TEXT,
ADD COLUMN     "customerEmailSnapshot" TEXT,
ADD COLUMN     "salesName" TEXT,
ADD COLUMN     "salesPhone" TEXT,
ADD COLUMN     "salesEmail" TEXT,
ADD COLUMN     "salesAddress" TEXT,
ADD COLUMN     "quoteDate" TIMESTAMP(3),
ADD COLUMN     "preparedBy" TEXT;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "designMediaAssetId" TEXT,
ADD COLUMN     "designImageUrl" TEXT,
ADD COLUMN     "skuSnapshot" TEXT,
ADD COLUMN     "colorSnapshot" TEXT,
ADD COLUMN     "categorySnapshot" TEXT,
ADD COLUMN     "genderSnapshot" TEXT,
ADD COLUMN     "moqSnapshot" INTEGER,
ADD COLUMN     "itemNote" TEXT,
ADD COLUMN     "productionLeadTime" TEXT,
ADD COLUMN     "sampleFee" DECIMAL(12,2),
ADD COLUMN     "sampleLeadTime" TEXT;

-- CreateIndex
CREATE INDEX "QuoteItem_designMediaAssetId_idx" ON "QuoteItem"("designMediaAssetId");

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_designMediaAssetId_fkey" FOREIGN KEY ("designMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
