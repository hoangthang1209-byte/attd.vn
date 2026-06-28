import {
  Prisma,
  TechPackAssetType,
  TechPackAssetFileType,
  TechPackStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateTechPackCode } from "@/features/tech-pack/tech-pack-code";
import type { TechPackItemLink, TechPackSourceItem } from "@/features/tech-pack/tech-pack.types";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
import {
  buildReleaseSnapshot,
  getTechPackReleaseReadiness,
  logTechPackReleaseEvent,
} from "@/features/tech-pack/tech-pack-release.service";
import { TechPackReleaseAction } from "@prisma/client";
import {
  buildTechPackDiff,
  type TechPackDiffResult,
  type TechPackDiffSnapshot,
} from "@/features/tech-pack/tech-pack-diff";

export type { TechPackItemLink, TechPackSourceItem } from "@/features/tech-pack/tech-pack.types";
export { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
export {
  getTechPackReleaseReadiness,
  getTechPackReleaseHistory,
} from "@/features/tech-pack/tech-pack-release.service";
export type { TechPackDiffResult } from "@/features/tech-pack/tech-pack-diff";
export { replaceTechPackBomItems, listTechPackBomItems } from "@/features/tech-pack/tech-pack-bom.service";
export {
  replaceTechPackArtworkPlacements,
  listTechPackArtworkPlacements,
} from "@/features/tech-pack/tech-pack-artwork.service";

const TECH_PACK_INCLUDE = {
  orderItem: {
    select: {
      id: true,
      quantity: true,
      productNameSnapshot: true,
      order: { select: { id: true, orderNo: true, customerNameSnapshot: true } },
    },
  },
  quoteItem: {
    select: {
      id: true,
      quantity: true,
      productNameSnapshot: true,
      quote: { select: { id: true, quoteNo: true, customerCompanySnapshot: true, customerContactNameSnapshot: true } },
    },
  },
  customer: { select: { id: true, name: true, code: true } },
  product: { select: { id: true, name: true, productCode: true } },
  productVariant: { select: { id: true, sku: true, sizeName: true } },
  pattern: {
    select: {
      id: true,
      code: true,
      name: true,
      version: true,
      baseSize: true,
      sizeRange: true,
      gradingRule: true,
      status: true,
      productionMaterialCategory: true,
    },
  },
  assets: { orderBy: { sortOrder: "asc" as const } },
  bomItems: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      material: { select: { id: true, code: true, name: true } },
      trim: { select: { id: true, code: true, name: true } },
      supplierRef: { select: { id: true, code: true, name: true } },
    },
  },
  artworkPlacements: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      artworkAsset: true,
      printMethodRef: { select: { id: true, code: true, name: true } },
    },
  },
  releaseHistory: { orderBy: { createdAt: "desc" as const }, take: 50 },
  measurements: {
    orderBy: { sortOrder: "asc" as const },
    include: { values: { orderBy: { size: "asc" as const } } },
  },
  supersededBy: { select: { id: true, code: true, version: true } },
} satisfies Prisma.TechPackInclude;

export type TechPackDetail = Prisma.TechPackGetPayload<{ include: typeof TECH_PACK_INCLUDE }>;

function assertDraft(status: TechPackStatus) {
  if (status !== TechPackStatus.DRAFT) {
    throw new TechPackValidationError("Chỉ Tech Pack bản nháp mới có thể chỉnh sửa.");
  }
}

async function populateFromOrderItem(orderItemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        select: {
          orderNo: true,
          customerId: true,
          customerNameSnapshot: true,
          productionDueDate: true,
        },
      },
      variant: { select: { id: true, sku: true, sizeName: true } },
    },
  });
  if (!item) throw new TechPackValidationError("Không tìm thấy hạng mục đơn hàng.");

  return {
    orderItemId,
    customerId: item.order.customerId,
    productId: item.productId,
    productVariantId: item.variantId,
    customerNameSnapshot: item.order.customerNameSnapshot,
    orderCodeSnapshot: item.order.orderNo,
    orderItemCodeSnapshot: item.id.slice(-8).toUpperCase(),
    productNameSnapshot: item.productNameSnapshot,
    productSkuSnapshot: item.skuSnapshot,
    colorSnapshot: item.colorSnapshot,
    sizeSnapshot: item.variant?.sizeName ?? item.variantNameSnapshot,
    quantitySnapshot: item.quantity,
    sourceType: item.supplySource ? String(item.supplySource) : null,
    processingMethod: item.processingMethod ? String(item.processingMethod) : null,
    deadline: item.order.productionDueDate,
    title: item.productNameSnapshot,
  };
}

