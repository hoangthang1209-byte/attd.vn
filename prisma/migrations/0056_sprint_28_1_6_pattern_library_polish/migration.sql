-- Sprint 28.1.6 — Pattern Library source fields and file size metadata

CREATE TYPE "PatternSourceType" AS ENUM ('INTERNAL', 'EXTERNAL_STUDIO', 'CUSTOMER', 'FACTORY', 'OTHER');

ALTER TABLE "Pattern" ADD COLUMN "sourceType" "PatternSourceType";
ALTER TABLE "Pattern" ADD COLUMN "sourceSupplier" TEXT;
ALTER TABLE "Pattern" ADD COLUMN "sourceSupplierContact" TEXT;
ALTER TABLE "Pattern" ADD COLUMN "sourcePhone" TEXT;
ALTER TABLE "Pattern" ADD COLUMN "sourceEmail" TEXT;
ALTER TABLE "Pattern" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Pattern" ADD COLUMN "customerNameSnapshot" TEXT;
ALTER TABLE "Pattern" ADD COLUMN "sourceNotes" TEXT;

ALTER TABLE "PatternFile" ADD COLUMN "fileSizeBytes" INTEGER;

CREATE INDEX "Pattern_customerId_idx" ON "Pattern"("customerId");
CREATE INDEX "Pattern_sourceType_idx" ON "Pattern"("sourceType");

ALTER TABLE "Pattern" ADD CONSTRAINT "Pattern_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
