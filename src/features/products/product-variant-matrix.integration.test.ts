import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import {
  generateVariantMatrix,
  previewVariantMatrixGeneration,
} from "@/features/products/product-variant-matrix.service";
import {
  bootstrapDatabaseTestEnvironment,
  enforceDatabaseTestPrerequisites,
  getDatabaseTestsSkipReason,
  releaseDatabaseTestEnvironment,
  shouldRunDatabaseBackedTests,
  uniqueTestKey,
} from "@/test/prisma-test-client";

enforceDatabaseTestPrerequisites();

const dbSkipReason = getDatabaseTestsSkipReason();
const describeDb = shouldRunDatabaseBackedTests()
  ? (name: string, fn: () => void) => describe(name, { concurrency: 1 }, fn)
  : (name: string, fn: () => void) =>
      describe.skip(`${name} [skipped: ${dbSkipReason}]`, { concurrency: 1 }, fn);

const MATRIX_COLOR_LABELS = ["Den", "Xanh", "Trang", "Do"];
const MATRIX_SIZE_LABELS = ["M", "L", "XL", "2XL", "3XL"];
const NAVY_XS_COLOR_LABELS = ["Đen", "Navy", "Vàng", "Cam"];
const NAVY_XS_SIZE_LABELS = ["XS", "S", "M", "L"];
const HOODIE_COLOR_LABELS = ["Đỏ", "Navy", "Vàng", "Đen"];
const HOODIE_SIZE_LABELS = ["XS", "S", "M", "L"];

