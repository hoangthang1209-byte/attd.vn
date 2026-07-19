import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPublicProductVisibilityWhere,
  isDemoOrSampleProductMetadata,
  isPublicProductStatus,
  planBulkPublicRevalidationPaths,
  shouldHideProductFromPublic,
} from "@/features/products/product-public-visibility";
import { isClientTempProductId } from "@/features/products/product-bulk.service";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product public visibility", () => {
  it("ACTIVE product is public-eligible", () => {
    assert.equal(isPublicProductStatus("ACTIVE"), true);
    assert.equal(
      shouldHideProductFromPublic({
        status: "ACTIVE",
        slug: "ao-thun",
        categoryIsActive: true,
        metadata: null,
      }),
      false,
    );
  });

  it("DRAFT / INACTIVE / ARCHIVED are hidden", () => {
    assert.equal(shouldHideProductFromPublic({ status: "DRAFT", slug: "x" }), true);
    assert.equal(shouldHideProductFromPublic({ status: "INACTIVE", slug: "x" }), true);
    assert.equal(shouldHideProductFromPublic({ status: "ARCHIVED", slug: "x" }), true);
  });

  it("demo/sample metadata is excluded from public where", () => {
    assert.equal(isDemoOrSampleProductMetadata({ isDemo: true }), true);
    assert.equal(isDemoOrSampleProductMetadata({ sampleData: true }), true);
    const where = buildPublicProductVisibilityWhere();
    assert.equal(where.status, "ACTIVE");
    assert.deepEqual(where.slug, { not: "" });
    assert.deepEqual(where.category, { isActive: true });
    assert.ok(Array.isArray(where.AND));
  });

  it("plans revalidation for listing, PDP, category, homepage, sitemap", () => {
    const paths = planBulkPublicRevalidationPaths({
      slugs: ["ao-thun"],
      categorySlugs: ["ao-thun-tron"],
      affectsHomepage: true,
    });
    assert.ok(paths.includes("/san-pham"));
    assert.ok(paths.includes("/san-pham/ao-thun"));
    assert.ok(paths.includes("/san-pham?category=ao-thun-tron"));
    assert.ok(paths.includes("/ao-thun-tron"));
    assert.ok(paths.includes("/"));
    assert.ok(paths.includes("/sitemap.xml"));
  });
});

describe("legacy bulk id safety", () => {
  it("does not reject cuid-like legacy product IDs", () => {
    assert.equal(isClientTempProductId("cmqfmcrph003fk0044ki1ihbr"), false);
    assert.equal(isClientTempProductId("cmqjmmmt20019jo04fx6gk4wd"), false);
    assert.equal(isClientTempProductId("prod_legacy"), false);
    assert.equal(isClientTempProductId("product-1"), false);
    assert.equal(isClientTempProductId("tmp_1"), true);
  });
});

describe("public visibility wiring contracts", () => {
  it("listing/PDP/category/sitemap use canonical visibility helper", () => {
    const productService = read("src/features/products/services/product.service.ts");
    const categoryService = read("src/features/categories/services/category.service.ts");
    const sitemap = read("src/app/sitemap.ts");
    const bulk = read("src/features/products/product-bulk.service.ts");

    assert.match(productService, /buildPublicProductVisibilityWhere/);
    assert.match(productService, /getProductDetailBySlug/);
    assert.match(categoryService, /buildPublicProductVisibilityWhere/);
    assert.match(sitemap, /buildPublicProductVisibilityWhere/);
    assert.match(bulk, /updated\.count === 0/);
    assert.match(bulk, /Sản phẩm đã được lưu trữ/);
  });
});
