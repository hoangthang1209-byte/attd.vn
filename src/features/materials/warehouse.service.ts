import type {
  MaterialStockAdjustment,
  MaterialStockAdjustmentType,
  MaterialWarehouseBalance,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertNonNegative,
  computeAvailableQuantity,
  MaterialValidationError,
  toDecimal,
} from "@/features/materials/material-decimal";

type Tx = Prisma.TransactionClient;

export type WarehouseRow = {
  materialId: string;
  materialCode: string;
  name: string;
  materialType: string;
  unit: string;
  reorderPoint: string | null;
  onHandQuantity: string | null;
  reservedQuantity: string | null;
  availableQuantity: string | null;
  issuedQuantity: string | null;
  warehouseStatus: "undeclared" | "enough" | "low" | "shortage";
  hasBalance: boolean;
};

function resolveWarehouseStatus(input: {
  hasBalance: boolean;
  available: Prisma.Decimal;
  reorderPoint: Prisma.Decimal | null;
}): WarehouseRow["warehouseStatus"] {
  if (!input.hasBalance) return "undeclared";
  if (input.available.lte(0)) return "shortage";
  if (input.reorderPoint && input.available.lte(input.reorderPoint)) return "low";
  return "enough";
}

export async function listWarehouseOverview(): Promise<WarehouseRow[]> {
  const materials = await prisma.material.findMany({
    where: { isActive: true },
    include: { warehouseBalance: true },
    orderBy: [{ sortOrder: "asc" }, { materialCode: "asc" }],
  });

  return materials.map((m) => {
    const balance = m.warehouseBalance;
    const hasBalance = Boolean(balance);
    const available = balance ? toDecimal(balance.availableQuantity) : null;
    const reorderPoint = m.reorderPoint ? toDecimal(m.reorderPoint) : null;

    return {
      materialId: m.id,
      materialCode: m.materialCode,
      name: m.name,
      materialType: m.materialType,
      unit: m.unit,
      reorderPoint: m.reorderPoint?.toFixed() ?? null,
      onHandQuantity: balance?.onHandQuantity.toFixed() ?? null,
      reservedQuantity: balance?.reservedQuantity.toFixed() ?? null,
      availableQuantity: available?.toFixed() ?? null,
      issuedQuantity: balance?.issuedQuantity.toFixed() ?? null,
      hasBalance,
      warehouseStatus: resolveWarehouseStatus({
        hasBalance,
        available: available ?? toDecimal(0),
        reorderPoint,
      }),
    };
  });
}

async function upsertBalanceTx(
  tx: Tx,
  materialId: string,
  updater: (current: MaterialWarehouseBalance | null) => {
    onHandQuantity: Prisma.Decimal;
    reservedQuantity: Prisma.Decimal;
    issuedQuantity: Prisma.Decimal;
  },
) {
  const current = await tx.materialWarehouseBalance.findUnique({ where: { materialId } });
  const next = updater(current);
  assertNonNegative(next.onHandQuantity, "Tồn thực tế");
  assertNonNegative(next.reservedQuantity, "Số lượng đã giữ");
  assertNonNegative(next.issuedQuantity, "Số lượng đã cấp");
  if (next.reservedQuantity.gt(next.onHandQuantity)) {
    throw new MaterialValidationError("Số lượng giữ không được vượt tồn thực tế.");
  }

  const availableQuantity = computeAvailableQuantity(next.onHandQuantity, next.reservedQuantity);

  if (current) {
    return tx.materialWarehouseBalance.update({
      where: { materialId },
      data: {
        onHandQuantity: next.onHandQuantity,
        reservedQuantity: next.reservedQuantity,
        issuedQuantity: next.issuedQuantity,
        availableQuantity,
        lastCountedAt: new Date(),
      },
    });
  }

  return tx.materialWarehouseBalance.create({
    data: {
      materialId,
      onHandQuantity: next.onHandQuantity,
      reservedQuantity: next.reservedQuantity,
      issuedQuantity: next.issuedQuantity,
      availableQuantity,
      lastCountedAt: new Date(),
    },
  });
}

async function recordAdjustmentTx(
  tx: Tx,
  input: {
    materialId: string;
    adjustmentType: MaterialStockAdjustmentType;
    quantity: Prisma.Decimal;
    previousOnHandQuantity: Prisma.Decimal;
    nextOnHandQuantity: Prisma.Decimal;
    note?: string | null;
    referenceOrderId?: string | null;
    createdByEmployeeId?: string | null;
  },
) {
  return tx.materialStockAdjustment.create({
    data: {
      materialId: input.materialId,
      adjustmentType: input.adjustmentType,
      quantity: input.quantity,
      previousOnHandQuantity: input.previousOnHandQuantity,
      nextOnHandQuantity: input.nextOnHandQuantity,
      note: input.note?.trim() || null,
      referenceOrderId: input.referenceOrderId ?? null,
      createdByEmployeeId: input.createdByEmployeeId ?? null,
    },
  });
}

export type StockAdjustmentInput = {
  materialId: string;
  adjustmentType: MaterialStockAdjustmentType;
  quantity: number | string;
  note?: string | null;
  referenceOrderId?: string | null;
  createdByEmployeeId?: string | null;
};

