import "server-only";

import type {
  ItemProductionStageKey,
  OrderItemProductionApprovalStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DESIGN_FILE_TYPES } from "@/features/orders/production-pack-labels";
import {
  isProductionApprovalGateStage,
  type ProductionApprovalGateResult,
  type ProductionApprovalRecord,
  type UpsertProductionApprovalInput,
} from "@/features/item-production-tracking/production-approval.types";
import {
  ProductionApprovalValidationError,
  validateReleaseRequirements,
} from "@/features/item-production-tracking/production-approval.validation";

export { ProductionApprovalValidationError, validateReleaseRequirements };

export class ProductionApprovalGateError extends Error {
  readonly code = "APPROVAL_REQUIRED" as const;
  readonly orderItemId: string;
  readonly productionJobHref: string;

  constructor(orderItemId: string) {
    super("Sản phẩm chưa được duyệt sản xuất.");
    this.name = "ProductionApprovalGateError";
    this.orderItemId = orderItemId;
    this.productionJobHref = `/admin/production/jobs/${orderItemId}`;
  }
}

const FILE_SELECT = {
  id: true,
  title: true,
  type: true,
  status: true,
  version: true,
  mediaAssetId: true,
  orderId: true,
  orderItemId: true,
  mediaAsset: { select: { id: true, filename: true, url: true } },
} satisfies Prisma.OrderProductionFileSelect;

function mapFile(
  file: {
    id: string;
    title: string | null;
    type: string;
    status: string;
    version: number;
    mediaAssetId: string;
    mediaAsset?: { filename: string | null } | null;
  } | null,
) {
  if (!file) return null;
  return {
    id: file.id,
    title: file.title,
    type: file.type,
    status: file.status,
    version: file.version,
    mediaAssetId: file.mediaAssetId,
    filename: file.mediaAsset?.filename ?? file.title,
  };
}

async function computeArtworkStale(input: {
  orderItemId: string;
  orderId: string;
  status: OrderItemProductionApprovalStatus;
  artworkFileId: string | null;
  artworkStatus: string | null;
}): Promise<{ artworkStale: boolean; artworkStaleMessage: string | null }> {
  if (input.status !== "RELEASED" || !input.artworkFileId) {
    return { artworkStale: false, artworkStaleMessage: null };
  }

  if (input.artworkStatus && input.artworkStatus !== "ACTIVE") {
    return {
      artworkStale: true,
      artworkStaleMessage:
        "Artwork đã duyệt không còn ACTIVE. Cần duyệt lại trước khi sản xuất theo file mới.",
    };
  }

  const activeDesign = await prisma.orderProductionFile.findFirst({
    where: {
      status: "ACTIVE",
      type: { in: [...DESIGN_FILE_TYPES] },
      OR: [{ orderItemId: input.orderItemId }, { orderId: input.orderId }],
      NOT: { id: input.artworkFileId },
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, version: true },
  });

  if (activeDesign) {
    return {
      artworkStale: true,
      artworkStaleMessage: `Artwork hiện tại khác artwork đã duyệt (đang ACTIVE: ${
        activeDesign.title ?? activeDesign.id
      } v${activeDesign.version}).`,
    };
  }

  return { artworkStale: false, artworkStaleMessage: null };
}

function mapApproval(
  row: NonNullable<Awaited<ReturnType<typeof loadApprovalRow>>>,
  stale: { artworkStale: boolean; artworkStaleMessage: string | null },
): ProductionApprovalRecord {
  return {
    id: row.id,
    orderItemId: row.orderItemId,
    status: row.status,
    sampleRequired: row.sampleRequired,
    artworkFileId: row.artworkFileId,
    sampleFileId: row.sampleFileId,
    evidenceMediaAssetId: row.evidenceMediaAssetId,
    techPackId: row.techPackId,
    approvedByContactId: row.approvedByContactId,
    approvedByName: row.approvedByName,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    note: row.note,
    releasedByAdminUserId: row.releasedByAdminUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    artworkFile: mapFile(row.artworkFile),
    sampleFile: mapFile(row.sampleFile),
    evidenceMedia: row.evidenceMediaAsset
      ? {
          id: row.evidenceMediaAsset.id,
          filename: row.evidenceMediaAsset.filename,
          url: row.evidenceMediaAsset.url,
        }
      : null,
    techPack: row.techPack
      ? {
          id: row.techPack.id,
          code: row.techPack.code,
          version: row.techPack.version,
          status: row.techPack.status,
          title: row.techPack.title,
        }
      : null,
    approvedByContact: row.approvedByContact
      ? {
          id: row.approvedByContact.id,
          fullName: row.approvedByContact.fullName,
          title: row.approvedByContact.title,
        }
      : null,
    artworkStale: stale.artworkStale,
    artworkStaleMessage: stale.artworkStaleMessage,
  };
}

