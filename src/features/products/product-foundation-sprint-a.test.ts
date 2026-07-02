import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  ensureCategoryForImportExecution,
  validateCategoryForImportPreview,
  extractImportCategorySkuCode,
  IMPORT_CATEGORY_SKU_CODE_REQUIRED_ERROR,
} from "@/features/products/product-import-category";
import {
  assertNonNegativePrice,
  assertValidStockQty,
  isPublicCatalogProductStatus,
  normalizeVariantStockFields,
  PUBLIC_IN_STOCK_VARIANT_FILTER,
  variantCountsAsPubliclyInStock,
} from "@/features/products/product-foundation-validation";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import { isCategoryBranchActive } from "@/features/categories/category-public-visibility";
import { sumDescendantProductCountsSafe } from "@/features/categories/category-product-count.utils";
import { planProductCacheRevalidationPaths } from "@/features/products/revalidate-public-product-cache";
import { assertVariantBelongsToProduct } from "@/features/pricing/services/product-tier.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { TIER_VARIANT_OWNERSHIP_ERROR } from "@/features/products/product-foundation-validation";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("product-foundation-sprint-a", () => {
  // 1. Import preview does not mutate categories/products/variants/media/stock/prices.
  it("1 import preview path does not call category execution writes", () => {
    const previewSource = readRepoFile("src/features/products/product-import-v2.service.ts");
    const previewStart = previewSource.indexOf("export async function previewProductImportV2");
    const executeStart = previewSource.indexOf("export async function executeProductImportV2");
    assert.ok(previewStart >= 0 && executeStart > previewStart);
    const previewBody = previewSource.slice(previewStart, executeStart);
    assert.ok(!previewBody.includes("ensureCategoryForImportExecution"));
    assert.ok(!previewBody.includes("category.create"));
    assert.ok(!previewBody.includes("category.upsert"));
    assert.ok(!previewBody.includes("productVariant.create"));
    assert.ok(!previewBody.includes("createProductAdmin"));
  });

  // 2. Import execution rejects unknown category without valid skuCode.
  it("2 import execution rejects unknown category without valid skuCode", async () => {
    const mockDb = {
      category: {
        findFirst: async () => null,
        create: async () => {
          throw new Error("category.create must not run");
        },
      },
    };
    await assert.rejects(
      () => ensureCategoryForImportExecution("Áo thun trơn", true, mockDb as never),
      (error: unknown) =>
        error instanceof Error && error.message === IMPORT_CATEGORY_SKU_CODE_REQUIRED_ERROR,
    );
  });

  // 3. Import execution creates category only with valid required category data.
  it("3 import execution creates category only with explicit 4-letter skuCode", async () => {
    let created = false;
    const mockDb = {
      category: {
        findFirst: async (args: { where?: { skuCode?: { equals: string } } }) => {
          if (args.where?.skuCode) return null;
          return null;
        },
        create: async (args: { data: { name: string; slug: string; skuCode: string } }) => {
          created = true;
          return {
            id: "cat-new",
            name: args.data.name,
            slug: args.data.slug,
            skuCode: args.data.skuCode,
          };
        },
      },
    };
    const result = await ensureCategoryForImportExecution("POLO", true, mockDb as never);
    assert.equal(created, true);
    assert.equal(result.skuCode, "POLO");
  });

  // 4. Product and variant writes reject negative price and stock.
  it("4 product and variant writes reject negative price and stock", () => {
    assert.throws(
      () => assertNonNegativePrice(-1, "variant", "variants.0.wholesalePrice"),
      (error: unknown) => error instanceof ProductAdminValidationError,
    );
    assert.throws(
      () => assertValidStockQty(-3, "variants.0.stockQty"),
      (error: unknown) => error instanceof ProductAdminValidationError,
    );
  });

  // 5. Zero-stock matrix variants are not IN_STOCK.
  it("5 zero-stock matrix variants are not IN_STOCK", () => {
    const matrixSource = readRepoFile("src/features/products/product-variant-matrix.service.ts");
    assert.ok(matrixSource.includes("normalizeVariantStockFields(0)"));
    const stock = normalizeVariantStockFields(0);
    assert.equal(stock.stockStatus, "OUT_OF_STOCK");
  });

  // 6. Public in-stock filters exclude zero-stock tracked variants.
  it("6 public in-stock filters exclude zero-stock tracked variants", () => {
    assert.deepEqual(PUBLIC_IN_STOCK_VARIANT_FILTER.stockQty, { gt: 0 });
    assert.ok(PUBLIC_IN_STOCK_VARIANT_FILTER.stockStatus.in.includes("IN_STOCK"));
    assert.equal(variantCountsAsPubliclyInStock(0, "IN_STOCK"), false);
    assert.equal(variantCountsAsPubliclyInStock(5, "IN_STOCK"), true);
  });

  // 7. Price tier rejects a variant belonging to another product.
  it("7 price tier rejects a variant belonging to another product", async () => {
    const mockDb = {
      productVariant: {
        findFirst: async () => null,
      },
    };
    await assert.rejects(
      () => assertVariantBelongsToProduct("product-a", "variant-b", mockDb as never),
      (error: unknown) =>
        error instanceof PricingValidationError && error.message === TIER_VARIANT_OWNERSHIP_ERROR,
    );
  });

  // 8. Archive hides product publicly while retaining record and relations.
  it("8 archive hides product publicly while retaining record and relations", () => {
    const adminSource = readRepoFile("src/features/products/product-admin.service.ts");
    assert.ok(adminSource.includes("archiveProductAdmin"));
    assert.ok(adminSource.includes('data: { status: "ARCHIVED" }'));
    assert.ok(!adminSource.match(/deleteProductAdmin[\s\S]*prisma\.product\.delete/));
    assert.equal(isPublicCatalogProductStatus("ARCHIVED"), false);
    assert.equal(isPublicCatalogProductStatus("ACTIVE"), true);
  });

  // 9. Restore makes archived product eligible again where applicable.
  it("9 restore makes archived product eligible again as draft", () => {
    const adminSource = readRepoFile("src/features/products/product-admin.service.ts");
    assert.ok(adminSource.includes("restoreProductAdmin"));
    assert.ok(adminSource.includes('status: ProductStatus = "DRAFT"'));
    const dashboardSource = readRepoFile("src/components/admin/products/ProductCatalogDashboard.tsx");
    assert.ok(dashboardSource.includes("Đã khôi phục sản phẩm ở trạng thái nháp."));
    assert.ok(dashboardSource.includes('status: "DRAFT"'));
  });

  // 10. Inactive category direct slug returns not-found.
  it("10 inactive category direct slug is not publicly accessible", () => {
    const nodes = [{ id: "c1", parentId: null, isActive: false, slug: "inactive-slug" }];
    assert.equal(isCategoryBranchActive("c1", nodes), false);
    const categoryService = readRepoFile("src/features/categories/services/category.service.ts");
    assert.ok(categoryService.includes("isCategoryPubliclyAccessibleBySlug"));
  });

  // 11. Active child beneath inactive ancestor returns not-found.
  it("11 active child beneath inactive ancestor is not publicly accessible", () => {
    const nodes = [
      { id: "p1", parentId: null, isActive: false, slug: "parent" },
      { id: "c1", parentId: "p1", isActive: true, slug: "child" },
    ];
    assert.equal(isCategoryBranchActive("c1", nodes), false);
  });

  // 12. Valid active category hierarchy remains accessible.
  it("12 valid active category hierarchy remains accessible", () => {
    const nodes = [
      { id: "p1", parentId: null, isActive: true, slug: "parent" },
      { id: "c1", parentId: "p1", isActive: true, slug: "child" },
    ];
    assert.equal(isCategoryBranchActive("c1", nodes), true);
  });

  // 13. Product create/update/archive invokes centralized cache revalidation.
  it("13 product create update archive invoke centralized cache revalidation", () => {
    const adminSource = readRepoFile("src/features/products/product-admin.service.ts");
    assert.ok(adminSource.includes("revalidatePublicProductCache"));
    const createCount = (adminSource.match(/revalidatePublicProductCache/g) ?? []).length;
    assert.ok(createCount >= 4);
    const paths = planProductCacheRevalidationPaths({
      slug: "ao-thun",
      categorySlugs: ["ao-thun-tron"],
      affectsHomepage: true,
    });
    assert.ok(paths.includes("/san-pham"));
    assert.ok(paths.includes("/san-pham/ao-thun"));
    assert.ok(paths.includes("/"));
    assert.ok(paths.includes("/sitemap.xml"));
  });

  // 14. Descendant product count survives cyclic input safely.
  it("14 descendant product count survives cyclic input safely", () => {
    const byParent = new Map<string, Array<{ id: string; directProductCount: number }>>([
      ["a", [{ id: "b", directProductCount: 1 }]],
      ["b", [{ id: "a", directProductCount: 2 }]],
    ]);
    const total = sumDescendantProductCountsSafe("a", byParent);
    assert.ok(Number.isFinite(total));
    assert.ok(total >= 0);
  });

  it("category display names are never treated as import sku codes", () => {
    assert.equal(extractImportCategorySkuCode("Áo thun trơn"), null);
    assert.equal(extractImportCategorySkuCode("polo"), "POLO");
    const errors = validateCategoryForImportPreview("Áo thun trơn", null, true);
    assert.equal(errors[0]?.message, IMPORT_CATEGORY_SKU_CODE_REQUIRED_ERROR);
  });
});
