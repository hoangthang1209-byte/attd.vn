-- Sprint 26.3.3.2 — Order variant matrix, employee role, sales employee bridge

CREATE TYPE "EmployeeRole" AS ENUM ('SALES', 'PRODUCTION', 'DELIVERY', 'ADMIN', 'OTHER');

ALTER TABLE "Employee" ADD COLUMN "role" "EmployeeRole";

CREATE INDEX "Employee_role_idx" ON "Employee"("role");

ALTER TABLE "SalesRepresentative" ADD COLUMN "employeeId" TEXT;

CREATE UNIQUE INDEX "SalesRepresentative_employeeId_key" ON "SalesRepresentative"("employeeId");
CREATE INDEX "SalesRepresentative_employeeId_idx" ON "SalesRepresentative"("employeeId");

ALTER TABLE "SalesRepresentative" ADD CONSTRAINT "SalesRepresentative_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "salesEmployeeId" TEXT;

CREATE INDEX "Order_salesEmployeeId_idx" ON "Order"("salesEmployeeId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_salesEmployeeId_fkey"
  FOREIGN KEY ("salesEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OrderItemVariant" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "colorId" TEXT,
  "colorNameSnapshot" TEXT,
  "sizeValue" TEXT,
  "skuSnapshot" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'cái',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrderItemVariant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItemVariant_orderItemId_idx" ON "OrderItemVariant"("orderItemId");
CREATE INDEX "OrderItemVariant_colorId_idx" ON "OrderItemVariant"("colorId");

ALTER TABLE "OrderItemVariant" ADD CONSTRAINT "OrderItemVariant_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItemVariant" ADD CONSTRAINT "OrderItemVariant_colorId_fkey"
  FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;
