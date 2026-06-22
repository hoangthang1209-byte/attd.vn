import type { Prisma, StockStatus, VariantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import {
  formatVariantDependencyMessage,
  getVariantDependencySummary,
  hasProtectedVariantDependencies,
} from "@/features/products/product-variant-lifecycle.service";
import { ensureUniqueSku, isSkuTaken } from "@/features/products/product-sku-utils";

export type BulkOperationType =
  | "archive"
  | "restore"
  | "delete"
  | "status"
  | "stock"
  | "moq"
  | "leadTime"
  | "sku"
  | "image";

export type BulkVariantRecord = {
  id: string;
  sku: string;
  displayLabel: string | null;
  variantStatus: VariantStatus;
  stockQty: number;
  stockStatus: StockStatus;
  moqOverride: number | null;
  leadTimeOverride: string | null;
  imageUrl: string | null;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
  dimensions: string | null;
  capacity: string | null;
  optionValueIds: string[];
};

export type BulkBlockedItem = {
  id: string;
  sku: string;
  displayLabel: string | null;
  reason: string;
};

export type BulkVariantResult = {
  operation: BulkOperationType;
  successCount: number;
  skippedCount: number;
  blockedCount: number;
  deletedIds: string[];
  message: string;
  variants: BulkVariantRecord[];
  blocked?: BulkBlockedItem[];
  skuPreview?: Array<{ id: string; currentSku: string; nextSku: string }>;
  previewOnly?: boolean;
};

const VARIANT_SELECT = {
  id: true,
  sku: true,
  displayLabel: true,
  variantStatus: true,
  stockQty: true,
  stockStatus: true,
  moqOverride: true,
  leadTimeOverride: true,
  imageUrl: true,
  colorName: true,
  colorCode: true,
  sizeName: true,
  dimensions: true,
  capacity: true,
  optionValues: { select: { optionValueId: true } },
} satisfies Prisma.ProductVariantSelect;

type DbVariant = Prisma.ProductVariantGetPayload<{ select: typeof VARIANT_SELECT }>;

function mapVariantRecord(variant: DbVariant): BulkVariantRecord {
  return {
    id: variant.id,
    sku: variant.sku,
    displayLabel: variant.displayLabel,
    variantStatus: variant.variantStatus,
    stockQty: variant.stockQty,
    stockStatus: variant.stockStatus,
    moqOverride: variant.moqOverride,
    leadTimeOverride: variant.leadTimeOverride,
    imageUrl: variant.imageUrl,
    colorName: variant.colorName,
    colorCode: variant.colorCode,
    sizeName: variant.sizeName,
    dimensions: variant.dimensions,
    capacity: variant.capacity,
    optionValueIds: variant.optionValues.map((link) => link.optionValueId),
  };
}

function dedupeIds(variantIds: string[]): string[] {
  return [...new Set(variantIds.map((id) => id.trim()).filter(Boolean))];
}

async function loadVariantsForProduct(
  productId: string,
  variantIds: string[],
): Promise<DbVariant[]> {
  const ids = dedupeIds(variantIds);
  if (!ids.length) {
    throw new ProductAdminValidationError(
      "Vui lòng chọn ít nhất một biến thể.",
      { variants: "Danh sách biến thể trống." },
    );
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId, id: { in: ids } },
    select: VARIANT_SELECT,
    orderBy: { createdAt: "asc" },
  });

  if (variants.length !== ids.length) {
    throw new ProductAdminValidationError(
      "Một hoặc nhiều biến thể không thuộc sản phẩm này.",
      { variants: "Biến thể không thuộc sản phẩm này." },
    );
  }

  return variants;
}

async function reloadVariants(productId: string, variantIds: string[]): Promise<DbVariant[]> {
  return prisma.productVariant.findMany({
    where: { productId, id: { in: variantIds } },
    select: VARIANT_SELECT,
    orderBy: { createdAt: "asc" },
  });
}

function padNumber(value: number, padding: number): string {
  const safePadding = Math.max(1, Math.min(6, padding));
  return String(value).padStart(safePadding, "0");
}

function buildAffixedSku(currentSku: string, prefix: string, suffix: string): string {
  return `${prefix}${currentSku}${suffix}`.trim();
}