async function loadApprovalRow(orderItemId: string) {
  return prisma.orderItemProductionApproval.findUnique({
    where: { orderItemId },
    include: {
      artworkFile: { select: FILE_SELECT },
      sampleFile: { select: FILE_SELECT },
      evidenceMediaAsset: { select: { id: true, filename: true, url: true } },
      techPack: {
        select: { id: true, code: true, version: true, status: true, title: true },
      },
      approvedByContact: { select: { id: true, fullName: true, title: true } },
      orderItem: { select: { id: true, orderId: true } },
    },
  });
}

export async function getOrCreateProductionApproval(
  orderItemId: string,
): Promise<ProductionApprovalRecord> {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: { id: true, orderId: true },
  });
  if (!item) throw new ProductionApprovalValidationError("Không tìm thấy dòng đơn hàng.");

  let row = await loadApprovalRow(orderItemId);
  if (!row) {
    await prisma.orderItemProductionApproval.create({
      data: {
        orderItemId,
        status: "PENDING",
        sampleRequired: true,
      },
    });
    row = await loadApprovalRow(orderItemId);
  }
  if (!row) throw new ProductionApprovalValidationError("Không tạo được duyệt sản xuất.");

  const stale = await computeArtworkStale({
    orderItemId,
    orderId: row.orderItem.orderId,
    status: row.status,
    artworkFileId: row.artworkFileId,
    artworkStatus: row.artworkFile?.status ?? null,
  });
  return mapApproval(row, stale);
}

export async function getProductionApprovalStatusesForOrderItems(
  orderItemIds: string[],
): Promise<
  Map<
    string,
    {
      status: OrderItemProductionApprovalStatus;
      artworkStale: boolean;
    }
  >
