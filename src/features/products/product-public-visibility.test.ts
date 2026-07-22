import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPublicProductVisibilityWhere,
  isDemoOrSampleProductMetadata,
  isPublicProductStatus,
  isPublicVisibleProductRow,
  planBulkPublicRevalidationPaths,
  shouldHideProductFromPublic,
} from "@/features/products/product-public-visibility";
import { evaluateProductReadiness } from "@/features/products/product-admin-readiness";
import { buildProductImages } from "@/lib/productImages";
import { isClientTempProductId } from "@/features/products/product-bulk.service";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product public visibility", () => {
  it("ACTIVE product with valid Cloudinary image is public-visible", () => {
    assert.equal(isPublicProductStatus("ACTIVE"), true);
    assert.equal(
      shouldHideProductFromPublic({
        status: "ACTIVE",
        slug: "ao-thun-cotton-4-chieu-cao-cap",
        categoryIsActive: true,
        metadata: { curatedSalesBadges: ["BEST_SELLER"] },
      }),
      false,
    );
  });

  it("ACTIVE product with broken image remains public-visible", () => {
    assert.equal(
      shouldHideProductFromPublic({
        status: "ACTIVE",
        slug: "ao-thun-cvc-unisex",
        categoryIsActive: true,
        metadata: null,
      }),
      false,
    );
    const readiness = evaluateProductReadiness({
      status: "ACTIVE",
      featuredImage:
        "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/dead.png",
      gallery: [],
      images: [],
      seoTitle: "SEO",
      seoDescription: "SEO",
      variants: [{ stockQty: 1, stockStatus: "IN_STOCK", wholesalePrice: 1000 }],
    });
    assert.equal(readiness.hasBrokenImage, true);
    assert.equal(readiness.isReady, false);
  });

  it("ACTIVE product with missing image remains public-visible", () => {
    assert.equal(
      shouldHideProductFromPublic({
        status: "ACTIVE",
        slug: "missing-image-product",
        categoryIsActive: true,
        metadata: null,
      }),
      false,
    );
  });

  it("ACTIVE product with missing SEO does not become non-public", () => {
    assert.equal(
      shouldHideProductFromPublic({
        status: "ACTIVE",
        slug: "missing-seo",
        categoryIsActive: true,
      }),
      false,
    );
    const readiness = evaluateProductReadiness({
      status: "ACTIVE",
      featuredImage: "https://cdn.example.com/a.jpg",
      seoTitle: "",
      seoDescription: "",
      variants: [{ stockQty: 1, stockStatus: "IN_STOCK", wholesalePrice: 1000 }],
    });
    assert.equal(readiness.hasSeo, false);
    assert.equal(readiness.isReady, false);
  });

  it("DRAFT / INACTIVE / ARCHIVED are hidden", () => {
    assert.equal(shouldHideProductFromPublic({ status: "DRAFT", slug: "x" }), true);
    assert.equal(shouldHideProductFromPublic({ status: "INACTIVE", slug: "x" }), true);
    assert.equal(shouldHideProductFromPublic({ status: "ARCHIVED", slug: "x" }), true);
  });

  it("demo/sample metadata is excluded from public visibility", () => {
    assert.equal(isDemoOrSampleProductMetadata({ isDemo: true }), true);
    assert.equal(isDemoOrSampleProductMetadata({ sampleData: true }), true);
    assert.equal(isDemoOrSampleProductMetadata({ curatedSalesBadges: ["BEST_SELLER"] }), false);
    assert.equal(
      shouldHideProductFromPublic({
        status: "ACTIVE",
        slug: "demo",
        categoryIsActive: true,
        metadata: { isDemo: true },
      }),
      true,
    );
  });

  it("inactive category product is not public-visible", () => {
    assert.equal(
      shouldHideProductFromPublic({
        status: "ACTIVE",
        slug: "x",
        categoryIsActive: false,
      }),
      true,
    );
  });

  it("Prisma where stays canonical and never encodes readiness/image-health gates", () => {
    const where = buildPublicProductVisibilityWhere({
      slug: "ao-thun-cotton-4-chieu-cao-cap",
    });
    assert.equal(where.status, "ACTIVE");
    assert.equal(where.slug, "ao-thun-cotton-4-chieu-cao-cap");
    assert.deepEqual(where.category, { isActive: true });
    assert.equal("AND" in where, false);
    assert.equal("NOT" in where, false);
    const serialized = JSON.stringify(where);
    assert.equal(serialized.includes("isDemo"), false);
    assert.equal(serialized.includes("sampleData"), false);
    assert.equal(serialized.includes("broken"), false);
    assert.equal(serialized.includes("readiness"), false);
  });

  it("non-demo metadata rows pass public visible row guard", () => {
    assert.equal(
      isPublicVisibleProductRow({
        status: "ACTIVE",
        slug: "ao-thun-cotton-4-chieu-cao-cap",
        metadata: { curatedSalesBadges: ["BEST_SELLER"] },
        categoryIsActive: true,
      }),
      true,
    );
    assert.equal(
      isPublicVisibleProductRow({
        status: "ACTIVE",
        slug: "demo",
        metadata: { isDemo: true },
      }),
      false,
    );
  });

  it("public serializer can fall back for invalid images without excluding product", () => {
    const images = buildProductImages({
      featuredImage: "/api/media/private.jpg",
      gallery: ["https://cdn.example.com/ok.jpg"],
      images: [],
    });
    assert.deepEqual(
      images.map((image) => image.imageUrl),
      ["https://cdn.example.com/ok.jpg"],
    );
  });

  it("plans revalidation for listing, PDP, category, homepage, sitemap", () => {
    const paths = planBulkPublicRevalidationPaths({
      slugs: ["ao-thun-cotton-4-chieu-cao-cap"],
      categorySlugs: ["ao-thun-regular-cao-cap"],
      affectsHomepage: true,
    });
    assert.ok(paths.includes("/san-pham"));
    assert.ok(paths.includes("/san-pham/ao-thun-cotton-4-chieu-cao-cap"));
    assert.ok(paths.includes("/san-pham?category=ao-thun-regular-cao-cap"));
    assert.ok(paths.includes("/ao-thun-regular-cao-cap"));
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
    const pdpPage = read("src/app/(public)/san-pham/[slug]/page.tsx");

    assert.match(productService, /buildPublicProductVisibilityWhere/);
    assert.match(productService, /getProductDetailBySlug/);
    assert.match(productService, /isDemoOrSampleProductMetadata/);
    assert.match(categoryService, /buildPublicProductVisibilityWhere/);
    assert.match(sitemap, /buildPublicProductVisibilityWhere/);
    assert.match(bulk, /updated\.count === 0/);
    assert.match(bulk, /Sản phẩm đã được lưu trữ/);
    assert.doesNotMatch(pdpPage, /evaluateProductReadiness|product-image-health|productHasBrokenImage/);
    assert.doesNotMatch(productService, /evaluateProductReadiness/);
  });
});