async function validateSkuAssignments(
  assignments: Array<{ id: string; nextSku: string }>,
): Promise<void> {
  const seen = new Set<string>();
  for (const item of assignments) {
    const sku = item.nextSku.trim();
    if (!sku) {
      throw new ProductAdminValidationError(
        "SKU không được để trống.",
        { variants: "SKU không hợp lệ." },
      );
    }
    if (seen.has(sku)) {
      throw new ProductAdminValidationError(
        `SKU "${sku}" bị trùng trong danh sách cập nhật.`,
        { variants: "SKU bị trùng." },
      );
    }
    seen.add(sku);
  }

  for (const item of assignments) {
    const taken = await isSkuTaken(item.nextSku.trim(), item.id);
    if (taken) {
      throw new ProductAdminValidationError(
        `SKU "${item.nextSku.trim()}" đã tồn tại.`,
        { variants: `SKU "${item.nextSku.trim()}" đã tồn tại.` },
      );
    }
  }
}

export type BulkVariantInput = {
  operation: BulkOperationType;
  variantIds: string[];
  previewOnly?: boolean;
  confirmOverwriteSku?: boolean;
  status?: VariantStatus;
  stock?: {
    mode: "set" | "increase" | "decrease";
    quantity: number;
    stockStatus?: StockStatus;
  };
  moq?: {
    mode: "set" | "clear";
    value?: number | null;
  };
  leadTime?: {
    mode: "set" | "clear";
    value?: string | null;
  };
  sku?: {
    mode: "affix" | "sequential";
    prefix?: string;
    suffix?: string;
    startNumber?: number;
    padding?: number;
    overwrite?: boolean;
  };
  image?: {
    mode: "set" | "clear";
    imageUrl?: string | null;
  };
};

export async function performBulkVariantOperation(
  productId: string,
  input: BulkVariantInput,
): Promise<BulkVariantResult> {
  const variants = await loadVariantsForProduct(productId, input.variantIds);

  switch (input.operation) {
    case "archive":
      return bulkArchive(productId, variants);
    case "restore":
      return bulkRestore(productId, variants);
    case "delete":
      return bulkDelete(productId, variants);
    case "status":
      return bulkStatus(productId, variants, input.status);
    case "stock":
      return bulkStock(productId, variants, input.stock, input.previewOnly);
    case "moq":
      return bulkMoq(productId, variants, input.moq);
    case "leadTime":
      return bulkLeadTime(productId, variants, input.leadTime);
    case "sku":
      return bulkSku(productId, variants, input.sku, input.previewOnly, input.confirmOverwriteSku);
    case "image":
      return bulkImage(productId, variants, input.image);
    default:
      throw new ProductAdminValidationError(
        "Thao tác hàng loạt không hợp lệ.",
        { variants: "Thao tác không được hỗ trợ." },
      );
  }
}

