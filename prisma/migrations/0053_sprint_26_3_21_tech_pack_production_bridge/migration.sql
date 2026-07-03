-- Sprint 26.3.21: Tech Pack production job bridge fields

ALTER TABLE "TechPack" ADD COLUMN "productionPlanId" TEXT;
ALTER TABLE "TechPack" ADD COLUMN "jobCodeSnapshot" TEXT;
ALTER TABLE "TechPack" ADD COLUMN "internalDeadlineSnapshot" TIMESTAMP(3);
ALTER TABLE "TechPack" ADD COLUMN "deliveryDeadlineSnapshot" TIMESTAMP(3);
ALTER TABLE "TechPack" ADD COLUMN "productionOwnerNameSnapshot" TEXT;
ALTER TABLE "TechPack" ADD COLUMN "workshopNameSnapshot" TEXT;
ALTER TABLE "TechPack" ADD COLUMN "constructionNote" TEXT;
ALTER TABLE "TechPack" ADD COLUMN "fitNote" TEXT;
ALTER TABLE "TechPack" ADD COLUMN "generalNote" TEXT;

CREATE INDEX "TechPack_productionPlanId_idx" ON "TechPack"("productionPlanId");

ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
