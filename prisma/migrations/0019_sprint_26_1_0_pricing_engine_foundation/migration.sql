-- CreateEnum
CREATE TYPE "PricingCalculationStatus" AS ENUM ('DRAFT', 'CALCULATED', 'USED_FOR_QUOTE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PricingServiceType" AS ENUM ('PRINT_DTF', 'PRINT_SILK', 'EMBROIDERY', 'OEM', 'PACKAGING', 'DESIGN', 'SETUP', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "PricingCalculationType" AS ENUM ('PER_ITEM', 'PER_ORDER', 'PER_POSITION', 'MANUAL');

-- CreateTable
CREATE TABLE "PriceGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPriceTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "priceGroupId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePriceRule" (
    "id" TEXT NOT NULL,
    "serviceType" "PricingServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "priceGroupId" TEXT,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "calculationType" "PricingCalculationType" NOT NULL DEFAULT 'PER_ITEM',
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "setupFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCalculation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leadId" TEXT,
    "customerId" TEXT,
    "contactId" TEXT,
    "priceGroupId" TEXT,
    "status" "PricingCalculationStatus" NOT NULL DEFAULT 'CALCULATED',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "setupTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "manualTotalAmount" DECIMAL(12,2),
    "manualOverrideReason" TEXT,
    "internalNote" TEXT,
    "inputSnapshot" JSONB,
    "resultSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCalculationItem" (
    "id" TEXT NOT NULL,
    "pricingCalculationId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productNameSnapshot" TEXT,
    "variantNameSnapshot" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'cái',
    "baseUnitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "setupFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costEstimate" DECIMAL(12,2),
    "marginAmount" DECIMAL(12,2),
    "marginRate" DECIMAL(8,4),
    "pricingSnapshot" JSONB,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "manualUnitPrice" DECIMAL(12,2),
    "manualOverrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCalculationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceGroup_code_key" ON "PriceGroup"("code");

-- CreateIndex
CREATE INDEX "PriceGroup_code_idx" ON "PriceGroup"("code");

-- CreateIndex
CREATE INDEX "PriceGroup_isActive_idx" ON "PriceGroup"("isActive");

-- CreateIndex
CREATE INDEX "PriceGroup_isDefault_idx" ON "PriceGroup"("isDefault");

-- CreateIndex
CREATE INDEX "ProductPriceTier_productId_idx" ON "ProductPriceTier"("productId");

-- CreateIndex
CREATE INDEX "ProductPriceTier_variantId_idx" ON "ProductPriceTier"("variantId");

-- CreateIndex
CREATE INDEX "ProductPriceTier_priceGroupId_idx" ON "ProductPriceTier"("priceGroupId");

-- CreateIndex
CREATE INDEX "ProductPriceTier_minQuantity_idx" ON "ProductPriceTier"("minQuantity");

-- CreateIndex
CREATE INDEX "ProductPriceTier_isActive_idx" ON "ProductPriceTier"("isActive");

-- CreateIndex
CREATE INDEX "ServicePriceRule_serviceType_idx" ON "ServicePriceRule"("serviceType");

-- CreateIndex
CREATE INDEX "ServicePriceRule_priceGroupId_idx" ON "ServicePriceRule"("priceGroupId");

-- CreateIndex
CREATE INDEX "ServicePriceRule_isActive_idx" ON "ServicePriceRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCalculation_code_key" ON "PricingCalculation"("code");

-- CreateIndex
CREATE INDEX "PricingCalculation_code_idx" ON "PricingCalculation"("code");

-- CreateIndex
CREATE INDEX "PricingCalculation_leadId_idx" ON "PricingCalculation"("leadId");

-- CreateIndex
CREATE INDEX "PricingCalculation_customerId_idx" ON "PricingCalculation"("customerId");

-- CreateIndex
CREATE INDEX "PricingCalculation_status_idx" ON "PricingCalculation"("status");

-- CreateIndex
CREATE INDEX "PricingCalculation_createdAt_idx" ON "PricingCalculation"("createdAt");

-- CreateIndex
CREATE INDEX "PricingCalculationItem_pricingCalculationId_idx" ON "PricingCalculationItem"("pricingCalculationId");

-- CreateIndex
CREATE INDEX "PricingCalculationItem_productId_idx" ON "PricingCalculationItem"("productId");

-- CreateIndex
CREATE INDEX "PricingCalculationItem_variantId_idx" ON "PricingCalculationItem"("variantId");

-- AddForeignKey
ALTER TABLE "ProductPriceTier" ADD CONSTRAINT "ProductPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceTier" ADD CONSTRAINT "ProductPriceTier_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceTier" ADD CONSTRAINT "ProductPriceTier_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "PriceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePriceRule" ADD CONSTRAINT "ServicePriceRule_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "PriceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculation" ADD CONSTRAINT "PricingCalculation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculation" ADD CONSTRAINT "PricingCalculation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculation" ADD CONSTRAINT "PricingCalculation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculation" ADD CONSTRAINT "PricingCalculation_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "PriceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculationItem" ADD CONSTRAINT "PricingCalculationItem_pricingCalculationId_fkey" FOREIGN KEY ("pricingCalculationId") REFERENCES "PricingCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculationItem" ADD CONSTRAINT "PricingCalculationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculationItem" ADD CONSTRAINT "PricingCalculationItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
