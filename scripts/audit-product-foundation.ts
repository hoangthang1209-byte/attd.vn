/**
 * Read-only product foundation diagnostic.
 * Usage: npx tsx scripts/audit-product-foundation.ts
 * JSON:  npx tsx scripts/audit-product-foundation.ts --json
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const asJson = process.argv.includes("--json");

type Finding = {
  code: string;
  message: string;
  count: number;
  samples: string[];
};

async function recordFinding(
  findings: Finding[],
  code: string,
  message: string,
  count: number,
  samples: string[],
) {
  if (count <= 0) return;
  findings.push({ code, message, count, samples });
}

async function main() {
  const findings: Finding[] = [];

  const categoriesMissingSkuWhere = { OR: [{ skuCode: null }, { skuCode: "" }] };
  const [categoriesMissingSku, categoriesMissingSkuCount] = await Promise.all([
    prisma.category.findMany({
      where: categoriesMissingSkuWhere,
      select: { id: true, name: true, slug: true },
      take: 20,
    }),
    prisma.category.count({ where: categoriesMissingSkuWhere }),
  ]);
  await recordFinding(
    findings,
    "category_missing_sku_code",
    "Danh mục thiếu mã skuCode",
    categoriesMissingSkuCount,
    categoriesMissingSku.map((c) => `${c.name} (${c.slug}) [${c.id}]`),
  );

  const negativeTierPricesWhere = { unitPrice: { lt: 0 } };
  const [negativeTierPrices, negativeTierPricesCount] = await Promise.all([
    prisma.productPriceTier.findMany({
      where: negativeTierPricesWhere,
      select: { id: true, productId: true, unitPrice: true },
      take: 20,
    }),
    prisma.productPriceTier.count({ where: negativeTierPricesWhere }),
  ]);
  await recordFinding(
    findings,
    "negative_product_tier_price",
    "Dòng giá sản phẩm (ProductPriceTier) có đơn giá âm",
    negativeTierPricesCount,
    negativeTierPrices.map((t) => `tier ${t.id} · product ${t.productId}`),
  );

  const negativeVariantPricesWhere = {
    OR: [
      { wholesalePrice: { lt: 0 } },
      { dealerPrice: { lt: 0 } },
      { costPrice: { lt: 0 } },
    ],
  };
  const [negativeVariantPrices, negativeVariantPricesCount] = await Promise.all([
    prisma.productVariant.findMany({
      where: negativeVariantPricesWhere,
      select: { id: true, sku: true, productId: true },
      take: 20,
    }),
    prisma.productVariant.count({ where: negativeVariantPricesWhere }),
  ]);
  await recordFinding(
    findings,
    "negative_variant_price",
    "Biến thể có giá âm",
    negativeVariantPricesCount,
    negativeVariantPrices.map((v) => `${v.sku} [${v.id}] · product ${v.productId}`),
  );

  const negativeStockWhere = { stockQty: { lt: 0 } };
  const [negativeStock, negativeStockCount] = await Promise.all([
    prisma.productVariant.findMany({
      where: negativeStockWhere,
      select: { id: true, sku: true, stockQty: true, productId: true },
      take: 20,
    }),
    prisma.productVariant.count({ where: negativeStockWhere }),
  ]);
  await recordFinding(
    findings,
    "negative_stock_qty",
    "Biến thể có tồn kho âm",
    negativeStockCount,
    negativeStock.map((v) => `${v.sku}: ${v.stockQty} [${v.id}]`),
  );

  const zeroStockInStockWhere = { stockQty: 0, stockStatus: "IN_STOCK" as const };
  const [zeroStockInStock, zeroStockInStockCount] = await Promise.all([
    prisma.productVariant.findMany({
      where: zeroStockInStockWhere,
      select: { id: true, sku: true, productId: true },
      take: 20,
    }),
    prisma.productVariant.count({ where: zeroStockInStockWhere }),
  ]);
  await recordFinding(
    findings,
    "zero_stock_in_stock",
    "Biến thể tồn kho = 0 nhưng trạng thái IN_STOCK",
    zeroStockInStockCount,
    zeroStockInStock.map((v) => `${v.sku} [${v.id}]`),
  );

  const mismatchedTiers = await prisma.$queryRaw<Array<{ id: string; productId: string; variantId: string }>>`
    SELECT t.id, t."productId", t."variantId"
    FROM "ProductPriceTier" t
    INNER JOIN "ProductVariant" v ON v.id = t."variantId"
    WHERE t."variantId" IS NOT NULL AND v."productId" <> t."productId"
    LIMIT 20
  `;
  const mismatchedTierCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "ProductPriceTier" t
    INNER JOIN "ProductVariant" v ON v.id = t."variantId"
    WHERE t."variantId" IS NOT NULL AND v."productId" <> t."productId"
  `;
  await recordFinding(
    findings,
    "tier_variant_product_mismatch",
    "Dòng giá gắn biến thể không thuộc sản phẩm",
    Number(mismatchedTierCount[0]?.count ?? 0),
    mismatchedTiers.map((t) => `tier ${t.id} · product ${t.productId} · variant ${t.variantId}`),
  );

  const archivedWhere = { status: "ARCHIVED" as const, slug: { not: "" } };
  const [archivedProducts, archivedProductsCount] = await Promise.all([
    prisma.product.findMany({
      where: archivedWhere,
      select: { id: true, name: true, slug: true },
      take: 20,
    }),
    prisma.product.count({ where: archivedWhere }),
  ]);
  await recordFinding(
    findings,
    "archived_products_present",
    "Sản phẩm ARCHIVED — xác minh truy vấn public chỉ dùng status ACTIVE",
    archivedProductsCount,
    archivedProducts.map((p) => `${p.name} (${p.slug}) [${p.id}]`),
  );

  const inactiveCategoryWhere = { isActive: false, slug: { not: "" } };
  const [inactiveCategories, inactiveCategoriesCount] = await Promise.all([
    prisma.category.findMany({
      where: inactiveCategoryWhere,
      select: { id: true, name: true, slug: true },
      take: 20,
    }),
    prisma.category.count({ where: inactiveCategoryWhere }),
  ]);
  await recordFinding(
    findings,
    "inactive_categories_with_public_slug",
    "Danh mục tạm ẩn vẫn có slug — xác minh resolver public chặn nhánh không hoạt động",
    inactiveCategoriesCount,
    inactiveCategories.map((c) => `${c.name} (${c.slug}) [${c.id}]`),
  );

  const activeChildUnderInactiveParent = await prisma.$queryRaw<
    Array<{ childId: string; childSlug: string; parentSlug: string }>
  >`
    SELECT c.id AS "childId", c.slug AS "childSlug", p.slug AS "parentSlug"
    FROM "Category" c
    INNER JOIN "Category" p ON c."parentId" = p.id
    WHERE p."isActive" = false AND c."isActive" = true AND c.slug <> ''
    LIMIT 20
  `;
  const activeChildUnderInactiveParentCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Category" c
    INNER JOIN "Category" p ON c."parentId" = p.id
    WHERE p."isActive" = false AND c."isActive" = true AND c.slug <> ''
  `;
  await recordFinding(
    findings,
    "active_child_under_inactive_parent",
    "Danh mục con đang hoạt động nhưng danh mục cha tạm ẩn — phải bị chặn trên public",
    Number(activeChildUnderInactiveParentCount[0]?.count ?? 0),
    activeChildUnderInactiveParent.map(
      (row) => `child ${row.childSlug} [${row.childId}] · parent ${row.parentSlug}`,
    ),
  );

  if (asJson) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));
    return;
  }

  console.log("=== Kiểm tra nền tảng sản phẩm (read-only) ===\n");
  if (findings.length === 0) {
    console.log("Không phát hiện bất thường trong phạm vi kiểm tra.");
    return;
  }

  for (const finding of findings) {
    console.log(`[${finding.code}] ${finding.message} — ${finding.count} bản ghi`);
    for (const sample of finding.samples.slice(0, 5)) {
      console.log(`  - ${sample}`);
    }
    if (finding.samples.length > 5) {
      console.log(`  ... và ${finding.count - 5} bản ghi khác`);
    }
    console.log("");
  }

  console.log("Ghi chú:");
  console.log("- zero_stock_in_stock, negative_*: sửa thủ công hoặc qua import/bulk sau khi xác nhận.");
  console.log("- category_missing_sku_code: bổ sung mã danh mục trong admin.");
  console.log("- tier_variant_product_mismatch: rà soát thủ công trước khi sửa.");
  console.log("- archived_products_present / inactive_categories_*: kiểm tra bộ lọc public sau deploy.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
