-- CreateEnum
CREATE TYPE "OrderProductGender" AS ENUM ('MALE', 'FEMALE', 'UNISEX', 'KIDS', 'OTHER');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "systemCode" TEXT;

-- AlterTable
ALTER TABLE "Color" ADD COLUMN "hex" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryMethod_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "productionOwnerId" TEXT,
ADD COLUMN "deliveryMethodId" TEXT,
ADD COLUMN "deliveryMethodName" TEXT,
ADD COLUMN "deliveryOwnerId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "colorId" TEXT,
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "gender" "OrderProductGender";

-- CreateIndex
CREATE UNIQUE INDEX "Product_systemCode_key" ON "Product"("systemCode");

-- CreateIndex
CREATE INDEX "Product_systemCode_idx" ON "Product"("systemCode");

-- CreateIndex
CREATE INDEX "Color_isActive_idx" ON "Color"("isActive");

-- CreateIndex
CREATE INDEX "Color_sortOrder_idx" ON "Color"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_employeeCode_idx" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryMethod_code_key" ON "DeliveryMethod"("code");

-- CreateIndex
CREATE INDEX "DeliveryMethod_code_idx" ON "DeliveryMethod"("code");

-- CreateIndex
CREATE INDEX "DeliveryMethod_isActive_idx" ON "DeliveryMethod"("isActive");

-- CreateIndex
CREATE INDEX "Order_productionOwnerId_idx" ON "Order"("productionOwnerId");

-- CreateIndex
CREATE INDEX "Order_deliveryMethodId_idx" ON "Order"("deliveryMethodId");

-- CreateIndex
CREATE INDEX "OrderItem_colorId_idx" ON "OrderItem"("colorId");

-- CreateIndex
CREATE INDEX "OrderItem_categoryId_idx" ON "OrderItem"("categoryId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productionOwnerId_fkey" FOREIGN KEY ("productionOwnerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryOwnerId_fkey" FOREIGN KEY ("deliveryOwnerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliveryMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
