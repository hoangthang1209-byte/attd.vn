import type { Prisma, ProductStatus, StockStatus, VariantStatus } from "@prisma/client";
import { Prisma as PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateSku,
  ensureUniqueSku,
  ensureUniqueProductCode,
  ProductSkuError,
  CATEGORY_SKU_CODE_MISSING_ERROR,
  CATEGORY_CODE_DUPLICATE_ERROR,
  validateProductCodeForCategory,
  requireCategorySkuCode,
  generateCategoryCodeFromName,
  ensureUniqueCategoryCode,
  isCategoryCodeTaken,
  normalizeCode,
} from "@/features/products/product-sku-utils";
import { ProductAdminValidationError, isPrismaTransactionTimeoutError, PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE } from "@/features/products/product-admin-input";
import {
  CATEGORY_SLUG_DUPLICATE_ERROR,
  validateCategoryParentSelection,
} from "@/features/categories/category-tree-utils";
import { generateProductSystemCode } from "@/features/products/product-system-code";
import {
  PRODUCT_CMS_INCLUDE,
  syncProductCmsData,
  resolveOptionValueIdsForProduct,
  type ProductCustomizationInput,
  type ProductOptionInput,
  type ProductSpecificationInput,
} from "@/features/products/product-admin-cms";
import {
  applyLegacyMirrorToProduct,
  syncProductAttributeAssignments,
  validateProductAttributeAssignments,
} from "@/features/products/product-attribute-assignment.service";
import type { ResolvedAssignmentValue } from "@/features/products/product-attribute-assignment.utils";
import {
  assertAttributeAssignmentIdsBelongToProduct,
  assertCustomizationIdsBelongToProduct,
  assertNoDuplicateRelationIds,
  assertOptionIdsBelongToProduct,
  assertOptionValueIdsBelongToProduct,
  assertSpecificationIdsBelongToProduct,
  assertVariantIdsBelongToProduct,
  throwProductRelationOwnershipError,
  updateProductVariantOwned,
  type DbClient,
} from "@/features/products/product-relation-ownership";
import {
  assertCategoryPublishQuality,
  assertProductPublishQuality,
  interimProductStatusForAtomicPublish,
  isProductPublishTransition,
  requiresAtomicActiveProductPublish,
  shouldEnforceCategoryIndexableSeoGate,
  type CategoryPublishQualityInput,
  type ProductPublishQualityInput,
} from "@/lib/seo/publish-quality-gate";
import { isIndexableCategoryLanding } from "@/lib/seo/indexable-category-routes";

const PUBLISH_QUALITY_INCLUDE = {
  images: { select: { imageUrl: true } },
  variants: { select: { variantStatus: true, imageUrl: true } },
  specifications: { select: { label: true, value: true } },
  attributeAssignments: {
    select: { attributeId: true, attributeValueId: true, customValue: true },
  },
  options: {
    include: {
      values: { select: { label: true } },
    },
  },
} satisfies Prisma.ProductInclude;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductListParams = {
  search?: string;
  categoryId?: string;
  status?: string;
  stockStatus?: string;
  supportsPrinting?: boolean;
  supportsOem?: boolean;
  page?: number;
  pageSize?: number;
};

export type VariantInput = {
  id?: string;
  clientKey?: string;
  sku?: string;
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
  dimensions?: string;
  capacity?: string;
  displayLabel?: string;
  moqOverride?: number | null;
  leadTimeOverride?: string | null;
  materialOverride?: string | null;
  optionValueIds?: string[];
  wholesalePrice?: number | null;
  dealerPrice?: number | null;
  costPrice?: number | null;
  priceTiers?: Record<string, unknown> | null;
  stockQty?: number;
  stockStatus?: StockStatus;
  weight?: number | null;
  imageUrl?: string | null;
  internalNote?: string;
  variantStatus?: VariantStatus;
  metadata?: Record<string, unknown> | null;
};

export type ProductInput = {
  name: string;
  slug?: string;
  productCode?: string;
  categoryId: string;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  aiSummary?: string;
  gsm?: number | null;
  material?: string;
  form?: string;
  fit?: string;
  defaultMoq?: number | null;
  useCases?: string[];
  targetCustomers?: string[];
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  tags?: string[];
  featuredImage?: string | null;
  gallery?: string[];
  leadTime?: string | null;
  status?: ProductStatus;
  metadata?: Record<string, unknown> | null;
  variants?: VariantInput[];
  options?: ProductOptionInput[];
  specifications?: ProductSpecificationInput[];
  customizations?: ProductCustomizationInput[];
  attributeAssignments?: import("@/features/products/product-attribute-assignment.utils").ProductAttributeAssignmentInput[];
};

