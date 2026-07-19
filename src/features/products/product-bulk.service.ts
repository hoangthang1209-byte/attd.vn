import type { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import { readProductEntryFromMetadata } from "@/features/products/product-entry-modes";
import { mapPersistedProductToPublishQualityInput } from "@/features/products/product-publish-quality-snapshot";
import { revalidatePublicProductCache } from "@/features/products/revalidate-public-product-cache";
import {
  evaluateProductPublishQuality,
  type ProductPublishQualityInput,
} from "@/lib/seo/publish-quality-gate";

export type ProductBulkOperation =
  | "archive"
  | "status"
  | "publish"
  | "unpublish"
  | "moq"
  | "leadTime"
  | "capabilities";

export type ProductBulkCapabilityField =
  | "supportsPrinting"
  | "supportsEmbroidery"
  | "supportsOem";

export type ProductBulkInput = {
  operation: ProductBulkOperation;
  productIds: string[];
  status?: ProductStatus;
  moq?: { mode: "set"; value: number };
  leadTime?: { mode: "set"; value: string };
  capabilities?: {
    field: ProductBulkCapabilityField;
    value: boolean;
  };
};

export type ProductBulkSkippedItem = {
  id: string;
  name: string;
  productCode: string | null;
  reason: string;
};

export type ProductBulkResult = {
  operation: ProductBulkOperation;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  message: string;
  skipped?: ProductBulkSkippedItem[];
};

export const PRODUCT_BULK_MAX_IDS = 200;

const PUBLISH_QUALITY_INCLUDE = {
  images: { select: { imageUrl: true } },
  variants: { select: { id: true, variantStatus: true, imageUrl: true } },
  specifications: { select: { label: true, value: true } },
  attributeAssignments: {
    select: { attributeId: true, attributeValueId: true, customValue: true },
  },
  options: {
    include: {
      values: { select: { label: true } },
    },
  },
} as const;

/** Client-only / unsaved row keys must never be accepted by the product bulk API. */
export function isClientTempProductId(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return true;
  // Keep this narrow: never reject valid cuid / uuid / legacy persisted IDs.
  return /^(tmp|temp|client|local|row)[-_]/i.test(trimmed);
}

export function dedupeProductIds(productIds: string[]): string[] {
  return [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
}

export function validateProductBulkIds(productIds: string[]): string[] {
  const ids = dedupeProductIds(productIds);
  if (!ids.length) {
    throw new ProductAdminValidationError("Vui lòng chọn ít nhất 1 sản phẩm.", {
      products: "Danh sách sản phẩm trống.",
    });
  }
  if (ids.some(isClientTempProductId)) {
    throw new ProductAdminValidationError(
      "Không thể cập nhật sản phẩm chưa lưu trên hệ thống.",
      { products: "ID sản phẩm tạm thời không hợp lệ." },
    );
  }
  if (ids.length > PRODUCT_BULK_MAX_IDS) {
    throw new ProductAdminValidationError(
      `Chỉ hỗ trợ tối đa ${PRODUCT_BULK_MAX_IDS} sản phẩm mỗi lần.`,
      { products: `Tối đa ${PRODUCT_BULK_MAX_IDS} sản phẩm.` },
    );
  }
  return ids;
}

export function validateBulkMoqValue(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || !Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ProductAdminValidationError("Giá trị nhập không hợp lệ.", {
      moq: "MOQ phải là số nguyên lớn hơn 0.",
    });
  }
  return numberValue;
}

export function validateBulkLeadTimeValue(value: unknown): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.length > 120) {
    throw new ProductAdminValidationError("Giá trị nhập không hợp lệ.", {
      leadTime: "Lead-time không được để trống và tối đa 120 ký tự.",
    });
  }
  return trimmed;
}

function enrichPublishQualityWithEntryContext(
  base: ProductPublishQualityInput,
  source: {
    metadata?: unknown;
    defaultMoq?: number | null;
    leadTime?: string | null;
    supportsPrinting?: boolean;
    supportsEmbroidery?: boolean;
    supportsOem?: boolean;
  },
): ProductPublishQualityInput {
  const entry = readProductEntryFromMetadata(source.metadata);
  return {
    ...base,
    productMode: entry.mode ?? null,
    pricingMode: entry.pricingMode ?? null,
    stockMode: entry.stockMode ?? null,
    defaultMoq: source.defaultMoq ?? null,
    leadTime: source.leadTime ?? null,
    supportsPrinting: source.supportsPrinting ?? false,
    supportsEmbroidery: source.supportsEmbroidery ?? false,
    supportsOem: source.supportsOem ?? false,
    quoteCtaEnabled:
      Boolean(source.supportsOem) ||
      entry.pricingMode === "CONTACT_QUOTE" ||
      entry.mode === "OEM_SOURCING",
  };
}

