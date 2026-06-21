import type { OrderMaterialAllocationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluateOrderMaterialAvailability,
  type MaterialAvailabilityRow,
} from "@/features/materials/material-availability.service";
import {
  applyStockAdjustment,
  adjustReservedQuantityTx,
  issueFromReservationTx,
} from "@/features/materials/warehouse.service";
import { MaterialValidationError, toDecimal, minDecimal } from "@/features/materials/material-decimal";

function deriveAllocationStatus(
  required: Prisma.Decimal,
  reserved: Prisma.Decimal,
  issued: Prisma.Decimal,
): OrderMaterialAllocationStatus {
  if (issued.gte(required) && required.gt(0)) return "ISSUED";
  if (issued.gt(0)) return "PARTIALLY_ISSUED";
  if (reserved.gte(required) && required.gt(0)) return "RESERVED";
  if (reserved.gt(0)) return "PARTIALLY_RESERVED";
  return "PENDING";
}

export async function reserveMaterialForOrder(input: {
  orderId: string;
  materialId: string;
  quantity?: number | string;
}) {
  const availability = await evaluateOrderMaterialAvailability(input.orderId);
  const row = availability.find((r) => r.materialId === input.materialId);
  if (!row) throw new MaterialValidationError("Vật tư không thuộc định mức của đơn hàng này.");

  const required = toDecimal(row.requiredQuantity);
  const reserveQty = toDecimal(input.quantity ?? row.requiredQuantity);
  if (reserveQty.lte(0)) throw new MaterialValidationError("Số lượng giữ phải lớn hơn 0.");

  const balance = await prisma.materialWarehouseBalance.findUnique({
    where: { materialId: input.materialId },
  });
  if (!balance) throw new MaterialValidationError("Chưa khai báo tồn kho cho vật tư này.");

  const available = toDecimal(balance.availableQuantity);
  if (reserveQty.gt(available)) {
    throw new MaterialValidationError("Không đủ tồn khả dụng để giữ.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.orderMaterialAllocation.findUnique({
      where: { orderId_materialId: { orderId: input.orderId, materialId: input.materialId } },
    });

    const prevReserved = existing ? toDecimal(existing.reservedQuantity) : toDecimal(0);
    const issued = existing ? toDecimal(existing.issuedQuantity) : toDecimal(0);
    const nextReserved = prevReserved.add(reserveQty);

    await adjustReservedQuantityTx(tx, input.materialId, reserveQty);

    const status = deriveAllocationStatus(required, nextReserved, issued);

    const allocation = existing
      ? await tx.orderMaterialAllocation.update({
          where: { id: existing.id },
          data: {
            requiredQuantity: required,
            reservedQuantity: nextReserved,
            status,
          },
        })
      : await tx.orderMaterialAllocation.create({
          data: {
            orderId: input.orderId,
            materialId: input.materialId,
            requiredQuantity: required,
            reservedQuantity: reserveQty,
            issuedQuantity: toDecimal(0),
            status,
          },
        });

    return { allocation, availability: await evaluateOrderMaterialAvailability(input.orderId) };
  });
}