describeDb("variant matrix generation", () => {
  let prisma: PrismaClient;
  let categoryId = "";
  const createdProductIds: string[] = [];
  const createdCategoryIds: string[] = [];

  before(async () => {
    prisma = await bootstrapDatabaseTestEnvironment();
    const category = await prisma.category.create({
      data: {
        name: `Danh mục ma trận ${uniqueTestKey("cat")}`,
        slug: uniqueTestKey("cat"),
        skuCode: "MTX",
      },
    });
    categoryId = category.id;
    createdCategoryIds.push(category.id);
  });

  after(async () => {
    if (prisma) {
      for (const productId of createdProductIds.splice(0).reverse()) {
        await prisma.productVariantOptionValue.deleteMany({
          where: { variant: { productId } },
        });
        await prisma.productVariant.deleteMany({ where: { productId } });
        await prisma.productOptionValue.deleteMany({
          where: { option: { productId } },
        });
        await prisma.productOption.deleteMany({ where: { productId } });
        await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
      }
      for (const id of createdCategoryIds.splice(0).reverse()) {
        await prisma.category.delete({ where: { id } }).catch(() => undefined);
      }
    }
    await releaseDatabaseTestEnvironment();
  });

  async function createMatrixProduct(
    productCodeSuffix: string,
    colors: string[] = MATRIX_COLOR_LABELS,
    sizes: string[] = MATRIX_SIZE_LABELS,
  ) {
    const key = uniqueTestKey("matrix");
    const productCode = `MTX${productCodeSuffix}`;
    const product = await prisma.product.create({
      data: {
        name: `Sản phẩm ma trận ${key}`,
        slug: key,
        categoryId,
        productCode,
        status: "DRAFT",
        description: "Mô tả sản phẩm kiểm thử ma trận biến thể với đủ nội dung.",
      },
    });
    createdProductIds.push(product.id);

    await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Màu sắc",
        slug: "color",
        sortOrder: 0,
        values: {
          create: colors.map((label, sortOrder) => ({ label, sortOrder })),
        },
      },
    });
    await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Kích thước",
        slug: "size",
        sortOrder: 1,
        values: {
          create: sizes.map((label, sortOrder) => ({ label, sortOrder })),
        },
      },
    });

    return product;
  }

  it("generates 20 variants from 4 colors × 5 sizes with ASCII names such as Den", async () => {
    const product = await createMatrixProduct("9001");
    const preview = await previewVariantMatrixGeneration(product.id);

    assert.equal(preview.theoreticalCount, 20);
    assert.equal(preview.existingCount, 0);
    assert.equal(preview.missingCount, 20);
    assert.equal(preview.canGenerate, true);

    const result = await generateVariantMatrix(product.id);
    assert.equal(result.created, 20);
    assert.equal(result.skipped, 0);

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      orderBy: { sku: "asc" },
    });
    assert.equal(variants.length, 20);
    assert.ok(variants.some((variant) => variant.displayLabel === "Den / M"));
    assert.ok(variants.every((variant) => variant.colorId == null && variant.sizeId == null));
  });

  it("creates ProductVariantOptionValue links for every generated variant", async () => {
    const product = await createMatrixProduct("9002");
    await generateVariantMatrix(product.id);

    const linkCount = await prisma.productVariantOptionValue.count({
      where: { variant: { productId: product.id } },
    });
    assert.equal(linkCount, 40);

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      include: { optionValues: true },
    });
    assert.ok(variants.every((variant) => variant.optionValues.length === 2));
  });

  it("generates unique SKUs and zero-stock variants are OUT_OF_STOCK", async () => {
    const product = await createMatrixProduct("9003");
    await generateVariantMatrix(product.id);

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      select: { sku: true, stockQty: true, stockStatus: true },
    });
    const skus = variants.map((variant) => variant.sku);
    assert.equal(new Set(skus).size, 20);
    assert.ok(variants.every((variant) => variant.stockQty === 0));
    assert.ok(variants.every((variant) => variant.stockStatus === "OUT_OF_STOCK"));
    assert.ok(skus.some((sku) => sku.endsWith("-BLK-M")));
  });

  it("running generation again skips all 20 as existing without creating duplicates", async () => {
    const product = await createMatrixProduct("9004");
    const first = await generateVariantMatrix(product.id);
    assert.equal(first.created, 20);

    const secondPreview = await previewVariantMatrixGeneration(product.id);
    assert.equal(secondPreview.missingCount, 0);
    assert.equal(secondPreview.canGenerate, false);

    await assert.rejects(
      () => generateVariantMatrix(product.id),
      (error: unknown) =>
        error instanceof ProductAdminValidationError &&
        error.message === "Tất cả tổ hợp biến thể đã tồn tại.",
    );

    const variantCount = await prisma.productVariant.count({ where: { productId: product.id } });
    assert.equal(variantCount, 20);
  });

  it("Navy/XS 4×4 fixture creates 16 variants and 32 links including Navy / XS", async () => {
    const product = await createMatrixProduct("9010", NAVY_XS_COLOR_LABELS, NAVY_XS_SIZE_LABELS);
    const preview = await previewVariantMatrixGeneration(product.id);
    assert.equal(preview.theoreticalCount, 16);
    assert.equal(preview.missingCount, 16);
    assert.equal(preview.canGenerate, true);

    const result = await generateVariantMatrix(product.id);
    assert.equal(result.created, 16);
    assert.ok(result.variants.some((variant) => variant.displayLabel === "Navy / XS"));

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      select: { displayLabel: true, stockQty: true, stockStatus: true, sku: true },
    });
    assert.equal(variants.length, 16);
    assert.ok(variants.every((variant) => variant.stockQty === 0));
    assert.ok(variants.every((variant) => variant.stockStatus === "OUT_OF_STOCK"));
    assert.ok(variants.some((variant) => /NVY-XS$/i.test(variant.sku)));

    const linkCount = await prisma.productVariantOptionValue.count({
      where: { variant: { productId: product.id } },
    });
    assert.equal(linkCount, 32);

    const secondPreview = await previewVariantMatrixGeneration(product.id);
    assert.equal(secondPreview.missingCount, 0);
    assert.equal(secondPreview.canGenerate, false);
    await assert.rejects(
      () => generateVariantMatrix(product.id),
      (error: unknown) =>
        error instanceof ProductAdminValidationError &&
        error.message === "Tất cả tổ hợp biến thể đã tồn tại.",
    );
  });

  it("Đỏ/Navy/Vàng/Đen × XS/S/M/L generates 16 unique color+size SKUs without conflict", async () => {
    const product = await createMatrixProduct("9013", HOODIE_COLOR_LABELS, HOODIE_SIZE_LABELS);
    const result = await generateVariantMatrix(product.id);
    assert.equal(result.created, 16);

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      select: { sku: true, displayLabel: true },
      orderBy: { sku: "asc" },
    });
    assert.equal(variants.length, 16);
    assert.equal(new Set(variants.map((variant) => variant.sku)).size, 16);
    assert.ok(variants.some((variant) => variant.sku.endsWith("-RED-S")));
    assert.ok(variants.some((variant) => variant.sku.endsWith("-NVY-S")));
    assert.ok(variants.some((variant) => variant.sku.endsWith("-YLW-S")));
    assert.ok(variants.some((variant) => variant.sku.endsWith("-BLK-S")));
    assert.ok(variants.every((variant) => /-(RED|NVY|YLW|BLK)-(XS|S|M|L)$/.test(variant.sku)));

    const linkCount = await prisma.productVariantOptionValue.count({
      where: { variant: { productId: product.id } },
    });
    assert.equal(linkCount, 32);

    await assert.rejects(
      () => generateVariantMatrix(product.id),
      (error: unknown) =>
        error instanceof ProductAdminValidationError &&
        error.message === "Tất cả tổ hợp biến thể đã tồn tại.",
    );
  });

  it("legacy orphan SKU conflict does not block matrix generation", async () => {
    const product = await createMatrixProduct("9014", ["Đỏ"], ["S", "M"]);
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `${product.productCode}-RED-S`,
        displayLabel: "Legacy orphan",
        stockQty: 0,
        stockStatus: "OUT_OF_STOCK",
        variantStatus: "ACTIVE",
      },
    });

    const preview = await previewVariantMatrixGeneration(product.id);
    assert.equal(preview.existingCount, 0);
    assert.equal(preview.missingCount, 2);

    const result = await generateVariantMatrix(product.id);
    assert.equal(result.created, 2);

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      select: { sku: true, optionValues: { select: { optionValueId: true } } },
    });
    assert.equal(variants.length, 3);
    const redS = variants.filter((variant) => variant.sku.startsWith(`${product.productCode}-RED-S`));
    assert.ok(redS.some((variant) => variant.sku === `${product.productCode}-RED-S`));
    assert.ok(redS.some((variant) => variant.sku === `${product.productCode}-RED-S-2`));
    assert.ok(
      variants
        .filter((variant) => variant.optionValues.length > 0)
        .every((variant) => variant.optionValues.length === 2),
    );
  });

  it("rejects stale or foreign optionValueIds with actionable ownership message", async () => {
    const product = await createMatrixProduct("9011", NAVY_XS_COLOR_LABELS, NAVY_XS_SIZE_LABELS);
    const owned = await prisma.productOptionValue.findFirst({
      where: { option: { productId: product.id } },
      select: { id: true },
    });
    assert.ok(owned);

    const other = await createMatrixProduct("9012", ["Đen"], ["M"]);
    const foreign = await prisma.productOptionValue.findFirst({
      where: { option: { productId: other.id } },
      select: { id: true },
    });
    assert.ok(foreign);

    const { assertOptionValueIdsBelongToProduct } = await import(
      "@/features/products/product-relation-ownership"
    );
    const { MATRIX_OPTION_VALUE_OWNERSHIP_ERROR } = await import(
      "@/features/products/product-variant-matrix.service"
    );

    await assert.rejects(
      () => assertOptionValueIdsBelongToProduct(prisma, product.id, ["stale-missing-id", owned.id]),
    );
    await assert.rejects(
      () => assertOptionValueIdsBelongToProduct(prisma, product.id, [foreign.id]),
    );

    // Execute path wraps ownership failures with the same actionable Vietnamese copy.
    assert.match(MATRIX_OPTION_VALUE_OWNERSHIP_ERROR, /không tồn tại hoặc không thuộc sản phẩm này/);
    assert.match(MATRIX_OPTION_VALUE_OWNERSHIP_ERROR, /Vui lòng lưu sản phẩm rồi thử lại/);
  });
});
