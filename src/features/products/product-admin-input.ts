import type { ProductStatus, StockStatus, VariantStatus } from "@prisma/client";
import type { ProductInput, VariantInput } from "@/features/products/product-admin.service";

export class ProductAdminValidationError extends Error {
  fieldErrors: Record<string, string>;
  detail: string;

  constructor(message: string, fieldErrors: Record<string, string> = {}, detail = message) {
    super(message);
    this.name = "ProductAdminValidationError";
    this.fieldErrors = fieldErrors;
    this.detail = detail;
  }
}

const VALID_STOCK_STATUSES = new Set<StockStatus>(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "PREORDER"]);
const VALID_PRODUCT_STATUSES = new Set<ProductStatus>(["ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]);
const VALID_VARIANT_STATUSES = new Set<VariantStatus>(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export function isValidImageUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}

export function normalizeImageUrl(
  value: unknown,
  field: string,
  fieldErrors: Record<string, string>,
  optional = true,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return optional ? null : undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return optional ? null : undefined;
  if (!isValidImageUrl(trimmed)) {
    fieldErrors[field] = "URL ảnh không hợp lệ. Vui lòng dùng link ảnh bắt đầu bằng https://.";
    return optional ? null : undefined;
  }
  return trimmed;
}

export function parseOptionalInt(
  value: unknown,
  field: string,
  fieldErrors: Record<string, string>,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      fieldErrors[field] = field.includes("stockQty") ? "Tồn kho phải là số." : "Giá trị phải là số nguyên.";
      return undefined;
    }
    return value;
  }
  const str = String(value).trim();
  if (!str) return null;
  const n = parseInt(str.replace(/[,\s]/g, ""), 10);
  if (Number.isNaN(n)) {
    fieldErrors[field] = field.includes("stockQty") ? "Tồn kho phải là số." : "Giá trị phải là số nguyên.";
    return undefined;
  }
  return n;
}

export function parseOptionalNumber(
  value: unknown,
  field: string,
  fieldErrors: Record<string, string>,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fieldErrors[field] = field.includes("dealerPrice")
        ? "Giá đại lý phải là số."
        : field.includes("wholesalePrice")
          ? "Giá sỉ phải là số."
          : "Giá trị phải là số.";
      return undefined;
    }
    return value;
  }
  const str = String(value).trim();
  if (!str) return null;
  const n = parseFloat(str.replace(/[,\s]/g, ""));
  if (Number.isNaN(n)) {
    fieldErrors[field] = field.includes("dealerPrice")
      ? "Giá đại lý phải là số."
      : field.includes("wholesalePrice")
        ? "Giá sỉ phải là số."
        : "Giá trị phải là số.";
    return undefined;
  }
  return n;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function parseVariant(raw: unknown, index: number): VariantInput {
  if (!raw || typeof raw !== "object") {
    throw new ProductAdminValidationError("Dữ liệu biến thể không hợp lệ.", {
      [`variants.${index}`]: "Biến thể không hợp lệ.",
    });
  }

  const v = raw as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};
  const prefix = `variants.${index}`;

  const imageUrl = normalizeImageUrl(
    v.imageUrl ?? v.featuredImage,
    `${prefix}.imageUrl`,
    fieldErrors,
  );

  const wholesalePrice = parseOptionalNumber(v.wholesalePrice, `${prefix}.wholesalePrice`, fieldErrors);
  const dealerPrice = parseOptionalNumber(v.dealerPrice, `${prefix}.dealerPrice`, fieldErrors);
  const costPrice = parseOptionalNumber(v.costPrice, `${prefix}.costPrice`, fieldErrors);
  const weight = parseOptionalNumber(v.weight, `${prefix}.weight`, fieldErrors);
  const stockQty = parseOptionalInt(v.stockQty, `${prefix}.stockQty`, fieldErrors);

  let stockStatus: StockStatus | undefined;
  if (v.stockStatus !== undefined && v.stockStatus !== null && v.stockStatus !== "") {
    const status = String(v.stockStatus).toUpperCase() as StockStatus;
    if (!VALID_STOCK_STATUSES.has(status)) {
      fieldErrors[`${prefix}.stockStatus`] = "Trạng thái tồn kho không hợp lệ.";
    } else {
      stockStatus = status;
    }
  }

  let variantStatus: VariantStatus | undefined;
  if (v.variantStatus !== undefined && v.variantStatus !== null && v.variantStatus !== "") {
    const status = String(v.variantStatus).toUpperCase() as VariantStatus;
    if (!VALID_VARIANT_STATUSES.has(status)) {
      fieldErrors[`${prefix}.variantStatus`] = "Trạng thái biến thể không hợp lệ.";
    } else {
      variantStatus = status;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ProductAdminValidationError(
      "Không thể lưu sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
      fieldErrors,
    );
  }

  return {
    id: v.id ? String(v.id) : undefined,
    sku: v.sku ? String(v.sku).trim() : undefined,
    colorName: v.colorName ? String(v.colorName).trim() : undefined,
    colorCode: v.colorCode ? String(v.colorCode).trim() : undefined,
    sizeName: v.sizeName ? String(v.sizeName).trim() : undefined,
    dimensions: v.dimensions ? String(v.dimensions).trim() : undefined,
    capacity: v.capacity ? String(v.capacity).trim() : undefined,
    wholesalePrice: wholesalePrice ?? undefined,
    dealerPrice: dealerPrice ?? undefined,
    costPrice: costPrice ?? undefined,
    priceTiers: v.priceTiers && typeof v.priceTiers === "object" ? (v.priceTiers as Record<string, unknown>) : undefined,
    stockQty: stockQty ?? undefined,
    stockStatus,
    weight: weight ?? undefined,
    imageUrl: imageUrl ?? undefined,
    internalNote: v.internalNote ? String(v.internalNote).trim() : undefined,
    variantStatus,
    metadata: v.metadata && typeof v.metadata === "object" ? (v.metadata as Record<string, unknown>) : undefined,
  };
}