export async function issueMaterialForOrder(input: {
  orderId: string;
  materialId: string;
  quantity?: number | string;
  note?: string | null;
  createdByEmployeeId?: string | null;
}) {
  const availability = await evaluateOrderMaterialAvailability(input.orderId);
  const row = availability.find((r) => r.materialId === input.materialId);
  if (!row) throw new MaterialValidationError("Vật tư không thuộc định mức của đơn hàng này.");

  const required = toDecimal(row.requiredQuantity);
  const issueQty = toDecimal(input.quantity ?? row.requiredQuantity);
  if (issueQty.lte(0)) throw new MaterialValidationError("Số lượng cấp phải lớn hơn 0.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.orderMaterialAllocation.findUnique({
      where: { orderId_materialId: { orderId: input.orderId, materialId: input.materialId } },
    });

    const prevReserved = existing ? toDecimal(existing.reservedQuantity) : toDecimal(0);
    const prevIssued = existing ? toDecimal(existing.issuedQuantity) : toDecimal(0);

    if (existing && prevReserved.gte(issueQty)) {
      await issueFromReservationTx(tx, input.materialId, issueQty);
    } else {
      const balance = await tx.materialWarehouseBalance.findUnique({
        where: { materialId: input.materialId },
      });
      if (!balance) throw new MaterialValidationError("Chưa khai báo tồn kho.");
      const available = toDecimal(balance.availableQuantity);
      if (issueQty.gt(available)) {
        throw new MaterialValidationError("Không đủ tồn khả dụng để cấp.");
      }

      await tx.materialWarehouseBalance.update({
        where: { materialId: input.materialId },
        data: {
          onHandQuantity: toDecimal(balance.onHandQuantity).sub(issueQty),
          issuedQuantity: toDecimal(balance.issuedQuantity).add(issueQty),
          availableQuantity: toDecimal(balance.onHandQuantity)
            .sub(issueQty)
            .sub(toDecimal(balance.reservedQuantity)),
          lastCountedAt: new Date(),
        },
      });

      await tx.materialStockAdjustment.create({
        data: {
          materialId: input.materialId,
          adjustmentType: "ISSUE_TO_PRODUCTION",
          quantity: issueQty,
          previousOnHandQuantity: balance.onHandQuantity,
          nextOnHandQuantity: toDecimal(balance.onHandQuantity).sub(issueQty),
          note: input.note?.trim() || null,
          referenceOrderId: input.orderId,
          createdByEmployeeId: input.createdByEmployeeId ?? null,
        },
      });
    }

    const nextIssued = prevIssued.add(issueQty);
    const nextReserved = prevReserved.sub(minDecimal(prevReserved, issueQty));
    const status = deriveAllocationStatus(required, nextReserved, nextIssued);

    const allocation = existing
      ? await tx.orderMaterialAllocation.update({
          where: { id: existing.id },
          data: {
            requiredQuantity: required,
            reservedQuantity: nextReserved.lt(0) ? toDecimal(0) : nextReserved,
            issuedQuantity: nextIssued,
            status,
            note: input.note?.trim() || existing.note,
          },
        })
      : await tx.orderMaterialAllocation.create({
          data: {
            orderId: input.orderId,
            materialId: input.materialId,
            requiredQuantity: required,
            reservedQuantity: toDecimal(0),
            issuedQuantity: issueQty,
            status,
            note: input.note?.trim() || null,
          },
        });

    return { allocation, availability: await evaluateOrderMaterialAvailability(input.orderId) };
  });
}

export async function releaseMaterialAllocation(input: {
  orderId: string;
  allocationId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const allocation = await tx.orderMaterialAllocation.findFirst({
      where: { id: input.allocationId, orderId: input.orderId },
    });
    if (!allocation) throw new MaterialValidationError("Không tìm thấy phân bổ vật tư.");

    const reserved = toDecimal(allocation.reservedQuantity);
    if (reserved.gt(0)) {
      await adjustReservedQuantityTx(tx, allocation.materialId, reserved.neg());
    }

    const updated = await tx.orderMaterialAllocation.update({
      where: { id: allocation.id },
      data: {
        reservedQuantity: 0,
        status: toDecimal(allocation.issuedQuantity).gt(0) ? allocation.status : "RELEASED",
      },
    });

    return {
      allocation: updated,
      availability: await evaluateOrderMaterialAvailability(input.orderId),
    };
  });
}

export async function linkOrderMaterialToCatalog(input: {
  orderId: string;
  orderMaterialRequirementId: string;
  materialId: string;
}) {
  const requirement = await prisma.orderItemMaterialRequirement.findFirst({
    where: {
      id: input.orderMaterialRequirementId,
      orderItem: { orderId: input.orderId },
    },
  });
  if (!requirement) throw new MaterialValidationError("Không tìm thấy dòng định mức.");

  const material = await prisma.material.findUnique({ where: { id: input.materialId } });
  if (!material) throw new MaterialValidationError("Không tìm thấy vật tư.");

  await prisma.orderItemMaterialRequirement.update({
    where: { id: requirement.id },
    data: {
      materialId: material.id,
      materialCodeSnapshot: material.materialCode,
      materialNameSnapshot: material.name,
      unitSnapshot: material.unit,
      materialCode: material.materialCode,
      materialName: material.name,
      unit: material.unit,
      materialType: material.materialType,
    },
  });

  return evaluateOrderMaterialAvailability(input.orderId);
}

export type { MaterialAvailabilityRow };