async function populateFromQuoteItem(quoteItemId: string) {
  const item = await prisma.quoteItem.findUnique({
    where: { id: quoteItemId },
    include: {
      quote: {
        select: {
          quoteNo: true,
          customerId: true,
          customerCompanySnapshot: true,
          customerContactNameSnapshot: true,
          validUntil: true,
        },
      },
      variant: { select: { id: true, sku: true, sizeName: true } },
    },
  });
  if (!item) throw new TechPackValidationError("Không tìm thấy hạng mục báo giá.");

  return {
    quoteItemId,
    customerId: item.quote.customerId,
    productId: item.productId,
    productVariantId: item.variantId,
    customerNameSnapshot:
      item.quote.customerContactNameSnapshot ?? item.quote.customerCompanySnapshot,
    orderCodeSnapshot: item.quote.quoteNo,
    orderItemCodeSnapshot: item.id.slice(-8).toUpperCase(),
    productNameSnapshot: item.productNameSnapshot,
    productSkuSnapshot: item.skuSnapshot,
    colorSnapshot: item.colorSnapshot,
    sizeSnapshot: item.variant?.sizeName ?? item.variantNameSnapshot,
    quantitySnapshot: item.quantity,
    sourceType: "FROM_QUOTE",
    processingMethod: null,
    deadline: item.quote.validUntil,
    title: item.productNameSnapshot,
    internalNotes: "Nguồn: hạng mục báo giá (chưa có đơn hàng).",
  };
}

