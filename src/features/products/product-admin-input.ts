import type { ProductStatus, StockStatus, VariantStatus } from "@prisma/client";
import type { ProductInput, VariantInput } from "@/features/products/product-admin.service";
import { isValidProductImageUrl, PRODUCT_IMAGE_URL_ERROR } from "@/features/products/product-image-url";
import {
  validateCuratedSalesBadgeKeys,
  type ProductCuratedBadgeKey,
} from "@/features/products/product-sales-badges";
import {
  SeoPublishQualityGateError,
  formatSeoPublishQualityGateApiError,
} from "@/lib/seo/publish-quality-gate";

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

export const PRODUCT_RELATION_OWNERSHIP_MESSAGE =
  "Dữ liệu lựa chọn hoặc thông số sản phẩm không hợp lệ.";

/** Ownership violations are validation failures, not publish-quality gate issues. */
export class ProductRelationOwnershipError extends ProductAdminValidationError {
  readonly httpStatus = 422 as const;

  constructor(detail = PRODUCT_RELATION_OWNERSHIP_MESSAGE) {
    super(detail, {}, detail);
    this.name = "ProductRelationOwnershipError";
  }
}

export function throwProductRelationOwnershipError(): never {
  throw new ProductRelationOwnershipError();
}

export const PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE =
  "Không thể lưu sản phẩm do hệ thống xử lý quá lâu. Dữ liệu bạn đã nhập vẫn được giữ lại. Vui lòng thử lại.";

export function isPrismaTransactionTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message;
  return (
    message.includes("Transaction already closed") ||
    message.includes("timeout for this transaction") ||
    message.includes("A query cannot be executed on an expired transaction")
  );
}

