import type { OrderMaterialAllocationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aggregateOrderMaterials, normalizeMaterialKey } from "@/features/orders/bom-calculations";
import { listOrderMaterials } from "@/features/orders/production-pack.service";
import { MATERIAL_AVAILABILITY_LABELS } from "@/features/materials/material-labels";
import { toDecimal, maxDecimal } from "@/features/materials/material-decimal";

export type MaterialWarehouseStatus =
  | "UNKNOWN"
  | "ENOUGH"
  | "SHORTAGE"
  | "RESERVED"
  | "ISSUED";

export type MaterialAvailabilityRow = {
  aggregateKey: string;
  materialId: string | null;
  materialCode: string | null;
  materialName: string;
  materialType: string;
  unit: string;
  requiredQuantity: string;
  onHandQuantity: string | null;
  reservedQuantity: string | null;
  availableQuantity: string | null;
  shortageQuantity: string | null;
  allocatedQuantity: string | null;
  purchaseRequestedQuantity: string | null;
  receivedQuantity: string | null;
  issuedToProductionQuantity: string | null;
  warehouseStatus: MaterialWarehouseStatus;
  readinessLabel: string;
  allocationId: string | null;
  allocationStatus: OrderMaterialAllocationStatus | null;
  orderMaterialRequirementIds: string[];
};

function aggregateKeyForRow(row: {
  materialId: string | null;
  materialCode: string | null;
  materialName: string;
  unit: string;
}): string {
  if (row.materialId) return `id:${row.materialId}`;
  return normalizeMaterialKey(row);
}

function resolveWarehouseStatus(input: {
  materialId: string | null;
  hasBalance: boolean;
  required: Prisma.Decimal;
  available: Prisma.Decimal | null;
  allocationStatus: OrderMaterialAllocationStatus | null;
  reservedQty: Prisma.Decimal;
  issuedQty: Prisma.Decimal;
}): MaterialWarehouseStatus {
  if (
    input.allocationStatus === "ISSUED" ||
    (input.allocationStatus === "PARTIALLY_ISSUED" && input.issuedQty.gt(0))
  ) {
    if (input.issuedQty.gte(input.required)) return "ISSUED";
  }

  if (
    input.allocationStatus === "RESERVED" ||
    input.allocationStatus === "PARTIALLY_RESERVED"
  ) {
    if (input.reservedQty.gte(input.required)) return "RESERVED";
  }

  if (!input.materialId || !input.hasBalance || input.available === null) {
    return "UNKNOWN";
  }

  if (input.available.gte(input.required)) return "ENOUGH";
  return "SHORTAGE";
}

