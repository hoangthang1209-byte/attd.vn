/**
 * Reproduces demo product save scenarios for Sprint 27.4.0 report.
 * Run: npx tsx scripts/repro-demo-product-save.ts
 */
import { prisma } from "../src/lib/prisma";
import { updateProductAdmin } from "../src/features/products/product-admin.service";
import { ProductAdminValidationError } from "../src/features/products/product-admin-input";
import { getProductAdminById } from "../src/features/products/product-admin.service";

const DEMO_ID = "cmqq3eb1d0001rwo0eknjhrig";

async function loadDemoPayload() {
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
    status: "DRAFT" as const,
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

async function runScenario(
  label: string,
  fn: () => Promise<{ ok: boolean; status?: number; fieldErrors?: Record<string, string>; message?: string }>,
) {
  console.log(`\n=== ${label} ===`);
  try {
    const result = await fn();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    if (err instanceof ProductAdminValidationError) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            message: err.message,
            fieldErrors: err.fieldErrors,
            detail: err.detail,
          },
          null,
          2,
        ),
      );
      return;
    }
    console.error(err);
  }
}

async function main() {
  const base = await loadDemoPayload();
  const existing = await prisma.product.findUnique({
    where: { id: DEMO_ID },
    select: { status: true, productCode: true },
  });
  console.log("Demo:", existing);

  await runScenario("1. DRAFT save — productCode OMITTED (manual mode OFF)", async () => {
    const updated = await updateProductAdmin(DEMO_ID, base);
    return { ok: true, message: `Saved ${updated?.id} status=${updated?.status}` };
  });

  await runScenario("2. DRAFT save — manual code ON, invalid ATTD-POLO-PIQUE-PRO-DEMO", async () => {
    try {
      await updateProductAdmin(DEMO_ID, {
        ...base,
        productCode: "ATTD-POLO-PIQUE-PRO-DEMO",
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof ProductAdminValidationError) {
        return { ok: false, fieldErrors: err.fieldErrors, message: err.message };
      }
      throw err;
    }
  });

  await runScenario("3. Publish DRAFT → ACTIVE", async () => {
    try {
      const updated = await updateProductAdmin(DEMO_ID, { ...base, status: "ACTIVE" });
      return { ok: true, message: `Published status=${updated?.status}` };
    } catch (err) {
      if (err instanceof ProductAdminValidationError) {
        return { ok: false, fieldErrors: err.fieldErrors, message: err.message };
      }
      throw err;
    } finally {
      await prisma.product.update({ where: { id: DEMO_ID }, data: { status: "DRAFT" } });
    }
  });

  await prisma.$disconnect();
}

void main();
