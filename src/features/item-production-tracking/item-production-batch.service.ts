import type {
  ItemProductionBatchAuditAction,
  ItemProductionProgressEventType,
  ItemProductionStageKey,
  ItemProductionStageStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ITEM_PRODUCTION_DEFAULT_WEIGHTS,
  ITEM_PRODUCTION_STAGE_LABELS,
} from "@/features/item-production-tracking/config";
import {
  computeAllocatedQuantity,
  computeUnallocatedQuantity,
  generateBatchCode,
  hasMaterialItemProgress,
  maxCompletedQuantity,
  recomputeBatchFromStages,
} from "@/features/item-production-tracking/batch-aggregation";
import { validateQuantityUpdate } from "@/features/item-production-tracking/progress-risk";
import { rollupParentFromBatches } from "@/features/item-production-tracking/item-production-batch-rollup";

const batchInclude = {
  supplier: { select: { id: true, code: true, name: true, isActive: true } },
  picEmployee: { select: { id: true, employeeCode: true, fullName: true } },
  stages: { orderBy: { sequence: "asc" as const } },
} satisfies Prisma.ItemProductionBatchInclude;

async function writeBatchAudit(
  tx: Prisma.TransactionClient,
  input: {
    batchId: string;
    action: ItemProductionBatchAuditAction;
    previousValue?: string | null;
    newValue?: string | null;
    note?: string | null;
    adminUserId?: string | null;
  },
) {
  await tx.itemProductionBatchAuditEntry.create({
    data: {
      batchId: input.batchId,
      action: input.action,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      note: input.note ?? null,
      createdByAdminUserId: input.adminUserId ?? null,
    },
  });
}

async function validateSupplier(tx: Prisma.TransactionClient, supplierId: string | null | undefined) {
  if (!supplierId) return;
  const supplier = await tx.productionSupplier.findUnique({
    where: { id: supplierId },
    select: { isActive: true },
  });
  if (!supplier) throw new Error("Xưởng được chọn không tồn tại.");
  if (!supplier.isActive) throw new Error("Xưởng được chọn không còn hoạt động.");
}

function batchStagesFromItemStages(
  itemStages: Array<{
    stageKey: ItemProductionStageKey;
    labelSnapshot: string;
    sequence: number;
    isApplicable: boolean;
    weight: number;
    status: ItemProductionStageStatus;
  }>,
  qty: number,
) {
  return itemStages.map((step) => ({
    stageKey: step.stageKey,
    labelSnapshot: step.labelSnapshot || ITEM_PRODUCTION_STAGE_LABELS[step.stageKey],
    sequence: step.sequence,
    isApplicable: step.isApplicable,
    weight: step.weight || ITEM_PRODUCTION_DEFAULT_WEIGHTS[step.stageKey],
    status: (step.isApplicable ? "NOT_STARTED" : "SKIPPED") as ItemProductionStageStatus,
    plannedQuantity: step.isApplicable ? qty : 0,
  }));
}

