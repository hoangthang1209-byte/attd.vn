import type { StockStatus } from "@prisma/client";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";

export const NEGATIVE_PRODUCT_PRICE_ERROR = "Giá sản phẩm không được âm.";
export const NEGATIVE_VARIANT_PRICE_ERROR = "Giá biến thể không được âm.";
export const NEGATIVE_STOCK_ERROR = "Tồn kho không được âm.";
export const INVALID_STOCK_QTY_ERROR = "Tồn kho phải là số nguyên hợp lệ.";
export const ZERO_STOCK_IN_STOCK_ERROR =
  "Biến thể có tồn kho bằng 0 không thể ở trạng thái còn hàng.";
export const TIER_VARIANT_OWNERSHIP_ERROR =
  "Biến thể được chọn không thuộc sản phẩm này.";

const TRACKED_IN_STOCK_STATUSES = new Set<StockStatus>(["IN_STOCK", "LOW_STOCK"]);

export function isValidFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidIntegerStockQty(value: unknown): value is number {
  return isValidFiniteNumber(value) && Number.isInteger(value);
}

export function assertNonNegativePrice(
  value: number | null | undefined,
  scope: "product" | "variant",
  field: string,
): void {
  if (value === undefined || value === null) return;
  if (!isValidFiniteNumber(value)) {
    throw new ProductAdminValidationError(
      scope === "product" ? NEGATIVE_PRODUCT_PRICE_ERROR : NEGATIVE_VARIANT_PRICE_ERROR,
      { [field]: scope === "product" ? NEGATIVE_PRODUCT_PRICE_ERROR : NEGATIVE_VARIANT_PRICE_ERROR },
    );
  }
  if (value < 0) {
    throw new ProductAdminValidationError(
      scope === "product" ? NEGATIVE_PRODUCT_PRICE_ERROR : NEGATIVE_VARIANT_PRICE_ERROR,
      { [field]: scope === "product" ? NEGATIVE_PRODUCT_PRICE_ERROR : NEGATIVE_VARIANT_PRICE_ERROR },
    );
  }
}

export function assertValidStockQty(
  value: number | null | undefined,
  field = "stockQty",
): void {
  if (value === undefined || value === null) return;
  if (!isValidIntegerStockQty(value)) {
    throw new ProductAdminValidationError(INVALID_STOCK_QTY_ERROR, {
      [field]: INVALID_STOCK_QTY_ERROR,
    });
  }
  if (value < 0) {
    throw new ProductAdminValidationError(NEGATIVE_STOCK_ERROR, {
      [field]: NEGATIVE_STOCK_ERROR,
    });
  }
}

export function defaultStockStatusForQty(stockQty: number): StockStatus {
  if (stockQty > 0) return "IN_STOCK";
  return "OUT_OF_STOCK";
}

export function assertStockStatusCompatibleWithQty(
  stockQty: number,
  stockStatus: StockStatus,
  field = "stockStatus",
): void {
  if (stockQty === 0 && TRACKED_IN_STOCK_STATUSES.has(stockStatus)) {
    throw new ProductAdminValidationError(ZERO_STOCK_IN_STOCK_ERROR, {
      [field]: ZERO_STOCK_IN_STOCK_ERROR,
    });
  }
}

export function normalizeVariantStockFields(
  stockQty: number,
  stockStatus?: StockStatus,
): { stockQty: number; stockStatus: StockStatus } {
  assertValidStockQty(stockQty);
  const normalizedStatus = stockStatus ?? defaultStockStatusForQty(stockQty);
  if (stockQty === 0 && TRACKED_IN_STOCK_STATUSES.has(normalizedStatus)) {
    return { stockQty, stockStatus: "OUT_OF_STOCK" };
  }
  assertStockStatusCompatibleWithQty(stockQty, normalizedStatus);
  return { stockQty, stockStatus: normalizedStatus };
}

export function validateVariantPriceFields(input: {
  wholesalePrice?: number | null;
  dealerPrice?: number | null;
  costPrice?: number | null;
  prefix?: string;
}): void {
  const prefix = input.prefix ?? "variants";
  assertNonNegativePrice(input.wholesalePrice, "variant", `${prefix}.wholesalePrice`);
  assertNonNegativePrice(input.dealerPrice, "variant", `${prefix}.dealerPrice`);
  assertNonNegativePrice(input.costPrice, "variant", `${prefix}.costPrice`);
}

export function variantCountsAsPubliclyInStock(stockQty: number, stockStatus: StockStatus): boolean {
  if (stockQty <= 0) return false;
  return stockStatus === "IN_STOCK" || stockStatus === "LOW_STOCK";
}

/** Public catalog surfaces only expose ACTIVE products. */
export function isPublicCatalogProductStatus(status: string): boolean {
  return status === "ACTIVE";
}

/** Prisma filter fragment for public in-stock catalog queries. */
export const PUBLIC_IN_STOCK_VARIANT_FILTER = {
  stockStatus: { in: ["IN_STOCK", "LOW_STOCK"] as StockStatus[] },
  stockQty: { gt: 0 },
} as const;
