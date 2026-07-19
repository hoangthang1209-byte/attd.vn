import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluatePersistedProductPublishGate,
  isClientTempProductId,
  productBulkArchiveUpdateData,
  productBulkForbiddenFields,
  PRODUCT_BULK_MAX_IDS,
  validateBulkLeadTimeValue,
  validateBulkMoqValue,
  validateProductBulkIds,
} from "@/features/products/product-bulk.service";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product bulk id validation", () => {
  it("rejects empty productIds", () => {
    assert.throws(() => validateProductBulkIds([]), ProductAdminValidationError);
  });

  it("rejects temp IDs", () => {
    assert.equal(isClientTempProductId("tmp_123"), true);
    assert.equal(isClientTempProductId("client-product"), true);
    assert.equal(isClientTempProductId("prod_legacy"), false);
    assert.equal(isClientTempProductId("cmqfmcrph003fk0044ki1ihbr"), false);
    assert.throws(
      () => validateProductBulkIds(["tmp_123", "cm1234567890abcdefghijkl"]),
      ProductAdminValidationError,
    );
  });
  it("allows persisted cuid-like IDs and supports 200 products", () => {
    const ids = Array.from({ length: 200 }, (_, index) => `cm1234567890abcdefghij${String(index).padStart(2, "0")}`);
    assert.equal(validateProductBulkIds(ids).length, 200);
    assert.equal(PRODUCT_BULK_MAX_IDS, 200);
    assert.throws(
      () => validateProductBulkIds([...ids, "cm1234567890abcdefghijxx"]),
      ProductAdminValidationError,
    );
  });
});

describe("product bulk field validation", () => {
  it("bulk MOQ validates positive integer", () => {
    assert.equal(validateBulkMoqValue(50), 50);
    assert.throws(() => validateBulkMoqValue(0), ProductAdminValidationError);
    assert.throws(() => validateBulkMoqValue(-1), ProductAdminValidationError);
    assert.throws(() => validateBulkMoqValue(1.5), ProductAdminValidationError);
    assert.throws(() => validateBulkMoqValue("abc"), ProductAdminValidationError);
  });

  it("bulk lead-time rejects empty values", () => {
    assert.equal(validateBulkLeadTimeValue("Có sẵn: 1–3 ngày"), "Có sẵn: 1–3 ngày");
    assert.throws(() => validateBulkLeadTimeValue("  "), ProductAdminValidationError);
  });
});

describe("product bulk safety contracts", () => {
  it("archives selected products only via status update", () => {
    assert.deepEqual(productBulkArchiveUpdateData(), { status: "ARCHIVED" });
  });

  it("does not change productCode/SKU/category fields in bulk helpers", () => {
    const forbidden = productBulkForbiddenFields();
    assert.ok(forbidden.includes("productCode"));
    assert.ok(forbidden.includes("sku"));
    assert.ok(forbidden.includes("categoryId"));
    const service = read("src/features/products/product-bulk.service.ts");
    assert.doesNotMatch(service, /data:\s*\{\s*productCode:/);
    assert.doesNotMatch(service, /data:\s*\{\s*[^}]*\bsku:/);
    assert.doesNotMatch(service, /data:\s*\{\s*categoryId:/);
    assert.doesNotMatch(service, /data:\s*\{\s*category:/);
  });

  it("does not delete variants when archiving", () => {
    const service = read("src/features/products/product-bulk.service.ts");
    assert.match(service, /status:\s*"ARCHIVED"/);
    assert.doesNotMatch(service, /productVariant\.delete/);
    assert.doesNotMatch(service, /variants:\s*\{\s*delete/);
  });
});

describe("product bulk publish readiness", () => {
  const incomplete = {
    name: "Test",
    slug: "test",
    categoryId: "",
    description: null,
    seoTitle: null,
    seoDescription: null,
    featuredImage: null,
    gallery: [] as string[],
    images: [] as Array<{ imageUrl: string }>,
    variants: [] as Array<{ variantStatus: string; imageUrl: string | null }>,
    specifications: [] as Array<{ label: string; value: string }>,
    attributeAssignments: [] as Array<{
      attributeId: string;
      attributeValueId: string | null;
      customValue: string | null;
    }>,
    options: [] as Array<{ values: Array<{ label: string }> }>,
  };

  it("publish skips products not ready", () => {
    const result = evaluatePersistedProductPublishGate(incomplete);
    assert.equal(result.valid, false);
    assert.ok(result.reason.length > 0);
  });

  it("publish allows ready products", () => {
    const result = evaluatePersistedProductPublishGate({
      ...incomplete,
      name: "Áo thun cotton cao cấp",
      slug: "ao-thun-cotton-cao-cap",
      categoryId: "cat_1",
      description: "Áo thun cotton 2 chiều phù hợp in chuyển nhiệt cho doanh nghiệp.",
      seoTitle: "Áo thun cotton cao cấp giá sỉ",
      seoDescription: "Áo thun cotton cao cấp dành cho đơn hàng sỉ và đồng phục doanh nghiệp.",
      featuredImage: "https://cdn.example.com/ao-thun.jpg",
      variants: [{ variantStatus: "ACTIVE", imageUrl: null }],
    });
    assert.equal(result.valid, true);
  });
});

describe("product bulk API route contract", () => {
  it("exposes POST /api/admin/products/bulk with permission gate", () => {
    const route = read("src/app/api/admin/products/bulk/route.ts");
    assert.match(route, /performBulkProductOperation/);
    assert.match(route, /requireAdminPermission/);
    assert.match(route, /platform:\s*"product"/);
    assert.match(route, /action:\s*"update"/);
  });
});
