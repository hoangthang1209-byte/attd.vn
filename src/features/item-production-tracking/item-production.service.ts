import type {
  ItemProductionDeliveryStatus,
  ItemProductionProgressEventType,
  ItemProductionRiskStatus,
  ItemProductionStageKey,
  ItemProductionStageStatus,
  ItemProductionStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ITEM_PRODUCTION_DEFAULT_WEIGHTS,
  ITEM_PRODUCTION_RISK_CONFIG,
  ITEM_PRODUCTION_STAGE_LABELS,
} from "@/features/item-production-tracking/config";
import {
  computeRiskStatus,
  computeWeightedProgressPercent,
  deriveCurrentStageKey,
  deriveDeliveryStatus,
  deriveReadyQuantity,
  validateQuantityUpdate,
} from "@/features/item-production-tracking/progress-risk";
import {
  ensureSystemWorkflowTemplates,
  listWorkflowTemplates,
} from "@/features/item-production-tracking/workflow-templates";
import type { ProductionListFilters } from "@/features/item-production-tracking/types";
import {
  computeAllocatedQuantity,
  computeUnallocatedQuantity,
} from "@/features/item-production-tracking/batch-aggregation";

export type { ProductionListFilters } from "@/features/item-production-tracking/types";

function daysAgo(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function recomputeFromStages(
  stages: Array<{
    stageKey: ItemProductionStageKey;
    isApplicable: boolean;
    weight: number;
    status: ItemProductionStageStatus;
    plannedQuantity: number;
    completedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    reworkQuantity: number;
    sequence: number;
  }>,
  meta: {
    productionStatus: ItemProductionStatus;
    promisedDeliveryDate: Date | null;
    lastProgressAt: Date | null;
    hasSupplier: boolean;
  },
) {
  const progressPercent = computeWeightedProgressPercent(stages);
  const readyQuantity = deriveReadyQuantity(stages);
  const plannedFromStages = stages.reduce((max, s) => Math.max(max, s.plannedQuantity), 0);
  const deliveryStatus = deriveDeliveryStatus({
    readyQuantity,
    plannedQuantity: plannedFromStages,
  });
  const currentStageKey = deriveCurrentStageKey(stages);
  const hasBlockedStage = stages.some((s) => s.isApplicable && s.status === "BLOCKED");
  const hasRejectedOrRework = stages.some(
    (s) => s.isApplicable && (s.rejectedQuantity > 0 || s.reworkQuantity > 0),
  );
  let productionStatus = meta.productionStatus;
  if (productionStatus !== "CANCELLED" && productionStatus !== "ON_HOLD" && productionStatus !== "DRAFT") {
    const applicable = stages.filter((s) => s.isApplicable && s.status !== "SKIPPED");
    if (applicable.length > 0 && applicable.every((s) => s.status === "COMPLETED")) {
      productionStatus = "COMPLETED";
    } else if (applicable.some((s) => s.status === "IN_PROGRESS" || s.status === "COMPLETED" || s.status === "BLOCKED")) {
      const finishing = applicable.some(
        (s) =>
          (s.stageKey === "FINISHING" || s.stageKey === "IRONING" || s.stageKey === "PACKING" || s.stageKey === "READY_TO_SHIP") &&
          (s.status === "IN_PROGRESS" || s.status === "COMPLETED"),
      );
      productionStatus = finishing && progressPercent >= 70 ? "FINISHING" : "IN_PRODUCTION";
    } else {
      productionStatus = "PLANNED";
    }
  }
  const riskStatus = computeRiskStatus({
    promisedDeliveryDate: meta.promisedDeliveryDate,
    progressPercent,
    readyQuantity,
    plannedQuantity: plannedFromStages || readyQuantity,
    lastProgressAt: meta.lastProgressAt,
    productionStatus,
    hasBlockedStage,
    hasRejectedOrRework,
    hasSupplier: meta.hasSupplier,
  });
  return {
    progressPercent,
    readyQuantity,
    deliveryStatus,
    currentStageKey,
    productionStatus,
    riskStatus,
    actualCompletedAt: productionStatus === "COMPLETED" ? new Date() : null,
  };
}

const trackingInclude = {
  orderItem: {
    include: {
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          customerId: true,
          customerNameSnapshot: true,
          customerCompanyName: true,
          productionDueDate: true,
          deliveryExpectedAt: true,
          customer: { select: { id: true, name: true, code: true } },
        },
      },
      variants: { orderBy: { sortOrder: "asc" as const } },
      designMediaAsset: { select: { id: true, url: true, thumbnailUrl: true } },
    },
  },
  supplier: { select: { id: true, code: true, name: true } },
  assignedEmployee: { select: { id: true, employeeCode: true, fullName: true } },
  workflowTemplate: { select: { id: true, code: true, name: true } },
  stages: { orderBy: { sequence: "asc" as const } },
  batches: {
    select: {
      id: true,
      status: true,
      plannedQuantity: true,
      supplierId: true,
      progressPercent: true,
      readyQuantity: true,
      riskStatus: true,
    },
  },
} satisfies Prisma.ItemProductionTrackingInclude;

