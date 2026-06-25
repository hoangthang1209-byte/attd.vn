/**
 * ACTIVE vs DRAFT save timing repro for demo product.
 * Run: PRODUCT_SAVE_TIMING=1 npx tsx scripts/repro-active-product-save-timing.ts
 */
import { prisma } from "../src/lib/prisma";
import { getProductAdminById, updateProductAdmin } from "../src/features/products/product-admin.service";
import { ProductAdminValidationError } from "../src/features/products/product-admin-input";

const DEMO_ID = "cmqq3eb1d0001rwo0eknjhrig";

async function loadPayload(status: "ACTIVE" | "DRAFT") {
  const product = await getProductAdminById(DEMO_ID);
  if (!product) throw new Error("Demo product not found");
  return {
    name: product.name,
    categoryId: product.categoryId,
    slug: product.slug ?? undefined,
    shortDescription: product.shortDescription ?? undefined,
    description: product.description ?? undefined,
    seoTitle: product.seoTitle ?? undefined,
    seoDescription: product.seoDescription ?? undefined,
    defaultMoq: product.defaultMoq ?? undefined,
    leadTime: product.leadTime ?? undefined,
    useCases: product.useCases ?? [],
    targetCustomers: product.targetCustomers ?? [],
    supportsPrinting: product.supportsPrinting,
    supportsEmbroidery: product.supportsEmbroidery,
    supportsOem: product.supportsOem,
    tags: product.tags ?? [],
    status,
    featuredImage: product.featuredImage ?? undefined,
    gallery: product.gallery ?? [],
    specifications: product.specifications?.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      sortOrder: row.sortOrder,
    })),
    customizations: product.customizationCapabilities?.map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description ?? undefined,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
    })),
    attributeAssignments: product.attributeAssignments?.map((row) => ({
      id: row.id,
      attributeId: row.attributeId,
      attributeValueId: row.attributeValueId,
      customValue: row.customValue,
      sortOrder: row.sortOrder,
    })),
    options: product.options?.map((group) => ({
      id: group.id,
      attributeId: group.attributeId ?? undefined,
      name: group.name,
      slug: group.slug,
      sortOrder: group.sortOrder,
      values: group.values?.map((value) => ({
        id: value.id,
        attributeValueId: value.attributeValueId ?? undefined,
        label: value.label,
        valueCode: value.valueCode ?? undefined,
        imageUrl: value.imageUrl ?? undefined,
        sortOrder: value.sortOrder,
      })),
    })),
    variants: product.variants?.map((variant) => ({
      id: variant.id,
      clientKey: variant.id,
      sku: variant.sku,
      colorName: variant.colorName ?? undefined,
      colorCode: variant.colorCode ?? undefined,
      sizeName: variant.sizeName ?? undefined,
      displayLabel: variant.displayLabel ?? undefined,
      moqOverride: variant.moqOverride ?? undefined,
      leadTimeOverride: variant.leadTimeOverride ?? undefined,
      wholesalePrice: variant.wholesalePrice ?? undefined,
      dealerPrice: variant.dealerPrice ?? undefined,
      stockQty: variant.stockQty,
      stockStatus: variant.stockStatus,
      variantStatus: variant.variantStatus,
      imageUrl: variant.imageUrl ?? undefined,
      optionValueIds: variant.optionValues?.map((link) => link.optionValueId),
    })),
  };
}

async function runCase(label: string, mutate: (payload: Awaited<ReturnType<typeof loadPayload>>) => void) {
  console.log(`\n=== ${label} ===`);
  const payload = await loadPayload("ACTIVE");
  mutate(payload);
  const started = performance.now();
  try {
    await updateProductAdmin(DEMO_ID, payload);
    console.log(`OK in ${Math.round(performance.now() - started)}ms`);
  } catch (err) {
    console.log(`FAIL in ${Math.round(performance.now() - started)}ms`);
    if (err instanceof ProductAdminValidationError) {
      console.log(err.message, err.fieldErrors);
    } else {
      console.error(err);
    }
  }
}

async function main() {
  await prisma.product.update({
    where: { id: DEMO_ID },
    data: { status: "ACTIVE" },
  });

  await runCase("ACTIVE unchanged save", () => {});
  await runCase("ACTIVE scalar change", (payload) => {
    payload.shortDescription = `${payload.shortDescription ?? ""} `.trim();
  });
  await runCase("ACTIVE variant image change", (payload) => {
    const variant = payload.variants?.[0];
    if (!variant) throw new Error("missing variant");
    variant.imageUrl = variant.imageUrl ?? "https://example.com/variant-test.jpg";
  });
  await runCase("ACTIVE option value image change", (payload) => {
    const value = payload.options?.[0]?.values?.[0];
    if (!value) throw new Error("missing option value");
    value.imageUrl = value.imageUrl ?? "https://example.com/option-test.jpg";
  });
  await runCase("ACTIVE assignment touch (no-op value)", (payload) => {
    const row = payload.attributeAssignments?.[0];
    if (!row) throw new Error("missing assignment");
    row.sortOrder = row.sortOrder ?? 0;
  });

  console.log("\n=== DRAFT unchanged save ===");
  const draftPayload = await loadPayload("DRAFT");
  const draftStarted = performance.now();
  await updateProductAdmin(DEMO_ID, draftPayload);
  console.log(`OK in ${Math.round(performance.now() - draftStarted)}ms`);

  await prisma.product.update({
    where: { id: DEMO_ID },
    data: { status: "ACTIVE" },
  });
  await prisma.$disconnect();
}

void main();
