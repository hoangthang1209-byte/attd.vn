import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import {
  bootstrapDatabaseTestEnvironment,
  enforceDatabaseTestPrerequisites,
  getDatabaseTestsSkipReason,
  releaseDatabaseTestEnvironment,
  shouldRunDatabaseBackedTests,
  uniqueTestKey,
} from "@/test/prisma-test-client";
import { ProductAdminValidationError, ProductRelationOwnershipError } from "@/features/products/product-admin-input";
import { isUsablePublishImageReference } from "@/features/products/product-image-url";
import { isPublishableLocalImagePath } from "@/lib/imagePaths";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  SeoPublishQualityGateError,
} from "@/lib/seo/publish-quality-gate";

enforceDatabaseTestPrerequisites();

const dbSkipReason = getDatabaseTestsSkipReason();
const describeDb = shouldRunDatabaseBackedTests()
  ? (name: string, fn: () => void) => describe(name, { concurrency: 1 }, fn)
  : (name: string, fn: () => void) =>
      describe.skip(`${name} [skipped: ${dbSkipReason}]`, { concurrency: 1 }, fn);

function publishableProductInput(categoryId: string, overrides: Record<string, unknown> = {}) {
  const key = uniqueTestKey("prod");
  return {
    name: `Sản phẩm kiểm thử ${key}`,
    slug: key,
    categoryId,
    description: "Mô tả sản phẩm đủ nội dung để xuất bản công khai trên website kiểm thử.",
    seoTitle: "Sản phẩm kiểm thử | ATTD",
    seoDescription: "Mô tả SEO đủ nội dung cho trang sản phẩm công khai trên ATTD kiểm thử.",
    featuredImage: "/uploads/products/ao-thun-test.jpg",
    status: "DRAFT" as const,
    variants: [{ variantStatus: "ACTIVE" as const }],
    ...overrides,
  };
}

function requireProduct<T>(product: T | null, label: string): T {
  assert.ok(product, `${label} should exist`);
  return product;
}

describe("publish image reference rules", () => {
  it("rejects unsafe and non-file local paths", () => {
    assert.equal(isUsablePublishImageReference("x"), false);
    assert.equal(isUsablePublishImageReference("/not-an-image"), false);
    assert.equal(isUsablePublishImageReference("/api/admin"), false);
    assert.equal(isUsablePublishImageReference("/uploads"), false);
    assert.equal(isUsablePublishImageReference("/uploads/products"), false);
    assert.equal(isUsablePublishImageReference("/uploads/products/"), false);
    assert.equal(isUsablePublishImageReference("javascript:alert(1)"), false);
    assert.equal(isUsablePublishImageReference("data:image/png;base64,abc"), false);
    assert.equal(isUsablePublishImageReference("http://cdn.example.com/products/ao-thun.jpg"), false);
    assert.equal(isPublishableLocalImagePath("/uploads"), false);
    assert.equal(isPublishableLocalImagePath("/uploads/products/%2e%2e/secret.jpg"), false);
    assert.equal(isPublishableLocalImagePath("/uploads/products/%2E%2E/secret.jpg"), false);
    assert.equal(isPublishableLocalImagePath("/uploads/products/%252e%252e/secret.jpg"), false);
    assert.equal(isPublishableLocalImagePath("/uploads/products/%2fsecret.jpg"), false);
    assert.equal(isPublishableLocalImagePath("/uploads/products/%5csecret.jpg"), false);
    assert.equal(isPublishableLocalImagePath("/uploads/products/%ZZ/secret.jpg"), false);
  });

  it("accepts approved local upload files and configured remote URLs", () => {
    assert.equal(isUsablePublishImageReference("/uploads/products/ao-thun.jpg"), true);
    assert.equal(isUsablePublishImageReference("/uploads/products/ao-thun.jpg?v=1"), true);
    assert.equal(
      isUsablePublishImageReference("https://res.cloudinary.com/demo/image/upload/sample.jpg"),
      true,
    );
    assert.equal(
      isUsablePublishImageReference("https://public.blob.vercel-storage.com/product.webp"),
      true,
    );
  });
});

