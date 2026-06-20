-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "publicShortCode" VARCHAR(4);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_publicShortCode_key" ON "Quote"("publicShortCode");
