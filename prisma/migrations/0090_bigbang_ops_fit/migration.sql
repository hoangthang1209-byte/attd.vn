-- AlterEnum: additive sample revision state (appends; Prisma maps by name)
ALTER TYPE "ItemProductionSampleStatus" ADD VALUE 'NEEDS_REVISION';

-- AlterTable: lightweight next-action fields for daily production board
ALTER TABLE "ItemProductionTracking" ADD COLUMN "nextAction" TEXT;
ALTER TABLE "ItemProductionTracking" ADD COLUMN "nextActionDueDate" TIMESTAMP(3);

CREATE INDEX "ItemProductionTracking_nextActionDueDate_idx"
  ON "ItemProductionTracking"("nextActionDueDate");
