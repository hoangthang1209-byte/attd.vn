import type {
  Prisma,
  ProductionStageStatus,
  ProductionStageType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PRODUCTION_STAGE_TYPES,
  DEFAULT_STAGE_SORT_ORDER,
  PRODUCTION_STAGE_STATUS_LABELS,
  PRODUCTION_STAGE_TYPE_LABELS,
} from "@/features/orders/production-execution-labels";
import { getRequiredProductionStageTypes } from "@/features/orders/order-item-stage-profile";
import {
  decimalToNumber,
  parseQuantityInput,
  ProductionExecutionValidationError,
  serializeDecimal,
  validateStageQuantities,
} from "@/features/orders/production-quantity";

export type ProductionStageRecord = {
  id: string;
  orderId: string;
  orderItemId: string | null;
  stageType: ProductionStageType;
  stageTypeLabel: string;
  status: ProductionStageStatus;
  statusLabel: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  plannedQuantity: string | null;
  completedQuantity: string;
  passedQuantity: string;
  defectQuantity: string;
  reworkQuantity: string;
  scrapQuantity: string;
  note: string | null;
  sortOrder: number;
};

function mapStage(row: Prisma.OrderProductionStageGetPayload<{
  include: { assignedEmployee: { select: { fullName: true } } };
}>): ProductionStageRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    stageType: row.stageType,
    stageTypeLabel: PRODUCTION_STAGE_TYPE_LABELS[row.stageType],
    status: row.status,
    statusLabel: PRODUCTION_STAGE_STATUS_LABELS[row.status],
    assignedEmployeeId: row.assignedEmployeeId,
    assignedEmployeeName: row.assignedEmployee?.fullName ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    plannedQuantity: row.plannedQuantity ? serializeDecimal(row.plannedQuantity) : null,
    completedQuantity: serializeDecimal(row.completedQuantity),
    passedQuantity: serializeDecimal(row.passedQuantity),
    defectQuantity: serializeDecimal(row.defectQuantity),
    reworkQuantity: serializeDecimal(row.reworkQuantity),
    scrapQuantity: serializeDecimal(row.scrapQuantity),
    note: row.note,
    sortOrder: row.sortOrder,
  };
}

const stageInclude = {
  assignedEmployee: { select: { fullName: true } },
} as const;

export async function listProductionStages(
  orderId: string,
  options?: { orderItemId?: string | null },
): Promise<ProductionStageRecord[]> {
  const where: Prisma.OrderProductionStageWhereInput = { orderId };
  if (options?.orderItemId === null) {
    where.orderItemId = null;
  } else if (options?.orderItemId) {
    where.orderItemId = options.orderItemId;
  }
  const rows = await prisma.orderProductionStage.findMany({
    where,
    include: stageInclude,
    orderBy: [{ sortOrder: "asc" }, { stageType: "asc" }],
  });
  return rows.map(mapStage);
}

export async function listAllProductionStagesForOrder(orderId: string): Promise<ProductionStageRecord[]> {
  const rows = await prisma.orderProductionStage.findMany({
    where: { orderId },
    include: stageInclude,
    orderBy: [{ orderItemId: "asc" }, { sortOrder: "asc" }, { stageType: "asc" }],
  });
  return rows.map(mapStage);
}

export function hasLegacyOrderLevelStages(stages: ProductionStageRecord[]): boolean {
  return stages.some((s) => !s.orderItemId);
}

export async function initializeProductionStagesForOrderItem(
  orderId: string,
  orderItemId: string,
): Promise<ProductionStageRecord[]> {
  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, orderId },
    select: { supplySource: true, processingMethod: true },
  });
  if (!item) throw new ProductionExecutionValidationError("Không tìm thấy dòng sản phẩm.");

  const stageTypes = getRequiredProductionStageTypes({
    supplySource: item.supplySource,
    processingMethod: item.processingMethod,
  });

  const existing = await prisma.orderProductionStage.findMany({
    where: { orderId, orderItemId },
    select: { stageType: true },
  });
  const existingTypes = new Set(existing.map((r) => r.stageType));

  const toCreate = stageTypes.filter((t) => !existingTypes.has(t));
  if (toCreate.length > 0) {
    await prisma.orderProductionStage.createMany({
      data: toCreate.map((stageType) => ({
        orderId,
        orderItemId,
        stageType,
        status: "NOT_STARTED" as const,
        sortOrder: DEFAULT_STAGE_SORT_ORDER[stageType],
      })),
    });
  }

  return listProductionStages(orderId, { orderItemId });
}

