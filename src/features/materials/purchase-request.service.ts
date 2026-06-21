import type { PurchaseRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePurchaseRequestCode } from "@/features/materials/material-code";
import { MaterialValidationError, toDecimal } from "@/features/materials/material-decimal";
import { applyStockAdjustment } from "@/features/materials/warehouse.service";
import {
  evaluateOrderMaterialAvailability,
  type MaterialAvailabilityRow,
} from "@/features/materials/material-availability.service";

const VALID_TRANSITIONS: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["ORDERED", "CANCELLED"],
  ORDERED: ["PARTIALLY_RECEIVED", "RECEIVED"],
  PARTIALLY_RECEIVED: ["RECEIVED"],
  RECEIVED: [],
  CANCELLED: [],
};

export type PurchaseRequestItemInput = {
  materialId?: string | null;
  materialCodeSnapshot?: string | null;
  materialNameSnapshot: string;
  unitSnapshot: string;
  requestedQuantity: number | string;
  orderedQuantity?: number | string | null;
  linkedOrderId?: string | null;
  note?: string | null;
  sortOrder?: number;
};

export async function listPurchaseRequests(input?: {
  status?: PurchaseRequestStatus;
  search?: string;
  limit?: number;
}) {
  const where: Prisma.PurchaseRequestWhereInput = {};
  if (input?.status) where.status = input.status;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { requestCode: { contains: q, mode: "insensitive" } },
      { supplierName: { contains: q, mode: "insensitive" } },
    ];
  }

  const requests = await prisma.purchaseRequest.findMany({
    where,
    include: {
      requestedByEmployee: { select: { id: true, fullName: true } },
      items: true,
    },
    orderBy: { updatedAt: "desc" },
    take: input?.limit ?? 100,
  });

  return requests.map((req) => ({
    ...req,
    itemCount: req.items.length,
    totalRequestedQuantity: req.items
      .reduce((sum, item) => sum.add(toDecimal(item.requestedQuantity)), toDecimal(0))
      .toFixed(),
    linkedOrderNos: [...new Set(req.items.map((i) => i.linkedOrderId).filter(Boolean))],
  }));
}

export async function getPurchaseRequest(id: string) {
  return prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      requestedByEmployee: { select: { id: true, fullName: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          material: { select: { id: true, materialCode: true, name: true, unit: true } },
          linkedOrder: { select: { id: true, orderNo: true } },
        },
      },
    },
  });
}