export function evaluatePersistedProductPublishGate(product: {
  name: string;
  slug: string;
  categoryId: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImage: string | null;
  gallery: string[];
  metadata?: unknown;
  defaultMoq?: number | null;
  leadTime?: string | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  images: Array<{ imageUrl: string }>;
  variants: Array<{ variantStatus: string; imageUrl: string | null }>;
  specifications: Array<{ label: string; value: string }>;
  attributeAssignments: Array<{
    attributeId: string;
    attributeValueId: string | null;
    customValue: string | null;
  }>;
  options: Array<{ values: Array<{ label: string }> }>;
}): { valid: boolean; reason: string } {
  const snapshot = enrichPublishQualityWithEntryContext(
    mapPersistedProductToPublishQualityInput({
      ...product,
      variants: product.variants.map((variant) => ({
        variantStatus: variant.variantStatus as "ACTIVE" | "INACTIVE" | "ARCHIVED",
        imageUrl: variant.imageUrl,
      })),
    }),
    product,
  );
  const result = evaluateProductPublishQuality(snapshot);
  if (result.valid) return { valid: true, reason: "" };
  return {
    valid: false,
    reason: result.issues[0]?.message ?? "Sản phẩm chưa đủ điều kiện publish.",
  };
}

type LoadedProduct = {
  id: string;
  name: string;
  slug: string;
  productCode: string | null;
  status: ProductStatus;
  categoryId: string;
};

async function revalidateUpdatedProducts(
  products: LoadedProduct[],
  nextStatusById: Map<string, ProductStatus>,
): Promise<void> {
  await Promise.all(
    products.map((product) => {
      const nextStatus = nextStatusById.get(product.id) ?? product.status;
      return revalidatePublicProductCache({
        productId: product.id,
        slug: product.slug,
        categoryId: product.categoryId,
        affectsHomepage: product.status === "ACTIVE" || nextStatus === "ACTIVE",
      });
    }),
  );
}

function buildResult(
  operation: ProductBulkOperation,
  successCount: number,
  skipped: ProductBulkSkippedItem[],
  successMessage: string,
): ProductBulkResult {
  const skippedCount = skipped.length;
  let message = successMessage;
  if (skippedCount > 0) {
    message = `${successMessage} Bỏ qua ${skippedCount} sản phẩm chưa đủ điều kiện.`;
  }
  return {
    operation,
    successCount,
    skippedCount,
    failedCount: 0,
    message,
    skipped: skippedCount ? skipped : undefined,
  };
}

async function bulkArchive(products: LoadedProduct[]): Promise<ProductBulkResult> {
  const targets = products.filter((product) => product.status !== "ARCHIVED");
  const alreadyArchived = products.filter((product) => product.status === "ARCHIVED");
  const skipped: ProductBulkSkippedItem[] = alreadyArchived.map((product) => ({
    id: product.id,
    name: product.name,
    productCode: product.productCode,
    reason: "Sản phẩm đã được lưu trữ.",
  }));

  let successCount = 0;
  if (targets.length) {
    const updated = await prisma.product.updateMany({
      where: {
        id: { in: targets.map((product) => product.id) },
        status: { not: "ARCHIVED" },
      },
      data: { status: "ARCHIVED" },
    });
    successCount = updated.count;
    if (updated.count === 0) {
      return {
        operation: "archive",
        successCount: 0,
        skippedCount: skipped.length + targets.length,
        failedCount: targets.length,
        message: "Không cập nhật được sản phẩm đã chọn. Vui lòng tải lại danh sách và thử lại.",
        skipped: [
          ...skipped,
          ...targets.map((product) => ({
            id: product.id,
            name: product.name,
            productCode: product.productCode,
            reason: "DB không thay đổi trạng thái lưu trữ.",
          })),
        ],
      };
    }
    if (updated.count < targets.length) {
      const unchanged = targets.length - updated.count;
      skipped.push({
        id: "bulk",
        name: "Một số sản phẩm",
        productCode: null,
        reason: `${unchanged} sản phẩm không đổi trạng thái sau updateMany.`,
      });
    }
  }

  const nextStatus = new Map(products.map((product) => [product.id, "ARCHIVED" as ProductStatus]));
  await revalidateUpdatedProducts(products, nextStatus);

  if (successCount === 0 && skipped.length > 0) {
    return {
      operation: "archive",
      successCount: 0,
      skippedCount: skipped.length,
      failedCount: 0,
      message: `Không có sản phẩm nào cần lưu trữ. Bỏ qua ${skipped.length} sản phẩm.`,
      skipped,
    };
  }

  return buildResult(
    "archive",
    successCount,
    skipped,
    `Đã lưu trữ ${successCount} sản phẩm.`,
  );
}