export async function ensureProductionStagesForOrderItem(
  orderId: string,
  orderItemId: string,
): Promise<ProductionStageRecord[]> {
  const legacyCount = await prisma.orderProductionStage.count({
    where: { orderId, orderItemId: null },
  });
  if (legacyCount > 0) {
    return listProductionStages(orderId, { orderItemId: null });
  }

  const count = await prisma.orderProductionStage.count({ where: { orderId, orderItemId } });
  if (count === 0) {
    return initializeProductionStagesForOrderItem(orderId, orderItemId);
  }
  return listProductionStages(orderId, { orderItemId });
}

export async function ensureProductionStagesInitializedForOrder(
  orderId: string,
): Promise<ProductionStageRecord[]> {
  const legacyCount = await prisma.orderProductionStage.count({
    where: { orderId, orderItemId: null },
  });
  if (legacyCount > 0) {
    return listProductionStages(orderId, { orderItemId: null });
  }

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });

  const allStages: ProductionStageRecord[] = [];
  for (const item of items) {
    const stages = await ensureProductionStagesForOrderItem(orderId, item.id);
    allStages.push(...stages);
  }
  return allStages;
}

export async function initializeProductionStages(orderId: string): Promise<ProductionStageRecord[]> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");

  const existing = await prisma.orderProductionStage.findMany({
    where: { orderId },
    select: { stageType: true },
  });
  const existingTypes = new Set(existing.map((r) => r.stageType));

  const toCreate = DEFAULT_PRODUCTION_STAGE_TYPES.filter((t) => !existingTypes.has(t));
  if (toCreate.length > 0) {
    await prisma.orderProductionStage.createMany({
      data: toCreate.map((stageType) => ({
        orderId,
        stageType,
        status: "NOT_STARTED" as const,
        sortOrder: DEFAULT_STAGE_SORT_ORDER[stageType],
      })),
    });
  }

  return listProductionStages(orderId);
}

export async function ensureProductionStagesInitialized(orderId: string): Promise<ProductionStageRecord[]> {
  return ensureProductionStagesInitializedForOrder(orderId);
}

export type UpdateProductionStageInput = {
  status?: ProductionStageStatus;
  assignedEmployeeId?: string | null;
  plannedQuantity?: unknown;
  completedQuantity?: unknown;
  passedQuantity?: unknown;
  defectQuantity?: unknown;
  reworkQuantity?: unknown;
  scrapQuantity?: unknown;
  note?: string | null;
  quantityCorrectionReason?: string | null;
};

