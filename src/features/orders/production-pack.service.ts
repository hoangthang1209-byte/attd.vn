import {
  MaterialType,
  Prisma,
  ProductionFileStatus,
  ProductionFileType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteR2Object } from "@/features/storage/r2/r2-production-file.service";
import { deleteStoredMediaObject } from "@/lib/storage";
import {
  computeRequiredQuantity,
  resolveOrderItemTotalQuantity,
} from "@/features/orders/bom-calculations";
import {
  MATERIAL_TYPES,
  PRODUCTION_FILE_TYPES,
} from "@/features/orders/production-pack-labels";
import type {
  DeleteOrderProductionFileResult,
  OrderItemMaterialRecord,
  OrderProductionFileRecord,
} from "@/features/orders/production-pack.types";

export class ProductionPackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionPackValidationError";
  }
}

type Tx = Prisma.TransactionClient;

const PRODUCTION_FILE_MEDIA_SELECT = {
  id: true,
  filename: true,
  originalName: true,
  url: true,
  mimeType: true,
  format: true,
  sizeBytes: true,
  thumbnailUrl: true,
  storageProvider: true,
} as const;

function mapProductionFile(row: {
  id: string;
  orderId: string | null;
  orderItemId: string | null;
  mediaAssetId: string;
  type: ProductionFileType;
  status: ProductionFileStatus;
  version: number;
  title: string | null;
  note: string | null;
  appliesToColorId: string | null;
  appliesToColorName: string | null;
  appliesToSize: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  mediaAsset: {
    id: string;
    filename: string;
    originalName: string | null;
    url: string;
    mimeType: string;
    format: string | null;
    sizeBytes: number;
    thumbnailUrl: string | null;
    storageProvider: string;
  };
}): OrderProductionFileRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    mediaAssetId: row.mediaAssetId,
    type: row.type,
    status: row.status,
    version: row.version,
    title: row.title,
    note: row.note,
    appliesToColorId: row.appliesToColorId,
    appliesToColorName: row.appliesToColorName,
    appliesToSize: row.appliesToSize,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    mediaAsset: row.mediaAsset,
  };
}

function validateFileScope(orderId: string | null | undefined, orderItemId: string | null | undefined) {
  const hasOrder = Boolean(orderId);
  const hasItem = Boolean(orderItemId);
  if (hasOrder === hasItem) {
    throw new ProductionPackValidationError(
      "File phải thuộc đơn hàng hoặc một dòng sản phẩm, không được cả hai hoặc không có.",
    );
  }
}