async function bulkSetStatus(
  products: LoadedProduct[],
  status: ProductStatus,
): Promise<ProductBulkResult> {
  if (status === "ACTIVE") {
    return bulkPublish(products);
  }

  const targets = products.filter((product) => product.status !== status);
  const unchanged = products.filter((product) => product.status === status);
  const skipped: ProductBulkSkippedItem[] = unchanged.map((product) => ({
    id: product.id,
    name: product.name,
    productCode: product.productCode,
    reason: `Sản phẩm đã ở trạng thái ${status}.`,
  }));

  let successCount = 0;
  if (targets.length) {
    const updated = await prisma.product.updateMany({
      where: {
        id: { in: targets.map((product) => product.id) },
        status: { not: status },
      },
      data: { status },
    });
    successCount = updated.count;
    if (updated.count === 0) {
      return {
        operation: "status",
        successCount: 0,
        skippedCount: skipped.length + targets.length,
        failedCount: targets.length,
        message: "Không cập nhật được trạng thái sản phẩm đã chọn.",
        skipped: [
          ...skipped,
          ...targets.map((product) => ({
            id: product.id,
            name: product.name,
            productCode: product.productCode,
            reason: "DB không thay đổi trạng thái.",
          })),
        ],
      };
    }
  }

  const nextStatus = new Map(products.map((product) => [product.id, status]));
  await revalidateUpdatedProducts(products, nextStatus);
  return buildResult("status", successCount, skipped, `Đã cập nhật ${successCount} sản phẩm.`);
}

async function bulkPublish(products: LoadedProduct[]): Promise<ProductBulkResult> {
  const fullProducts = await prisma.product.findMany({
    where: { id: { in: products.map((product) => product.id) } },
    include: PUBLISH_QUALITY_INCLUDE,
  });

  const readyIds: string[] = [];
  const skipped: ProductBulkSkippedItem[] = [];

  for (const product of fullProducts) {
    if (product.status === "ACTIVE") {
      continue;
    }
    const gate = evaluatePersistedProductPublishGate(product);
    if (!gate.valid) {
      skipped.push({
        id: product.id,
        name: product.name,
        productCode: product.productCode,
        reason: gate.reason,
      });
      continue;
    }
    readyIds.push(product.id);
  }

  if (readyIds.length) {
    await prisma.product.updateMany({
      where: { id: { in: readyIds } },
      data: { status: "ACTIVE" },
    });
  }

  const nextStatus = new Map<string, ProductStatus>();
  for (const product of products) {
    nextStatus.set(product.id, readyIds.includes(product.id) ? "ACTIVE" : product.status);
  }
  await revalidateUpdatedProducts(products, nextStatus);

  if (readyIds.length === 0 && skipped.length > 0) {
    return {
      operation: "publish",
      successCount: 0,
      skippedCount: skipped.length,
      failedCount: 0,
      message: `${skipped.length} sản phẩm chưa đủ điều kiện publish. Vui lòng hoàn thiện trước.`,
      skipped,
    };
  }

  return buildResult(
    "publish",
    readyIds.length,
    skipped,
    `Đã cập nhật ${readyIds.length} sản phẩm.`,
  );
}

async function bulkUnpublish(products: LoadedProduct[]): Promise<ProductBulkResult> {
  const targets = products.filter((product) => product.status !== "DRAFT");
  if (targets.length) {
    await prisma.product.updateMany({
      where: { id: { in: targets.map((product) => product.id) } },
      data: { status: "DRAFT" },
    });
  }
  const nextStatus = new Map(products.map((product) => [product.id, "DRAFT" as ProductStatus]));
  await revalidateUpdatedProducts(products, nextStatus);
  return buildResult("unpublish", targets.length, [], `Đã cập nhật ${targets.length} sản phẩm.`);
}

async function bulkMoq(products: LoadedProduct[], value: number): Promise<ProductBulkResult> {
  await prisma.product.updateMany({
    where: { id: { in: products.map((product) => product.id) } },
    data: { defaultMoq: value },
  });
  await revalidateUpdatedProducts(
    products,
    new Map(products.map((product) => [product.id, product.status])),
  );
  return buildResult("moq", products.length, [], `Đã cập nhật MOQ cho ${products.length} sản phẩm.`);
}

