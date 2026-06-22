import type {
  DeliveryAttemptResult,
  DeliveryExecutionStatus,
  DeliveryProofType,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import {
  DELIVERY_ATTEMPT_RESULT_LABELS,
  DELIVERY_EXECUTION_STATUS_LABELS,
  DELIVERY_PROOF_TYPE_LABELS,
} from "@/features/orders/delivery-execution-labels";
import { getDeliveryFulfillment } from "@/features/orders/delivery-fulfillment.service";
import {
  parseQuantityInput,
  ProductionExecutionValidationError,
  serializeDecimal,
} from "@/features/orders/production-quantity";

export type DeliveryExecutionItemInput = {
  orderItemId?: string | null;
  orderItemVariantId?: string | null;
  productNameSnapshot: string;
  colorNameSnapshot?: string | null;
  sizeValueSnapshot?: string | null;
  skuSnapshot?: string | null;
  unitSnapshot?: string | null;
  plannedQuantity: unknown;
  dispatchedQuantity?: unknown;
  note?: string | null;
  sortOrder?: number;
  quantityOverrideReason?: string | null;
};

export type DeliveryExecutionItemRecord = {
  id: string;
  orderItemId: string | null;
  orderItemVariantId: string | null;
  productNameSnapshot: string;
  colorNameSnapshot: string | null;
  sizeValueSnapshot: string | null;
  skuSnapshot: string | null;
  unitSnapshot: string | null;
  plannedQuantity: string;
  dispatchedQuantity: string;
  deliveredQuantity: string;
  returnedQuantity: string;
  damagedQuantity: string;
  note: string | null;
  sortOrder: number;
};

export type DeliveryAttemptRecord = {
  id: string;
  attemptNumber: number;
  attemptedAt: string | null;
  attemptedByEmployeeId: string | null;
  attemptedByEmployeeName: string | null;
  result: DeliveryAttemptResult;
  resultLabel: string;
  recipientName: string | null;
  recipientPhone: string | null;
  note: string | null;
  failureReason: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryProofRecord = {
  id: string;
  orderId: string;
  deliveryExecutionId: string;
  deliveryAttemptId: string | null;
  mediaAssetId: string;
  proofType: DeliveryProofType;
  proofTypeLabel: string;
  title: string | null;
  note: string | null;
  mimeType: string;
  filename: string;
  originalName: string | null;
  thumbnailUrl: string | null;
  url: string;
  createdAt: string;
};

export type DeliveryExecutionRecord = {
  id: string;
  orderId: string;
  executionCode: string;
  status: DeliveryExecutionStatus;
  statusLabel: string;
  deliveryMethodId: string | null;
  deliveryCarrierId: string | null;
  carrierNameSnapshot: string | null;
  trackingCode: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  recipientNameSnapshot: string | null;
  recipientPhoneSnapshot: string | null;
  recipientAddressSnapshot: string | null;
  expectedDeliveryAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  totalDispatchedQuantity: string;
  totalDeliveredQuantity: string;
  totalReturnedQuantity: string;
  note: string | null;
  items: DeliveryExecutionItemRecord[];
  attempts: DeliveryAttemptRecord[];
  proofs: DeliveryProofRecord[];
  createdAt: string;
  updatedAt: string;
};

const executionInclude = {
  assignedEmployee: { select: { fullName: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  attempts: {
    include: { attemptedBy: { select: { fullName: true } } },
    orderBy: { attemptNumber: "asc" as const },
  },
  proofs: {
    include: {
      mediaAsset: {
        select: {
          mimeType: true,
          filename: true,
          originalName: true,
          thumbnailUrl: true,
          url: true,
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

type ExecutionRow = Prisma.OrderDeliveryExecutionGetPayload<{ include: typeof executionInclude }>;

function mapProof(
  row: ExecutionRow["proofs"][number],
): DeliveryProofRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    deliveryExecutionId: row.deliveryExecutionId,
    deliveryAttemptId: row.deliveryAttemptId,
    mediaAssetId: row.mediaAssetId,
    proofType: row.proofType,
    proofTypeLabel: DELIVERY_PROOF_TYPE_LABELS[row.proofType],
    title: row.title,
    note: row.note,
    mimeType: row.mediaAsset.mimeType,
    filename: row.mediaAsset.filename,
    originalName: row.mediaAsset.originalName,
    thumbnailUrl: row.mediaAsset.thumbnailUrl,
    url: row.mediaAsset.url,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAttempt(row: ExecutionRow["attempts"][number]): DeliveryAttemptRecord {
  return {
    id: row.id,
    attemptNumber: row.attemptNumber,
    attemptedAt: row.attemptedAt?.toISOString() ?? null,
    attemptedByEmployeeId: row.attemptedByEmployeeId,
    attemptedByEmployeeName: row.attemptedBy?.fullName ?? null,
    result: row.result,
    resultLabel: DELIVERY_ATTEMPT_RESULT_LABELS[row.result],
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    note: row.note,
    failureReason: row.failureReason,
    nextAttemptAt: row.nextAttemptAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapExecution(row: ExecutionRow): DeliveryExecutionRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    executionCode: row.executionCode,
    status: row.status,
    statusLabel: DELIVERY_EXECUTION_STATUS_LABELS[row.status],
    deliveryMethodId: row.deliveryMethodId,
    deliveryCarrierId: row.deliveryCarrierId,
    carrierNameSnapshot: row.carrierNameSnapshot,
    trackingCode: row.trackingCode,
    assignedEmployeeId: row.assignedEmployeeId,
    assignedEmployeeName: row.assignedEmployee?.fullName ?? null,
    recipientNameSnapshot: row.recipientNameSnapshot,
    recipientPhoneSnapshot: row.recipientPhoneSnapshot,
    recipientAddressSnapshot: row.recipientAddressSnapshot,
    expectedDeliveryAt: row.expectedDeliveryAt?.toISOString() ?? null,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    totalDispatchedQuantity: serializeDecimal(row.totalDispatchedQuantity),
    totalDeliveredQuantity: serializeDecimal(row.totalDeliveredQuantity),
    totalReturnedQuantity: serializeDecimal(row.totalReturnedQuantity),
    note: row.note,
    items: row.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      orderItemVariantId: item.orderItemVariantId,
      productNameSnapshot: item.productNameSnapshot,
      colorNameSnapshot: item.colorNameSnapshot,
      sizeValueSnapshot: item.sizeValueSnapshot,
      skuSnapshot: item.skuSnapshot,
      unitSnapshot: item.unitSnapshot,
      plannedQuantity: serializeDecimal(item.plannedQuantity),
      dispatchedQuantity: serializeDecimal(item.dispatchedQuantity),
      deliveredQuantity: serializeDecimal(item.deliveredQuantity),
      returnedQuantity: serializeDecimal(item.returnedQuantity),
      damagedQuantity: serializeDecimal(item.damagedQuantity),
      note: item.note,
      sortOrder: item.sortOrder,
    })),
    attempts: row.attempts.map(mapAttempt),
    proofs: row.proofs.map(mapProof),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function generateDeliveryExecutionCode(): Promise<string> {
  const rows = await prisma.orderDeliveryExecution.findMany({ select: { executionCode: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.executionCode.match(/^GH-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `GH-${String(max + 1).padStart(6, "0")}`;
}

function sumItemQuantities(items: { dispatchedQuantity?: Decimal; deliveredQuantity?: Decimal; returnedQuantity?: Decimal }[]) {
  return {
    dispatched: items.reduce((acc, i) => acc.plus(i.dispatchedQuantity ?? new Decimal(0)), new Decimal(0)),
    delivered: items.reduce((acc, i) => acc.plus(i.deliveredQuantity ?? new Decimal(0)), new Decimal(0)),
    returned: items.reduce((acc, i) => acc.plus(i.returnedQuantity ?? new Decimal(0)), new Decimal(0)),
  };
}

async function logDeliveryActivity(
  orderId: string,
  title: string,
  detail: string | null,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  await client.orderActivity.create({
    data: { orderId, type: "DELIVERY_UPDATED", title, detail },
  });
}

function validateItemQuantities(
  planned: Decimal,
  dispatched: Decimal,
  delivered: Decimal,
  returned: Decimal,
  damaged: Decimal,
  options?: { quantityOverrideReason?: string | null },
): void {
  if (dispatched.gt(planned) && !options?.quantityOverrideReason?.trim()) {
    throw new ProductionExecutionValidationError(
      "Số lượng xuất vượt kế hoạch cần ghi rõ lý do điều chỉnh.",
    );
  }
  const outcome = delivered.plus(returned).plus(damaged);
  if (outcome.gt(dispatched) && !options?.quantityOverrideReason?.trim()) {
    throw new ProductionExecutionValidationError(
      "Tổng giao + hoàn + hư hỏng không được vượt số lượng xuất (trừ khi có lý do điều chỉnh).",
    );
  }
}

export async function listDeliveryExecutions(orderId: string): Promise<DeliveryExecutionRecord[]> {
  const rows = await prisma.orderDeliveryExecution.findMany({
    where: { orderId },
    include: executionInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapExecution);
}

export async function getDeliveryExecution(
  orderId: string,
  executionId: string,
): Promise<DeliveryExecutionRecord | null> {
  const row = await prisma.orderDeliveryExecution.findFirst({
    where: { id: executionId, orderId },
    include: executionInclude,
  });
  return row ? mapExecution(row) : null;
}

export type CreateDeliveryExecutionInput = {
  deliveryMethodId?: string | null;
  deliveryCarrierId?: string | null;
  carrierNameSnapshot?: string | null;
  trackingCode?: string | null;
  assignedEmployeeId?: string | null;
  recipientNameSnapshot?: string | null;
  recipientPhoneSnapshot?: string | null;
  recipientAddressSnapshot?: string | null;
  expectedDeliveryAt?: string | null;
  note?: string | null;
  status?: DeliveryExecutionStatus;
  items: DeliveryExecutionItemInput[];
  quantityOverrideReason?: string | null;
};

export async function buildDefaultExecutionItems(orderId: string): Promise<DeliveryExecutionItemInput[]> {
  const fulfillment = await getDeliveryFulfillment(orderId);
  return fulfillment.lines
    .filter((line) => Number(line.remainingDispatchableQuantity) > 0)
    .map((line, index) => ({
      orderItemId: line.orderItemId,
      orderItemVariantId: line.orderItemVariantId,
      productNameSnapshot: line.productName,
      colorNameSnapshot: line.colorName,
      sizeValueSnapshot: line.sizeValue,
      skuSnapshot: line.sku,
      unitSnapshot: line.unit,
      plannedQuantity: line.remainingDispatchableQuantity,
      dispatchedQuantity: line.remainingDispatchableQuantity,
      sortOrder: index,
    }));
}

export async function createDeliveryExecution(
  orderId: string,
  input: CreateDeliveryExecutionInput,
): Promise<DeliveryExecutionRecord> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      deliveryCarrierRef: { select: { name: true } },
      deliveryMethodRef: { select: { id: true } },
    },
  });
  if (!order) throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");

  if (input.items.length === 0) {
    throw new ProductionExecutionValidationError("Vui lòng chọn ít nhất một dòng sản phẩm.");
  }

  const fulfillment = await getDeliveryFulfillment(orderId);
  const fulfillmentMap = new Map(
    fulfillment.lines.map((l) => [`${l.orderItemId}:${l.orderItemVariantId ?? ""}`, l]),
  );

  const parsedItems = input.items.map((item, index) => {
    const planned = parseQuantityInput(item.plannedQuantity, "Số lượng kế hoạch");
    const dispatched = parseQuantityInput(
      item.dispatchedQuantity ?? item.plannedQuantity,
      "Số lượng xuất",
    );
    const key = `${item.orderItemId ?? ""}:${item.orderItemVariantId ?? ""}`;
    const line = fulfillmentMap.get(key);
    if (line) {
      const remaining = new Decimal(line.remainingDispatchableQuantity);
      if (planned.gt(remaining) && !input.quantityOverrideReason?.trim()) {
        throw new ProductionExecutionValidationError(
          `Số lượng kế hoạch vượt số còn lại có thể xuất (${line.productName}).`,
        );
      }
    }
    validateItemQuantities(planned, dispatched, new Decimal(0), new Decimal(0), new Decimal(0), {
      quantityOverrideReason: input.quantityOverrideReason,
    });
    return {
      orderItemId: item.orderItemId ?? null,
      orderItemVariantId: item.orderItemVariantId ?? null,
      productNameSnapshot: item.productNameSnapshot.trim() || "Sản phẩm",
      colorNameSnapshot: item.colorNameSnapshot?.trim() || null,
      sizeValueSnapshot: item.sizeValueSnapshot?.trim() || null,
      skuSnapshot: item.skuSnapshot?.trim() || null,
      unitSnapshot: item.unitSnapshot?.trim() || null,
      plannedQuantity: planned,
      dispatchedQuantity: dispatched,
      sortOrder: item.sortOrder ?? index,
      note: item.note?.trim() || null,
    };
  });

  const totals = sumItemQuantities(parsedItems);
  const executionCode = await generateDeliveryExecutionCode();
  const status = input.status ?? "DRAFT";

  const carrierName =
    input.carrierNameSnapshot?.trim() ||
    order.deliveryCarrierName ||
    order.deliveryCarrier?.trim() ||
    order.deliveryCarrierRef?.name ||
    null;

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.orderDeliveryExecution.create({
      data: {
        orderId,
        executionCode,
        status,
        deliveryMethodId: input.deliveryMethodId ?? order.deliveryMethodId,
        deliveryCarrierId: input.deliveryCarrierId ?? order.deliveryCarrierId,
        carrierNameSnapshot: carrierName,
        trackingCode: input.trackingCode?.trim() || order.deliveryTrackingCode,
        assignedEmployeeId: input.assignedEmployeeId ?? order.deliveryOwnerId,
        recipientNameSnapshot:
          input.recipientNameSnapshot?.trim() || order.deliveryRecipientName,
        recipientPhoneSnapshot:
          input.recipientPhoneSnapshot?.trim() || order.deliveryRecipientPhone,
        recipientAddressSnapshot:
          input.recipientAddressSnapshot?.trim() || order.deliveryAddress,
        expectedDeliveryAt: input.expectedDeliveryAt
          ? new Date(input.expectedDeliveryAt)
          : order.deliveryExpectedAt,
        dispatchedAt: status === "DISPATCHED" || status === "IN_TRANSIT" ? new Date() : null,
        totalDispatchedQuantity: totals.dispatched,
        totalDeliveredQuantity: new Decimal(0),
        totalReturnedQuantity: new Decimal(0),
        note: input.note?.trim() || null,
        items: { create: parsedItems },
      },
      include: executionInclude,
    });

    await logDeliveryActivity(
      orderId,
      "Tạo chuyến giao hàng",
      `${executionCode} · Xuất ${serializeDecimal(totals.dispatched)}`,
      tx,
    );

    return created;
  });

  return mapExecution(row);
}

export type UpdateDeliveryExecutionInput = Partial<
  Omit<CreateDeliveryExecutionInput, "items">
> & {
  items?: DeliveryExecutionItemInput[];
};

export async function updateDeliveryExecution(
  orderId: string,
  executionId: string,
  input: UpdateDeliveryExecutionInput,
): Promise<DeliveryExecutionRecord> {
  const existing = await prisma.orderDeliveryExecution.findFirst({
    where: { id: executionId, orderId },
    include: { items: true },
  });
  if (!existing) throw new ProductionExecutionValidationError("Không tìm thấy chuyến giao hàng.");
  if (!["DRAFT", "READY_TO_DISPATCH"].includes(existing.status)) {
    throw new ProductionExecutionValidationError("Chỉ có thể chỉnh sửa chuyến ở trạng thái nháp hoặc sẵn sàng xuất.");
  }

  const row = await prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.orderDeliveryExecutionItem.deleteMany({ where: { deliveryExecutionId: executionId } });
      const parsedItems = input.items.map((item, index) => {
        const planned = parseQuantityInput(item.plannedQuantity, "Số lượng kế hoạch");
        const dispatched = parseQuantityInput(
          item.dispatchedQuantity ?? item.plannedQuantity,
          "Số lượng xuất",
        );
        validateItemQuantities(planned, dispatched, new Decimal(0), new Decimal(0), new Decimal(0), {
          quantityOverrideReason: input.quantityOverrideReason,
        });
        return {
          deliveryExecutionId: executionId,
          orderItemId: item.orderItemId ?? null,
          orderItemVariantId: item.orderItemVariantId ?? null,
          productNameSnapshot: item.productNameSnapshot.trim() || "Sản phẩm",
          colorNameSnapshot: item.colorNameSnapshot?.trim() || null,
          sizeValueSnapshot: item.sizeValueSnapshot?.trim() || null,
          skuSnapshot: item.skuSnapshot?.trim() || null,
          unitSnapshot: item.unitSnapshot?.trim() || null,
          plannedQuantity: planned,
          dispatchedQuantity: dispatched,
          sortOrder: item.sortOrder ?? index,
          note: item.note?.trim() || null,
        };
      });
      await tx.orderDeliveryExecutionItem.createMany({ data: parsedItems });
      const totals = sumItemQuantities(parsedItems);
      await tx.orderDeliveryExecution.update({
        where: { id: executionId },
        data: { totalDispatchedQuantity: totals.dispatched },
      });
    }

    const updated = await tx.orderDeliveryExecution.update({
      where: { id: executionId },
      data: {
        ...(input.deliveryMethodId !== undefined ? { deliveryMethodId: input.deliveryMethodId } : {}),
        ...(input.deliveryCarrierId !== undefined ? { deliveryCarrierId: input.deliveryCarrierId } : {}),
        ...(input.carrierNameSnapshot !== undefined
          ? { carrierNameSnapshot: input.carrierNameSnapshot?.trim() || null }
          : {}),
        ...(input.trackingCode !== undefined ? { trackingCode: input.trackingCode?.trim() || null } : {}),
        ...(input.assignedEmployeeId !== undefined
          ? { assignedEmployeeId: input.assignedEmployeeId }
          : {}),
        ...(input.recipientNameSnapshot !== undefined
          ? { recipientNameSnapshot: input.recipientNameSnapshot?.trim() || null }
          : {}),
        ...(input.recipientPhoneSnapshot !== undefined
          ? { recipientPhoneSnapshot: input.recipientPhoneSnapshot?.trim() || null }
          : {}),
        ...(input.recipientAddressSnapshot !== undefined
          ? { recipientAddressSnapshot: input.recipientAddressSnapshot?.trim() || null }
          : {}),
        ...(input.expectedDeliveryAt !== undefined
          ? {
              expectedDeliveryAt: input.expectedDeliveryAt
                ? new Date(input.expectedDeliveryAt)
                : null,
            }
          : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: executionInclude,
    });

    await logDeliveryActivity(orderId, "Cập nhật chuyến giao hàng", existing.executionCode, tx);
    return updated;
  });

  return mapExecution(row);
}

export async function dispatchDeliveryExecution(
  orderId: string,
  executionId: string,
): Promise<DeliveryExecutionRecord> {
  const existing = await prisma.orderDeliveryExecution.findFirst({
    where: { id: executionId, orderId },
    include: { items: true },
  });
  if (!existing) throw new ProductionExecutionValidationError("Không tìm thấy chuyến giao hàng.");
  if (!["DRAFT", "READY_TO_DISPATCH"].includes(existing.status)) {
    throw new ProductionExecutionValidationError("Chuyến giao hàng đã được xuất hoặc không thể xuất.");
  }

  const dispatchedTotal = existing.items.reduce(
    (acc, item) => acc.plus(item.dispatchedQuantity),
    new Decimal(0),
  );
  if (dispatchedTotal.lte(0)) {
    throw new ProductionExecutionValidationError("Vui lòng nhập số lượng xuất trước khi xác nhận.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.orderDeliveryExecution.update({
      where: { id: executionId },
      data: {
        status: "DISPATCHED",
        dispatchedAt: new Date(),
        totalDispatchedQuantity: dispatchedTotal,
      },
      include: executionInclude,
    });
    await logDeliveryActivity(
      orderId,
      "Xác nhận xuất hàng",
      `${existing.executionCode} · ${serializeDecimal(dispatchedTotal)}`,
      tx,
    );
    return updated;
  });

  return mapExecution(row);
}

export async function updateDeliveryExecutionStatus(
  orderId: string,
  executionId: string,
  status: DeliveryExecutionStatus,
): Promise<DeliveryExecutionRecord> {
  const existing = await prisma.orderDeliveryExecution.findFirst({
    where: { id: executionId, orderId },
  });
  if (!existing) throw new ProductionExecutionValidationError("Không tìm thấy chuyến giao hàng.");

  if (status === "CANCELLED" && !["DRAFT", "READY_TO_DISPATCH"].includes(existing.status)) {
    throw new ProductionExecutionValidationError("Chỉ có thể hủy chuyến ở trạng thái nháp hoặc sẵn sàng xuất.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.orderDeliveryExecution.update({
      where: { id: executionId },
      data: {
        status,
        ...(status === "DELIVERED" || status === "PARTIALLY_DELIVERED"
          ? { deliveredAt: new Date() }
          : {}),
      },
      include: executionInclude,
    });
    await logDeliveryActivity(
      orderId,
      "Cập nhật trạng thái chuyến giao hàng",
      `${existing.executionCode}: ${DELIVERY_EXECUTION_STATUS_LABELS[status]}`,
      tx,
    );
    return updated;
  });

  return mapExecution(row);
}

export type CreateDeliveryAttemptInput = {
  attemptedAt?: string | null;
  attemptedByEmployeeId?: string | null;
  result?: DeliveryAttemptResult;
  recipientName?: string | null;
  recipientPhone?: string | null;
  note?: string | null;
  failureReason?: string | null;
  nextAttemptAt?: string | null;
  itemQuantities?: Array<{
    itemId: string;
    deliveredQuantity?: unknown;
    returnedQuantity?: unknown;
    damagedQuantity?: unknown;
  }>;
  quantityOverrideReason?: string | null;
};

const FAILED_RESULTS: DeliveryAttemptResult[] = [
  "FAILED",
  "REFUSED",
  "NO_RECIPIENT",
  "WRONG_ADDRESS",
];

export async function createDeliveryAttempt(
  orderId: string,
  executionId: string,
  input: CreateDeliveryAttemptInput,
): Promise<DeliveryExecutionRecord> {
  const execution = await prisma.orderDeliveryExecution.findFirst({
    where: { id: executionId, orderId },
    include: { items: true, attempts: true },
  });
  if (!execution) throw new ProductionExecutionValidationError("Không tìm thấy chuyến giao hàng.");

  const attemptNumber =
    execution.attempts.reduce((max, a) => Math.max(max, a.attemptNumber), 0) + 1;
  const result = input.result ?? "PENDING";

  if (FAILED_RESULTS.includes(result) && !input.note?.trim() && !input.failureReason?.trim()) {
    throw new ProductionExecutionValidationError(
      "Lần giao thất bại cần ghi chú hoặc lý do thất bại.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    if (input.itemQuantities?.length) {
      for (const qty of input.itemQuantities) {
        const item = execution.items.find((i) => i.id === qty.itemId);
        if (!item) continue;
        const delivered = parseQuantityInput(qty.deliveredQuantity ?? 0, "Số lượng giao");
        const returned = parseQuantityInput(qty.returnedQuantity ?? 0, "Số lượng hoàn");
        const damaged = parseQuantityInput(qty.damagedQuantity ?? 0, "Số lượng hư hỏng");
        validateItemQuantities(
          item.plannedQuantity,
          item.dispatchedQuantity,
          delivered,
          returned,
          damaged,
          { quantityOverrideReason: input.quantityOverrideReason },
        );
        await tx.orderDeliveryExecutionItem.update({
          where: { id: item.id },
          data: { deliveredQuantity: delivered, returnedQuantity: returned, damagedQuantity: damaged },
        });
      }
    }

    await tx.orderDeliveryAttempt.create({
      data: {
        deliveryExecutionId: executionId,
        attemptNumber,
        attemptedAt: input.attemptedAt ? new Date(input.attemptedAt) : new Date(),
        attemptedByEmployeeId: input.attemptedByEmployeeId ?? null,
        result,
        recipientName: input.recipientName?.trim() || null,
        recipientPhone: input.recipientPhone?.trim() || null,
        note: input.note?.trim() || null,
        failureReason: input.failureReason?.trim() || null,
        nextAttemptAt: input.nextAttemptAt ? new Date(input.nextAttemptAt) : null,
      },
    });

    const refreshedItems = await tx.orderDeliveryExecutionItem.findMany({
      where: { deliveryExecutionId: executionId },
    });
    const totals = {
      delivered: refreshedItems.reduce((acc, i) => acc.plus(i.deliveredQuantity), new Decimal(0)),
      returned: refreshedItems.reduce((acc, i) => acc.plus(i.returnedQuantity), new Decimal(0)),
    };

    let nextStatus: DeliveryExecutionStatus = execution.status;
    if (result === "DELIVERED") nextStatus = "DELIVERED";
    else if (result === "PARTIAL") nextStatus = "PARTIALLY_DELIVERED";
    else if (FAILED_RESULTS.includes(result)) nextStatus = "DELIVERY_FAILED";
    else if (result === "RETURNED") nextStatus = "RETURNED";
    else if (result === "DAMAGED") nextStatus = "DELIVERY_FAILED";

    const updated = await tx.orderDeliveryExecution.update({
      where: { id: executionId },
      data: {
        status: nextStatus,
        totalDeliveredQuantity: totals.delivered,
        totalReturnedQuantity: totals.returned,
        ...(nextStatus === "DELIVERED" || nextStatus === "PARTIALLY_DELIVERED"
          ? { deliveredAt: new Date() }
          : {}),
      },
      include: executionInclude,
    });

    await logDeliveryActivity(
      orderId,
      "Ghi nhận kết quả giao hàng",
      `${execution.executionCode} · Lần ${attemptNumber}: ${DELIVERY_ATTEMPT_RESULT_LABELS[result]}`,
      tx,
    );

    return updated;
  });

  return mapExecution(row);
}

export async function updateDeliveryAttempt(
  orderId: string,
  executionId: string,
  attemptId: string,
  input: CreateDeliveryAttemptInput,
): Promise<DeliveryExecutionRecord> {
  const attempt = await prisma.orderDeliveryAttempt.findFirst({
    where: { id: attemptId, deliveryExecutionId: executionId },
    include: { deliveryExecution: true },
  });
  if (!attempt || attempt.deliveryExecution.orderId !== orderId) {
    throw new ProductionExecutionValidationError("Không tìm thấy lần giao hàng.");
  }

  const result = input.result ?? attempt.result;
  if (FAILED_RESULTS.includes(result) && !input.note?.trim() && !input.failureReason?.trim() && !attempt.note && !attempt.failureReason) {
    throw new ProductionExecutionValidationError(
      "Lần giao thất bại cần ghi chú hoặc lý do thất bại.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    await tx.orderDeliveryAttempt.update({
      where: { id: attemptId },
      data: {
        ...(input.attemptedAt !== undefined
          ? { attemptedAt: input.attemptedAt ? new Date(input.attemptedAt) : null }
          : {}),
        ...(input.attemptedByEmployeeId !== undefined
          ? { attemptedByEmployeeId: input.attemptedByEmployeeId }
          : {}),
        ...(input.result !== undefined ? { result: input.result } : {}),
        ...(input.recipientName !== undefined
          ? { recipientName: input.recipientName?.trim() || null }
          : {}),
        ...(input.recipientPhone !== undefined
          ? { recipientPhone: input.recipientPhone?.trim() || null }
          : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        ...(input.failureReason !== undefined
          ? { failureReason: input.failureReason?.trim() || null }
          : {}),
        ...(input.nextAttemptAt !== undefined
          ? { nextAttemptAt: input.nextAttemptAt ? new Date(input.nextAttemptAt) : null }
          : {}),
      },
    });

    const updated = await tx.orderDeliveryExecution.findFirst({
      where: { id: executionId, orderId },
      include: executionInclude,
    });
    if (!updated) throw new ProductionExecutionValidationError("Không tìm thấy chuyến giao hàng.");

    await logDeliveryActivity(
      orderId,
      "Cập nhật kết quả giao hàng",
      `${attempt.deliveryExecution.executionCode} · Lần ${attempt.attemptNumber}`,
      tx,
    );

    return updated;
  });

  return mapExecution(row);
}