export async function listProductionItems(filters: ProductionListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const now = new Date();
  const staleBefore = daysAgo(ITEM_PRODUCTION_RISK_CONFIG.staleUpdateDays, now);

  const where: Prisma.ItemProductionTrackingWhereInput = {};
  const orderItemFilter: Prisma.OrderItemWhereInput = {};
  if (filters.orderId) orderItemFilter.orderId = filters.orderId;
  if (filters.customerId) orderItemFilter.order = { customerId: filters.customerId };
  if (Object.keys(orderItemFilter).length > 0) where.orderItem = orderItemFilter;
  if (filters.productionStatus) where.productionStatus = filters.productionStatus;
  if (filters.deliveryStatus) where.deliveryStatus = filters.deliveryStatus;
  if (filters.currentStage) where.currentStageKey = filters.currentStage;
  if (filters.riskStatus) where.riskStatus = filters.riskStatus;
  if (filters.assignedEmployeeId) where.assignedEmployeeId = filters.assignedEmployeeId;
  if (filters.promisedFrom || filters.promisedTo) {
    where.promisedDeliveryDate = {};
    if (filters.promisedFrom) where.promisedDeliveryDate.gte = new Date(filters.promisedFrom);
    if (filters.promisedTo) where.promisedDeliveryDate.lte = new Date(filters.promisedTo);
  }
  if (filters.onlyDelayed) where.riskStatus = "DELAYED";
  if (filters.readyToShip) {
    where.deliveryStatus = { in: ["READY", "PARTIALLY_READY"] };
  }
  if (filters.onlyStale) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        productionStatus: { in: ["PLANNED", "IN_PRODUCTION", "FINISHING"] },
        OR: [{ lastProgressAt: null }, { lastProgressAt: { lt: staleBefore } }],
      },
    ];
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { orderItem: { order: { orderNo: { contains: q, mode: "insensitive" } } } },
      { orderItem: { order: { customerNameSnapshot: { contains: q, mode: "insensitive" } } } },
      { orderItem: { order: { customerCompanyName: { contains: q, mode: "insensitive" } } } },
      { orderItem: { order: { customer: { name: { contains: q, mode: "insensitive" } } } } },
      { orderItem: { productNameSnapshot: { contains: q, mode: "insensitive" } } },
      { orderItem: { skuSnapshot: { contains: q, mode: "insensitive" } } },
      { orderItem: { colorSnapshot: { contains: q, mode: "insensitive" } } },
      { orderItem: { id: { contains: q, mode: "insensitive" } } },
      { supplier: { name: { contains: q, mode: "insensitive" } } },
      { batches: { some: { code: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (filters.supplierId) {
    const supplierMatch: Prisma.ItemProductionTrackingWhereInput = {
      OR: [
        { supplierId: filters.supplierId },
        { batches: { some: { supplierId: filters.supplierId, status: { not: "CANCELLED" } } } },
      ],
    };
    if (where.OR) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: Array.isArray(where.OR) ? where.OR : [where.OR] },
        supplierMatch,
      ];
      delete where.OR;
    } else {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), supplierMatch];
    }
  }

  if (filters.batchRiskStatus) {
    where.batches = {
      ...(where.batches as Prisma.ItemProductionBatchListRelationFilter | undefined),
      some: { riskStatus: filters.batchRiskStatus as ItemProductionRiskStatus, status: "ACTIVE" },
    };
  }

  if (filters.batchStatus) {
    where.batches = {
      ...(where.batches as Prisma.ItemProductionBatchListRelationFilter | undefined),
      some: { status: filters.batchStatus as Prisma.EnumItemProductionBatchStatusFilter["equals"] },
    };
  }

  if (filters.hasBatches) {
    where.batches = {
      ...(where.batches as Prisma.ItemProductionBatchListRelationFilter | undefined),
      some: { status: { not: "CANCELLED" } },
    };
  }

  if (filters.noBatches) {
    where.batches = {
      ...(where.batches as Prisma.ItemProductionBatchListRelationFilter | undefined),
      none: { status: { not: "CANCELLED" } },
    };
  }

  if (filters.partiallyAllocated || filters.fullyAllocated || filters.unallocated) {
    const candidates = await prisma.itemProductionTracking.findMany({
      where,
      select: {
        id: true,
        plannedQuantity: true,
        batches: { select: { status: true, plannedQuantity: true } },
      },
    });
    const matchedIds = candidates
      .filter((item) => {
        const allocated = computeAllocatedQuantity(item.batches);
        const unallocated = computeUnallocatedQuantity(item.plannedQuantity, item.batches);
        const hasNonCancelled = item.batches.some((b) => b.status !== "CANCELLED");
        if (filters.partiallyAllocated) return hasNonCancelled && unallocated > 0 && allocated > 0;
        if (filters.fullyAllocated) return hasNonCancelled && unallocated === 0;
        if (filters.unallocated) return unallocated > 0;
        return true;
      })
      .map((i) => i.id);
    where.id = { in: matchedIds.length > 0 ? matchedIds : ["__none__"] };
  }

  const [total, items, kpiGroups] = await Promise.all([
    prisma.itemProductionTracking.count({ where }),
    prisma.itemProductionTracking.findMany({
      where,
      include: trackingInclude,
      orderBy: [{ lastProgressAt: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.itemProductionTracking.groupBy({
      by: ["productionStatus", "riskStatus", "deliveryStatus", "currentStageKey"],
      _count: { _all: true },
    }),
  ]);

  const kpis = {
    total: await prisma.itemProductionTracking.count(),
    inProduction: 0,
    awaitingQc: 0,
    readyToShip: 0,
    needsAttention: 0,
    atRisk: 0,
    delayed: 0,
    stale: await prisma.itemProductionTracking.count({
      where: {
        productionStatus: { in: ["PLANNED", "IN_PRODUCTION", "FINISHING"] },
        OR: [{ lastProgressAt: null }, { lastProgressAt: { lt: staleBefore } }],
      },
    }),
  };
  for (const row of kpiGroups) {
    const c = row._count._all;
    if (row.productionStatus === "IN_PRODUCTION" || row.productionStatus === "FINISHING") kpis.inProduction += c;
    if (row.currentStageKey === "QC") kpis.awaitingQc += c;
    if (row.deliveryStatus === "READY" || row.deliveryStatus === "PARTIALLY_READY") kpis.readyToShip += c;
    if (row.riskStatus === "NEEDS_ATTENTION") kpis.needsAttention += c;
    if (row.riskStatus === "AT_RISK") kpis.atRisk += c;
    if (row.riskStatus === "DELAYED") kpis.delayed += c;
  }

  const itemsWithBatchSummary = items.map((item) => {
    const nonCancelled = item.batches.filter((b) => b.status !== "CANCELLED");
    const allocatedQuantity = computeAllocatedQuantity(item.batches);
    const unallocatedQuantity = computeUnallocatedQuantity(item.plannedQuantity, item.batches);
    const supplierIds = new Set(
      nonCancelled.map((b) => b.supplierId).filter((id): id is string => id != null),
    );
    const activeBatches = item.batches.filter((b) => b.status === "ACTIVE");
    return {
      ...item,
      batchSummary: {
        hasBatches: nonCancelled.length > 0,
        batchCount: nonCancelled.length,
        allocatedQuantity,
        unallocatedQuantity,
        supplierCount: supplierIds.size,
        usesBatchExecution: activeBatches.length > 0,
      },
    };
  });

  return { items: itemsWithBatchSummary, total, page, pageSize, kpis };
}

export async function getProductionItem(id: string) {
  return prisma.itemProductionTracking.findUnique({
    where: { id },
    include: {
      ...trackingInclude,
      stages: {
        orderBy: { sequence: "asc" },
        include: {
          history: {
            orderBy: { happenedAt: "desc" },
            take: 30,
            include: { createdByAdminUser: { select: { id: true, username: true } } },
          },
        },
      },
    },
  });
}

export async function getOrderProductionSummary(orderId: string) {
  const items = await prisma.itemProductionTracking.findMany({
    where: { orderItem: { orderId } },
    select: {
      id: true,
      progressPercent: true,
      readyQuantity: true,
      plannedQuantity: true,
      riskStatus: true,
      productionStatus: true,
      deliveryStatus: true,
    },
  });
  const total = items.length;
  const avgProgress =
    total === 0
      ? 0
      : Math.round(
          (items.reduce((s, i) => s + Number(i.progressPercent), 0) / total) * 100,
        ) / 100;
  return {
    total,
    averageProgressPercent: avgProgress,
    readyQuantity: items.reduce((s, i) => s + i.readyQuantity, 0),
    plannedQuantity: items.reduce((s, i) => s + i.plannedQuantity, 0),
    atRiskCount: items.filter((i) => i.riskStatus === "AT_RISK" || i.riskStatus === "NEEDS_ATTENTION").length,
    delayedCount: items.filter((i) => i.riskStatus === "DELAYED").length,
    items,
  };
}

export async function initializeFromOrder(input: {
  orderId: string;
  defaultTemplateCode?: string;
  templateIdByOrderItemId?: Record<string, string>;
  customStageKeysByOrderItemId?: Record<string, ItemProductionStageKey[]>;
  adminUserId?: string | null;
}) {
  await ensureSystemWorkflowTemplates();
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!order) throw new Error("Không tìm thấy đơn hàng");
  if (order.status === "CANCELLED") {
    throw new Error("Không thể khởi tạo theo dõi cho đơn đã hủy");
  }

  const templates = await listWorkflowTemplates();
  const defaultCode = input.defaultTemplateCode ?? "TEE_PRINT_EMBROIDERY";
  const defaultTemplate = templates.find((t) => t.code === defaultCode) ?? templates[0];
  if (!defaultTemplate) throw new Error("Chưa có workflow template");

  const promised = order.deliveryExpectedAt ?? order.productionDueDate ?? null;
  const createdIds: string[] = [];
  const skipped: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const existing = await tx.itemProductionTracking.findUnique({
        where: { orderItemId: item.id },
        select: { id: true },
      });
      if (existing) {
        skipped.push(item.id);
        continue;
      }
      const templateId = input.templateIdByOrderItemId?.[item.id] ?? defaultTemplate.id;
      const template =
        templates.find((t) => t.id === templateId) ??
        (await tx.itemProductionWorkflowTemplate.findUnique({
          where: { id: templateId },
          include: { steps: { orderBy: { sequence: "asc" } } },
        }));
      if (!template) throw new Error("Workflow template không hợp lệ");

      const customKeys = input.customStageKeysByOrderItemId?.[item.id];
      const steps = template.steps
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((step) => {
          const enabled = !customKeys || customKeys.includes(step.stageKey);
          return {
            ...step,
            isApplicable: enabled && step.isApplicable,
            status: (enabled ? "NOT_STARTED" : "SKIPPED") as ItemProductionStageStatus,
          };
        });

      const qty = item.quantity;
      const tracking = await tx.itemProductionTracking.create({
        data: {
          orderItemId: item.id,
          workflowTemplateId: template.id,
          productionStatus: "PLANNED",
          deliveryStatus: "NOT_READY",
          riskStatus: "ON_TRACK",
          orderedQuantity: qty,
          plannedQuantity: qty,
          readyQuantity: 0,
          progressPercent: 0,
          promisedDeliveryDate: promised,
          currentStageKey: steps.find((s) => s.isApplicable)?.stageKey ?? null,
          stages: {
            create: steps.map((step) => ({
              stageKey: step.stageKey,
              labelSnapshot: step.label || ITEM_PRODUCTION_STAGE_LABELS[step.stageKey],
              sequence: step.sequence,
              isApplicable: step.isApplicable,
              weight: step.weight || ITEM_PRODUCTION_DEFAULT_WEIGHTS[step.stageKey],
              status: step.status,
              plannedQuantity: step.isApplicable ? qty : 0,
            })),
          },
        },
      });
      createdIds.push(tracking.id);
    }
  });

  return { createdIds, skippedOrderItemIds: skipped, createdCount: createdIds.length };
}