async function bulkArchive(
  productId: string,
  variants: DbVariant[],
): Promise<BulkVariantResult> {
  const toArchive = variants.filter((v) => v.variantStatus === "ACTIVE");
  const skipped = variants.length - toArchive.length;

  if (!toArchive.length) {
    return {
      operation: "archive",
      successCount: 0,
      skippedCount: skipped,
      blockedCount: 0,
      deletedIds: [],
      message: "Không có biến thể đang bán để ngừng sử dụng.",
      variants: variants.map(mapVariantRecord),
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.updateMany({
      where: { productId, id: { in: toArchive.map((v) => v.id) } },
      data: { variantStatus: "INACTIVE" },
    });
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "archive",
    successCount: toArchive.length,
    skippedCount: skipped,
    blockedCount: 0,
    deletedIds: [],
    message: `Đã ngừng sử dụng ${toArchive.length} biến thể.`,
    variants: updated.map(mapVariantRecord),
  };
}

async function bulkRestore(
  productId: string,
  variants: DbVariant[],
): Promise<BulkVariantResult> {
  const toRestore = variants.filter(
    (v) => v.variantStatus === "INACTIVE" || v.variantStatus === "ARCHIVED",
  );
  const skipped = variants.length - toRestore.length;

  if (!toRestore.length) {
    return {
      operation: "restore",
      successCount: 0,
      skippedCount: skipped,
      blockedCount: 0,
      deletedIds: [],
      message: "Không có biến thể ngừng sử dụng để kích hoạt lại.",
      variants: variants.map(mapVariantRecord),
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.updateMany({
      where: { productId, id: { in: toRestore.map((v) => v.id) } },
      data: { variantStatus: "ACTIVE" },
    });
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "restore",
    successCount: toRestore.length,
    skippedCount: skipped,
    blockedCount: 0,
    deletedIds: [],
    message: `Đã kích hoạt lại ${toRestore.length} biến thể.`,
    variants: updated.map(mapVariantRecord),
  };
}

async function bulkDelete(
  productId: string,
  variants: DbVariant[],
): Promise<BulkVariantResult> {
  const blocked: BulkBlockedItem[] = [];
  for (const variant of variants) {
    const dependencies = await getVariantDependencySummary(variant.id);
    if (hasProtectedVariantDependencies(dependencies)) {
      blocked.push({
        id: variant.id,
        sku: variant.sku,
        displayLabel: variant.displayLabel,
        reason: formatVariantDependencyMessage(dependencies) ?? "Có liên kết nghiệp vụ.",
      });
    }
  }

  if (blocked.length) {
    throw new ProductAdminValidationError(
      "Không thể xóa vĩnh viễn biến thể vì đã được sử dụng trong dữ liệu nghiệp vụ.",
      { variants: `${blocked.length} biến thể bị chặn xóa.` },
      `Có ${blocked.length}/${variants.length} biến thể không thể xóa vĩnh viễn.`,
    );
  }

  const ids = variants.map((v) => v.id);
  await prisma.$transaction(async (tx) => {
    await tx.productVariantOptionValue.deleteMany({ where: { variantId: { in: ids } } });
    await tx.productVariant.deleteMany({ where: { productId, id: { in: ids } } });
  });

  return {
    operation: "delete",
    successCount: ids.length,
    skippedCount: 0,
    blockedCount: 0,
    deletedIds: ids,
    message: `Đã xóa ${ids.length} biến thể.`,
    variants: [],
    blocked,
  };
}

async function bulkStatus(
  productId: string,
  variants: DbVariant[],
  status?: VariantStatus,
): Promise<BulkVariantResult> {
  if (!status || !["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
    throw new ProductAdminValidationError(
      "Trạng thái biến thể không hợp lệ.",
      { variants: "Trạng thái không hợp lệ." },
    );
  }

  if (status === "INACTIVE") {
    return bulkArchive(productId, variants);
  }
  if (status === "ACTIVE") {
    return bulkRestore(productId, variants);
  }

  const toUpdate = variants.filter((v) => v.variantStatus !== status);
  await prisma.$transaction(async (tx) => {
    await tx.productVariant.updateMany({
      where: { productId, id: { in: toUpdate.map((v) => v.id) } },
      data: { variantStatus: status },
    });
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "status",
    successCount: toUpdate.length,
    skippedCount: variants.length - toUpdate.length,
    blockedCount: 0,
    deletedIds: [],
    message: `Đã cập nhật trạng thái cho ${toUpdate.length} biến thể.`,
    variants: updated.map(mapVariantRecord),
  };
}

async function bulkStock(
  productId: string,
  variants: DbVariant[],
  stock?: BulkVariantInput["stock"],
  previewOnly?: boolean,
): Promise<BulkVariantResult> {
  if (!stock) {
    throw new ProductAdminValidationError(
      "Thiếu dữ liệu cập nhật tồn kho.",
      { variants: "Dữ liệu tồn kho không hợp lệ." },
    );
  }

  if (!Number.isFinite(stock.quantity) || stock.quantity < 0) {
    throw new ProductAdminValidationError(
      "Số lượng tồn kho phải là số không âm.",
      { variants: "Số lượng không hợp lệ." },
    );
  }

  const updates = variants.map((variant) => {
    let nextQty = variant.stockQty;
    if (stock.mode === "set") nextQty = Math.floor(stock.quantity);
    if (stock.mode === "increase") nextQty = variant.stockQty + Math.floor(stock.quantity);
    if (stock.mode === "decrease") nextQty = Math.max(0, variant.stockQty - Math.floor(stock.quantity));
    return {
      id: variant.id,
      stockQty: nextQty,
      stockStatus: stock.stockStatus ?? variant.stockStatus,
    };
  });

  if (previewOnly) {
    return {
      operation: "stock",
      successCount: 0,
      skippedCount: 0,
      blockedCount: 0,
      deletedIds: [],
      message: "Xem trước cập nhật tồn kho.",
      variants: variants.map(mapVariantRecord),
      previewOnly: true,
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      await tx.productVariant.update({
        where: { id: item.id },
        data: {
          stockQty: item.stockQty,
          ...(stock.stockStatus ? { stockStatus: stock.stockStatus } : {}),
        },
      });
    }
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "stock",
    successCount: updates.length,
    skippedCount: 0,
    blockedCount: 0,
    deletedIds: [],
    message: `Đã cập nhật tồn kho cho ${updates.length} biến thể.`,
    variants: updated.map(mapVariantRecord),
  };
}

async function bulkMoq(
  productId: string,
  variants: DbVariant[],
  moq?: BulkVariantInput["moq"],
): Promise<BulkVariantResult> {
  if (!moq) {
    throw new ProductAdminValidationError(
      "Thiếu dữ liệu cập nhật MOQ.",
      { variants: "Dữ liệu MOQ không hợp lệ." },
    );
  }

  if (moq.mode === "set") {
    if (moq.value == null || !Number.isInteger(moq.value) || moq.value < 1) {
      throw new ProductAdminValidationError(
        "MOQ phải là số nguyên dương.",
        { variants: "MOQ không hợp lệ." },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const variant of variants) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          moqOverride: moq.mode === "clear" ? null : moq.value ?? null,
        },
      });
    }
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "moq",
    successCount: variants.length,
    skippedCount: 0,
    blockedCount: 0,
    deletedIds: [],
    message:
      moq.mode === "clear"
        ? `Đã xóa MOQ riêng cho ${variants.length} biến thể.`
        : `Đã cập nhật MOQ cho ${variants.length} biến thể.`,
    variants: updated.map(mapVariantRecord),
  };
}

async function bulkLeadTime(
  productId: string,
  variants: DbVariant[],
  leadTime?: BulkVariantInput["leadTime"],
): Promise<BulkVariantResult> {
  if (!leadTime) {
    throw new ProductAdminValidationError(
      "Thiếu dữ liệu cập nhật thời gian sản xuất.",
      { variants: "Dữ liệu lead time không hợp lệ." },
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const variant of variants) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          leadTimeOverride:
            leadTime.mode === "clear"
              ? null
              : leadTime.value?.trim() || null,
        },
      });
    }
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "leadTime",
    successCount: variants.length,
    skippedCount: 0,
    blockedCount: 0,
    deletedIds: [],
    message:
      leadTime.mode === "clear"
        ? `Đã xóa thời gian sản xuất riêng cho ${variants.length} biến thể.`
        : `Đã cập nhật thời gian sản xuất cho ${variants.length} biến thể.`,
    variants: updated.map(mapVariantRecord),
  };
}

