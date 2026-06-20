import type { Prisma, ProductStatus, StockStatus, VariantStatus } from "@prisma/client";
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
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import { generateProductSystemCode } from "@/features/products/product-system-code";

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
  sku?: string;
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
  dimensions?: string;
  capacity?: string;
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
};

const VARIANT_INCLUDE = {
  color: { select: { id: true, name: true, slug: true } },
  size: { select: { id: true, name: true, slug: true } },
} as const;

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, skuCode: true } },
  images: { select: { id: true, imageUrl: true, altText: true, sortOrder: true }, orderBy: { sortOrder: "asc" as const } },
  variants: { include: VARIANT_INCLUDE, orderBy: { createdAt: "asc" as const } },
} as const;

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
  productCode: string
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
  return await ensureUniqueSku(base);
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

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProductAdmin(input: ProductInput) {
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

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      productCode,
      systemCode,
      categoryId: input.categoryId,
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
      status: input.status ?? "DRAFT",
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
    },
    include: PRODUCT_INCLUDE,
  });

  if (input.variants?.length) {
    for (const v of input.variants) {
      const sku = await buildVariantSku(v, productCode);
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku,
          colorName: v.colorName,
          colorCode: v.colorCode,
          sizeName: v.sizeName,
          dimensions: v.dimensions,
          capacity: v.capacity,
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
    }
  }

  return await getProductAdminById(product.id);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProductAdmin(id: string, input: Partial<ProductInput>) {
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
  if (input.status !== undefined) updateData.status = input.status;

  await prisma.product.update({ where: { id }, data: updateData });

  if (input.variants) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { productCode: true, name: true, material: true, categoryId: true },
    });
    const categoryId = input.categoryId ?? product?.categoryId;
    const prodCode = product?.productCode;
    if (!prodCode) {
      throw new ProductAdminValidationError(
        "Không thể tạo biến thể vì sản phẩm chưa có ID sản phẩm.",
        { productCode: "Thiếu ID sản phẩm." }
      );
    }

    for (const v of input.variants) {
      if (v.id) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: {
            colorName: v.colorName,
            colorCode: v.colorCode,
            sizeName: v.sizeName,
            dimensions: v.dimensions,
            capacity: v.capacity,
            wholesalePrice: v.wholesalePrice != null ? v.wholesalePrice : undefined,
            dealerPrice: v.dealerPrice != null ? v.dealerPrice : undefined,
            costPrice: v.costPrice != null ? v.costPrice : undefined,
            ...(v.priceTiers ? { priceTiers: v.priceTiers as Prisma.InputJsonValue } : {}),
            stockQty: v.stockQty,
            stockStatus: v.stockStatus,
            weight: v.weight != null ? v.weight : undefined,
            imageUrl: v.imageUrl !== undefined ? (v.imageUrl?.trim() ? v.imageUrl.trim() : null) : undefined,
            internalNote: v.internalNote,
            variantStatus: v.variantStatus,
          },
        });
      } else {
        const sku = await buildVariantSku(v, prodCode);
        await prisma.productVariant.create({
          data: {
            productId: id,
            sku,
            colorName: v.colorName,
            colorCode: v.colorCode,
            sizeName: v.sizeName,
            dimensions: v.dimensions,
            capacity: v.capacity,
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
      }
    }
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

export async function createProductCategory(data: CategoryAdminInput) {
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
      parentId: data.parentId ?? null,
    },
  });
}

export async function updateProductCategory(id: string, data: CategoryAdminInput) {
  let skuCode = data.skuCode?.trim() ? normalizeCode(data.skuCode) : null;
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
      parentId: data.parentId ?? null,
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