export async function updateProductionItem(
  id: string,
  patch: {
    supplierId?: string | null;
    assignedEmployeeId?: string | null;
    note?: string | null;
    promisedDeliveryDate?: string | null;
    productionStatus?: ItemProductionStatus;
    expectedRowVersion?: number;
  },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.itemProductionTracking.findUnique({
      where: { id },
      include: { stages: true },
    });
    if (!current) throw new Error("Không tìm thấy item sản xuất");
    if (patch.expectedRowVersion != null && patch.expectedRowVersion !== current.rowVersion) {
      throw new Error("Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại.");
    }

    const stages = current.stages;
    const recomputed = recomputeFromStages(stages, {
      productionStatus: patch.productionStatus ?? current.productionStatus,
      promisedDeliveryDate:
        patch.promisedDeliveryDate === undefined
          ? current.promisedDeliveryDate
          : patch.promisedDeliveryDate
            ? new Date(patch.promisedDeliveryDate)
            : null,
      lastProgressAt: current.lastProgressAt,
      hasSupplier: (patch.supplierId !== undefined ? patch.supplierId : current.supplierId) != null,
    });

    return tx.itemProductionTracking.update({
      where: { id },
      data: {
        supplierId: patch.supplierId === undefined ? undefined : patch.supplierId,
        assignedEmployeeId: patch.assignedEmployeeId === undefined ? undefined : patch.assignedEmployeeId,
        note: patch.note === undefined ? undefined : patch.note,
        promisedDeliveryDate:
          patch.promisedDeliveryDate === undefined
            ? undefined
            : patch.promisedDeliveryDate
              ? new Date(patch.promisedDeliveryDate)
              : null,
        productionStatus: recomputed.productionStatus,
        deliveryStatus: recomputed.deliveryStatus,
        riskStatus: recomputed.riskStatus,
        progressPercent: recomputed.progressPercent,
        readyQuantity: recomputed.readyQuantity,
        currentStageKey: recomputed.currentStageKey,
        actualCompletedAt: recomputed.actualCompletedAt ?? undefined,
        rowVersion: { increment: 1 },
      },
      include: trackingInclude,
    });
  });
}

