-- Sprint 27.3.4: structured product-level shared attribute assignments

CREATE TABLE "ProductAttributeAssignment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "attributeValueId" TEXT,
    "customValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAttributeAssignment_productId_attributeId_key" ON "ProductAttributeAssignment"("productId", "attributeId");
CREATE INDEX "ProductAttributeAssignment_productId_sortOrder_idx" ON "ProductAttributeAssignment"("productId", "sortOrder");
CREATE INDEX "ProductAttributeAssignment_attributeId_idx" ON "ProductAttributeAssignment"("attributeId");

ALTER TABLE "ProductAttributeAssignment" ADD CONSTRAINT "ProductAttributeAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeAssignment" ADD CONSTRAINT "ProductAttributeAssignment_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeAssignment" ADD CONSTRAINT "ProductAttributeAssignment_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "ProductAttributeValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