async function bulkSku(
  productId: string,
  variants: DbVariant[],
  skuInput?: BulkVariantInput["sku"],
  previewOnly?: boolean,
  confirmOverwriteSku?: boolean,
): Promise<BulkVariantResult> {
  if (!skuInput) {
    throw new ProductAdminValidationError(
      "Thiếu dữ liệu cập nhật SKU.",
      { variants: "Dữ liệu SKU không hợp lệ." },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { productCode: true },
  });
  if (!product?.productCode) {
    throw new ProductAdminValidationError(
      "Sản phẩm chưa có mã sản phẩm.",
      { productCode: "Thiếu mã sản phẩm." },
    );
  }

  const prefix = skuInput.prefix?.trim() ?? "";
  const suffix = skuInput.suffix?.trim() ?? "";
  const assignments: Array<{ id: string; currentSku: string; nextSku: string }> = [];

  if (skuInput.mode === "affix") {
    if (!prefix && !suffix) {
      throw new ProductAdminValidationError(
        "Nhập tiền tố hoặc hậu tố SKU.",
        { variants: "Thiếu tiền tố/hậu tố." },
      );
    }
    for (const variant of variants) {
      assignments.push({
        id: variant.id,
        currentSku: variant.sku,
        nextSku: buildAffixedSku(variant.sku, prefix, suffix),
      });
    }
  } else {
    const start = Math.max(1, skuInput.startNumber ?? 1);
    const padding = skuInput.padding ?? 2;
    let counter = start;
    for (const variant of variants) {
      const base = `${product.productCode}-${padNumber(counter, padding)}`;
      const unique = await ensureUniqueSku(base);
      assignments.push({
        id: variant.id,
        currentSku: variant.sku,
        nextSku: unique,
      });
      counter += 1;
    }
  }

  const existingSkuCount = variants.filter((v) => v.sku.trim()).length;
  const willOverwrite = assignments.filter((item) => item.currentSku !== item.nextSku).length;
  if (willOverwrite > 0 && !confirmOverwriteSku && !previewOnly) {
    throw new ProductAdminValidationError(
      `Cần xác nhận vì sẽ ghi đè ${willOverwrite} SKU hiện có (${existingSkuCount} biến thể có SKU).`,
      { variants: "Vui lòng xác nhận ghi đè SKU." },
    );
  }

  if (previewOnly) {
    return {
      operation: "sku",
      successCount: 0,
      skippedCount: 0,
      blockedCount: 0,
      deletedIds: [],
      message: "Xem trước SKU.",
      variants: variants.map(mapVariantRecord),
      skuPreview: assignments.slice(0, 12),
      previewOnly: true,
    };
  }

  await validateSkuAssignments(
    assignments.map((item) => ({ id: item.id, nextSku: item.nextSku })),
  );

  await prisma.$transaction(async (tx) => {
    for (const item of assignments) {
      if (item.currentSku === item.nextSku) continue;
      await tx.productVariant.update({
        where: { id: item.id },
        data: { sku: item.nextSku },
      });
    }
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "sku",
    successCount: assignments.filter((a) => a.currentSku !== a.nextSku).length,
    skippedCount: assignments.length - assignments.filter((a) => a.currentSku !== a.nextSku).length,
    blockedCount: 0,
    deletedIds: [],
    message: `Đã cập nhật SKU cho ${assignments.filter((a) => a.currentSku !== a.nextSku).length} biến thể.`,
    variants: updated.map(mapVariantRecord),
    skuPreview: assignments.slice(0, 12),
  };
}

async function bulkImage(
  productId: string,
  variants: DbVariant[],
  image?: BulkVariantInput["image"],
): Promise<BulkVariantResult> {
  if (!image) {
    throw new ProductAdminValidationError(
      "Thiếu dữ liệu cập nhật ảnh.",
      { variants: "Dữ liệu ảnh không hợp lệ." },
    );
  }

  if (image.mode === "set") {
    const url = image.imageUrl?.trim();
    if (!url || !/^https?:\/\/.+/i.test(url)) {
      throw new ProductAdminValidationError(
        "URL ảnh không hợp lệ.",
        { variants: "URL ảnh không hợp lệ." },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const variant of variants) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          imageUrl: image.mode === "clear" ? null : image.imageUrl?.trim() || null,
        },
      });
    }
  });

  const updated = await reloadVariants(productId, variants.map((v) => v.id));
  return {
    operation: "image",
    successCount: variants.length,
    skippedCount: 0,
    blockedCount: 0,
    deletedIds: [],
    message:
      image.mode === "clear"
        ? `Đã xóa ảnh riêng cho ${variants.length} biến thể.`
        : `Đã gán ảnh cho ${variants.length} biến thể.`,
    variants: updated.map(mapVariantRecord),
  };
}

export async function preflightBulkDelete(
  productId: string,
  variantIds: string[],
): Promise<{ canDeleteAll: boolean; blocked: BulkBlockedItem[] }> {
  const variants = await loadVariantsForProduct(productId, variantIds);
  const blocked: BulkBlockedItem[] = [];
  for (const variant of variants) {
    const dependencies = await getVariantDependencySummary(variant.id);
    if (hasProtectedVariantDependencies(dependencies)) {
      blocked.push({
        id: variant.id,
        sku: variant.sku,
        displayLabel: variant.displayLabel,
        reason: formatVariantDependencyMessage(dependencies) ?? "Có liên kết nghiệp vụ.",
      });
    }
  }
  return { canDeleteAll: blocked.length === 0, blocked };
}