describeDb("database-backed product integration", () => {
  let prisma: PrismaClient;

  before(async () => {
    prisma = await bootstrapDatabaseTestEnvironment();
    await import("@/features/products/product-admin.service");
  });

  after(async () => {
    await releaseDatabaseTestEnvironment();
  });

  describe("product relation ownership", () => {
  let updateProductAdmin: typeof import("@/features/products/product-admin.service").updateProductAdmin;
  let createProductAdmin: typeof import("@/features/products/product-admin.service").createProductAdmin;
  let categoryId = "";
  const createdProductIds: string[] = [];
  const createdCategoryIds: string[] = [];

  before(async () => {
    const service = await import("@/features/products/product-admin.service");
    updateProductAdmin = service.updateProductAdmin;
    createProductAdmin = service.createProductAdmin;

    const category = await prisma.category.create({
      data: {
        name: `Danh mục kiểm thử ${uniqueTestKey("cat")}`,
        slug: uniqueTestKey("cat"),
        skuCode: "TST",
      },
    });
    categoryId = category.id;
    createdCategoryIds.push(category.id);
  });

  after(async () => {
    if (!prisma) return;
    for (const productId of createdProductIds.splice(0).reverse()) {
      await prisma.productVariant.deleteMany({ where: { productId } });
      await prisma.productSpecification.deleteMany({ where: { productId } });
      await prisma.productOption.deleteMany({ where: { productId } });
      await prisma.productAttributeAssignment.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    }
    for (const id of createdCategoryIds.splice(0).reverse()) {
      await prisma.category.delete({ where: { id } }).catch(() => undefined);
    }
  });

  it("rejects foreign variant ID on publish and leaves both products unchanged", async () => {
    const productA = requireProduct(
      await createProductAdmin(publishableProductInput(categoryId)),
      "productA",
    );
    const productB = requireProduct(
      await createProductAdmin(publishableProductInput(categoryId)),
      "productB",
    );
    createdProductIds.push(productA.id, productB.id);

    const foreignVariant = await prisma.productVariant.findFirst({
      where: { productId: productB.id },
    });
    assert.ok(foreignVariant);

    const beforeA = await prisma.product.findUnique({ where: { id: productA.id } });
    const beforeBVariant = await prisma.productVariant.findUnique({ where: { id: foreignVariant.id } });

    await assert.rejects(
      () =>
        updateProductAdmin(productA.id, {
          ...publishableProductInput(categoryId),
          status: "ACTIVE",
          variants: [{ id: foreignVariant.id, variantStatus: "ACTIVE" }],
        }),
      (err: unknown) => err instanceof ProductRelationOwnershipError,
    );

    const afterA = await prisma.product.findUnique({ where: { id: productA.id } });
    const afterBVariant = await prisma.productVariant.findUnique({ where: { id: foreignVariant.id } });
    assert.notEqual(afterA?.status, "ACTIVE");
    assert.equal(afterBVariant?.sku, beforeBVariant?.sku);
    assert.equal(beforeA?.status, afterA?.status);
  });

  it("rejects foreign specification ID and does not mutate the foreign row", async () => {
    const productA = requireProduct(
      await createProductAdmin(publishableProductInput(categoryId)),
      "productA",
    );
    const productB = requireProduct(
      await createProductAdmin(
        publishableProductInput(categoryId, {
          specifications: [{ label: "Chất liệu", value: "Cotton 100%" }],
        }),
      ),
      "productB",
    );
    createdProductIds.push(productA.id, productB.id);

    const foreignSpec = await prisma.productSpecification.findFirst({
      where: { productId: productB.id },
    });
    assert.ok(foreignSpec);

    await assert.rejects(
      () =>
        updateProductAdmin(productA.id, {
          status: "ACTIVE",
          specifications: [{ id: foreignSpec.id, label: "Chất liệu", value: "Đã sửa trái phép" }],
        }),
      (err: unknown) => err instanceof ProductRelationOwnershipError,
    );

    const unchanged = await prisma.productSpecification.findUnique({ where: { id: foreignSpec.id } });
    assert.equal(unchanged?.value, "Cotton 100%");
  });

  it("rolls back ACTIVE activation when a dependent write fails inside the publish transaction", async () => {
    const product = requireProduct(
      await createProductAdmin(
        publishableProductInput(categoryId, {
          variants: [{ variantStatus: "ACTIVE" }],
        }),
      ),
      "product",
    );
    createdProductIds.push(product.id);

    const variantA = await prisma.productVariant.findFirst({ where: { productId: product.id } });
    assert.ok(variantA);

    const variantB = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: uniqueTestKey("SKU-B"),
        stockQty: 0,
        stockStatus: "IN_STOCK",
        variantStatus: "ACTIVE",
      },
    });

    await assert.rejects(
      () =>
        updateProductAdmin(product.id, {
          status: "ACTIVE",
          featuredImage: "/uploads/products/ao-thun-test.jpg",
          variants: [{ id: variantA.id, sku: variantB.sku, variantStatus: "ACTIVE" }],
        }),
      (err: unknown) => err instanceof ProductAdminValidationError,
    );

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    const persistedA = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    assert.notEqual(after?.status, "ACTIVE");
    assert.notEqual(persistedA?.sku, variantB.sku);
  });

  it("activates only when persisted relations satisfy publish requirements", async () => {
    const product = requireProduct(
      await createProductAdmin(publishableProductInput(categoryId)),
      "product",
    );
    createdProductIds.push(product.id);

    const updated = requireProduct(
      await updateProductAdmin(product.id, {
        status: "ACTIVE",
        featuredImage: "/uploads/products/ao-thun-test.jpg",
        variants: [{ variantStatus: "ACTIVE" }],
      }),
      "updated",
    );

    assert.equal(updated.status, "ACTIVE");
    const persisted = await prisma.product.findUnique({ where: { id: product.id } });
    assert.equal(persisted?.status, "ACTIVE");
  });

  it("rejects publish when owned INACTIVE variant omits variantStatus", async () => {
    const product = requireProduct(
      await createProductAdmin(
        publishableProductInput(categoryId, {
          variants: [{ variantStatus: "INACTIVE" }],
        }),
      ),
      "product",
    );
    createdProductIds.push(product.id);

    const inactiveVariant = await prisma.productVariant.findFirst({ where: { productId: product.id } });
    assert.ok(inactiveVariant);
    assert.equal(inactiveVariant.variantStatus, "INACTIVE");

    const before = await prisma.product.findUnique({ where: { id: product.id } });

    await assert.rejects(
      () =>
        updateProductAdmin(product.id, {
          status: "ACTIVE",
          featuredImage: "/uploads/products/ao-thun-test.jpg",
          variants: [{ id: inactiveVariant.id }],
        }),
      (err: unknown) =>
        err instanceof SeoPublishQualityGateError &&
        err.code === SEO_PUBLISH_QUALITY_GATE_FAILED,
    );

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    const persistedVariant = await prisma.productVariant.findUnique({
      where: { id: inactiveVariant.id },
    });
    assert.notEqual(after?.status, "ACTIVE");
    assert.equal(after?.status, before?.status);
    assert.equal(persistedVariant?.variantStatus, "INACTIVE");
    assert.equal(after?.featuredImage, before?.featuredImage);
  });

  it("publishes when owned INACTIVE variant is explicitly activated", async () => {
    const product = requireProduct(
      await createProductAdmin(
        publishableProductInput(categoryId, {
          variants: [{ variantStatus: "INACTIVE" }],
        }),
      ),
      "product",
    );
    createdProductIds.push(product.id);

    const inactiveVariant = await prisma.productVariant.findFirst({ where: { productId: product.id } });
    assert.ok(inactiveVariant);

    const updated = requireProduct(
      await updateProductAdmin(product.id, {
        status: "ACTIVE",
        featuredImage: "/uploads/products/ao-thun-test.jpg",
        variants: [{ id: inactiveVariant.id, variantStatus: "ACTIVE" }],
      }),
      "updated",
    );

    assert.equal(updated.status, "ACTIVE");
    const persistedVariant = await prisma.productVariant.findUnique({
      where: { id: inactiveVariant.id },
    });
    assert.equal(persistedVariant?.variantStatus, "ACTIVE");
  });

  it("creates and publishes a structured product with many specifications without timing out", async () => {
    const specifications = Array.from({ length: 10 }, (_, index) => ({
      label: `Thông số ${index + 1}`,
      value: `Giá trị ${index + 1}`,
      sortOrder: index,
    }));

    const product = requireProduct(
      await createProductAdmin(
        publishableProductInput(categoryId, {
          status: "ACTIVE",
          specifications,
          variants: [
            { colorName: "Đen", sizeName: "M", variantStatus: "ACTIVE" as const },
            { colorName: "Đen", sizeName: "L", variantStatus: "ACTIVE" as const },
            { colorName: "Trắng", sizeName: "M", variantStatus: "ACTIVE" as const },
          ],
        }),
      ),
      "structured product",
    );
    createdProductIds.push(product.id);

    assert.equal(product.status, "ACTIVE");
    const specs = await prisma.productSpecification.findMany({
      where: { productId: product.id },
      orderBy: { sortOrder: "asc" },
    });
    assert.equal(specs.length, 10);
    assert.equal(specs[0]?.label, "Thông số 1");
    assert.equal(specs[9]?.value, "Giá trị 10");

    const variants = await prisma.productVariant.findMany({ where: { productId: product.id } });
    assert.equal(variants.length, 3);
  });

  it("updates structured product specifications without duplicating rows", async () => {
    const product = requireProduct(
      await createProductAdmin(
        publishableProductInput(categoryId, {
          specifications: [
            { label: "Chất liệu", value: "Cotton" },
            { label: "Form", value: "Regular" },
          ],
        }),
      ),
      "product",
    );
    createdProductIds.push(product.id);

    const existingSpecs = await prisma.productSpecification.findMany({
      where: { productId: product.id },
    });
    assert.equal(existingSpecs.length, 2);

    const updated = await updateProductAdmin(product.id, {
      specifications: [
        { id: existingSpecs[0]!.id, label: "Chất liệu", value: "Cotton 2 chiều" },
        { label: "Co giãn", value: "2 chiều" },
      ],
    });

    const afterSpecs = await prisma.productSpecification.findMany({
      where: { productId: product.id },
      orderBy: { sortOrder: "asc" },
    });
    assert.equal(afterSpecs.length, 2);
    assert.equal(afterSpecs[0]?.value, "Cotton 2 chiều");
    assert.equal(afterSpecs[1]?.label, "Co giãn");
    assert.ok(updated);
  });
  });

  describe("product mutation API routes", () => {
  let categoryId = "";
  const createdProductIds: string[] = [];
  const createdCategoryIds: string[] = [];

  before(async () => {
    const category = await prisma.category.create({
      data: {
        name: `Danh mục API ${uniqueTestKey("cat")}`,
        slug: uniqueTestKey("cat-api"),
        skuCode: "API",
      },
    });
    categoryId = category.id;
    createdCategoryIds.push(category.id);
  });

  after(async () => {
    if (!prisma) return;
    for (const productId of createdProductIds.splice(0).reverse()) {
      await prisma.productVariant.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    }
    for (const id of createdCategoryIds.splice(0).reverse()) {
      await prisma.category.delete({ where: { id } }).catch(() => undefined);
    }
  });

  it("returns 422 from admin route for foreign variant ownership violation", async () => {
    const { createProductAdmin } = await import("@/features/products/product-admin.service");
    const { PATCH } = await import("@/app/api/admin/products/[id]/route");

    const productA = requireProduct(
      await createProductAdmin(publishableProductInput(categoryId)),
      "productA",
    );
    const productB = requireProduct(
      await createProductAdmin(publishableProductInput(categoryId)),
      "productB",
    );
    createdProductIds.push(productA.id, productB.id);

    const foreignVariant = await prisma.productVariant.findFirst({ where: { productId: productB.id } });
    assert.ok(foreignVariant);

    const response = await PATCH(
      new NextRequest(`http://localhost/api/admin/products/${productA.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...publishableProductInput(categoryId),
          status: "ACTIVE",
          variants: [{ id: foreignVariant.id, variantStatus: "ACTIVE" }],
        }),
      }),
      { params: Promise.resolve({ id: productA.id }) },
    );

    assert.equal(response.status, 422);
    const body = (await response.json()) as { error?: string };
    assert.match(body.error ?? "", /không hợp lệ/i);
  });

  it("returns non-success from legacy public route when publish quality gate fails", async () => {
    const { createProductAdmin } = await import("@/features/products/product-admin.service");
    const { PATCH } = await import("@/app/api/products/[id]/route");

    const product = requireProduct(
      await createProductAdmin(publishableProductInput(categoryId)),
      "product",
    );
    createdProductIds.push(product.id);

    const response = await PATCH(
      new Request(`http://localhost/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          slug: product.slug,
          categoryId,
          status: "ACTIVE",
          description: "",
          seoTitle: "",
          seoDescription: "",
        }),
      }),
      { params: Promise.resolve({ id: product.id }) },
    );

    assert.notEqual(response.status, 200);
    assert.equal(response.status, 422);
    const body = (await response.json()) as { message?: string; error?: string };
    assert.ok(body.message || body.error);
    const persisted = await prisma.product.findUnique({ where: { id: product.id } });
    assert.notEqual(persisted?.status, "ACTIVE");
  });
  });
});