export async function applyStockAdjustment(input: StockAdjustmentInput, existingTx?: Tx) {
  const qty = toDecimal(input.quantity);
  if (qty.lte(0) && input.adjustmentType !== "CORRECTION") {
    throw new MaterialValidationError("Số lượng phải lớn hơn 0.");
  }

  const material = await prisma.material.findUnique({ where: { id: input.materialId } });
  if (!material) throw new MaterialValidationError("Không tìm thấy vật tư.");

  if (input.adjustmentType === "CORRECTION" && !input.note?.trim()) {
    throw new MaterialValidationError("Ghi chú là bắt buộc khi điều chỉnh tồn.");
  }

  const run = async (tx: Tx) => {
    const current = await tx.materialWarehouseBalance.findUnique({
      where: { materialId: input.materialId },
    });
    const prevOnHand = current ? toDecimal(current.onHandQuantity) : toDecimal(0);
    const prevReserved = current ? toDecimal(current.reservedQuantity) : toDecimal(0);
    const prevIssued = current ? toDecimal(current.issuedQuantity) : toDecimal(0);

    let nextOnHand = prevOnHand;
    let nextIssued = prevIssued;
    let delta = qty;

    switch (input.adjustmentType) {
      case "OPENING_BALANCE":
        if (current) {
          throw new MaterialValidationError("Vật tư đã có tồn kho. Dùng nhập kho hoặc điều chỉnh.");
        }
        nextOnHand = qty;
        delta = qty;
        break;
      case "RECEIVE":
        nextOnHand = prevOnHand.add(qty);
        delta = qty;
        break;
      case "CORRECTION":
        nextOnHand = prevOnHand.add(qty);
        delta = qty;
        break;
      case "ISSUE_TO_PRODUCTION":
        if (qty.gt(prevOnHand.sub(prevReserved))) {
          throw new MaterialValidationError("Không đủ tồn khả dụng để cấp sản xuất.");
        }
        nextOnHand = prevOnHand.sub(qty);
        nextIssued = prevIssued.add(qty);
        delta = qty.neg();
        break;
      case "RETURN_FROM_PRODUCTION":
        nextOnHand = prevOnHand.add(qty);
        nextIssued = prevIssued.sub(qty).lt(0) ? toDecimal(0) : prevIssued.sub(qty);
        delta = qty;
        break;
      default:
        throw new MaterialValidationError("Loại điều chỉnh không hợp lệ.");
    }

    assertNonNegative(nextOnHand, "Tồn thực tế");

    const balance = await upsertBalanceTx(tx, input.materialId, () => ({
      onHandQuantity: nextOnHand,
      reservedQuantity: prevReserved,
      issuedQuantity: nextIssued,
    }));

    const adjustment = await recordAdjustmentTx(tx, {
      materialId: input.materialId,
      adjustmentType: input.adjustmentType,
      quantity: delta.abs(),
      previousOnHandQuantity: prevOnHand,
      nextOnHandQuantity: nextOnHand,
      note: input.note,
      referenceOrderId: input.referenceOrderId,
      createdByEmployeeId: input.createdByEmployeeId,
    });

    return { balance, adjustment };
  };

  return existingTx ? run(existingTx) : prisma.$transaction(run);
}

export async function listWarehouseHistory(materialId: string, limit = 50) {
  return prisma.materialStockAdjustment.findMany({
    where: { materialId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      referenceOrder: { select: { id: true, orderNo: true } },
      createdByEmployee: { select: { id: true, fullName: true } },
    },
  });
}

export async function adjustReservedQuantityTx(
  tx: Tx,
  materialId: string,
  deltaReserved: Prisma.Decimal,
  deltaIssued: Prisma.Decimal = toDecimal(0),
) {
  const current = await tx.materialWarehouseBalance.findUnique({ where: { materialId } });
  if (!current) {
    throw new MaterialValidationError("Chưa khai báo tồn kho cho vật tư này.");
  }

  const onHand = toDecimal(current.onHandQuantity);
  const reserved = toDecimal(current.reservedQuantity).add(deltaReserved);
  const issued = toDecimal(current.issuedQuantity).add(deltaIssued);

  return upsertBalanceTx(tx, materialId, () => ({
    onHandQuantity: onHand,
    reservedQuantity: reserved,
    issuedQuantity: issued,
  }));
}

export async function issueFromReservationTx(
  tx: Tx,
  materialId: string,
  issueQty: Prisma.Decimal,
) {
  const current = await tx.materialWarehouseBalance.findUnique({ where: { materialId } });
  if (!current) throw new MaterialValidationError("Chưa khai báo tồn kho.");

  const onHand = toDecimal(current.onHandQuantity);
  const reserved = toDecimal(current.reservedQuantity);
  const issued = toDecimal(current.issuedQuantity);

  if (issueQty.gt(reserved)) {
    throw new MaterialValidationError("Số lượng cấp vượt số lượng đã giữ.");
  }
  if (issueQty.gt(onHand)) {
    throw new MaterialValidationError("Không đủ tồn thực tế.");
  }

  return upsertBalanceTx(tx, materialId, () => ({
    onHandQuantity: onHand.sub(issueQty),
    reservedQuantity: reserved.sub(issueQty),
    issuedQuantity: issued.add(issueQty),
  }));
}

export type { MaterialStockAdjustment };