export async function addDeliveryProof(
  orderId: string,
  executionId: string,
  input: {
    mediaAssetId: string;
    proofType?: DeliveryProofType;
    title?: string | null;
    note?: string | null;
    deliveryAttemptId?: string | null;
  },
): Promise<DeliveryProofRecord> {
  if (!input.mediaAssetId?.trim()) {
    throw new ProductionExecutionValidationError("Vui lòng chọn tệp minh chứng.");
  }

  const execution = await prisma.orderDeliveryExecution.findFirst({
    where: { id: executionId, orderId },
  });
  if (!execution) throw new ProductionExecutionValidationError("Không tìm thấy chuyến giao hàng.");

  const media = await prisma.mediaAsset.findUnique({ where: { id: input.mediaAssetId } });
  if (!media) throw new ProductionExecutionValidationError("Tệp minh chứng không hợp lệ.");

  const proof = await prisma.$transaction(async (tx) => {
    const created = await tx.orderDeliveryProof.create({
      data: {
        orderId,
        deliveryExecutionId: executionId,
        deliveryAttemptId: input.deliveryAttemptId ?? null,
        mediaAssetId: input.mediaAssetId,
        proofType: input.proofType ?? "OTHER",
        title: input.title?.trim() || null,
        note: input.note?.trim() || null,
      },
      include: {
        mediaAsset: {
          select: {
            mimeType: true,
            filename: true,
            originalName: true,
            thumbnailUrl: true,
            url: true,
          },
        },
      },
    });

    await logDeliveryActivity(
      orderId,
      "Thêm bằng chứng giao hàng",
      `${execution.executionCode} · ${DELIVERY_PROOF_TYPE_LABELS[created.proofType]}`,
      tx,
    );

    return created;
  });

  return mapProof(proof);
}

export async function removeDeliveryProof(
  orderId: string,
  executionId: string,
  proofId: string,
): Promise<void> {
  const proof = await prisma.orderDeliveryProof.findFirst({
    where: { id: proofId, orderId, deliveryExecutionId: executionId },
    include: { deliveryExecution: { select: { executionCode: true } } },
  });
  if (!proof) throw new ProductionExecutionValidationError("Không tìm thấy bằng chứng giao hàng.");

  await prisma.$transaction(async (tx) => {
    await tx.orderDeliveryProof.delete({ where: { id: proofId } });
    await logDeliveryActivity(
      orderId,
      "Xóa bằng chứng giao hàng",
      proof.deliveryExecution.executionCode,
      tx,
    );
  });
}

export async function listDeliveryProofs(
  orderId: string,
  executionId: string,
): Promise<DeliveryProofRecord[]> {
  const proofs = await prisma.orderDeliveryProof.findMany({
    where: { orderId, deliveryExecutionId: executionId },
    include: {
      mediaAsset: {
        select: {
          mimeType: true,
          filename: true,
          originalName: true,
          thumbnailUrl: true,
          url: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return proofs.map((p) => mapProof(p as ExecutionRow["proofs"][number]));
}