> {
  const unique = [...new Set(orderItemIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.orderItemProductionApproval.findMany({
    where: { orderItemId: { in: unique } },
    select: {
      orderItemId: true,
      status: true,
      artworkFileId: true,
      artworkFile: { select: { status: true } },
      orderItem: { select: { orderId: true } },
    },
  });

  const map = new Map<
    string,
    { status: OrderItemProductionApprovalStatus; artworkStale: boolean }
  >();

  await Promise.all(
    rows.map(async (row) => {
      const stale = await computeArtworkStale({
        orderItemId: row.orderItemId,
        orderId: row.orderItem.orderId,
        status: row.status,
        artworkFileId: row.artworkFileId,
        artworkStatus: row.artworkFile?.status ?? null,
      });
      map.set(row.orderItemId, {
        status: row.status,
        artworkStale: stale.artworkStale,
      });
    }),
  );

  return map;
}

async function assertFileBelongsToItem(
  fileId: string | null | undefined,
  orderItemId: string,
  orderId: string,
  label: string,
) {
  if (!fileId) return;
  const file = await prisma.orderProductionFile.findUnique({
    where: { id: fileId },
    select: { id: true, orderId: true, orderItemId: true },
  });
  if (!file) {
    throw new ProductionApprovalValidationError(`${label} không tồn tại.`);
  }
  const ok =
    file.orderItemId === orderItemId ||
    file.orderId === orderId ||
    (file.orderItemId == null && file.orderId === orderId);
  if (!ok) {
    throw new ProductionApprovalValidationError(`${label} không thuộc đơn hàng/item này.`);
  }
}

export async function getProductionApprovalFormOptions(orderItemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      id: true,
      orderId: true,
      order: { select: { customerId: true } },
    },
  });
  if (!item) throw new ProductionApprovalValidationError("Không tìm thấy dòng đơn hàng.");

  const [files, techPacks, contacts] = await Promise.all([
    prisma.orderProductionFile.findMany({
      where: {
        OR: [{ orderItemId: item.id }, { orderId: item.orderId }],
      },
      orderBy: [{ status: "asc" }, { version: "desc" }, { createdAt: "desc" }],
      select: FILE_SELECT,
    }),
    prisma.techPack.findMany({
      where: { orderItemId: item.id },
      orderBy: [{ status: "asc" }, { version: "desc" }],
      select: { id: true, code: true, version: true, status: true, title: true },
    }),
    item.order.customerId
      ? prisma.contact.findMany({
          where: { customerId: item.order.customerId },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, title: true },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const designFiles = files.filter((f) =>
    (DESIGN_FILE_TYPES as readonly string[]).includes(f.type),
  );
  const artworkCandidates = [...designFiles].sort((a, b) => {
    const aActive = a.status === "ACTIVE" ? 0 : 1;
    const bActive = b.status === "ACTIVE" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return b.version - a.version;
  });

  return {
    orderId: item.orderId,
    artworkOptional: designFiles.length === 0,
    artworkFiles: artworkCandidates.map((f) => mapFile(f)),
    sampleFiles: files.map((f) => mapFile(f)),
    techPacks: [...techPacks].sort((a, b) => {
      const aRel = a.status === "RELEASED" ? 0 : 1;
      const bRel = b.status === "RELEASED" ? 0 : 1;
      if (aRel !== bRel) return aRel - bRel;
      return b.version - a.version;
    }),
    contacts,
  };
}

export async function enforceProductionApprovalGate(input: {
  orderItemId: string;
  stageKey: ItemProductionStageKey | string | null | undefined;
  bypassReason?: string | null;
  productionItemId?: string | null;
  stageId?: string | null;
  adminUserId?: string | null;
  adminUsername?: string | null;
}): Promise<void> {
  const result = await assertProductionApprovalAllowsProgress(input);
  if (!result.allowed) {
    throw new ProductionApprovalGateError(result.orderItemId);
  }
}

export async function upsertProductionApproval(
  input: UpsertProductionApprovalInput,
): Promise<ProductionApprovalRecord> {
  const item = await prisma.orderItem.findUnique({
    where: { id: input.orderItemId },
    select: { id: true, orderId: true, order: { select: { customerId: true } } },
  });
  if (!item) throw new ProductionApprovalValidationError("Không tìm thấy dòng đơn hàng.");

  await assertFileBelongsToItem(input.artworkFileId, item.id, item.orderId, "Artwork");
  await assertFileBelongsToItem(input.sampleFileId, item.id, item.orderId, "File mẫu");

  if (input.evidenceMediaAssetId) {
    const media = await prisma.mediaAsset.findUnique({
      where: { id: input.evidenceMediaAssetId },
      select: { id: true },
    });
    if (!media) {
      throw new ProductionApprovalValidationError("Media bằng chứng không tồn tại.");
    }
  }

  if (input.techPackId) {
    const tp = await prisma.techPack.findUnique({
      where: { id: input.techPackId },
      select: { id: true, orderItemId: true },
    });
    if (!tp) throw new ProductionApprovalValidationError("Tech Pack không tồn tại.");
    if (tp.orderItemId && tp.orderItemId !== item.id) {
      throw new ProductionApprovalValidationError("Tech Pack không thuộc item này.");
    }
  }

  if (input.approvedByContactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: input.approvedByContactId },
      select: { id: true, customerId: true, fullName: true },
    });
    if (!contact) {
      throw new ProductionApprovalValidationError("Người liên hệ không tồn tại.");
    }
    if (item.order.customerId && contact.customerId !== item.order.customerId) {
      throw new ProductionApprovalValidationError("Người liên hệ không thuộc khách hàng của đơn.");
    }
  }

  const designFileCount = await prisma.orderProductionFile.count({
    where: {
      type: { in: [...DESIGN_FILE_TYPES] },
      OR: [{ orderItemId: item.id }, { orderId: item.orderId }],
    },
  });

  validateReleaseRequirements({
    status: input.status,
    sampleRequired: input.sampleRequired,
    artworkFileId: input.artworkFileId,
    sampleFileId: input.sampleFileId,
    evidenceMediaAssetId: input.evidenceMediaAssetId,
    approvedByContactId: input.approvedByContactId,
    approvedByName: input.approvedByName,
    artworkOptional: designFileCount === 0,
    note: input.note,
  });

  let approvedAt: Date | null = null;
  if (input.status === "RELEASED") {
    approvedAt = input.approvedAt
      ? input.approvedAt instanceof Date
        ? input.approvedAt
        : new Date(input.approvedAt)
      : new Date();
    if (Number.isNaN(approvedAt.getTime())) {
      throw new ProductionApprovalValidationError("Thời điểm duyệt không hợp lệ.");
    }
  }

  const approvedByName =
    input.approvedByName?.trim() ||
    (input.approvedByContactId
      ? (
          await prisma.contact.findUnique({
            where: { id: input.approvedByContactId },
            select: { fullName: true },
          })
        )?.fullName ?? null
      : null);

  await prisma.orderItemProductionApproval.upsert({
    where: { orderItemId: input.orderItemId },
    create: {
      orderItemId: input.orderItemId,
      status: input.status,
      sampleRequired: input.sampleRequired,
      artworkFileId: input.artworkFileId ?? null,
      sampleFileId: input.sampleFileId ?? null,
      evidenceMediaAssetId: input.evidenceMediaAssetId ?? null,
      techPackId: input.techPackId ?? null,
      approvedByContactId: input.approvedByContactId ?? null,
      approvedByName,
      approvedAt,
      note: input.note?.trim() || null,
      releasedByAdminUserId: input.status === "RELEASED" ? input.adminUserId ?? null : null,
    },
    update: {
      status: input.status,
      sampleRequired: input.sampleRequired,
      artworkFileId: input.artworkFileId ?? null,
      sampleFileId: input.sampleFileId ?? null,
      evidenceMediaAssetId: input.evidenceMediaAssetId ?? null,
      techPackId: input.techPackId ?? null,
      approvedByContactId: input.approvedByContactId ?? null,
      approvedByName,
      approvedAt: input.status === "RELEASED" ? approvedAt : null,
      note: input.note?.trim() || null,
      releasedByAdminUserId:
        input.status === "RELEASED" ? input.adminUserId ?? null : null,
    },
  });

  return getOrCreateProductionApproval(input.orderItemId);
}

