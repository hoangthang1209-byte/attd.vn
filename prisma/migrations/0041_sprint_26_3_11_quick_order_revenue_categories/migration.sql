-- Sprint 26.3.11 — Revenue categories, order item supply/processing classification

CREATE TYPE "OrderItemSupplySource" AS ENUM (
  'ATTD_STOCK',
  'EXTERNAL_PURCHASE',
  'MADE_TO_ORDER',
  'CUSTOMER_SUPPLIED'
);

CREATE TYPE "OrderItemProcessingMethod" AS ENUM (
  'AS_IS',
  'PRINT',
  'EMBROIDERY',
  'PRINT_AND_EMBROIDERY',
  'MADE_TO_ORDER',
  'OTHER_SERVICE'
);

CREATE TABLE "RevenueCategory" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RevenueCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueCategory_code_key" ON "RevenueCategory"("code");
CREATE INDEX "RevenueCategory_parentId_idx" ON "RevenueCategory"("parentId");
CREATE INDEX "RevenueCategory_isActive_sortOrder_idx" ON "RevenueCategory"("isActive", "sortOrder");

ALTER TABLE "RevenueCategory"
  ADD CONSTRAINT "RevenueCategory_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "RevenueCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD COLUMN "supplySource" "OrderItemSupplySource",
  ADD COLUMN "processingMethod" "OrderItemProcessingMethod",
  ADD COLUMN "revenueCategoryId" TEXT,
  ADD COLUMN "revenueCategoryNameSnapshot" TEXT,
  ADD COLUMN "revenueCategoryCodeSnapshot" TEXT;

CREATE INDEX "OrderItem_revenueCategoryId_idx" ON "OrderItem"("revenueCategoryId");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_revenueCategoryId_fkey"
  FOREIGN KEY ("revenueCategoryId") REFERENCES "RevenueCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuoteItem"
  ADD COLUMN "revenueCategoryId" TEXT,
  ADD COLUMN "revenueCategoryNameSnapshot" TEXT,
  ADD COLUMN "revenueCategoryCodeSnapshot" TEXT;

CREATE INDEX "QuoteItem_revenueCategoryId_idx" ON "QuoteItem"("revenueCategoryId");

ALTER TABLE "QuoteItem"
  ADD CONSTRAINT "QuoteItem_revenueCategoryId_fkey"
  FOREIGN KEY ("revenueCategoryId") REFERENCES "RevenueCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
