import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import {
  isPartialCatalogSchemaError,
  normalizeLegacyProductRow,
} from "./product-detail-compat";
import { mapProductToPublicDetail } from "./product-detail.mapper";

describe("isPartialCatalogSchemaError", () => {
  it("detects missing ProductOption table", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Table missing", {
      code: "P2021",
      clientVersion: "test",
    });
    assert.equal(isPartialCatalogSchemaError(error), true);
  });

  it("detects missing ProductVariant column message", () => {
    assert.equal(
      isPartialCatalogSchemaError(
        new Error("The column `ProductVariant.displayLabel` does not exist in the current database."),
      ),
      true,
    );
  });
});

describe("normalizeLegacyProductRow", () => {
  it("maps legacy variants without structured options for PDP", () => {
    const normalized = normalizeLegacyProductRow({
      id: "p1",
      slug: "ao-thun-test",
      name: "Áo thun test",
      productCode: "TS001",
      shortDescription: null,
      description: null,
      seoTitle: null,
      seoDescription: null,
      material: "Cotton",
      form: null,
      fit: null,
      gsm: 180,
      defaultMoq: 50,
      leadTime: "7 ngày",
      supportsPrinting: true,
      supportsEmbroidery: false,
      supportsOem: false,
      useCases: [],
      targetCustomers: [],
      featuredImage: null,
      gallery: [],
      metadata: null,
      category: { id: "c1", name: "Áo thun", slug: "ao-thun-tron" },
      images: [],
      variants: [
        {
          id: "v1",
          sku: "TS001-BLK-M",
          colorName: "Đen",
          colorCode: "BLK",
          sizeName: "M",
          dimensions: null,
          capacity: null,
          stockStatus: "IN_STOCK",
          stockQty: 10,
          imageUrl: null,
          color: null,
          size: null,
        },
      ],
    });

    const detail = mapProductToPublicDetail(normalized);
    assert.equal(detail.variants.length, 1);
    assert.equal(detail.optionGroups.length > 0, true);
    assert.equal(detail.hasStructuredOptions, false);
    JSON.stringify(detail);
  });
});