export async function createPurchaseRequest(input: {
  supplierName?: string | null;
  requestedByEmployeeId?: string | null;
  expectedArrivalAt?: string | null;
  note?: string | null;
  items: PurchaseRequestItemInput[];
  status?: PurchaseRequestStatus;
}) {
  if (!input.items.length) {
    throw new MaterialValidationError("Yêu cầu mua hàng phải có ít nhất một dòng vật tư.");
  }

  const requestCode = await generatePurchaseRequestCode();

  return prisma.purchaseRequest.create({
    data: {
      requestCode,
      status: input.status ?? "DRAFT",
      supplierName: input.supplierName?.trim() || null,
      requestedByEmployeeId: input.requestedByEmployeeId ?? null,
      expectedArrivalAt: input.expectedArrivalAt ? new Date(input.expectedArrivalAt) : null,
      note: input.note?.trim() || null,
      requestedAt: input.status === "REQUESTED" ? new Date() : null,
      items: {
        create: input.items.map((item, index) => ({
          materialId: item.materialId ?? null,
          materialCodeSnapshot: item.materialCodeSnapshot ?? null,
          materialNameSnapshot: item.materialNameSnapshot.trim(),
          unitSnapshot: item.unitSnapshot.trim(),
          requestedQuantity: item.requestedQuantity,
          orderedQuantity: item.orderedQuantity ?? null,
          linkedOrderId: item.linkedOrderId ?? null,
          note: item.note?.trim() || null,
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
    include: {
      items: true,
      requestedByEmployee: { select: { id: true, fullName: true } },
    },
  });
}

export async function createPurchaseRequestFromOrderShortages(input: {
  orderId: string;
  requestedByEmployeeId?: string | null;
  note?: string | null;
}) {
  const availability = await evaluateOrderMaterialAvailability(input.orderId);
  const shortages = availability.filter(
    (row) => row.warehouseStatus === "SHORTAGE" && row.shortageQuantity,
  );

  if (!shortages.length) {
    throw new MaterialValidationError("Không có vật tư thiếu để tạo yêu cầu mua.");
  }

  const items: PurchaseRequestItemInput[] = shortages.map((row, index) => ({
    materialId: row.materialId,
    materialCodeSnapshot: row.materialCode,
    materialNameSnapshot: row.materialName,
    unitSnapshot: row.unit,
    requestedQuantity: row.shortageQuantity!,
    linkedOrderId: input.orderId,
    sortOrder: index,
  }));

  return createPurchaseRequest({
    requestedByEmployeeId: input.requestedByEmployeeId,
    note: input.note ?? `Tạo từ đơn hàng — thiếu vật tư`,
    items,
  });
}

export async function updatePurchaseRequest(
  id: string,
  input: {
    supplierName?: string | null;
    expectedArrivalAt?: string | null;
    note?: string | null;
    items?: PurchaseRequestItemInput[];
  },
) {
  const existing = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) throw new MaterialValidationError("Không tìm thấy yêu cầu mua hàng.");
  if (existing.status === "CANCELLED" || existing.status === "RECEIVED") {
    throw new MaterialValidationError("Không thể chỉnh sửa yêu cầu ở trạng thái này.");
  }

  const hasReceived = existing.items.some((i) => toDecimal(i.receivedQuantity).gt(0));
  if (hasReceived && input.items) {
    throw new MaterialValidationError("Không thể thay dòng vật tư sau khi đã ghi nhận hàng về.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });
      await tx.purchaseRequestItem.createMany({
        data: input.items.map((item, index) => ({
          purchaseRequestId: id,
          materialId: item.materialId ?? null,
          materialCodeSnapshot: item.materialCodeSnapshot ?? null,
          materialNameSnapshot: item.materialNameSnapshot.trim(),
          unitSnapshot: item.unitSnapshot.trim(),
          requestedQuantity: item.requestedQuantity,
          orderedQuantity: item.orderedQuantity ?? null,
          linkedOrderId: item.linkedOrderId ?? null,
          note: item.note?.trim() || null,
          sortOrder: item.sortOrder ?? index,
        })),
      });
    }

    return tx.purchaseRequest.update({
      where: { id },
      data: {
        ...(input.supplierName !== undefined
          ? { supplierName: input.supplierName?.trim() || null }
          : {}),
        ...(input.expectedArrivalAt !== undefined
          ? {
              expectedArrivalAt: input.expectedArrivalAt
                ? new Date(input.expectedArrivalAt)
                : null,
            }
          : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            material: true,
            linkedOrder: { select: { id: true, orderNo: true } },
          },
        },
        requestedByEmployee: { select: { id: true, fullName: true } },
      },
    });
  });
}

function computeRequestStatus(
  items: Array<{ requestedQuantity: Prisma.Decimal; orderedQuantity: Prisma.Decimal | null; receivedQuantity: Prisma.Decimal }>,
  current: PurchaseRequestStatus,
): PurchaseRequestStatus {
  if (current === "CANCELLED") return "CANCELLED";
  const allReceived = items.every((item) => {
    const target = item.orderedQuantity ?? item.requestedQuantity;
    return toDecimal(item.receivedQuantity).gte(target);
  });
  if (allReceived && items.length > 0) return "RECEIVED";
  const anyReceived = items.some((item) => toDecimal(item.receivedQuantity).gt(0));
  if (anyReceived) return "PARTIALLY_RECEIVED";
  return current;
}

export async function transitionPurchaseRequestStatus(
  id: string,
  nextStatus: PurchaseRequestStatus,
) {
  const existing = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) throw new MaterialValidationError("Không tìm thấy yêu cầu mua hàng.");

  const allowed = VALID_TRANSITIONS[existing.status];
  if (!allowed.includes(nextStatus)) {
    throw new MaterialValidationError(
      `Không thể chuyển từ ${existing.status} sang ${nextStatus}.`,
    );
  }

  if (nextStatus === "CANCELLED") {
    const hasReceived = existing.items.some((i) => toDecimal(i.receivedQuantity).gt(0));
    if (hasReceived) {
      throw new MaterialValidationError("Không thể hủy yêu cầu đã ghi nhận hàng về.");
    }
  }

  if (nextStatus === "RECEIVED") {
    const allOk = existing.items.every((item) => {
      const target = item.orderedQuantity ?? item.requestedQuantity;
      return toDecimal(item.receivedQuantity).gte(target);
    });
    if (!allOk) {
      throw new MaterialValidationError("Chưa nhận đủ số lượng cho tất cả dòng vật tư.");
    }
  }

  return prisma.purchaseRequest.update({
    where: { id },
    data: {
      status: nextStatus,
      ...(nextStatus === "REQUESTED" ? { requestedAt: new Date() } : {}),
    },
    include: { items: true, requestedByEmployee: { select: { id: true, fullName: true } } },
  });
}

export type ReceivePurchaseItemInput = {
  itemId: string;
  quantity: number | string;
  note?: string | null;
  createdByEmployeeId?: string | null;
};

export async function receivePurchaseRequestItems(
  purchaseRequestId: string,
  receives: ReceivePurchaseItemInput[],
) {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id: purchaseRequestId },
    include: { items: true },
  });
  if (!request) throw new MaterialValidationError("Không tìm thấy yêu cầu mua hàng.");
  if (request.status === "CANCELLED" || request.status === "DRAFT") {
    throw new MaterialValidationError("Yêu cầu chưa sẵn sàng để ghi nhận hàng về.");
  }

  return prisma.$transaction(async (tx) => {
    for (const receive of receives) {
      const item = request.items.find((i) => i.id === receive.itemId);
      if (!item) throw new MaterialValidationError("Không tìm thấy dòng vật tư.");

      const qty = toDecimal(receive.quantity);
      if (qty.lte(0)) throw new MaterialValidationError("Số lượng nhận phải lớn hơn 0.");

      const maxTarget = item.orderedQuantity ?? item.requestedQuantity;
      const nextReceived = toDecimal(item.receivedQuantity).add(qty);
      if (nextReceived.gt(maxTarget)) {
        throw new MaterialValidationError("Số lượng nhận vượt quá số lượng đặt/yêu cầu.");
      }

      if (!item.materialId) {
        throw new MaterialValidationError("Dòng vật tư chưa liên kết danh mục — không thể nhập kho.");
      }

      await applyStockAdjustment(
        {
          materialId: item.materialId,
          adjustmentType: "RECEIVE",
          quantity: qty.toFixed(),
          note: receive.note ?? `Nhận từ ${request.requestCode}`,
          createdByEmployeeId: receive.createdByEmployeeId ?? null,
        },
        tx,
      );

      await tx.purchaseRequestItem.update({
        where: { id: item.id },
        data: { receivedQuantity: nextReceived },
      });
    }

    const updatedItems = await tx.purchaseRequestItem.findMany({
      where: { purchaseRequestId },
    });
    const nextStatus = computeRequestStatus(updatedItems, request.status);

    return tx.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data: { status: nextStatus },
      include: {
        items: {
          include: {
            material: true,
            linkedOrder: { select: { id: true, orderNo: true } },
          },
        },
        requestedByEmployee: { select: { id: true, fullName: true } },
      },
    });
  });
}

export type { MaterialAvailabilityRow };