export async function updateProductionStage(
  orderId: string,
  stageId: string,
  input: UpdateProductionStageInput,
): Promise<ProductionStageRecord> {
  const stage = await prisma.orderProductionStage.findFirst({
    where: { id: stageId, orderId },
    include: stageInclude,
  });
  if (!stage) throw new ProductionExecutionValidationError("Không tìm thấy công đoạn sản xuất.");

  const now = new Date();
  const data: Prisma.OrderProductionStageUpdateInput = {};

  const completedQuantity = input.completedQuantity !== undefined
    ? parseQuantityInput(input.completedQuantity, "Số lượng hoàn thành")
    : stage.completedQuantity;
  const passedQuantity = input.passedQuantity !== undefined
    ? parseQuantityInput(input.passedQuantity, "Số lượng đạt")
    : stage.passedQuantity;
  const defectQuantity = input.defectQuantity !== undefined
    ? parseQuantityInput(input.defectQuantity, "Số lượng lỗi")
    : stage.defectQuantity;
  const reworkQuantity = input.reworkQuantity !== undefined
    ? parseQuantityInput(input.reworkQuantity, "Số lượng làm lại")
    : stage.reworkQuantity;
  const scrapQuantity = input.scrapQuantity !== undefined
    ? parseQuantityInput(input.scrapQuantity, "Số lượng hủy")
    : stage.scrapQuantity;

  const quantityChanged =
    input.completedQuantity !== undefined ||
    input.passedQuantity !== undefined ||
    input.defectQuantity !== undefined ||
    input.reworkQuantity !== undefined ||
    input.scrapQuantity !== undefined;

  const prevSum =
    decimalToNumber(stage.passedQuantity) +
    decimalToNumber(stage.defectQuantity) +
    decimalToNumber(stage.reworkQuantity) +
    decimalToNumber(stage.scrapQuantity);
  const newSum =
    decimalToNumber(passedQuantity) +
    decimalToNumber(defectQuantity) +
    decimalToNumber(reworkQuantity) +
    decimalToNumber(scrapQuantity);
  const prevCompleted = decimalToNumber(stage.completedQuantity);
  const newCompleted = decimalToNumber(completedQuantity);
  const materialQuantityChange =
    quantityChanged &&
    (prevSum !== newSum || prevCompleted !== newCompleted) &&
    (stage.status === "COMPLETED" || stage.status === "SKIPPED");

  if (materialQuantityChange && !input.quantityCorrectionReason?.trim()) {
    throw new ProductionExecutionValidationError(
      "Vui lòng nhập lý do điều chỉnh số lượng công đoạn đã hoàn thành.",
    );
  }

  validateStageQuantities({
    completedQuantity,
    passedQuantity,
    defectQuantity,
    reworkQuantity,
    scrapQuantity,
    allowExceedCompleted: Boolean(input.quantityCorrectionReason?.trim()),
  });

  if (input.plannedQuantity !== undefined) {
    data.plannedQuantity =
      input.plannedQuantity === null || input.plannedQuantity === ""
        ? null
        : parseQuantityInput(input.plannedQuantity, "Số lượng kế hoạch");
  }

  data.completedQuantity = completedQuantity;
  data.passedQuantity = passedQuantity;
  data.defectQuantity = defectQuantity;
  data.reworkQuantity = reworkQuantity;
  data.scrapQuantity = scrapQuantity;

  if (input.assignedEmployeeId !== undefined) {
    data.assignedEmployee = input.assignedEmployeeId
      ? { connect: { id: input.assignedEmployeeId } }
      : { disconnect: true };
  }

  if (input.note !== undefined) {
    data.note = input.note?.trim() || null;
  }

  let activityTitle: string | null = null;
  let activityDetail: string | null = null;
  let activityType: "PRODUCTION_UPDATED" = "PRODUCTION_UPDATED";

  if (input.status !== undefined) {
    const nextStatus = input.status;

    if (nextStatus === "BLOCKED" && !(input.note?.trim() || stage.note?.trim())) {
      throw new ProductionExecutionValidationError("Vui lòng nhập lý do tạm dừng.");
    }

    if (nextStatus === "COMPLETED" && completedQuantity.lte(0)) {
      throw new ProductionExecutionValidationError(
        "Không thể hoàn thành công đoạn khi số lượng hoàn thành bằng 0.",
      );
    }

    if (nextStatus === "IN_PROGRESS" && !stage.startedAt) {
      data.startedAt = now;
    }

    if (nextStatus === "COMPLETED" || nextStatus === "SKIPPED") {
      if (!stage.completedAt) data.completedAt = now;
    }

    if (nextStatus === "NOT_STARTED" || nextStatus === "IN_PROGRESS" || nextStatus === "BLOCKED") {
      data.completedAt = null;
    }

    data.status = nextStatus;

    const stageLabel = PRODUCTION_STAGE_TYPE_LABELS[stage.stageType];
    switch (nextStatus) {
      case "IN_PROGRESS":
        activityTitle = `Bắt đầu công đoạn ${stageLabel}`;
        break;
      case "COMPLETED":
        activityTitle = `Hoàn thành công đoạn ${stageLabel}`;
        activityDetail = `Hoàn thành: ${serializeDecimal(completedQuantity)}; Đạt: ${serializeDecimal(passedQuantity)}`;
        break;
      case "BLOCKED":
        activityTitle = `Tạm dừng công đoạn ${stageLabel}`;
        activityDetail = input.note?.trim() ?? stage.note;
        break;
      case "SKIPPED":
        activityTitle = `Bỏ qua công đoạn ${stageLabel}`;
        activityDetail = input.note?.trim() ?? stage.note;
        break;
      default:
        break;
    }
  } else if (quantityChanged) {
    activityTitle = `Cập nhật số lượng công đoạn ${PRODUCTION_STAGE_TYPE_LABELS[stage.stageType]}`;
    activityDetail = `Hoàn thành: ${serializeDecimal(completedQuantity)}; Đạt: ${serializeDecimal(passedQuantity)}`;
    if (input.quantityCorrectionReason?.trim()) {
      activityDetail += `\nLý do điều chỉnh: ${input.quantityCorrectionReason.trim()}`;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.orderProductionStage.update({
      where: { id: stageId },
      data,
      include: stageInclude,
    });

    if (activityTitle) {
      await tx.orderActivity.create({
        data: {
          orderId,
          type: activityType,
          title: activityTitle,
          detail: activityDetail,
        },
      });
    }

    return row;
  });

  return mapStage(updated);
}

export function computeStageProgressSummary(stages: ProductionStageRecord[]): {
  completedCount: number;
  applicableCount: number;
  progressLabel: string;
  hasBlocked: boolean;
  packingCompleted: boolean;
  packingSkipped: boolean;
} {
  const applicable = stages.filter((s) => s.status !== "SKIPPED");
  const completed = applicable.filter((s) => s.status === "COMPLETED");
  const packing = stages.find((s) => s.stageType === "PACKING");
  return {
    completedCount: completed.length,
    applicableCount: applicable.length,
    progressLabel: `${completed.length}/${applicable.length} công đoạn`,
    hasBlocked: stages.some((s) => s.status === "BLOCKED"),
    packingCompleted: packing?.status === "COMPLETED",
    packingSkipped: packing?.status === "SKIPPED",
  };
}