export async function listOrderProductionFiles(orderId: string): Promise<OrderProductionFileRecord[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, items: { select: { id: true } } },
  });
  if (!order) throw new ProductionPackValidationError("Không tìm thấy đơn hàng.");

  const itemIds = order.items.map((i) => i.id);
  const rows = await prisma.orderProductionFile.findMany({
    where: {
      OR: [{ orderId }, { orderItemId: { in: itemIds } }],
    },
    include: {
      mediaAsset: { select: PRODUCTION_FILE_MEDIA_SELECT },
    },
    orderBy: [{ sortOrder: "asc" }, { version: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapProductionFile);
}

export type CreateProductionFileInput = {
  orderId?: string | null;
  orderItemId?: string | null;
  mediaAssetId: string;
  type: ProductionFileType;
  status?: ProductionFileStatus;
  version?: number;
  title?: string | null;
  note?: string | null;
  appliesToColorId?: string | null;
  appliesToColorName?: string | null;
  appliesToSize?: string | null;
  sortOrder?: number;
  setAsActive?: boolean;
};

export async function createOrderProductionFile(
  orderId: string,
  input: CreateProductionFileInput,
): Promise<OrderProductionFileRecord> {
  validateFileScope(input.orderId ?? null, input.orderItemId ?? null);
  if (!PRODUCTION_FILE_TYPES.includes(input.type)) {
    throw new ProductionPackValidationError("Loại file không hợp lệ.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { id: true } } },
  });
  if (!order) throw new ProductionPackValidationError("Không tìm thấy đơn hàng.");

  if (input.orderId && input.orderId !== orderId) {
    throw new ProductionPackValidationError("File cấp đơn hàng không khớp.");
  }
  if (input.orderItemId) {
    const belongs = order.items.some((i) => i.id === input.orderItemId);
    if (!belongs) throw new ProductionPackValidationError("Dòng sản phẩm không thuộc đơn hàng này.");
  }

  const media = await prisma.mediaAsset.findUnique({ where: { id: input.mediaAssetId } });
  if (!media) throw new ProductionPackValidationError("Không tìm thấy file trong thư viện media.");

  let appliesToColorName = input.appliesToColorName?.trim() || null;
  if (input.appliesToColorId) {
    const color = await prisma.color.findUnique({ where: { id: input.appliesToColorId } });
    if (!color) throw new ProductionPackValidationError("Màu áp dụng không hợp lệ.");
    appliesToColorName = color.name;
  }

  const title = input.title?.trim() || media.filename;
  const setAsActive = input.setAsActive ?? true;

  let archivedIds: string[] = [];
  const created = await prisma.$transaction(async (tx) => {
    if (setAsActive) {
      archivedIds = await archiveOtherActiveVersions(tx, {
        orderId: input.orderId ?? null,
        orderItemId: input.orderItemId ?? null,
        type: input.type,
        title,
        excludeId: null,
      });
    }

    return tx.orderProductionFile.create({
      data: {
        orderId: input.orderId ?? null,
        orderItemId: input.orderItemId ?? null,
        mediaAssetId: input.mediaAssetId,
        type: input.type,
        status: setAsActive ? "ACTIVE" : (input.status ?? "DRAFT"),
        version: input.version ?? 1,
        title,
        note: input.note?.trim() || null,
        appliesToColorId: input.appliesToColorId ?? null,
        appliesToColorName,
        appliesToSize: input.appliesToSize?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
      },
      include: {
        mediaAsset: { select: PRODUCTION_FILE_MEDIA_SELECT },
      },
    });
  });

  if (archivedIds.length > 0) {
    const { invalidateApprovalsForArchivedArtworkFiles } = await import(
      "@/features/item-production-tracking/production-approval.service"
    );
    await invalidateApprovalsForArchivedArtworkFiles(archivedIds);
  }

  return mapProductionFile(created);
}

export type UpdateProductionFileInput = {
  type?: ProductionFileType;
  status?: ProductionFileStatus;
  version?: number;
  title?: string | null;
  note?: string | null;
  appliesToColorId?: string | null;
  appliesToColorName?: string | null;
  appliesToSize?: string | null;
  sortOrder?: number;
  setAsActive?: boolean;
};

async function archiveOtherActiveVersions(
  tx: Tx,
  input: {
    orderId: string | null;
    orderItemId: string | null;
    type: ProductionFileType;
    title: string;
    excludeId: string | null;
  },
): Promise<string[]> {
  const where: Prisma.OrderProductionFileWhereInput = {
    status: "ACTIVE",
    type: input.type,
    title: input.title,
    ...(input.orderId ? { orderId: input.orderId } : { orderItemId: input.orderItemId! }),
    ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
  };
  const toArchive = await tx.orderProductionFile.findMany({
    where,
    select: { id: true },
  });
  if (toArchive.length === 0) return [];
  await tx.orderProductionFile.updateMany({
    where,
    data: { status: "ARCHIVED" },
  });
  return toArchive.map((f) => f.id);
}

export async function updateOrderProductionFile(
  orderId: string,
  fileId: string,
  input: UpdateProductionFileInput,
): Promise<OrderProductionFileRecord> {
  const existing = await prisma.orderProductionFile.findUnique({
    where: { id: fileId },
    include: { orderItem: { select: { orderId: true } } },
  });
  if (!existing) throw new ProductionPackValidationError("Không tìm thấy file sản xuất.");
  const belongsToOrder =
    existing.orderId === orderId ||
    (existing.orderItemId && existing.orderItem?.orderId === orderId);
  if (!belongsToOrder) throw new ProductionPackValidationError("Tài liệu không thuộc đơn hàng này.");

  if (input.type && !PRODUCTION_FILE_TYPES.includes(input.type)) {
    throw new ProductionPackValidationError("Loại file không hợp lệ.");
  }

  let appliesToColorName = input.appliesToColorName?.trim() ?? existing.appliesToColorName;
  let appliesToColorId = input.appliesToColorId ?? existing.appliesToColorId;
  if (input.appliesToColorId !== undefined) {
    if (input.appliesToColorId) {
      const color = await prisma.color.findUnique({ where: { id: input.appliesToColorId } });
      if (!color) throw new ProductionPackValidationError("Màu áp dụng không hợp lệ.");
      appliesToColorName = color.name;
      appliesToColorId = color.id;
    } else {
      appliesToColorName = null;
      appliesToColorId = null;
    }
  }

  const title = input.title !== undefined ? (input.title?.trim() || existing.title) : existing.title;
  const type = input.type ?? existing.type;

  let archivedIds: string[] = [];
  const updated = await prisma.$transaction(async (tx) => {
    if (input.setAsActive) {
      archivedIds = await archiveOtherActiveVersions(tx, {
        orderId: existing.orderId,
        orderItemId: existing.orderItemId,
        type,
        title: title ?? "",
        excludeId: fileId,
      });
    }

    return tx.orderProductionFile.update({
      where: { id: fileId },
      data: {
        ...(input.type ? { type: input.type } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.setAsActive ? { status: "ACTIVE" } : {}),
        ...(input.version !== undefined ? { version: input.version } : {}),
        ...(input.title !== undefined ? { title: title } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        appliesToColorId,
        appliesToColorName,
        ...(input.appliesToSize !== undefined
          ? { appliesToSize: input.appliesToSize?.trim() || null }
          : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      include: {
        mediaAsset: { select: PRODUCTION_FILE_MEDIA_SELECT },
      },
    });
  });

  if (archivedIds.length > 0) {
    const { invalidateApprovalsForArchivedArtworkFiles } = await import(
      "@/features/item-production-tracking/production-approval.service"
    );
    await invalidateApprovalsForArchivedArtworkFiles(archivedIds);
  }

  return mapProductionFile(updated);
}

function assertProductionFileBelongsToOrder(
  orderId: string,
  existing: {
    orderId: string | null;
    orderItemId: string | null;
    orderItem: { orderId: string } | null;
  },
): void {
  const belongsToOrder =
    existing.orderId === orderId ||
    (existing.orderItemId && existing.orderItem?.orderId === orderId);
  if (!belongsToOrder) {
    throw new ProductionPackValidationError("Tài liệu không thuộc đơn hàng này.");
  }
}

async function countMediaAssetBusinessReferences(tx: Tx, mediaAssetId: string): Promise<number> {
  const [
    productionFiles,
    qcEvidence,
    deliveryProofs,
    quoteItems,
    orderItems,
    salesReps,
    pathways,
    homepageOem,
    homepageWorkshop,
  ] = await Promise.all([
    tx.orderProductionFile.count({ where: { mediaAssetId } }),
    tx.orderQcEvidence.count({ where: { mediaAssetId } }),
    tx.orderDeliveryProof.count({ where: { mediaAssetId } }),
    tx.quoteItem.count({ where: { designMediaAssetId: mediaAssetId } }),
    tx.orderItem.count({ where: { designMediaAssetId: mediaAssetId } }),
    tx.salesRepresentative.count({ where: { avatarMediaAssetId: mediaAssetId } }),
    tx.homepageSourcingPathway.count({ where: { mediaAssetId } }),
    tx.homepageSettings.count({ where: { oemMediaAssetId: mediaAssetId } }),
    tx.homepageWorkshopMedia.count({ where: { mediaAssetId } }),
  ]);

  return (
    productionFiles +
    qcEvidence +
    deliveryProofs +
    quoteItems +
    orderItems +
    salesReps +
    pathways +
    homepageOem +
    homepageWorkshop
  );
}

async function deleteMediaAssetStorageObject(asset: {
  storageProvider: string;
  storageKey: string;
  url: string;
}): Promise<void> {
  try {
    if (asset.storageProvider === "CLOUDFLARE_R2") {
      await deleteR2Object(asset.storageKey);
      return;
    }
    await deleteStoredMediaObject(asset.url, asset.storageKey, asset.storageProvider);
  } catch (err) {
    console.warn(
      "[deleteOrderProductionFile] Storage object cleanup failed after relation removal:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function archiveOrderProductionFile(
  orderId: string,
  fileId: string,
): Promise<OrderProductionFileRecord> {
  return updateOrderProductionFile(orderId, fileId, { status: "ARCHIVED" });
}

export async function deleteOrderProductionFile(
  orderId: string,
  fileId: string,
): Promise<DeleteOrderProductionFileResult> {
  const existing = await prisma.orderProductionFile.findUnique({
    where: { id: fileId },
    include: {
      orderItem: { select: { orderId: true } },
      mediaAsset: true,
    },
  });
  if (!existing) throw new ProductionPackValidationError("Không tìm thấy file sản xuất.");
  assertProductionFileBelongsToOrder(orderId, existing);

  const mediaAssetId = existing.mediaAssetId;
  const assetSnapshot = existing.mediaAsset;

  const removedRelationOnly = await prisma.$transaction(async (tx) => {
    await tx.orderProductionFile.delete({ where: { id: fileId } });

    const remainingRefs = await countMediaAssetBusinessReferences(tx, mediaAssetId);
    if (remainingRefs > 0) {
      return true;
    }

    await tx.mediaAsset.delete({ where: { id: mediaAssetId } });
    return false;
  });

  if (!removedRelationOnly) {
    await deleteMediaAssetStorageObject(assetSnapshot);
  }

  return { fileId, removedRelationOnly };
}

// --- BOM ---

function mapOrderMaterial(row: {
  id: string;
  orderItemId: string;
  sourceProductMaterialRequirementId: string | null;
  materialId: string | null;
  materialType: MaterialType;
  materialName: string;
  materialCode: string | null;
  materialCodeSnapshot: string | null;
  materialNameSnapshot: string | null;
  unitSnapshot: string | null;
  unit: string;
  consumptionPerUnit: Prisma.Decimal;
  wastagePercent: Prisma.Decimal;
  requiredQuantity: Prisma.Decimal;
  requiredQuantityOverridden: boolean;
  note: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): OrderItemMaterialRecord {
  return {
    id: row.id,
    orderItemId: row.orderItemId,
    sourceProductMaterialRequirementId: row.sourceProductMaterialRequirementId,
    materialId: row.materialId,
    materialType: row.materialType,
    materialName: row.materialName,
    materialCode: row.materialCode,
    materialCodeSnapshot: row.materialCodeSnapshot,
    materialNameSnapshot: row.materialNameSnapshot,
    unitSnapshot: row.unitSnapshot,
    unit: row.unit,
    consumptionPerUnit: row.consumptionPerUnit.toFixed(),
    wastagePercent: row.wastagePercent.toFixed(),
    requiredQuantity: row.requiredQuantity.toFixed(),
    requiredQuantityOverridden: row.requiredQuantityOverridden,
    note: row.note,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listOrderMaterials(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
          materialRequirements: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!order) throw new ProductionPackValidationError("Không tìm thấy đơn hàng.");

  const items = order.items.map((item) => ({
    orderItemId: item.id,
    productNameSnapshot: item.productNameSnapshot,
    variantNameSnapshot: item.variantNameSnapshot,
    totalQuantity: resolveOrderItemTotalQuantity(item),
    materials: item.materialRequirements.map(mapOrderMaterial),
  }));

  const flatRows = order.items.flatMap((item) =>
    item.materialRequirements.map((m) => ({
      materialType: m.materialType,
      materialName: m.materialName,
      materialCode: m.materialCode,
      unit: m.unit,
      requiredQuantity: m.requiredQuantity,
      note: m.note,
    })),
  );

  const { aggregateOrderMaterials } = await import("@/features/orders/bom-calculations");
  const summary = aggregateOrderMaterials(flatRows);

  return { items, summary };
}

export async function copyProductBomToOrderItems(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { variants: true },
  });

  for (const item of items) {
    if (!item.productId) continue;
    const totalQty = resolveOrderItemTotalQuantity(item);
    await copyProductBomToOrderItem(tx, {
      orderItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      totalQuantity: totalQty,
      replaceExisting: true,
    });
  }
}

export async function copyProductBomToOrderItem(
  tx: Tx,
  input: {
    orderItemId: string;
    productId: string;
    variantId: string | null;
    totalQuantity: number;
    replaceExisting?: boolean;
  },
) {
  if (input.replaceExisting) {
    await tx.orderItemMaterialRequirement.deleteMany({
      where: { orderItemId: input.orderItemId },
    });
  }

  const productRows = await tx.productMaterialRequirement.findMany({
    where: {
      productId: input.productId,
      isActive: true,
      OR: [{ variantId: null }, ...(input.variantId ? [{ variantId: input.variantId }] : [])],
    },
    orderBy: { sortOrder: "asc" },
  });

  if (!productRows.length) return;

  await tx.orderItemMaterialRequirement.createMany({
    data: productRows.map((row, index) => ({
      orderItemId: input.orderItemId,
      sourceProductMaterialRequirementId: row.id,
      materialId: row.materialId,
      materialType: row.materialType,
      materialName: row.materialNameSnapshot ?? row.materialName,
      materialCode: row.materialCodeSnapshot ?? row.materialCode,
      materialCodeSnapshot: row.materialCodeSnapshot ?? row.materialCode,
      materialNameSnapshot: row.materialNameSnapshot ?? row.materialName,
      unitSnapshot: row.unitSnapshot ?? row.unit,
      unit: row.unitSnapshot ?? row.unit,
      consumptionPerUnit: row.consumptionPerUnit,
      wastagePercent: row.wastagePercent,
      requiredQuantity: computeRequiredQuantity(
        input.totalQuantity,
        row.consumptionPerUnit,
        row.wastagePercent,
      ),
      sortOrder: row.sortOrder ?? index,
      note: row.note,
    })),
  });
}

export async function recalculateOrderItemMaterials(orderItemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { materialRequirements: true, variants: true },
  });
  if (!item) return;

  const totalQty = resolveOrderItemTotalQuantity(item);
  for (const row of item.materialRequirements) {
    if (row.requiredQuantityOverridden) continue;
    const requiredQuantity = computeRequiredQuantity(
      totalQty,
      row.consumptionPerUnit,
      row.wastagePercent,
    );
    await prisma.orderItemMaterialRequirement.update({
      where: { id: row.id },
      data: { requiredQuantity },
    });
  }
}

export type CreateOrderMaterialInput = {
  orderItemId: string;
  materialType: MaterialType;
  materialName: string;
  materialCode?: string | null;
  unit: string;
  consumptionPerUnit: number | string;
  wastagePercent?: number | string;
  requiredQuantity?: number | string | null;
  note?: string | null;
  sortOrder?: number;
};

export async function createOrderMaterial(orderId: string, input: CreateOrderMaterialInput) {
  if (!MATERIAL_TYPES.includes(input.materialType)) {
    throw new ProductionPackValidationError("Loại nguyên phụ liệu không hợp lệ.");
  }
  const name = input.materialName?.trim();
  const unit = input.unit?.trim();
  if (!name) throw new ProductionPackValidationError("Tên nguyên phụ liệu là bắt buộc.");
  if (!unit) throw new ProductionPackValidationError("Đơn vị là bắt buộc.");

  const consumption = new Prisma.Decimal(input.consumptionPerUnit);
  if (consumption.lt(0)) {
    throw new ProductionPackValidationError("Định mức phải lớn hơn hoặc bằng 0.");
  }
  const wastage = new Prisma.Decimal(input.wastagePercent ?? 0);
  if (wastage.lt(0) || wastage.gt(100)) {
    throw new ProductionPackValidationError("Hao hụt phải từ 0 đến 100%.");
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: input.orderItemId },
    include: { variants: true },
  });
  if (!item || item.orderId !== orderId) {
    throw new ProductionPackValidationError("Dòng sản phẩm không thuộc đơn hàng này.");
  }

  const totalQty = resolveOrderItemTotalQuantity(item);
  const overridden = input.requiredQuantity != null && input.requiredQuantity !== "";
  const requiredQuantity = overridden
    ? new Prisma.Decimal(input.requiredQuantity!)
    : computeRequiredQuantity(totalQty, consumption, wastage);

  const row = await prisma.orderItemMaterialRequirement.create({
    data: {
      orderItemId: input.orderItemId,
      materialType: input.materialType,
      materialName: name,
      materialCode: input.materialCode?.trim() || null,
      unit,
      consumptionPerUnit: consumption,
      wastagePercent: wastage,
      requiredQuantity,
      requiredQuantityOverridden: overridden,
      note: input.note?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return mapOrderMaterial(row);
}

export type UpdateOrderMaterialInput = Partial<
  Omit<CreateOrderMaterialInput, "orderItemId">
> & {
  requiredQuantityOverridden?: boolean;
};

export async function updateOrderMaterial(
  orderId: string,
  materialId: string,
  input: UpdateOrderMaterialInput,
) {
  const existing = await prisma.orderItemMaterialRequirement.findUnique({
    where: { id: materialId },
    include: { orderItem: { include: { variants: true } } },
  });
  if (!existing || existing.orderItem.orderId !== orderId) {
    throw new ProductionPackValidationError("Không tìm thấy dòng nguyên phụ liệu.");
  }

  const consumption =
    input.consumptionPerUnit !== undefined
      ? new Prisma.Decimal(input.consumptionPerUnit)
      : existing.consumptionPerUnit;
  if (consumption.lt(0)) {
    throw new ProductionPackValidationError("Định mức phải lớn hơn hoặc bằng 0.");
  }
  const wastage =
    input.wastagePercent !== undefined
      ? new Prisma.Decimal(input.wastagePercent)
      : existing.wastagePercent;
  if (wastage.lt(0) || wastage.gt(100)) {
    throw new ProductionPackValidationError("Hao hụt phải từ 0 đến 100%.");
  }

  const totalQty = resolveOrderItemTotalQuantity(existing.orderItem);
  let requiredQuantity = existing.requiredQuantity;
  let overridden = existing.requiredQuantityOverridden;

  if (input.requiredQuantityOverridden === false) {
    overridden = false;
    requiredQuantity = computeRequiredQuantity(totalQty, consumption, wastage);
  } else if (input.requiredQuantity != null && input.requiredQuantity !== "") {
    overridden = true;
    requiredQuantity = new Prisma.Decimal(input.requiredQuantity);
  } else if (!overridden && (input.consumptionPerUnit !== undefined || input.wastagePercent !== undefined)) {
    requiredQuantity = computeRequiredQuantity(totalQty, consumption, wastage);
  }

  const row = await prisma.orderItemMaterialRequirement.update({
    where: { id: materialId },
    data: {
      ...(input.materialType ? { materialType: input.materialType } : {}),
      ...(input.materialName !== undefined
        ? { materialName: input.materialName.trim() || existing.materialName }
        : {}),
      ...(input.materialCode !== undefined
        ? { materialCode: input.materialCode?.trim() || null }
        : {}),
      ...(input.unit !== undefined ? { unit: input.unit.trim() || existing.unit } : {}),
      consumptionPerUnit: consumption,
      wastagePercent: wastage,
      requiredQuantity,
      requiredQuantityOverridden: overridden,
      ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  return mapOrderMaterial(row);
}

export async function deleteOrderMaterial(orderId: string, materialId: string) {
  const existing = await prisma.orderItemMaterialRequirement.findUnique({
    where: { id: materialId },
    include: { orderItem: { select: { orderId: true } } },
  });
  if (!existing || existing.orderItem.orderId !== orderId) {
    throw new ProductionPackValidationError("Không tìm thấy dòng nguyên phụ liệu.");
  }
  await prisma.orderItemMaterialRequirement.delete({ where: { id: materialId } });
}

export async function syncOrderMaterialsAfterItemsChange(orderId: string) {
  await prisma.$transaction(async (tx) => {
    await copyProductBomToOrderItems(tx, orderId);
  });
}