export function parseProductInput(raw: Record<string, unknown>, mode: "create"): ProductInput;
export function parseProductInput(raw: Record<string, unknown>, mode: "update"): Partial<ProductInput>;
export function parseProductInput(
  raw: Record<string, unknown>,
  mode: "create" | "update",
): ProductInput | Partial<ProductInput> {
  const fieldErrors: Record<string, string> = {};

  const name = raw.name !== undefined ? String(raw.name).trim() : undefined;
  if (mode === "create" && !name) fieldErrors.name = "Tên sản phẩm là bắt buộc.";

  const categoryId = raw.categoryId !== undefined ? String(raw.categoryId).trim() : undefined;
  if (mode === "create" && !categoryId) fieldErrors.categoryId = "Danh mục là bắt buộc.";

  const featuredImage = normalizeImageUrl(raw.featuredImage, "featuredImage", fieldErrors);
  const galleryRaw = parseStringArray(raw.gallery);
  const galleryErrors: Record<string, string> = {};
  const gallery = galleryRaw?.map((url, index) => {
    const normalized = normalizeImageUrl(url, `gallery.${index}`, galleryErrors, false);
    return normalized ?? "";
  }).filter(Boolean);
  Object.assign(fieldErrors, galleryErrors);

  const defaultMoq = parseOptionalInt(raw.defaultMoq, "defaultMoq", fieldErrors);
  const gsm = parseOptionalInt(raw.gsm, "gsm", fieldErrors);

  let status: ProductStatus | undefined;
  if (raw.status !== undefined && raw.status !== null && raw.status !== "") {
    const parsed = String(raw.status).toUpperCase() as ProductStatus;
    if (!VALID_PRODUCT_STATUSES.has(parsed)) {
      fieldErrors.status = "Trạng thái sản phẩm không hợp lệ.";
    } else {
      status = parsed;
    }
  }

  let variants: VariantInput[] | undefined;
  if (Array.isArray(raw.variants)) {
    variants = raw.variants.map((variant, index) => parseVariant(variant, index));
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ProductAdminValidationError(
      mode === "create"
        ? "Không thể tạo sản phẩm. Vui lòng kiểm tra các trường được đánh dấu."
        : "Không thể cập nhật sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
      fieldErrors,
    );
  }

  const input: Partial<ProductInput> = {};

  if (name !== undefined) input.name = name;
  if (raw.slug !== undefined) input.slug = String(raw.slug).trim() || undefined;
  if (raw.productCode !== undefined) input.productCode = raw.productCode ? String(raw.productCode).trim() : undefined;
  if (categoryId !== undefined) input.categoryId = categoryId;
  if (raw.shortDescription !== undefined) input.shortDescription = String(raw.shortDescription).trim() || undefined;
  if (raw.description !== undefined) input.description = String(raw.description).trim() || undefined;
  if (raw.seoTitle !== undefined) input.seoTitle = String(raw.seoTitle).trim() || undefined;
  if (raw.seoDescription !== undefined) input.seoDescription = String(raw.seoDescription).trim() || undefined;
  if (raw.aiSummary !== undefined) input.aiSummary = String(raw.aiSummary).trim() || undefined;
  if (gsm !== undefined) input.gsm = gsm;
  if (raw.material !== undefined) input.material = String(raw.material).trim() || undefined;
  if (raw.form !== undefined) input.form = String(raw.form).trim() || undefined;
  if (raw.fit !== undefined) input.fit = String(raw.fit).trim() || undefined;
  if (defaultMoq !== undefined) input.defaultMoq = defaultMoq;
  if (raw.leadTime !== undefined) input.leadTime = raw.leadTime ? String(raw.leadTime).trim() : null;
  if (raw.useCases !== undefined) input.useCases = parseStringArray(raw.useCases) ?? [];
  if (raw.targetCustomers !== undefined) input.targetCustomers = parseStringArray(raw.targetCustomers) ?? [];
  if (raw.supportsPrinting !== undefined) input.supportsPrinting = Boolean(raw.supportsPrinting);
  if (raw.supportsEmbroidery !== undefined) input.supportsEmbroidery = Boolean(raw.supportsEmbroidery);
  if (raw.supportsOem !== undefined) input.supportsOem = Boolean(raw.supportsOem);
  if (raw.tags !== undefined) input.tags = parseStringArray(raw.tags) ?? [];
  if (featuredImage !== undefined) input.featuredImage = featuredImage;
  if (galleryRaw !== undefined) input.gallery = gallery;
  if (status !== undefined) input.status = status;
  if (raw.metadata !== undefined && raw.metadata && typeof raw.metadata === "object") {
    input.metadata = raw.metadata as Record<string, unknown>;
  }
  if (variants !== undefined) input.variants = variants;

  if (mode === "create") {
    if (!name || !categoryId) {
      throw new ProductAdminValidationError(
        "Không thể tạo sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
        fieldErrors,
      );
    }
    return {
      ...input,
      name,
      categoryId,
      status: input.status ?? "DRAFT",
      useCases: input.useCases ?? [],
      targetCustomers: input.targetCustomers ?? [],
      tags: input.tags ?? [],
      gallery: input.gallery ?? [],
      variants: input.variants ?? [],
    };
  }

  return input;
}