const VARIANT_INCLUDE = {
  color: { select: { id: true, name: true, slug: true } },
  size: { select: { id: true, name: true, slug: true } },
} as const;

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, skuCode: true } },
  images: { select: { id: true, imageUrl: true, altText: true, sortOrder: true }, orderBy: { sortOrder: "asc" as const } },
  variants: {
    include: {
      ...VARIANT_INCLUDE,
      optionValues: { select: { optionValueId: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  ...PRODUCT_CMS_INCLUDE,
} as const;

/** Narrow interactive transaction budget for product save (publish) paths only. */
const PRODUCT_SAVE_TRANSACTION_OPTIONS = {
  timeout: 15000,
  maxWait: 5000,
} as const;

type WriteDependentRelationsOptions = {
  preparedVariantSkus?: ReadonlyMap<VariantInput, string>;
  resolvedAssignments?: ResolvedAssignmentValue[];
  skipOwnershipVerify?: boolean;
};

async function runProductSaveTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(fn, PRODUCT_SAVE_TRANSACTION_OPTIONS);
  } catch (err) {
    if (isPrismaTransactionTimeoutError(err)) {
      throw new ProductAdminValidationError(
        PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE,
        {},
        err instanceof Error ? err.message : PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE,
      );
    }
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  const viMap: Record<string, string> = {
    à: "a", á: "a", ả: "a", ã: "a", ạ: "a", ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a",
    â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
    è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e", ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
    ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
    ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o", ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
    ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
    ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u", ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
    ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y", đ: "d",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => viMap[c] ?? c)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
  if (!existing || existing.id === excludeId) return baseSlug;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSlug}-${i}`;
    const dup = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!dup || dup.id === excludeId) return candidate;
  }
  return `${baseSlug}-${Date.now()}`;
}

async function buildVariantSku(
  variantInput: VariantInput,
  productCode: string,
  db: Pick<typeof prisma, "productVariant"> = prisma,
): Promise<string> {
  if (variantInput.sku?.trim()) return variantInput.sku.trim();
  const base = generateSku({
    productCode,
    colorName: variantInput.colorName,
    colorCode: variantInput.colorCode,
    sizeName: variantInput.sizeName,
    dimensions: variantInput.dimensions,
    capacity: variantInput.capacity,
  });
  return await ensureUniqueSku(base, db);
}

async function prepareVariantSkusForInput(
  variants: VariantInput[] | undefined,
  productCode: string,
): Promise<Map<VariantInput, string>> {
  const prepared = new Map<VariantInput, string>();
  if (!variants?.length) return prepared;
  for (const variant of variants) {
    if (variant.id) continue;
    prepared.set(variant, await buildVariantSku(variant, productCode));
  }
  return prepared;
}

function variantSkuFieldKey(v: VariantInput): string {
  if (v.id) return `variants.byId.${v.id}.sku`;
  if (v.clientKey) return `variants.byClientKey.${v.clientKey}.sku`;
  return "variants.sku";
}

function throwVariantSkuConflict(v: VariantInput, sku: string): never {
  throw new ProductAdminValidationError(
    `SKU "${sku}" đã tồn tại.`,
    { [variantSkuFieldKey(v)]: "SKU đã tồn tại." },
  );
}

// ─── List & search ────────────────────────────────────────────────────────────

export async function listProductsAdmin(params: ProductListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 40));
  const where: Prisma.ProductWhereInput = {};

  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status as ProductStatus;
  if (params.supportsPrinting) where.supportsPrinting = true;
  if (params.supportsOem) where.supportsOem = true;

  if (params.stockStatus) {
    where.variants = { some: { stockStatus: params.stockStatus as StockStatus } };
  }

  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { productCode: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true, skuCode: true } },
        variants: {
          select: {
            id: true, sku: true, stockQty: true, stockStatus: true,
            wholesalePrice: true, dealerPrice: true, variantStatus: true,
            colorName: true, sizeName: true,
          },
        },
        images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const rows = products.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    variants: p.variants.map((v) => ({
      ...v,
      wholesalePrice: v.wholesalePrice?.toNumber() ?? null,
      dealerPrice: v.dealerPrice?.toNumber() ?? null,
    })),
  }));

  return { products: rows, total, page, pageSize };
}

export async function getProductAdminById(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  if (!p) return null;
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    variants: p.variants.map((v) => ({
      ...v,
      wholesalePrice: v.wholesalePrice?.toNumber() ?? null,
      dealerPrice: v.dealerPrice?.toNumber() ?? null,
      vipPrice: v.vipPrice?.toNumber() ?? null,
      costPrice: v.costPrice?.toNumber() ?? null,
      weight: v.weight?.toNumber() ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  };
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getProductAdminKpis() {
  const [
    totalProducts,
    activeProducts,
    totalVariants,
    lowStockVariants,
    outOfStockVariants,
    preorderVariants,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.productVariant.count(),
    prisma.productVariant.count({ where: { stockStatus: "LOW_STOCK" } }),
    prisma.productVariant.count({ where: { stockStatus: "OUT_OF_STOCK" } }),
    prisma.productVariant.count({ where: { stockStatus: "PREORDER" } }),
  ]);

  return { totalProducts, activeProducts, totalVariants, lowStockVariants, outOfStockVariants, preorderVariants };
}

// ─── Publish quality gate ─────────────────────────────────────────────────────

function assertNoRelationIdsOnCreate(
  input: Pick<
    ProductInput,
    "variants" | "options" | "specifications" | "customizations" | "attributeAssignments"
  >,
): void {
  const relationIds = [
    ...(input.variants?.map((variant) => variant.id) ?? []),
    ...(input.specifications?.map((spec) => spec.id) ?? []),
    ...(input.options?.map((option) => option.id) ?? []),
    ...(input.options?.flatMap((option) => option.values.map((value) => value.id)) ?? []),
    ...(input.customizations?.map((cap) => cap.id) ?? []),
    ...(input.attributeAssignments?.map((row) => row.id) ?? []),
  ];
  assertNoDuplicateRelationIds(relationIds);
  if (relationIds.some((id) => id?.trim())) {
    throwProductRelationOwnershipError();
  }
}

async function verifyProductRelationInputOwnership(
  productId: string,
  input: Partial<
    Pick<
      ProductInput,
      "variants" | "options" | "specifications" | "customizations" | "attributeAssignments"
    >
  >,
  db: DbClient = prisma,
): Promise<void> {
  if (input.variants?.length) {
    assertNoDuplicateRelationIds(input.variants.map((variant) => variant.id));
    await assertVariantIdsBelongToProduct(
      db,
      productId,
      input.variants.map((variant) => variant.id).filter(Boolean) as string[],
    );
  }

  if (input.specifications?.length) {
    assertNoDuplicateRelationIds(input.specifications.map((spec) => spec.id));
    await assertSpecificationIdsBelongToProduct(
      db,
      productId,
      input.specifications.map((spec) => spec.id).filter(Boolean) as string[],
    );
  }

  if (input.options?.length) {
    assertNoDuplicateRelationIds(input.options.map((option) => option.id));
    for (const option of input.options) {
      assertNoDuplicateRelationIds(option.values.map((value) => value.id));
    }
    await assertOptionIdsBelongToProduct(
      db,
      productId,
      input.options.map((option) => option.id).filter(Boolean) as string[],
    );
    await assertOptionValueIdsBelongToProduct(
      db,
      productId,
      input.options.flatMap((option) => option.values.map((value) => value.id)).filter(Boolean) as string[],
    );
  }

  if (input.customizations?.length) {
    assertNoDuplicateRelationIds(input.customizations.map((cap) => cap.id));
    await assertCustomizationIdsBelongToProduct(
      db,
      productId,
      input.customizations.map((cap) => cap.id).filter(Boolean) as string[],
    );
  }

  if (input.attributeAssignments !== undefined) {
    assertNoDuplicateRelationIds(input.attributeAssignments.map((row) => row.id));
    await assertAttributeAssignmentIdsBelongToProduct(
      db,
      productId,
      input.attributeAssignments.map((row) => row.id).filter(Boolean) as string[],
    );
  }
}

function mapProductInputToPublishQualityInput(
  input: ProductInput,
  slug: string,
): ProductPublishQualityInput {
  return {
    name: input.name,
    slug,
    categoryId: input.categoryId,
    description: input.description ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    featuredImage: input.featuredImage ?? null,
    gallery: input.gallery ?? [],
    productImages: input.gallery ?? [],
    variants: (input.variants ?? []).map((variant) => ({
      variantStatus: variant.variantStatus ?? "ACTIVE",
      imageUrl: variant.imageUrl ?? null,
    })),
    specifications: (input.specifications ?? []).map((row) => ({
      label: row.label,
      value: row.value,
    })),
    attributeAssignments: (input.attributeAssignments ?? []).map((row) => ({
      attributeId: row.attributeId,
      attributeValueId: row.attributeValueId ?? null,
      customValue: row.customValue ?? null,
    })),
    options: (input.options ?? []).map((group) => ({
      values: group.values.map((value) => ({ label: value.label })),
    })),
  };
}

async function loadProductPublishQualitySnapshot(
  productId: string,
  input: Partial<ProductInput>,
  db: DbClient = prisma,
): Promise<ProductPublishQualityInput> {
  await verifyProductRelationInputOwnership(productId, input, db);

  const existing = await db.product.findUnique({
    where: { id: productId },
    include: PUBLISH_QUALITY_INCLUDE,
  });

  if (!existing) {
    throw new ProductAdminValidationError("Không tìm thấy sản phẩm.", {}, "Không tìm thấy sản phẩm.");
  }

  const mergedVariants = input.variants
    ? input.variants.map((variant) => ({
        variantStatus: variant.variantStatus,
        imageUrl: variant.imageUrl ?? null,
      }))
    : existing.variants.map((variant) => ({
        variantStatus: variant.variantStatus,
        imageUrl: variant.imageUrl,
      }));

  return {
    name: input.name ?? existing.name,
    slug: input.slug ?? existing.slug,
    categoryId: input.categoryId ?? existing.categoryId,
    description: input.description !== undefined ? input.description ?? null : existing.description,
    seoTitle: input.seoTitle !== undefined ? input.seoTitle ?? null : existing.seoTitle,
    seoDescription:
      input.seoDescription !== undefined ? input.seoDescription ?? null : existing.seoDescription,
    featuredImage:
      input.featuredImage !== undefined ? input.featuredImage ?? null : existing.featuredImage,
    gallery: input.gallery ?? existing.gallery,
    productImages: existing.images.map((image) => image.imageUrl),
    variants: mergedVariants,
    specifications: input.specifications
      ? input.specifications.map((row) => ({ label: row.label, value: row.value }))
      : existing.specifications.map((row) => ({ label: row.label, value: row.value })),
    attributeAssignments: input.attributeAssignments
      ? input.attributeAssignments.map((row) => ({
          attributeId: row.attributeId,
          attributeValueId: row.attributeValueId ?? null,
          customValue: row.customValue ?? null,
        }))
      : existing.attributeAssignments.map((row) => ({
          attributeId: row.attributeId,
          attributeValueId: row.attributeValueId,
          customValue: row.customValue,
        })),
    options: input.options
      ? input.options.map((group) => ({
          values: group.values?.map((value) => ({ label: value.label })),
        }))
      : existing.options.map((group) => ({
          values: group.values.map((value) => ({ label: value.label })),
        })),
  };
}

function categoryInputToPublishQualityInput(data: CategoryAdminInput): CategoryPublishQualityInput {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    seoTitle: data.seoTitle ?? null,
    seoDescription: data.seoDescription ?? null,
    imageUrl: data.imageUrl ?? null,
  };
}

async function writeProductDependentRelations(
  productId: string,
  productCode: string,
  input: Pick<
    ProductInput,
    "variants" | "options" | "specifications" | "customizations" | "attributeAssignments"
  >,
  db: DbClient = prisma,
  options: WriteDependentRelationsOptions = {},
): Promise<void> {
  if (!options.skipOwnershipVerify) {
    await verifyProductRelationInputOwnership(productId, input, db);
  }

  if (input.options || input.specifications || input.customizations) {
    await syncProductCmsData(
      productId,
      {
        options: input.options,
        specifications: input.specifications,
        customizations: input.customizations,
      },
      db,
    );
  }

  if (input.attributeAssignments !== undefined) {
    const mirror = await syncProductAttributeAssignments(
      productId,
      input.attributeAssignments,
      db,
      { preResolved: options.resolvedAssignments },
    );
    await applyLegacyMirrorToProduct(productId, mirror, db);
  }

  const createdVariantIds: string[] = [];
  if (input.variants?.length) {
    for (const v of input.variants) {
      if (v.id) {
        try {
          await updateProductVariantOwned(db, productId, v.id, {
            ...(v.sku?.trim() ? { sku: v.sku.trim() } : {}),
            colorName: v.colorName,
            colorCode: v.colorCode,
            sizeName: v.sizeName,
            dimensions: v.dimensions,
            capacity: v.capacity,
            displayLabel:
              v.displayLabel !== undefined ? (v.displayLabel?.trim() || null) : undefined,
            moqOverride: v.moqOverride !== undefined ? v.moqOverride : undefined,
            leadTimeOverride:
              v.leadTimeOverride !== undefined ? (v.leadTimeOverride?.trim() || null) : undefined,
            materialOverride:
              v.materialOverride !== undefined ? (v.materialOverride?.trim() || null) : undefined,
            wholesalePrice: v.wholesalePrice != null ? v.wholesalePrice : undefined,
            dealerPrice: v.dealerPrice != null ? v.dealerPrice : undefined,
            costPrice: v.costPrice != null ? v.costPrice : undefined,
            ...(v.priceTiers ? { priceTiers: v.priceTiers as Prisma.InputJsonValue } : {}),
            stockQty: v.stockQty,
            stockStatus: v.stockStatus,
            weight: v.weight != null ? v.weight : undefined,
            imageUrl:
              v.imageUrl !== undefined ? (v.imageUrl?.trim() ? v.imageUrl.trim() : null) : undefined,
            internalNote: v.internalNote,
            variantStatus: v.variantStatus,
          });
        } catch (error) {
          if (error instanceof PrismaClient.PrismaClientKnownRequestError && error.code === "P2002") {
            throwVariantSkuConflict(v, v.sku?.trim() ?? "");
          }
          throw error;
        }
        continue;
      }

      const sku =
        v.sku?.trim() ||
        options.preparedVariantSkus?.get(v) ||
        (await buildVariantSku(v, productCode, db));
      try {
        const created = await db.productVariant.create({
          data: {
            productId,
            sku,
            colorName: v.colorName,
            colorCode: v.colorCode,
            sizeName: v.sizeName,
            dimensions: v.dimensions,
            capacity: v.capacity,
            displayLabel: v.displayLabel?.trim() || null,
            moqOverride: v.moqOverride ?? null,
            leadTimeOverride: v.leadTimeOverride?.trim() || null,
            materialOverride: v.materialOverride?.trim() || null,
            wholesalePrice: v.wholesalePrice != null ? v.wholesalePrice : undefined,
            dealerPrice: v.dealerPrice != null ? v.dealerPrice : undefined,
            costPrice: v.costPrice != null ? v.costPrice : undefined,
            ...(v.priceTiers ? { priceTiers: v.priceTiers as Prisma.InputJsonValue } : {}),
            stockQty: v.stockQty ?? 0,
            stockStatus: v.stockStatus ?? "IN_STOCK",
            weight: v.weight != null ? v.weight : undefined,
            imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : null,
            internalNote: v.internalNote,
            variantStatus: v.variantStatus ?? "ACTIVE",
            ...(v.metadata ? { metadata: v.metadata as Prisma.InputJsonValue } : {}),
          },
        });
        createdVariantIds.push(created.id);
      } catch (error) {
        if (error instanceof PrismaClient.PrismaClientKnownRequestError && error.code === "P2002") {
          throwVariantSkuConflict(v, v.sku?.trim() || sku);
        }
        throw error;
      }
    }
  }

  if (input.variants?.some((v) => v.optionValueIds?.length)) {
    const variantOptionValueIds: Record<string, string[]> = {};
    let newVariantIndex = 0;
    for (const v of input.variants) {
      if (!v.optionValueIds?.length) {
        if (!v.id) newVariantIndex += 1;
        continue;
      }
      const variantId = v.id ?? createdVariantIds[newVariantIndex];
      if (!v.id) newVariantIndex += 1;
      if (!variantId) continue;
      variantOptionValueIds[variantId] = await resolveOptionValueIdsForProduct(
        productId,
        v.optionValueIds,
        db,
      );
    }
    await syncProductCmsData(productId, { variantOptionValueIds }, db);
  }
}

function buildProductCreateData(
  input: ProductInput,
  productCode: string,
  slug: string,
  systemCode: string,
  status: ProductStatus,
): Prisma.ProductCreateInput {
  return {
    name: input.name,
    slug,
    productCode,
    systemCode,
    category: { connect: { id: input.categoryId } },
    shortDescription: input.shortDescription,
    description: input.description,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    aiSummary: input.aiSummary,
    gsm: input.gsm,
    material: input.material,
    form: input.form,
    fit: input.fit,
    defaultMoq: input.defaultMoq,
    useCases: input.useCases ?? [],
    targetCustomers: input.targetCustomers ?? [],
    supportsPrinting: input.supportsPrinting ?? false,
    supportsEmbroidery: input.supportsEmbroidery ?? false,
    supportsOem: input.supportsOem ?? false,
    tags: input.tags ?? [],
    featuredImage: input.featuredImage ?? null,
    gallery: input.gallery ?? [],
    leadTime: input.leadTime ?? null,
    status,
    ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProductAdmin(input: ProductInput) {
  const finalStatus = input.status ?? "DRAFT";
  const isPublishing = finalStatus === "ACTIVE";

  if (isPublishing) {
    assertNoRelationIdsOnCreate(input);
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { name: true, skuCode: true },
  });
  if (!category) {
    throw new ProductAdminValidationError(
      "Không thể tạo sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
      { categoryId: "Danh mục không tồn tại." },
    );
  }

  let productCode: string;
  try {
    productCode = await ensureUniqueProductCode(
      input.categoryId,
      input.productCode?.trim() || undefined
    );
  } catch (err) {
    if (err instanceof ProductSkuError) {
      const fieldErrors: Record<string, string> = {};
      if (err.message === CATEGORY_SKU_CODE_MISSING_ERROR) {
        fieldErrors.categoryId = err.message;
      } else if (input.productCode?.trim()) {
        fieldErrors.productCode = err.message;
      } else {
        fieldErrors.categoryId = err.message;
      }
      throw new ProductAdminValidationError(err.message, fieldErrors);
    }
    throw err;
  }

  const slug = await ensureUniqueSlug(input.slug ?? toSlug(input.name));
  const systemCode = await generateProductSystemCode();

  if (isPublishing) {
    assertProductPublishQuality(mapProductInputToPublishQualityInput(input, slug));

    const preparedVariantSkus = await prepareVariantSkusForInput(input.variants, productCode);
    const resolvedAssignments =
      input.attributeAssignments !== undefined
        ? await validateProductAttributeAssignments(input.attributeAssignments)
        : undefined;

    const productId = await runProductSaveTransaction(async (tx) => {
      const interimStatus = interimProductStatusForAtomicPublish("ACTIVE") as ProductStatus;
      const product = await tx.product.create({
        data: buildProductCreateData(input, productCode, slug, systemCode, interimStatus),
      });
      await writeProductDependentRelations(product.id, productCode, input, tx, {
        preparedVariantSkus,
        resolvedAssignments,
        skipOwnershipVerify: true,
      });
      await tx.product.update({ where: { id: product.id }, data: { status: "ACTIVE" } });
      return product.id;
    });
    return await getProductAdminById(productId);
  }

  const product = await prisma.product.create({
    data: buildProductCreateData(input, productCode, slug, systemCode, finalStatus),
    include: PRODUCT_INCLUDE,
  });

  await writeProductDependentRelations(product.id, productCode, input);
  return await getProductAdminById(product.id);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProductAdmin(id: string, input: Partial<ProductInput>) {
  const existingStatus = await prisma.product.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existingStatus) {
    throw new ProductAdminValidationError("Không tìm thấy sản phẩm.", {}, "Không tìm thấy sản phẩm.");
  }

  const nextStatus = input.status ?? existingStatus.status;
  if (isProductPublishTransition(existingStatus.status, nextStatus)) {
    const snapshot = await loadProductPublishQualitySnapshot(id, input);
    assertProductPublishQuality(snapshot);
  }

  if (input.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new ProductAdminValidationError(
        "Không thể cập nhật sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
        { categoryId: "Danh mục không tồn tại." },
      );
    }
  }

  const updateData: Prisma.ProductUpdateInput = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.productCode !== undefined && input.productCode.trim()) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { categoryId: true, productCode: true },
    });
    const categoryId = input.categoryId ?? product?.categoryId;
    if (categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { skuCode: true },
      });
      try {
        const prefix = requireCategorySkuCode(cat?.skuCode);
        updateData.productCode = validateProductCodeForCategory(prefix, input.productCode);
      } catch (err) {
        if (err instanceof ProductSkuError) {
          throw new ProductAdminValidationError(err.message, { productCode: err.message });
        }
        throw err;
      }
    }
  }
  if (input.categoryId !== undefined) updateData.category = { connect: { id: input.categoryId } };
  if (input.shortDescription !== undefined) updateData.shortDescription = input.shortDescription;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.seoTitle !== undefined) updateData.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) updateData.seoDescription = input.seoDescription;
  if (input.aiSummary !== undefined) updateData.aiSummary = input.aiSummary;
  if (input.gsm !== undefined) updateData.gsm = input.gsm;
  if (input.material !== undefined) updateData.material = input.material;
  if (input.form !== undefined) updateData.form = input.form;
  if (input.fit !== undefined) updateData.fit = input.fit;
  if (input.defaultMoq !== undefined) updateData.defaultMoq = input.defaultMoq;
  if (input.useCases !== undefined) updateData.useCases = input.useCases;
  if (input.targetCustomers !== undefined) updateData.targetCustomers = input.targetCustomers;
  if (input.supportsPrinting !== undefined) updateData.supportsPrinting = input.supportsPrinting;
  if (input.supportsEmbroidery !== undefined) updateData.supportsEmbroidery = input.supportsEmbroidery;
  if (input.supportsOem !== undefined) updateData.supportsOem = input.supportsOem;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.metadata !== undefined && input.metadata) updateData.metadata = input.metadata as Prisma.InputJsonValue;
  if (input.featuredImage !== undefined) updateData.featuredImage = input.featuredImage;
  if (input.gallery !== undefined) updateData.gallery = input.gallery;
  if (input.leadTime !== undefined) updateData.leadTime = input.leadTime;

  const isAtomicPublish = requiresAtomicActiveProductPublish(existingStatus.status, nextStatus);
  if (isAtomicPublish) {
    delete updateData.status;
  } else if (input.status !== undefined) {
    updateData.status = input.status;
  }

  if (isAtomicPublish) {
    const productCodeRow = await prisma.product.findUnique({
      where: { id },
      select: { productCode: true },
    });
    const productCode = productCodeRow?.productCode;
    if (!productCode) {
      throw new ProductAdminValidationError(
        "Không thể tạo biến thể vì sản phẩm chưa có ID sản phẩm.",
        { productCode: "Thiếu ID sản phẩm." },
      );
    }

    const preparedVariantSkus = await prepareVariantSkusForInput(input.variants, productCode);
    const resolvedAssignments =
      input.attributeAssignments !== undefined
        ? await validateProductAttributeAssignments(input.attributeAssignments)
        : undefined;
    await verifyProductRelationInputOwnership(id, input);

    await runProductSaveTransaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.product.update({ where: { id }, data: updateData });
      }
      await writeProductDependentRelations(id, productCode, input, tx, {
        preparedVariantSkus,
        resolvedAssignments,
        skipOwnershipVerify: true,
      });
      await tx.product.update({ where: { id }, data: { status: "ACTIVE" } });
    });
    return await getProductAdminById(id);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.product.update({ where: { id }, data: updateData });
  }

  const productCodeRow = await prisma.product.findUnique({
    where: { id },
    select: { productCode: true },
  });
  const productCode = productCodeRow?.productCode;
  if (!productCode && input.variants?.some((variant) => !variant.id)) {
    throw new ProductAdminValidationError(
      "Không thể tạo biến thể vì sản phẩm chưa có ID sản phẩm.",
      { productCode: "Thiếu ID sản phẩm." },
    );
  }

  if (productCode) {
    await writeProductDependentRelations(id, productCode, input);
  }

  return await getProductAdminById(id);
}

export async function deleteProductAdmin(id: string) {
  await prisma.productVariant.deleteMany({ where: { productId: id } });
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listProductCategories() {
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
    },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    skuCode: c.skuCode,
    description: c.description,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    imageUrl: c.imageUrl,
    sortOrder: c.sortOrder,
    parentId: c.parentId,
    parentName: c.parent?.name ?? null,
    productCount: c._count.products,
  }));
}

export async function getProductCategoryById(id: string) {
  const c = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    skuCode: c.skuCode,
    description: c.description,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    imageUrl: c.imageUrl,
    sortOrder: c.sortOrder,
    parentId: c.parentId,
    parentName: c.parent?.name ?? null,
    productCount: c._count.products,
  };
}

export type CategoryAdminInput = {
  name: string;
  slug: string;
  skuCode?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  parentId?: string | null;
};

async function assertUniqueCategorySlug(slug: string, excludeId?: string) {
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing && existing.id !== excludeId) {
    throw new ProductAdminValidationError(CATEGORY_SLUG_DUPLICATE_ERROR, {
      slug: CATEGORY_SLUG_DUPLICATE_ERROR,
    });
  }
}

async function assertValidCategoryParent(
  categoryId: string | null,
  parentId: string | null | undefined,
) {
  const normalizedParentId = parentId?.trim() ? parentId.trim() : null;
  if (!normalizedParentId) return null;

  const parent = await prisma.category.findUnique({
    where: { id: normalizedParentId },
    select: { id: true },
  });
  if (!parent) {
    throw new ProductAdminValidationError("Danh mục cha không tồn tại.", {
      parentId: "Danh mục cha không tồn tại.",
    });
  }

  if (!categoryId) return normalizedParentId;

  const allCategories = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const parentError = validateCategoryParentSelection(
    categoryId,
    normalizedParentId,
    allCategories,
  );
  if (parentError) {
    throw new ProductAdminValidationError(parentError, { parentId: parentError });
  }

  return normalizedParentId;
}

export async function createProductCategory(data: CategoryAdminInput) {
  assertCategoryPublishQuality(categoryInputToPublishQualityInput(data), {
    requireIndexableLandingFields: isIndexableCategoryLanding(data.slug),
  });

  await assertUniqueCategorySlug(data.slug);
  const parentId = await assertValidCategoryParent(null, data.parentId);

  let skuCode = data.skuCode?.trim() ? normalizeCode(data.skuCode) : "";
  if (!skuCode) {
    const base = generateCategoryCodeFromName(data.name);
    skuCode = await ensureUniqueCategoryCode(base);
  } else if (await isCategoryCodeTaken(skuCode)) {
    throw new ProductAdminValidationError(CATEGORY_CODE_DUPLICATE_ERROR, {
      skuCode: CATEGORY_CODE_DUPLICATE_ERROR,
    });
  }

  return prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      skuCode,
      description: data.description ?? null,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      imageUrl: data.imageUrl ?? null,
      sortOrder: data.sortOrder ?? 0,
      parentId,
    },
  });
}

export async function updateProductCategory(id: string, data: CategoryAdminInput) {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) {
    throw new ProductAdminValidationError("Không tìm thấy danh mục.", {}, "Không tìm thấy danh mục.");
  }

  if (shouldEnforceCategoryIndexableSeoGate(existing.slug, data.slug)) {
    assertCategoryPublishQuality(categoryInputToPublishQualityInput(data), {
      requireIndexableLandingFields: true,
    });
  } else {
    assertCategoryPublishQuality(categoryInputToPublishQualityInput(data), {
      requireIndexableLandingFields: false,
    });
  }

  await assertUniqueCategorySlug(data.slug, id);
  const parentId = await assertValidCategoryParent(id, data.parentId);

  const skuCode = data.skuCode?.trim() ? normalizeCode(data.skuCode) : null;
  if (skuCode && (await isCategoryCodeTaken(skuCode, id))) {
    throw new ProductAdminValidationError(CATEGORY_CODE_DUPLICATE_ERROR, {
      skuCode: CATEGORY_CODE_DUPLICATE_ERROR,
    });
  }

  return prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      skuCode,
      description: data.description ?? null,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      imageUrl: data.imageUrl ?? null,
      sortOrder: data.sortOrder ?? 0,
      parentId,
    },
  });
}

export async function deleteProductCategory(id: string) {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!cat) return { ok: false as const, reason: "not_found" as const };
  if (cat._count.products > 0) {
    return { ok: false as const, reason: "has_products" as const, count: cat._count.products };
  }
  if (cat._count.children > 0) {
    return { ok: false as const, reason: "has_children" as const };
  }
  await prisma.category.delete({ where: { id } });
  return { ok: true as const };
}

export async function upsertProductCategory(data: {
  name: string;
  slug: string;
  skuCode?: string;
  description?: string;
  sortOrder?: number;
}) {
  return await prisma.category.upsert({
    where: { slug: data.slug },
    create: {
      name: data.name,
      slug: data.slug,
      skuCode: data.skuCode,
      description: data.description,
      sortOrder: data.sortOrder ?? 0,
    },
    update: {
      name: data.name,
      skuCode: data.skuCode,
      description: data.description,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}