const VALID_STOCK_STATUSES = new Set<StockStatus>(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "PREORDER"]);
const VALID_PRODUCT_STATUSES = new Set<ProductStatus>(["ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]);
const VALID_VARIANT_STATUSES = new Set<VariantStatus>(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export function isValidImageUrl(value: string): boolean {
  return isValidProductImageUrl(value);
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
    fieldErrors[field] = PRODUCT_IMAGE_URL_ERROR;
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
  const id = v.id ? String(v.id) : undefined;
  const clientKey = v.clientKey ? String(v.clientKey) : undefined;
  const prefix = id
    ? `variants.byId.${id}`
    : clientKey
      ? `variants.byClientKey.${clientKey}`
      : `variants.${index}`;

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
  const moqOverride = parseOptionalInt(v.moqOverride, `${prefix}.moqOverride`, fieldErrors);

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
    id,
    clientKey,
    sku: v.sku ? String(v.sku).trim() : undefined,
    colorName: v.colorName ? String(v.colorName).trim() : undefined,
    colorCode: v.colorCode ? String(v.colorCode).trim() : undefined,
    sizeName: v.sizeName ? String(v.sizeName).trim() : undefined,
    dimensions: v.dimensions ? String(v.dimensions).trim() : undefined,
    capacity: v.capacity ? String(v.capacity).trim() : undefined,
    displayLabel: v.displayLabel ? String(v.displayLabel).trim() : undefined,
    moqOverride: moqOverride ?? undefined,
    leadTimeOverride: v.leadTimeOverride ? String(v.leadTimeOverride).trim() : undefined,
    materialOverride: v.materialOverride ? String(v.materialOverride).trim() : undefined,
    optionValueIds: Array.isArray(v.optionValueIds)
      ? v.optionValueIds.map((id) => String(id).trim()).filter(Boolean)
      : undefined,
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

  let curatedSalesBadges: ProductCuratedBadgeKey[] | undefined;
  if (raw.curatedSalesBadges !== undefined) {
    const validated = validateCuratedSalesBadgeKeys(raw.curatedSalesBadges);
    if ("error" in validated) {
      fieldErrors.curatedSalesBadges = validated.error;
    } else {
      curatedSalesBadges = validated.keys;
    }
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
  if (curatedSalesBadges !== undefined) input.curatedSalesBadges = curatedSalesBadges;
  if (variants !== undefined) input.variants = variants;

  if (Array.isArray(raw.options)) {
    input.options = raw.options.map((opt, index) => {
      const row = opt as Record<string, unknown>;
      const values = Array.isArray(row.values)
        ? row.values.map((val, valIndex) => {
            const v = val as Record<string, unknown>;
            return {
              id: v.id ? String(v.id) : undefined,
              attributeValueId: v.attributeValueId ? String(v.attributeValueId) : undefined,
              label: String(v.label ?? "").trim(),
              valueCode: v.valueCode ? String(v.valueCode).trim() : undefined,
              imageUrl: v.imageUrl ? String(v.imageUrl).trim() : undefined,
              sortOrder: typeof v.sortOrder === "number" ? v.sortOrder : valIndex,
            };
          }).filter((v) => v.label)
        : [];
      return {
        id: row.id ? String(row.id) : undefined,
        attributeId: row.attributeId ? String(row.attributeId) : undefined,
        name: String(row.name ?? "").trim(),
        slug: row.slug ? String(row.slug).trim() : undefined,
        sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
        values,
      };
    }).filter((opt) => opt.name);
  }

  if (Array.isArray(raw.specifications)) {
    input.specifications = raw.specifications.map((spec, index) => {
      const row = spec as Record<string, unknown>;
      return {
        id: row.id ? String(row.id) : undefined,
        label: String(row.label ?? "").trim(),
        value: String(row.value ?? "").trim(),
        sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
      };
    });
  }

  if (Array.isArray(raw.customizations)) {
    input.customizations = raw.customizations.map((cap, index) => {
      const row = cap as Record<string, unknown>;
      return {
        id: row.id ? String(row.id) : undefined,
        label: String(row.label ?? "").trim(),
        description: row.description ? String(row.description).trim() : undefined,
        sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
        enabled: row.enabled !== undefined ? Boolean(row.enabled) : true,
      };
    });
  }

  if (Array.isArray(raw.attributeAssignments)) {
    input.attributeAssignments = raw.attributeAssignments.map((item, index) => {
      const row = item as Record<string, unknown>;
      const attributeId = String(row.attributeId ?? "").trim();
      const attributeValueId = row.attributeValueId ? String(row.attributeValueId).trim() : undefined;
      const customValue = row.customValue ? String(row.customValue).trim() : undefined;
      if (!attributeId) {
        fieldErrors[`attributeAssignments.${index}.attributeId`] = "Thiếu thuộc tính được gán.";
      }
      return {
        id: row.id ? String(row.id) : undefined,
        attributeId,
        attributeValueId: attributeValueId || null,
        customValue: customValue || null,
        sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
      };
    });
  }

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
  code?: string;
  issues?: Array<{ field: string; label: string; message: string }>;
} {
  if (err instanceof SeoPublishQualityGateError) {
    const formatted = formatSeoPublishQualityGateApiError(err);
    return {
      ok: false,
      error: formatted.error,
      detail: formatted.error,
      fieldErrors: formatted.fieldErrors,
      status: formatted.status,
      code: formatted.code,
      issues: formatted.issues,
    };
  }

  if (err instanceof ProductRelationOwnershipError) {
    return {
      ok: false,
      error: err.message,
      detail: err.detail,
      fieldErrors: err.fieldErrors,
      status: err.httpStatus,
    };
  }

  if (err instanceof ProductAdminValidationError) {
    return {
      ok: false,
      error: err.message,
      detail: err.detail,
      fieldErrors: err.fieldErrors,
      status: 400,
    };
  }

  if (isPrismaTransactionTimeoutError(err)) {
    return {
      ok: false,
      error: PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE,
      detail:
        process.env.NODE_ENV === "development" && err instanceof Error
          ? err.message
          : PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE,
      fieldErrors: {},
      status: 503,
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