export async function listBatchesForProductionItem(productionItemId: string) {
  const tracking = await prisma.itemProductionTracking.findUnique({
    where: { id: productionItemId },
    select: {
      id: true,
      plannedQuantity: true,
      promisedDeliveryDate: true,
      orderItem: {
        select: {
          id: true,
          quantity: true,
          productNameSnapshot: true,
          skuSnapshot: true,
          order: {
            select: {
              id: true,
              orderNo: true,
              customerNameSnapshot: true,
              customerCompanyName: true,
              productionDueDate: true,
              deliveryExpectedAt: true,
              customer: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!tracking) throw new Error("Không tìm thấy item sản xuất");

  const batches = await prisma.itemProductionBatch.findMany({
    where: { itemProductionTrackingId: productionItemId },
    include: batchInclude,
    orderBy: { sequence: "asc" },
  });

  const allocatedQuantity = computeAllocatedQuantity(batches);
  const unallocatedQuantity = computeUnallocatedQuantity(tracking.plannedQuantity, batches);

  return {
    productionItem: tracking,
    batches,
    allocationSummary: {
      parentPlannedQuantity: tracking.plannedQuantity,
      allocatedQuantity,
      unallocatedQuantity,
      batchCount: batches.filter((b) => b.status !== "CANCELLED").length,
    },
  };
}

export async function getBatch(batchId: string) {
  return prisma.itemProductionBatch.findUnique({
    where: { id: batchId },
    include: {
      ...batchInclude,
      itemProductionTracking: {
        include: {
          orderItem: {
            include: {
              order: {
                select: {
                  id: true,
                  orderNo: true,
                  customerNameSnapshot: true,
                  customerCompanyName: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getBatchHistory(batchId: string) {
  const audit = await prisma.itemProductionBatchAuditEntry.findMany({
    where: { batchId },
    orderBy: { createdAt: "desc" },
    include: { createdByAdminUser: { select: { id: true, username: true } } },
  });
  const progressEntries = await prisma.itemProductionBatchProgressEntry.findMany({
    where: { batchStage: { batchId } },
    orderBy: { happenedAt: "desc" },
    take: 100,
    include: {
      batchStage: { select: { stageKey: true, labelSnapshot: true } },
      createdByAdminUser: { select: { id: true, username: true } },
    },
  });
  return { audit, progressEntries };
}

export async function canStartBatches(productionItemId: string) {
  const tracking = await prisma.itemProductionTracking.findUnique({
    where: { id: productionItemId },
    include: { stages: true, batches: { where: { status: { not: "CANCELLED" } } } },
  });
  if (!tracking) throw new Error("Không tìm thấy item sản xuất");
  if (tracking.batches.length > 0) return { allowed: true, reason: null };
  if (hasMaterialItemProgress(tracking.stages)) {
    return {
      allowed: false,
      reason:
        "Item này đã có tiến độ cấp item và chưa thể chuyển sang theo dõi theo lô. Vui lòng tiếp tục theo dõi ở cấp item.",
    };
  }
  return { allowed: true, reason: null };
}

export async function createBatch(input: {
  productionItemId: string;
  plannedQuantity: number;
  supplierId?: string | null;
  picEmployeeId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  notes?: string | null;
  name?: string | null;
  adminUserId?: string | null;
}) {
  if (!Number.isFinite(input.plannedQuantity) || input.plannedQuantity <= 0) {
    throw new Error("Số lượng lô phải lớn hơn 0.");
  }

  return prisma.$transaction(async (tx) => {
    const tracking = await tx.itemProductionTracking.findUnique({
      where: { id: input.productionItemId },
      include: {
        stages: { orderBy: { sequence: "asc" } },
        batches: true,
      },
    });
    if (!tracking) throw new Error("Không tìm thấy item sản xuất");

    if (tracking.batches.filter((b) => b.status !== "CANCELLED").length === 0) {
      if (hasMaterialItemProgress(tracking.stages)) {
        throw new Error(
          "Item này đã có tiến độ cấp item và chưa thể chuyển sang theo dõi theo lô.",
        );
      }
    }

    await validateSupplier(tx, input.supplierId);

    const allocated = computeAllocatedQuantity(tracking.batches);
    const available = tracking.plannedQuantity - allocated;
    if (input.plannedQuantity > available) {
      throw new Error("Số lượng lô vượt quá số lượng còn có thể phân bổ.");
    }

    const existingSequences = tracking.batches.map((b) => b.sequence);
    const sequence = existingSequences.length > 0 ? Math.max(...existingSequences) + 1 : 1;
    const code = generateBatchCode(tracking.orderItemId, sequence);

    const stageData = batchStagesFromItemStages(tracking.stages, input.plannedQuantity);

    const batch = await tx.itemProductionBatch.create({
      data: {
        code,
        itemProductionTrackingId: tracking.id,
        sequence,
        name: input.name ?? `Lô ${sequence}`,
        plannedQuantity: input.plannedQuantity,
        supplierId: input.supplierId ?? null,
        picEmployeeId: input.picEmployeeId ?? null,
        status: "DRAFT",
        plannedStartAt: input.plannedStartAt ? new Date(input.plannedStartAt) : null,
        plannedEndAt: input.plannedEndAt ? new Date(input.plannedEndAt) : null,
        notes: input.notes ?? null,
        createdByAdminUserId: input.adminUserId ?? null,
        updatedByAdminUserId: input.adminUserId ?? null,
        stages: { create: stageData },
      },
      include: batchInclude,
    });

    await writeBatchAudit(tx, {
      batchId: batch.id,
      action: "CREATED",
      newValue: JSON.stringify({
        code,
        plannedQuantity: input.plannedQuantity,
        supplierId: input.supplierId,
      }),
      adminUserId: input.adminUserId,
    });

    await rollupParentFromBatches(tx, tracking.id);
    return batch;
  });
}

export async function updateBatch(
  batchId: string,
  patch: {
    plannedQuantity?: number;
    supplierId?: string | null;
    picEmployeeId?: string | null;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    notes?: string | null;
    name?: string | null;
    adminUserId?: string | null;
  },
) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.itemProductionBatch.findUnique({
      where: { id: batchId },
      include: { stages: true, itemProductionTracking: { include: { batches: true } } },
    });
    if (!batch) throw new Error("Không tìm thấy lô sản xuất");
    if (batch.status === "CANCELLED" || batch.status === "COMPLETED") {
      throw new Error("Không thể chỉnh sửa lô đã hoàn tất hoặc đã hủy.");
    }

    if (patch.supplierId !== undefined) {
      await validateSupplier(tx, patch.supplierId);
    }

    if (patch.plannedQuantity !== undefined) {
      if (!Number.isFinite(patch.plannedQuantity) || patch.plannedQuantity <= 0) {
        throw new Error("Số lượng lô phải lớn hơn 0.");
      }
      const otherBatches = batch.itemProductionTracking.batches.filter((b) => b.id !== batchId);
      const otherAlloc = computeAllocatedQuantity(otherBatches);
      const available = batch.itemProductionTracking.plannedQuantity - otherAlloc;
      if (patch.plannedQuantity > available) {
        throw new Error("Số lượng lô vượt quá số lượng còn có thể phân bổ.");
      }
      const maxCompleted = maxCompletedQuantity(batch.stages);
      if (patch.plannedQuantity < maxCompleted) {
        throw new Error("Không thể giảm số lượng lô thấp hơn số lượng đã hoàn thành.");
      }
      if (patch.plannedQuantity !== batch.plannedQuantity) {
        await writeBatchAudit(tx, {
          batchId,
          action: "QUANTITY_CHANGED",
          previousValue: String(batch.plannedQuantity),
          newValue: String(patch.plannedQuantity),
          adminUserId: patch.adminUserId,
        });
        for (const stage of batch.stages) {
          if (stage.isApplicable) {
            await tx.itemProductionBatchStage.update({
              where: { id: stage.id },
              data: { plannedQuantity: patch.plannedQuantity },
            });
          }
        }
      }
    }

    if (patch.supplierId !== undefined && patch.supplierId !== batch.supplierId) {
      await writeBatchAudit(tx, {
        batchId,
        action: batch.supplierId ? "SUPPLIER_REASSIGNED" : "SUPPLIER_ASSIGNED",
        previousValue: batch.supplierId ?? null,
        newValue: patch.supplierId ?? null,
        adminUserId: patch.adminUserId,
      });
    }

    if (patch.picEmployeeId !== undefined && patch.picEmployeeId !== batch.picEmployeeId) {
      await writeBatchAudit(tx, {
        batchId,
        action: batch.picEmployeeId ? "PIC_CHANGED" : "PIC_ASSIGNED",
        previousValue: batch.picEmployeeId ?? null,
        newValue: patch.picEmployeeId ?? null,
        adminUserId: patch.adminUserId,
      });
    }

    if (
      (patch.plannedStartAt !== undefined || patch.plannedEndAt !== undefined) &&
      (patch.plannedStartAt !== (batch.plannedStartAt?.toISOString() ?? null) ||
        patch.plannedEndAt !== (batch.plannedEndAt?.toISOString() ?? null))
    ) {
      await writeBatchAudit(tx, {
        batchId,
        action: "PLANNED_DATES_CHANGED",
        previousValue: JSON.stringify({
          plannedStartAt: batch.plannedStartAt,
          plannedEndAt: batch.plannedEndAt,
        }),
        newValue: JSON.stringify({
          plannedStartAt: patch.plannedStartAt,
          plannedEndAt: patch.plannedEndAt,
        }),
        adminUserId: patch.adminUserId,
      });
    }

    if (patch.notes !== undefined && patch.notes !== batch.notes) {
      await writeBatchAudit(tx, {
        batchId,
        action: "NOTES_CHANGED",
        previousValue: batch.notes,
        newValue: patch.notes,
        adminUserId: patch.adminUserId,
      });
    }

    const updated = await tx.itemProductionBatch.update({
      where: { id: batchId },
      data: {
        plannedQuantity: patch.plannedQuantity,
        supplierId: patch.supplierId === undefined ? undefined : patch.supplierId,
        picEmployeeId: patch.picEmployeeId === undefined ? undefined : patch.picEmployeeId,
        name: patch.name === undefined ? undefined : patch.name,
        notes: patch.notes === undefined ? undefined : patch.notes,
        plannedStartAt:
          patch.plannedStartAt === undefined
            ? undefined
            : patch.plannedStartAt
              ? new Date(patch.plannedStartAt)
              : null,
        plannedEndAt:
          patch.plannedEndAt === undefined
            ? undefined
            : patch.plannedEndAt
              ? new Date(patch.plannedEndAt)
              : null,
        updatedByAdminUserId: patch.adminUserId ?? null,
      },
      include: batchInclude,
    });

    await rollupParentFromBatches(tx, batch.itemProductionTrackingId);
    return updated;
  });
}

export async function activateBatch(batchId: string, adminUserId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.itemProductionBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error("Không tìm thấy lô sản xuất");
    if (batch.status !== "DRAFT") throw new Error("Chỉ có thể kích hoạt lô ở trạng thái nháp.");
    const updated = await tx.itemProductionBatch.update({
      where: { id: batchId },
      data: {
        status: "ACTIVE",
        actualStartAt: batch.actualStartAt ?? new Date(),
        updatedByAdminUserId: adminUserId ?? null,
      },
      include: batchInclude,
    });
    await writeBatchAudit(tx, {
      batchId,
      action: "ACTIVATED",
      adminUserId,
    });
    await rollupParentFromBatches(tx, batch.itemProductionTrackingId);
    return updated;
  });
}

export async function completeBatch(batchId: string, adminUserId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.itemProductionBatch.findUnique({
      where: { id: batchId },
      include: { stages: true },
    });
    if (!batch) throw new Error("Không tìm thấy lô sản xuất");
    if (batch.status !== "ACTIVE") throw new Error("Chỉ có thể hoàn tất lô đang hoạt động.");
    const applicable = batch.stages.filter((s) => s.isApplicable && s.status !== "SKIPPED");
    const unfinished = applicable.filter((s) => s.status !== "COMPLETED");
    if (unfinished.length > 0) {
      throw new Error("Không thể hoàn tất lô vì vẫn còn công đoạn bắt buộc chưa hoàn thành.");
    }
    const updated = await tx.itemProductionBatch.update({
      where: { id: batchId },
      data: {
        status: "COMPLETED",
        actualEndAt: new Date(),
        updatedByAdminUserId: adminUserId ?? null,
      },
      include: batchInclude,
    });
    await writeBatchAudit(tx, { batchId, action: "COMPLETED", adminUserId });
    await rollupParentFromBatches(tx, batch.itemProductionTrackingId);
    return updated;
  });
}

export async function cancelBatch(batchId: string, note?: string, adminUserId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.itemProductionBatch.findUnique({
      where: { id: batchId },
      include: { stages: true },
    });
    if (!batch) throw new Error("Không tìm thấy lô sản xuất");
    if (batch.status === "CANCELLED") throw new Error("Lô đã được hủy.");
    if (batch.status === "COMPLETED") throw new Error("Không thể hủy lô đã hoàn tất.");
    const hasProgress = batch.stages.some(
      (s) => s.completedQuantity > 0 || s.status === "IN_PROGRESS" || s.status === "BLOCKED",
    );
    if (hasProgress) {
      throw new Error("Không thể hủy lô đã có tiến độ nếu chưa xử lý dữ liệu sản xuất.");
    }
    const updated = await tx.itemProductionBatch.update({
      where: { id: batchId },
      data: {
        status: "CANCELLED",
        updatedByAdminUserId: adminUserId ?? null,
        notes: note ? `${batch.notes ?? ""}\n[Hủy] ${note}`.trim() : batch.notes,
      },
      include: batchInclude,
    });
    await writeBatchAudit(tx, {
      batchId,
      action: "CANCELLED",
      note,
      adminUserId,
    });
    await rollupParentFromBatches(tx, batch.itemProductionTrackingId);
    return updated;
  });
}

export type BatchStageAction = "START" | "PROGRESS_UPDATE" | "COMPLETE" | "BLOCK" | "UNBLOCK" | "REOPEN";

export async function applyBatchStageProgress(input: {
  batchStageId: string;
  action: BatchStageAction;
  quantityDelta?: number;
  acceptedQuantityDelta?: number;
  rejectedQuantityDelta?: number;
  reworkQuantityDelta?: number;
  wasteQuantityDelta?: number;
  note?: string;
  expectedEnd?: string;
  adminUserId?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const stage = await tx.itemProductionBatchStage.findUnique({
      where: { id: input.batchStageId },
      include: { batch: { include: { stages: true, itemProductionTracking: true } } },
    });
    if (!stage) throw new Error("Không tìm thấy công đoạn");
    if (!stage.isApplicable) throw new Error("Công đoạn không áp dụng cho lô này");
    const batch = stage.batch;
    if (batch.status !== "ACTIVE") {
      throw new Error("Chỉ có thể cập nhật tiến độ lô đang hoạt động.");
    }

    const previousStatus = stage.status;
    let nextStatus: ItemProductionStageStatus = stage.status;
    let completedQuantity = stage.completedQuantity;
    let acceptedQuantity = stage.acceptedQuantity;
    let rejectedQuantity = stage.rejectedQuantity;
    let reworkQuantity = stage.reworkQuantity;
    let wasteQuantity = stage.wasteQuantity;
    let receivedQuantity = stage.receivedQuantity;
    let inProgressQuantity = stage.inProgressQuantity;
    let actualStartAt = stage.actualStartAt;
    let actualEndAt = stage.actualEndAt;
    let eventType: ItemProductionProgressEventType = "PROGRESS_UPDATE";
    const qtyDelta = input.quantityDelta ?? 0;

    switch (input.action) {
      case "START":
        if (stage.status === "COMPLETED") throw new Error("Công đoạn đã hoàn thành");
        nextStatus = "IN_PROGRESS";
        actualStartAt = actualStartAt ?? new Date();
        eventType = "START";
        break;
      case "PROGRESS_UPDATE":
        completedQuantity += qtyDelta;
        acceptedQuantity += input.acceptedQuantityDelta ?? 0;
        rejectedQuantity += input.rejectedQuantityDelta ?? 0;
        reworkQuantity += input.reworkQuantityDelta ?? 0;
        wasteQuantity += input.wasteQuantityDelta ?? 0;
        receivedQuantity = Math.max(receivedQuantity, completedQuantity);
        inProgressQuantity = Math.max(0, (stage.plannedQuantity || completedQuantity) - completedQuantity);
        nextStatus = "IN_PROGRESS";
        actualStartAt = actualStartAt ?? new Date();
        if (stage.plannedQuantity > 0 && completedQuantity >= stage.plannedQuantity) {
          nextStatus = "COMPLETED";
          actualEndAt = new Date();
          eventType = "COMPLETE";
        } else {
          eventType = "PROGRESS_UPDATE";
        }
        break;
      case "COMPLETE":
        if (qtyDelta > 0) completedQuantity += qtyDelta;
        if (completedQuantity <= 0 && stage.plannedQuantity > 0) {
          completedQuantity = stage.plannedQuantity;
        }
        acceptedQuantity += input.acceptedQuantityDelta ?? 0;
        if (acceptedQuantity <= 0) acceptedQuantity = completedQuantity;
        nextStatus = "COMPLETED";
        actualStartAt = actualStartAt ?? new Date();
        actualEndAt = new Date();
        eventType = "COMPLETE";
        break;
      case "BLOCK":
        nextStatus = "BLOCKED";
        eventType = "BLOCK";
        break;
      case "UNBLOCK":
        nextStatus =
          previousStatus === "BLOCKED" || previousStatus === "NOT_STARTED"
            ? "IN_PROGRESS"
            : previousStatus;
        eventType = "UNBLOCK";
        break;
      case "REOPEN":
        if (previousStatus !== "COMPLETED" && previousStatus !== "SKIPPED") {
          throw new Error("Chỉ mở lại công đoạn đã hoàn thành hoặc bỏ qua");
        }
        nextStatus = "IN_PROGRESS";
        actualEndAt = null;
        eventType = "REOPEN";
        break;
      default:
        throw new Error("Hành động không hợp lệ");
    }

    const validationError = validateQuantityUpdate({
      plannedQuantity: stage.plannedQuantity,
      completedQuantity,
      acceptedQuantity,
      rejectedQuantity,
      reworkQuantity,
      wasteQuantity,
    });
    if (validationError) throw new Error(validationError);

    await tx.itemProductionBatchStage.update({
      where: { id: stage.id },
      data: {
        status: nextStatus,
        completedQuantity,
        acceptedQuantity,
        rejectedQuantity,
        reworkQuantity,
        wasteQuantity,
        receivedQuantity,
        inProgressQuantity,
        actualStartAt,
        actualEndAt,
        plannedEndAt: input.expectedEnd ? new Date(input.expectedEnd) : undefined,
        note: input.note ?? stage.note,
      },
    });

    await tx.itemProductionBatchProgressEntry.create({
      data: {
        batchStageId: stage.id,
        eventType,
        quantityDelta: qtyDelta,
        acceptedQuantityDelta: input.acceptedQuantityDelta ?? 0,
        rejectedQuantityDelta: input.rejectedQuantityDelta ?? 0,
        reworkQuantityDelta: input.reworkQuantityDelta ?? 0,
        wasteQuantityDelta: input.wasteQuantityDelta ?? 0,
        previousStatus,
        nextStatus,
        note: input.note,
        createdByAdminUserId: input.adminUserId ?? null,
      },
    });

    const refreshedStages = await tx.itemProductionBatchStage.findMany({
      where: { batchId: batch.id },
      orderBy: { sequence: "asc" },
    });

    const recomputed = recomputeBatchFromStages(refreshedStages, {
      promisedDeliveryDate: batch.itemProductionTracking.promisedDeliveryDate,
      lastProgressAt: new Date(),
      hasSupplier: batch.supplierId != null,
      batchStatus: batch.status,
    });

    await tx.itemProductionBatch.update({
      where: { id: batch.id },
      data: {
        progressPercent: recomputed.progressPercent,
        readyQuantity: Math.min(recomputed.readyQuantity, batch.plannedQuantity),
        riskStatus: recomputed.riskStatus,
        currentStageKey: recomputed.currentStageKey,
        lastProgressAt: new Date(),
        actualStartAt: batch.actualStartAt ?? actualStartAt ?? new Date(),
      },
    });

    await rollupParentFromBatches(tx, batch.itemProductionTrackingId);

    return tx.itemProductionBatch.findUnique({
      where: { id: batch.id },
      include: batchInclude,
    });
  });
}

export async function getBatchStageHistory(batchStageId: string) {
  return prisma.itemProductionBatchProgressEntry.findMany({
    where: { batchStageId },
    orderBy: { happenedAt: "desc" },
    include: { createdByAdminUser: { select: { id: true, username: true } } },
  });
}