export async function evaluateOrderMaterialAvailability(
  orderId: string,
): Promise<MaterialAvailabilityRow[]> {
  const [materialsPayload, allocations, purchaseItems, rawRequirements] = await Promise.all([
    listOrderMaterials(orderId),
    prisma.orderMaterialAllocation.findMany({ where: { orderId } }),
    prisma.purchaseRequestItem.findMany({
      where: {
        linkedOrderId: orderId,
        purchaseRequest: { status: { not: "CANCELLED" } },
      },
      include: { purchaseRequest: { select: { status: true } } },
    }),
    prisma.orderItemMaterialRequirement.findMany({
      where: { orderItem: { orderId } },
      select: {
        id: true,
        materialId: true,
        materialCode: true,
        materialCodeSnapshot: true,
        materialName: true,
        materialNameSnapshot: true,
        unit: true,
        unitSnapshot: true,
        materialType: true,
        requiredQuantity: true,
      },
    }),
  ]);

  const balanceMaterialIds = [
    ...new Set(
      rawRequirements.map((r) => r.materialId).filter((id): id is string => Boolean(id)),
    ),
  ];
  const balances = balanceMaterialIds.length
    ? await prisma.materialWarehouseBalance.findMany({
        where: { materialId: { in: balanceMaterialIds } },
      })
    : [];
  const balanceByMaterialId = new Map(balances.map((b) => [b.materialId, b]));
  const allocationByMaterialId = new Map(allocations.map((a) => [a.materialId, a]));

  const grouped = new Map<
    string,
    {
      materialId: string | null;
      materialCode: string | null;
      materialName: string;
      materialType: string;
      unit: string;
      required: Prisma.Decimal;
      orderMaterialRequirementIds: string[];
    }
  >();

  for (const row of rawRequirements) {
    const materialCode = row.materialCodeSnapshot ?? row.materialCode;
    const materialName = row.materialNameSnapshot ?? row.materialName;
    const unit = row.unitSnapshot ?? row.unit;
    const key = aggregateKeyForRow({
      materialId: row.materialId,
      materialCode,
      materialName,
      unit,
    });
    const existing = grouped.get(key);
    const qty = toDecimal(row.requiredQuantity);
    if (existing) {
      existing.required = existing.required.add(qty);
      existing.orderMaterialRequirementIds.push(row.id);
    } else {
      grouped.set(key, {
        materialId: row.materialId,
        materialCode,
        materialName,
        materialType: row.materialType,
        unit,
        required: qty,
        orderMaterialRequirementIds: [row.id],
      });
    }
  }

  if (grouped.size === 0) {
    for (const summaryRow of materialsPayload.summary) {
      const key = normalizeMaterialKey(summaryRow);
      grouped.set(key, {
        materialId: null,
        materialCode: summaryRow.materialCode,
        materialName: summaryRow.materialName,
        materialType: summaryRow.materialType,
        unit: summaryRow.unit,
        required: toDecimal(summaryRow.totalRequiredQuantity),
        orderMaterialRequirementIds: [],
      });
    }
  }

  return Array.from(grouped.entries()).map(([aggregateKey, row]) => {
    const balance = row.materialId ? balanceByMaterialId.get(row.materialId) : null;
    const allocation = row.materialId ? allocationByMaterialId.get(row.materialId) : null;

    const onHand = balance ? toDecimal(balance.onHandQuantity) : null;
    const reservedGlobal = balance ? toDecimal(balance.reservedQuantity) : null;
    const available = balance ? toDecimal(balance.availableQuantity) : null;

    const purchaseRows = purchaseItems.filter(
      (item) =>
        (row.materialId && item.materialId === row.materialId) ||
        (!row.materialId &&
          item.materialCodeSnapshot === row.materialCode &&
          item.materialNameSnapshot === row.materialName &&
          item.unitSnapshot === row.unit),
    );

    const purchaseRequested = purchaseRows.reduce(
      (sum, item) => sum.add(toDecimal(item.requestedQuantity)),
      toDecimal(0),
    );
    const purchaseReceived = purchaseRows.reduce(
      (sum, item) => sum.add(toDecimal(item.receivedQuantity)),
      toDecimal(0),
    );

    const reservedQty = allocation ? toDecimal(allocation.reservedQuantity) : toDecimal(0);
    const issuedQty = allocation ? toDecimal(allocation.issuedQuantity) : toDecimal(0);

    const warehouseStatus = resolveWarehouseStatus({
      materialId: row.materialId,
      hasBalance: Boolean(balance),
      required: row.required,
      available,
      allocationStatus: allocation?.status ?? null,
      reservedQty,
      issuedQty,
    });

    const shortage =
      available !== null && warehouseStatus === "SHORTAGE"
        ? maxDecimal(row.required.sub(available), toDecimal(0))
        : warehouseStatus === "UNKNOWN"
          ? null
          : warehouseStatus === "SHORTAGE"
            ? row.required
            : toDecimal(0);

    return {
      aggregateKey,
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      materialType: row.materialType,
      unit: row.unit,
      requiredQuantity: row.required.toFixed(),
      onHandQuantity: onHand?.toFixed() ?? null,
      reservedQuantity: reservedGlobal?.toFixed() ?? null,
      availableQuantity: available?.toFixed() ?? null,
      shortageQuantity: shortage && shortage.gt(0) ? shortage.toFixed() : null,
      allocatedQuantity: allocation ? reservedQty.toFixed() : null,
      purchaseRequestedQuantity: purchaseRequested.gt(0) ? purchaseRequested.toFixed() : null,
      receivedQuantity: purchaseReceived.gt(0) ? purchaseReceived.toFixed() : null,
      issuedToProductionQuantity: issuedQty.gt(0) ? issuedQty.toFixed() : null,
      warehouseStatus,
      readinessLabel: MATERIAL_AVAILABILITY_LABELS[warehouseStatus],
      allocationId: allocation?.id ?? null,
      allocationStatus: allocation?.status ?? null,
      orderMaterialRequirementIds: row.orderMaterialRequirementIds,
    };
  });
}

export function isMaterialAvailabilityReady(rows: MaterialAvailabilityRow[]): boolean {
  if (rows.length === 0) return true;
  return rows.every((row) =>
    ["ENOUGH", "RESERVED", "ISSUED"].includes(row.warehouseStatus),
  );
}

export function materialAvailabilityMissingLabels(rows: MaterialAvailabilityRow[]): string[] {
  return rows
    .filter((row) => !["ENOUGH", "RESERVED", "ISSUED"].includes(row.warehouseStatus))
    .map((row) => row.materialName);
}