export function formatProductAdminApiError(err: unknown): {
  ok: false;
  error: string;
  detail: string;
  fieldErrors: Record<string, string>;
  status: number;
} {
  if (err instanceof ProductAdminValidationError) {
    return {
      ok: false,
      error: err.message,
      detail: err.detail,
      fieldErrors: err.fieldErrors,
      status: 400,
    };
  }

  if (err && typeof err === "object" && "code" in err) {
    const prismaErr = err as { code?: string; message?: string; meta?: { target?: string[]; field_name?: string } };
    const fieldErrors: Record<string, string> = {};

    if (prismaErr.code === "P2002") {
      const target = prismaErr.meta?.target ?? [];
      if (target.includes("productCode")) {
        fieldErrors.productCode = "Mã sản phẩm đã tồn tại.";
      }
      if (target.includes("slug")) {
        fieldErrors.slug = "Slug sản phẩm đã tồn tại.";
      }
      if (target.includes("sku")) {
        fieldErrors["variants.0.sku"] = "SKU đã tồn tại.";
      }
      return {
        ok: false,
        error: "Không thể lưu sản phẩm vì trùng dữ liệu.",
        detail: prismaErr.message ?? "Unique constraint failed",
        fieldErrors,
        status: 409,
      };
    }

    if (prismaErr.code === "P2003") {
      fieldErrors.categoryId = "Danh mục không tồn tại.";
      return {
        ok: false,
        error: "Không thể lưu sản phẩm.",
        detail: prismaErr.message ?? "Foreign key constraint failed",
        fieldErrors,
        status: 400,
      };
    }

    if (prismaErr.code === "P2025") {
      return {
        ok: false,
        error: "Không tìm thấy sản phẩm hoặc biến thể.",
        detail: prismaErr.message ?? "Record not found",
        fieldErrors,
        status: 404,
      };
    }

    return {
      ok: false,
      error: "Không thể lưu sản phẩm.",
      detail: prismaErr.message ?? String(err),
      fieldErrors,
      status: 500,
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    ok: false,
    error: "Không thể lưu sản phẩm.",
    detail: message,
    fieldErrors: {},
    status: 500,
  };
}