export type StageAction = "START" | "PROGRESS_UPDATE" | "COMPLETE" | "BLOCK" | "UNBLOCK" | "REOPEN";

export async function applyStageProgress(input: {
  stageId: string;
  action: StageAction;
  quantityDelta?: number;
  acceptedQuantityDelta?: number;
  rejectedQuantityDelta?: number;
  reworkQuantityDelta?: number;
  wasteQuantityDelta?: number;
  note?: string;
  expectedEnd?: string;
  adminUserId?: string | null;
  expectedRowVersion?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const stage = await tx.itemProductionStage.findUnique({
      where: { id: input.stageId },
      include: {
        productionItem: {
          include: {
            stages: true,
            batches: { where: { status: "ACTIVE" }, select: { id: true } },
          },
        },
      },
    });
    if (!stage) throw new Error("Không tìm thấy công đoạn");
    if (!stage.isApplicable) throw new Error("Công đoạn không áp dụng cho item này");
    const item = stage.productionItem;
    if (item.batches.length > 0) {
      throw new Error("Item đang theo dõi theo lô. Vui lòng cập nhật tiến độ ở cấp lô.");
    }
    if (input.expectedRowVersion != null && input.expectedRowVersion !== item.rowVersion) {
      throw new Error("Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại.");
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

    await tx.itemProductionStage.update({
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

    await tx.itemProductionProgressEntry.create({
      data: {
        productionStageId: stage.id,
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

    const refreshedStages = await tx.itemProductionStage.findMany({
      where: { productionItemId: item.id },
      orderBy: { sequence: "asc" },
    });
    const recomputed = recomputeFromStages(refreshedStages, {
      productionStatus: item.productionStatus === "DRAFT" ? "IN_PRODUCTION" : item.productionStatus,
      promisedDeliveryDate: item.promisedDeliveryDate,
      lastProgressAt: new Date(),
      hasSupplier: item.supplierId != null,
    });

    const updated = await tx.itemProductionTracking.update({
      where: { id: item.id },
      data: {
        productionStatus: recomputed.productionStatus,
        deliveryStatus: recomputed.deliveryStatus as ItemProductionDeliveryStatus,
        riskStatus: recomputed.riskStatus as ItemProductionRiskStatus,
        progressPercent: recomputed.progressPercent,
        readyQuantity: Math.min(recomputed.readyQuantity, item.plannedQuantity),
        currentStageKey: recomputed.currentStageKey,
        lastProgressAt: new Date(),
        actualCompletedAt: recomputed.productionStatus === "COMPLETED" ? new Date() : item.actualCompletedAt,
        rowVersion: { increment: 1 },
      },
      include: trackingInclude,
    });

    return updated;
  });
}

export async function getStageHistory(stageId: string) {
  return prisma.itemProductionProgressEntry.findMany({
    where: { productionStageId: stageId },
    orderBy: { happenedAt: "desc" },
    include: { createdByAdminUser: { select: { id: true, username: true } } },
  });
}

export { listWorkflowTemplates, ensureSystemWorkflowTemplates };