async function bulkLeadTime(products: LoadedProduct[], value: string): Promise<ProductBulkResult> {
  await prisma.product.updateMany({
    where: { id: { in: products.map((product) => product.id) } },
    data: { leadTime: value },
  });
  await revalidateUpdatedProducts(
    products,
    new Map(products.map((product) => [product.id, product.status])),
  );
  return buildResult(
    "leadTime",
    products.length,
    [],
    `Đã cập nhật lead-time cho ${products.length} sản phẩm.`,
  );
}

async function bulkCapabilities(
  products: LoadedProduct[],
  field: ProductBulkCapabilityField,
  value: boolean,
): Promise<ProductBulkResult> {
  await prisma.product.updateMany({
    where: { id: { in: products.map((product) => product.id) } },
    data: { [field]: value },
  });
  await revalidateUpdatedProducts(
    products,
    new Map(products.map((product) => [product.id, product.status])),
  );
  return buildResult(
    "capabilities",
    products.length,
    [],
    `Đã cập nhật ${products.length} sản phẩm.`,
  );
}

export async function performBulkProductOperation(
  input: ProductBulkInput,
): Promise<ProductBulkResult> {
  const ids = validateProductBulkIds(input.productIds);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      productCode: true,
      status: true,
      categoryId: true,
    },
  });

  const byId = new Map(products.map((product) => [product.id, product]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as LoadedProduct[];
  const missingIds = ids.filter((id) => !byId.has(id));
  const missingSkipped: ProductBulkSkippedItem[] = missingIds.map((id) => ({
    id,
    name: "Không tìm thấy",
    productCode: null,
    reason: "Không tìm thấy sản phẩm với ID đã chọn.",
  }));

  if (!ordered.length) {
    throw new ProductAdminValidationError("Không tìm thấy sản phẩm đã chọn.", {
      products: "Không có sản phẩm hợp lệ.",
    });
  }

  let result: ProductBulkResult;
  switch (input.operation) {
    case "archive":
      result = await bulkArchive(ordered);
      break;
    case "status": {
      if (!input.status) {
        throw new ProductAdminValidationError("Trạng thái không hợp lệ.", {
          status: "Thiếu trạng thái sản phẩm.",
        });
      }
      result = await bulkSetStatus(ordered, input.status);
      break;
    }
    case "publish":
      result = await bulkPublish(ordered);
      break;
    case "unpublish":
      result = await bulkUnpublish(ordered);
      break;
    case "moq": {
      if (!input.moq || input.moq.mode !== "set") {
        throw new ProductAdminValidationError("Giá trị nhập không hợp lệ.", {
          moq: "Thiếu giá trị MOQ.",
        });
      }
      result = await bulkMoq(ordered, validateBulkMoqValue(input.moq.value));
      break;
    }
    case "leadTime": {
      if (!input.leadTime || input.leadTime.mode !== "set") {
        throw new ProductAdminValidationError("Giá trị nhập không hợp lệ.", {
          leadTime: "Thiếu lead-time.",
        });
      }
      result = await bulkLeadTime(ordered, validateBulkLeadTimeValue(input.leadTime.value));
      break;
    }
    case "capabilities": {
      if (!input.capabilities) {
        throw new ProductAdminValidationError("Giá trị nhập không hợp lệ.", {
          capabilities: "Thiếu cấu hình tính năng.",
        });
      }
      const field = input.capabilities.field;
      if (
        field !== "supportsPrinting" &&
        field !== "supportsEmbroidery" &&
        field !== "supportsOem"
      ) {
        throw new ProductAdminValidationError("Giá trị nhập không hợp lệ.", {
          capabilities: "Tính năng không hợp lệ.",
        });
      }
      result = await bulkCapabilities(ordered, field, Boolean(input.capabilities.value));
      break;
    }
    default:
      throw new ProductAdminValidationError("Thao tác hàng loạt không hợp lệ.", {
        products: "Thao tác không được hỗ trợ.",
      });
  }

  if (missingSkipped.length) {
    const skipped = [...(result.skipped ?? []), ...missingSkipped];
    return {
      ...result,
      skippedCount: skipped.length,
      failedCount: result.failedCount + missingSkipped.length,
      skipped,
      message: `${result.message} Bỏ qua ${missingSkipped.length} ID không tồn tại.`,
    };
  }

  return result;
}

/** Exported for tests — confirms archive path never touches variants. */
export function productBulkArchiveUpdateData(): { status: "ARCHIVED" } {
  return { status: "ARCHIVED" };
}

/** Exported for tests — confirms bulk paths never mutate codes. */
export function productBulkForbiddenFields(): string[] {
  return ["productCode", "sku", "categoryId"];
}
