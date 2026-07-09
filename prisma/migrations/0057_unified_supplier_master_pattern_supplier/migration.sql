-- CreateEnum
CREATE TYPE "SupplierCategory" AS ENUM ('PATTERN_ROOM', 'FABRIC_SUPPLIER', 'TRIM_SUPPLIER', 'PRINT_EMBROIDERY', 'SEWING_FACTORY', 'WASH_FACTORY', 'LOGISTICS', 'GENERAL');

-- AlterTable
ALTER TABLE "ProductionSupplier" ADD COLUMN "category" "SupplierCategory" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Pattern" ADD COLUMN "patternSupplierId" TEXT,
ADD COLUMN "sourceSupplierCode" TEXT;

-- CreateIndex
CREATE INDEX "Pattern_patternSupplierId_idx" ON "Pattern"("patternSupplierId");

-- CreateIndex
CREATE INDEX "ProductionSupplier_category_idx" ON "ProductionSupplier"("category");

-- AddForeignKey
ALTER TABLE "Pattern" ADD CONSTRAINT "Pattern_patternSupplierId_fkey" FOREIGN KEY ("patternSupplierId") REFERENCES "ProductionSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