function pickLatestTechPack(
  packs: Array<{ id: string; version: number; code: string; createdAt: Date }>,
): TechPackItemLink | null {
  if (packs.length === 0) return null;
  const sorted = [...packs].sort((a, b) => {
    if (b.version !== a.version) return b.version - a.version;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const latest = sorted[0];
  return {
    latestTechPackId: latest.id,
    latestTechPackVersion: latest.version,
    latestTechPackCode: latest.code,
  };
}

export async function getTechPackLinksForOrderItems(
  orderItemIds: string[],
): Promise<Record<string, TechPackItemLink | null>> {
  const result: Record<string, TechPackItemLink | null> = {};
  if (orderItemIds.length === 0) return result;

  const packs = await prisma.techPack.findMany({
    where: { orderItemId: { in: orderItemIds } },
    select: { id: true, orderItemId: true, version: true, code: true, createdAt: true },
  });

  const byItem = new Map<string, typeof packs>();
  for (const pack of packs) {
    if (!pack.orderItemId) continue;
    const list = byItem.get(pack.orderItemId) ?? [];
    list.push(pack);
    byItem.set(pack.orderItemId, list);
  }

  for (const itemId of orderItemIds) {
    result[itemId] = pickLatestTechPack(byItem.get(itemId) ?? []);
  }
  return result;
}

export async function getTechPackLinksForQuoteItems(
  quoteItemIds: string[],
): Promise<Record<string, TechPackItemLink | null>> {
  const result: Record<string, TechPackItemLink | null> = {};
  if (quoteItemIds.length === 0) return result;

  const packs = await prisma.techPack.findMany({
    where: { quoteItemId: { in: quoteItemIds } },
    select: { id: true, quoteItemId: true, version: true, code: true, createdAt: true },
  });

  const byItem = new Map<string, typeof packs>();
  for (const pack of packs) {
    if (!pack.quoteItemId) continue;
    const list = byItem.get(pack.quoteItemId) ?? [];
    list.push(pack);
    byItem.set(pack.quoteItemId, list);
  }

  for (const itemId of quoteItemIds) {
    result[itemId] = pickLatestTechPack(byItem.get(itemId) ?? []);
  }
  return result;
}

export async function listTechPackSourceItems(input?: {
  q?: string;
  type?: "order-item" | "quote-item" | "all";
  limit?: number;
}): Promise<{ items: TechPackSourceItem[] }> {
  const limit = Math.min(Math.max(input?.limit ?? 30, 1), 100);
  const type = input?.type ?? "all";
  const q = input?.q?.trim();
  const items: TechPackSourceItem[] = [];

  if (type === "order-item" || type === "all") {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { status: { not: "CANCELLED" } },
        ...(q
          ? {
              OR: [
                { productNameSnapshot: { contains: q, mode: "insensitive" } },
                { skuSnapshot: { contains: q, mode: "insensitive" } },
                { colorSnapshot: { contains: q, mode: "insensitive" } },
                { order: { orderNo: { contains: q, mode: "insensitive" } } },
                { order: { customerNameSnapshot: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        order: { select: { orderNo: true, customerNameSnapshot: true, productionDueDate: true } },
        variant: { select: { sizeName: true } },
        techPacks: {
          select: { id: true, version: true, code: true, createdAt: true },
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: { order: { createdAt: "desc" } },
      take: limit,
    });

    for (const row of orderItems) {
      const latest = pickLatestTechPack(row.techPacks);
      items.push({
        type: "order-item",
        id: row.id,
        code: row.id.slice(-8).toUpperCase(),
        parentCode: row.order.orderNo,
        customerName: row.order.customerNameSnapshot,
        productName: row.productNameSnapshot,
        sku: row.skuSnapshot,
        color: row.colorSnapshot,
        size: row.variant?.sizeName ?? row.variantNameSnapshot,
        quantity: row.quantity,
        deadline: row.order.productionDueDate?.toISOString() ?? null,
        hasTechPack: row.techPacks.length > 0,
        latestTechPackId: latest?.latestTechPackId ?? null,
        latestTechPackVersion: latest?.latestTechPackVersion ?? null,
      });
    }
  }

  if (type === "quote-item" || type === "all") {
    const remaining = type === "all" ? Math.max(limit - items.length, 0) : limit;
    if (remaining > 0) {
      const quoteItems = await prisma.quoteItem.findMany({
        where: {
          quote: { status: { in: ["SENT", "VIEWED", "ACCEPTED"] } },
          ...(q
            ? {
                OR: [
                  { productNameSnapshot: { contains: q, mode: "insensitive" } },
                  { skuSnapshot: { contains: q, mode: "insensitive" } },
                  { colorSnapshot: { contains: q, mode: "insensitive" } },
                  { quote: { quoteNo: { contains: q, mode: "insensitive" } } },
                  { quote: { customerCompanySnapshot: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          quote: {
            select: {
              quoteNo: true,
              customerCompanySnapshot: true,
              customerContactNameSnapshot: true,
              validUntil: true,
            },
          },
          variant: { select: { sizeName: true } },
          techPacks: {
            select: { id: true, version: true, code: true, createdAt: true },
            orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          },
        },
        orderBy: { quote: { createdAt: "desc" } },
        take: remaining,
      });

      for (const row of quoteItems) {
        const latest = pickLatestTechPack(row.techPacks);
        items.push({
          type: "quote-item",
          id: row.id,
          code: row.id.slice(-8).toUpperCase(),
          parentCode: row.quote.quoteNo,
          customerName:
            row.quote.customerContactNameSnapshot ?? row.quote.customerCompanySnapshot,
          productName: row.productNameSnapshot,
          sku: row.skuSnapshot,
          color: row.colorSnapshot,
          size: row.variant?.sizeName ?? row.variantNameSnapshot,
          quantity: row.quantity,
          deadline: row.quote.validUntil?.toISOString() ?? null,
          hasTechPack: row.techPacks.length > 0,
          latestTechPackId: latest?.latestTechPackId ?? null,
          latestTechPackVersion: latest?.latestTechPackVersion ?? null,
        });
      }
    }
  }

  return { items };
}

export async function listTechPacks(input?: {
  status?: TechPackStatus;
  customerId?: string;
  productId?: string;
  orderItemId?: string;
  quoteItemId?: string;
  search?: string;
  limit?: number;
}) {
  const where: Prisma.TechPackWhereInput = {};
  if (input?.status) where.status = input.status;
  if (input?.customerId) where.customerId = input.customerId;
  if (input?.productId) where.productId = input.productId;
  if (input?.orderItemId) where.orderItemId = input.orderItemId;
  if (input?.quoteItemId) where.quoteItemId = input.quoteItemId;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { customerNameSnapshot: { contains: q, mode: "insensitive" } },
      { orderCodeSnapshot: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.techPack.findMany({
    where,
    include: {
      pattern: { select: { id: true, code: true, name: true, version: true, status: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: input?.limit ?? 100,
  });

  return { items };
}

export async function getTechPackDetail(id: string): Promise<TechPackDetail | null> {
  return prisma.techPack.findUnique({ where: { id }, include: TECH_PACK_INCLUDE });
}

export async function createTechPack(input: {
  orderItemId?: string | null;
  quoteItemId?: string | null;
  title?: string | null;
}) {
  if (!input.orderItemId && !input.quoteItemId) {
    throw new TechPackValidationError("Cần chọn hạng mục đơn hàng hoặc báo giá.");
  }
  if (input.orderItemId && input.quoteItemId) {
    throw new TechPackValidationError("Chỉ chọn một nguồn: đơn hàng hoặc báo giá.");
  }

  const code = await generateTechPackCode();
  const snapshot = input.orderItemId
    ? await populateFromOrderItem(input.orderItemId)
    : await populateFromQuoteItem(input.quoteItemId!);

  return prisma.techPack.create({
    data: {
      code,
      ...snapshot,
      title: input.title?.trim() || snapshot.title || null,
    },
    include: TECH_PACK_INCLUDE,
  }).then(async (pack) => {
    await logTechPackReleaseEvent({
      techPackId: pack.id,
      version: pack.version,
      action: TechPackReleaseAction.CREATED,
    });
    return pack;
  });
}

export async function updateTechPack(
  id: string,
  input: Partial<{
    title: string | null;
    bomNotes: string | null;
    trimsNotes: string | null;
    printMethodNotes: string | null;
    embroideryNotes: string | null;
    deadline: string | null;
    qcNotes: string | null;
    productionNotes: string | null;
    internalNotes: string | null;
    patternExceptionReason: string | null;
    measurements: Array<{
      id?: string;
      pointOfMeasure: string;
      description?: string | null;
      baseSize?: string | null;
      tolerance?: string | null;
      sortOrder?: number;
      values?: Array<{ size: string; value: string }>;
    }>;
  }>,
) {
  const existing = await prisma.techPack.findUnique({ where: { id } });
  if (!existing) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  assertDraft(existing.status);

  return prisma.$transaction(async (tx) => {
    await tx.techPack.update({
      where: { id },
      data: {
        title: input.title,
        bomNotes: input.bomNotes,
        trimsNotes: input.trimsNotes,
        printMethodNotes: input.printMethodNotes,
        embroideryNotes: input.embroideryNotes,
        deadline: input.deadline ? new Date(input.deadline) : input.deadline === null ? null : undefined,
        qcNotes: input.qcNotes,
        productionNotes: input.productionNotes,
        internalNotes: input.internalNotes,
        patternExceptionReason: input.patternExceptionReason,
      },
    });

    if (input.measurements) {
      await tx.techPackMeasurementValue.deleteMany({
        where: { measurement: { techPackId: id } },
      });
      await tx.techPackMeasurement.deleteMany({ where: { techPackId: id } });

      for (const [index, row] of input.measurements.entries()) {
        const pom = row.pointOfMeasure?.trim();
        if (!pom) continue;
        const measurement = await tx.techPackMeasurement.create({
          data: {
            techPackId: id,
            pointOfMeasure: pom,
            description: row.description?.trim() || null,
            baseSize: row.baseSize?.trim() || null,
            tolerance: row.tolerance?.trim() || null,
            sortOrder: row.sortOrder ?? index,
          },
        });
        for (const val of row.values ?? []) {
          if (!val.size?.trim() || !val.value?.trim()) continue;
          await tx.techPackMeasurementValue.create({
            data: {
              measurementId: measurement.id,
              size: val.size.trim(),
              value: val.value.trim(),
            },
          });
        }
      }
    }

    return tx.techPack.findUniqueOrThrow({ where: { id }, include: TECH_PACK_INCLUDE }).then(
      async (pack) => {
        await logTechPackReleaseEvent({
          techPackId: id,
          version: pack.version,
          action: TechPackReleaseAction.UPDATED,
        });
        return pack;
      },
    );
  });
}

export async function addTechPackAsset(
  techPackId: string,
  input: {
    type: TechPackAssetType;
    title?: string | null;
    description?: string | null;
    cloudinaryPublicId?: string | null;
    previewUrl?: string | null;
    r2ObjectKey?: string | null;
    originalFileName?: string | null;
    mimeType?: string | null;
    fileType?: TechPackAssetFileType;
    sortOrder?: number;
  },
) {
  const pack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  assertDraft(pack.status);

  return prisma.techPackAsset.create({
    data: {
      techPackId,
      type: input.type,
      title: input.title?.trim() || null,
      description: input.description?.trim() || null,
      cloudinaryPublicId: input.cloudinaryPublicId || null,
      previewUrl: input.previewUrl || null,
      r2ObjectKey: input.r2ObjectKey || null,
      originalFileName: input.originalFileName || null,
      mimeType: input.mimeType || null,
      fileType: input.fileType ?? TechPackAssetFileType.OTHER,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateTechPackAsset(
  techPackId: string,
  assetId: string,
  input: Partial<{
    type: TechPackAssetType;
    title: string | null;
    description: string | null;
    sortOrder: number;
  }>,
) {
  const pack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  assertDraft(pack.status);

  const asset = await prisma.techPackAsset.findFirst({ where: { id: assetId, techPackId } });
  if (!asset) throw new TechPackValidationError("Không tìm thấy tài sản.");

  return prisma.techPackAsset.update({
    where: { id: assetId },
    data: input,
  });
}

export async function deleteTechPackAsset(techPackId: string, assetId: string) {
  const pack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  assertDraft(pack.status);

  const asset = await prisma.techPackAsset.findFirst({ where: { id: assetId, techPackId } });
  if (!asset) throw new TechPackValidationError("Không tìm thấy tài sản.");
  await prisma.techPackAsset.delete({ where: { id: assetId } });
  return { ok: true };
}

export async function selectTechPackPattern(techPackId: string, patternId: string) {
  const pack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  assertDraft(pack.status);

  const pattern = await prisma.pattern.findUnique({
    where: { id: patternId },
    include: {
      measurements: { include: { values: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!pattern) throw new TechPackValidationError("Không tìm thấy rập.");

  return prisma.$transaction(async (tx) => {
    await tx.techPack.update({
      where: { id: techPackId },
      data: { patternId },
    });

    await tx.techPackMeasurementValue.deleteMany({
      where: { measurement: { techPackId } },
    });
    await tx.techPackMeasurement.deleteMany({ where: { techPackId } });

    for (const [index, row] of pattern.measurements.entries()) {
      const measurement = await tx.techPackMeasurement.create({
        data: {
          techPackId,
          pointOfMeasure: row.pointOfMeasure,
          description: row.description,
          baseSize: row.baseSize,
          tolerance: row.tolerance,
          sortOrder: row.sortOrder ?? index,
        },
      });
      for (const val of row.values) {
        await tx.techPackMeasurementValue.create({
          data: {
            measurementId: measurement.id,
            size: val.size,
            value: val.value,
          },
        });
      }
    }

    return tx.techPack.findUniqueOrThrow({ where: { id: techPackId }, include: TECH_PACK_INCLUDE }).then(
      async (result) => {
        await logTechPackReleaseEvent({
          techPackId,
          version: pack.version,
          action: TechPackReleaseAction.SELECT_PATTERN,
          snapshotJson: { patternId, patternCode: pattern.code },
        });
        return result;
      },
    );
  });
}

export async function releaseTechPack(
  id: string,
  releasedBy?: string | null,
  actorName?: string | null,
) {
  const readiness = await getTechPackReleaseReadiness(id);
  if (!readiness.canRelease) {
    throw new TechPackValidationError(readiness.errors[0] ?? "Tech Pack chưa đủ điều kiện phát hành.");
  }

  const pack = await prisma.techPack.findUnique({
    where: { id },
    include: {
      pattern: true,
      bomItems: true,
      artworkPlacements: true,
      measurements: true,
    },
  });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  assertDraft(pack.status);

  const snapshot = buildReleaseSnapshot({
    code: pack.code,
    version: pack.version,
    productNameSnapshot: pack.productNameSnapshot,
    customerNameSnapshot: pack.customerNameSnapshot,
    quantitySnapshot: pack.quantitySnapshot,
    bomItemCount: pack.bomItems.length,
    artworkPlacementCount: pack.artworkPlacements.length,
    measurementCount: pack.measurements.length,
    patternCode: pack.pattern?.code ?? pack.patternCodeSnapshot,
    patternVersion: pack.pattern ? String(pack.pattern.version) : pack.patternVersionSnapshot,
  });

  const updated = await prisma.techPack.update({
    where: { id },
    data: {
      status: TechPackStatus.RELEASED,
      releasedAt: new Date(),
      releasedBy: releasedBy?.trim() || null,
      patternCodeSnapshot: pack.pattern?.code ?? pack.patternCodeSnapshot,
      patternVersionSnapshot: pack.pattern
        ? String(pack.pattern.version)
        : pack.patternVersionSnapshot,
    },
    include: TECH_PACK_INCLUDE,
  });

  await logTechPackReleaseEvent({
    techPackId: id,
    version: pack.version,
    action: TechPackReleaseAction.RELEASED,
    actorId: releasedBy,
    actorName: actorName ?? releasedBy,
    snapshotJson: snapshot,
  });

  return updated;
}

export async function createTechPackNewVersion(id: string) {
  const source = await prisma.techPack.findUnique({
    where: { id },
    include: {
      assets: true,
      measurements: { include: { values: true } },
      bomItems: true,
      artworkPlacements: true,
    },
  });
  if (!source) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  if (source.status !== TechPackStatus.RELEASED) {
    throw new TechPackValidationError("Chỉ Tech Pack đã phát hành mới có thể tạo version mới.");
  }

  const code = await generateTechPackCode();

  return prisma.$transaction(async (tx) => {
    const newPack = await tx.techPack.create({
      data: {
        code,
        version: source.version + 1,
        status: TechPackStatus.DRAFT,
        orderItemId: source.orderItemId,
        quoteItemId: source.quoteItemId,
        customerId: source.customerId,
        productId: source.productId,
        productVariantId: source.productVariantId,
        patternId: source.patternId,
        title: source.title,
        customerNameSnapshot: source.customerNameSnapshot,
        orderCodeSnapshot: source.orderCodeSnapshot,
        orderItemCodeSnapshot: source.orderItemCodeSnapshot,
        productNameSnapshot: source.productNameSnapshot,
        productSkuSnapshot: source.productSkuSnapshot,
        colorSnapshot: source.colorSnapshot,
        sizeSnapshot: source.sizeSnapshot,
        quantitySnapshot: source.quantitySnapshot,
        sourceType: source.sourceType,
        processingMethod: source.processingMethod,
        bomNotes: source.bomNotes,
        trimsNotes: source.trimsNotes,
        printMethodNotes: source.printMethodNotes,
        embroideryNotes: source.embroideryNotes,
        deadline: source.deadline,
        qcNotes: source.qcNotes,
        productionNotes: source.productionNotes,
        internalNotes: source.internalNotes,
        patternExceptionReason: source.patternExceptionReason,
      },
    });

    for (const bom of source.bomItems) {
      await tx.techPackBomItem.create({
        data: {
          techPackId: newPack.id,
          sortOrder: bom.sortOrder,
          category: bom.category,
          itemName: bom.itemName,
          specification: bom.specification,
          color: bom.color,
          supplier: bom.supplier,
          unit: bom.unit,
          consumption: bom.consumption,
          wastePercent: bom.wastePercent,
          notes: bom.notes,
          materialId: bom.materialId,
          trimId: bom.trimId,
          supplierId: bom.supplierId,
        },
      });
    }

    const assetIdMap = new Map<string, string>();
    for (const asset of source.assets) {
      const created = await tx.techPackAsset.create({
        data: {
          techPackId: newPack.id,
          type: asset.type,
          title: asset.title,
          description: asset.description,
          cloudinaryPublicId: asset.cloudinaryPublicId,
          previewUrl: asset.previewUrl,
          r2ObjectKey: asset.r2ObjectKey,
          originalFileName: asset.originalFileName,
          mimeType: asset.mimeType,
          fileType: asset.fileType,
          sortOrder: asset.sortOrder,
        },
      });
      assetIdMap.set(asset.id, created.id);
    }

    for (const placement of source.artworkPlacements) {
      await tx.techPackArtworkPlacement.create({
        data: {
          techPackId: newPack.id,
          sortOrder: placement.sortOrder,
          artworkAssetId: placement.artworkAssetId
            ? assetIdMap.get(placement.artworkAssetId) ?? null
            : null,
          placementType: placement.placementType,
          title: placement.title,
          bodyPart: placement.bodyPart,
          width: placement.width,
          height: placement.height,
          measurementUnit: placement.measurementUnit,
          printMethod: placement.printMethod,
          printMethodId: placement.printMethodId,
          embroideryMethod: placement.embroideryMethod,
          inkColors: placement.inkColors,
          threadColors: placement.threadColors,
          notes: placement.notes,
        },
      });
    }

    for (const row of source.measurements) {
      const measurement = await tx.techPackMeasurement.create({
        data: {
          techPackId: newPack.id,
          pointOfMeasure: row.pointOfMeasure,
          description: row.description,
          baseSize: row.baseSize,
          tolerance: row.tolerance,
          sortOrder: row.sortOrder,
        },
      });
      for (const val of row.values) {
        await tx.techPackMeasurementValue.create({
          data: { measurementId: measurement.id, size: val.size, value: val.value },
        });
      }
    }

    await tx.techPack.update({
      where: { id: source.id },
      data: {
        status: TechPackStatus.SUPERSEDED,
        supersededById: newPack.id,
      },
    });

    await tx.techPackReleaseHistory.create({
      data: {
        techPackId: source.id,
        version: source.version,
        action: TechPackReleaseAction.SUPERSEDED,
        snapshotJson: { supersededById: newPack.id, newCode: code },
      },
    });
    await tx.techPackReleaseHistory.create({
      data: {
        techPackId: newPack.id,
        version: newPack.version,
        action: TechPackReleaseAction.NEW_VERSION,
        snapshotJson: { sourceId: source.id, sourceCode: source.code },
      },
    });

    return tx.techPack.findUniqueOrThrow({ where: { id: newPack.id }, include: TECH_PACK_INCLUDE });
  });
}

const DIFF_PACK_INCLUDE = {
  bomItems: { orderBy: { sortOrder: "asc" as const } },
  artworkPlacements: { orderBy: { sortOrder: "asc" as const } },
  measurements: {
    orderBy: { sortOrder: "asc" as const },
    include: { values: { orderBy: { size: "asc" as const } } },
  },
  pattern: { select: { id: true, code: true, version: true } },
} satisfies Prisma.TechPackInclude;

function toDiffSnapshot(
  pack: Prisma.TechPackGetPayload<{ include: typeof DIFF_PACK_INCLUDE }>,
): TechPackDiffSnapshot {
  return {
    bomItems: pack.bomItems.map((row) => ({
      sortOrder: row.sortOrder,
      category: row.category,
      itemName: row.itemName,
      specification: row.specification,
      color: row.color,
      supplier: row.supplier,
      unit: row.unit,
      consumption: row.consumption,
      materialId: row.materialId,
      trimId: row.trimId,
      supplierId: row.supplierId,
    })),
    artworkPlacements: pack.artworkPlacements.map((row) => ({
      sortOrder: row.sortOrder,
      placementType: row.placementType,
      title: row.title,
      bodyPart: row.bodyPart,
      width: row.width,
      height: row.height,
      printMethod: row.printMethod,
      embroideryMethod: row.embroideryMethod,
    })),
    measurements: pack.measurements.map((row) => ({
      sortOrder: row.sortOrder,
      pointOfMeasure: row.pointOfMeasure,
      description: row.description,
      tolerance: row.tolerance,
      values: row.values.map((v) => ({ size: v.size, value: v.value })),
    })),
    patternCodeSnapshot: pack.patternCodeSnapshot,
    patternVersionSnapshot: pack.patternVersionSnapshot,
    patternId: pack.patternId,
    patternCode: pack.pattern?.code ?? null,
    patternVersion: pack.pattern?.version ?? null,
    qcNotes: pack.qcNotes,
    productionNotes: pack.productionNotes,
    printMethodNotes: pack.printMethodNotes,
    embroideryNotes: pack.embroideryNotes,
    patternExceptionReason: pack.patternExceptionReason,
  };
}

export async function getTechPackDiff(techPackId: string): Promise<TechPackDiffResult> {
  const current = await prisma.techPack.findUnique({
    where: { id: techPackId },
    include: DIFF_PACK_INCLUDE,
  });
  if (!current) throw new TechPackValidationError("Không tìm thấy Tech Pack.");

  const previous = await prisma.techPack.findFirst({
    where: { supersededById: techPackId },
    include: DIFF_PACK_INCLUDE,
  });

  return buildTechPackDiff(toDiffSnapshot(current), previous ? toDiffSnapshot(previous) : null);
}