/**
 * When an approved artwork file is archived (e.g. replaced by V3 ACTIVE),
 * demote RELEASED → PENDING but keep the snapshot fields for display.
 */
export async function invalidateApprovalsForArchivedArtworkFiles(
  fileIds: string[],
): Promise<number> {
  const ids = [...new Set(fileIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  const result = await prisma.orderItemProductionApproval.updateMany({
    where: {
      status: "RELEASED",
      artworkFileId: { in: ids },
    },
    data: {
      status: "PENDING",
    },
  });
  return result.count;
}

export async function assertProductionApprovalAllowsProgress(input: {
  orderItemId: string;
  stageKey: ItemProductionStageKey | string | null | undefined;
  bypassReason?: string | null;
  productionItemId?: string | null;
  stageId?: string | null;
  adminUserId?: string | null;
  adminUsername?: string | null;
}): Promise<ProductionApprovalGateResult> {
  if (!isProductionApprovalGateStage(input.stageKey)) {
    return { allowed: true };
  }

  const approval = await prisma.orderItemProductionApproval.findUnique({
    where: { orderItemId: input.orderItemId },
    select: {
      status: true,
      artworkFileId: true,
      artworkFile: { select: { status: true } },
      orderItem: { select: { orderId: true } },
    },
  });

  const status = approval?.status ?? "PENDING";
  let blocked = status !== "RELEASED";

  if (!blocked && approval) {
    const stale = await computeArtworkStale({
      orderItemId: input.orderItemId,
      orderId: approval.orderItem.orderId,
      status: approval.status,
      artworkFileId: approval.artworkFileId,
      artworkStatus: approval.artworkFile?.status ?? null,
    });
    if (stale.artworkStale) blocked = true;
  }

  if (!blocked) return { allowed: true };

  const reason = input.bypassReason?.trim();
  if (reason && reason.length >= 5) {
    await prisma.orderItemProductionApprovalBypass.create({
      data: {
        orderItemId: input.orderItemId,
        productionItemId: input.productionItemId ?? null,
        stageId: input.stageId ?? null,
        stageKey: input.stageKey ? String(input.stageKey) : null,
        reason,
        actorAdminUserId: input.adminUserId ?? null,
        actorUsernameSnapshot: input.adminUsername ?? null,
      },
    });
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "APPROVAL_REQUIRED",
    message: "Sản phẩm chưa được duyệt sản xuất.",
    orderItemId: input.orderItemId,
    productionJobHref: `/admin/production/jobs/${input.orderItemId}`,
  };
}
