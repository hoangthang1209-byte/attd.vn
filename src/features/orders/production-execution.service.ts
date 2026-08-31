import { prisma } from "@/lib/prisma";
import { resolveOrderItemTotalQuantity } from "@/features/orders/bom-calculations";
import {
  aggregateOrderReadinessFromItems,
  evaluateOrderItemReadiness,
  itemHasDesignFile,
  ORDER_ITEM_READINESS_LABELS,
  type OrderItemReadinessState,
} from "@/features/orders/order-item-readiness";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";
import {
  ensureProductionStagesForOrderItem,
  ensureProductionStagesInitializedForOrder,
  hasLegacyOrderLevelStages,
  listAllProductionStagesForOrder,
  listProductionStages,
} from "@/features/orders/production-stage.service";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";
import {
  getQcInspection,
  hasLegacyOrderLevelQc,
  listQcInspectionsForOrder,
} from "@/features/orders/qc-inspection.service";
import { listOrderProductionFiles } from "@/features/orders/production-pack.service";
import {
  loadLeanOpsTrackingsForOrder,
  mapLeanOpsTrackingToStages,
  resolveLeanOpsReadyQuantity,
} from "@/features/orders/lean-ops-execution-bridge";

export type OrderItemExecutionBundle = {
  orderItemId: string;
  productName: string;
  colorSnapshot: string | null;
  skuSnapshot: string | null;
  quantity: number;
  unit: string;
  supplySource: string | null;
  processingMethod: string | null;
  stages: ProductionStageRecord[];
  qc: QcInspectionRecord | null;
  readiness: {
    state: OrderItemReadinessState;
    stateLabel: string;
  };
  activeFileCount: number;
  /** Present when this item uses ItemProductionTracking as execution truth. */
  usesLeanOps: boolean;
  leanOpsReadyQuantity: number;
};

export type ProductionExecutionBundle = {
  isLegacy: boolean;
  /** Order has ItemProductionTracking — Lean Ops is production execution truth. */
  usesLeanOps: boolean;
  legacyStages: ProductionStageRecord[];
  legacyQc: QcInspectionRecord | null;
  items: OrderItemExecutionBundle[];
  orderReadiness: {
    state: OrderItemReadinessState;
    stateLabel: string;
  };
};

function groupStagesByItem(stages: ProductionStageRecord[]): {
  legacy: ProductionStageRecord[];
  byItem: Map<string, ProductionStageRecord[]>;
} {
  const legacy: ProductionStageRecord[] = [];
  const byItem = new Map<string, ProductionStageRecord[]>();
  for (const stage of stages) {
    if (!stage.orderItemId) {
      legacy.push(stage);
      continue;
    }
    const list = byItem.get(stage.orderItemId) ?? [];
    list.push(stage);
    byItem.set(stage.orderItemId, list);
  }
  return { legacy, byItem };
}

function groupQcByItem(records: QcInspectionRecord[]): {
  legacy: QcInspectionRecord | null;
  byItem: Map<string, QcInspectionRecord>;
} {
  let legacy: QcInspectionRecord | null = null;
  const byItem = new Map<string, QcInspectionRecord>();
  for (const record of records) {
    if (!record.orderItemId) {
      legacy = record;
      continue;
    }
    byItem.set(record.orderItemId, record);
  }
  return { legacy, byItem };
}

export async function buildProductionExecutionBundle(orderId: string): Promise<ProductionExecutionBundle> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { variants: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng.");
  }

  const [allStages, allQc, files, leanOpsByItem] = await Promise.all([
    listAllProductionStagesForOrder(orderId),
    listQcInspectionsForOrder(orderId),
    listOrderProductionFiles(orderId),
    loadLeanOpsTrackingsForOrder(orderId),
  ]);

  const usesLeanOps = leanOpsByItem.size > 0;
  const isLegacy = hasLegacyOrderLevelStages(allStages) || hasLegacyOrderLevelQc(allQc);

  // Do not seed competing OrderProductionStage rows when Lean Ops tracking exists.
  if (!usesLeanOps && isLegacy && allStages.length === 0 && order.items.length > 0) {
    await ensureProductionStagesInitializedForOrder(orderId);
  }

  let stages = allStages.length > 0 ? allStages : await listAllProductionStagesForOrder(orderId);
  const qcRecords = allQc;
  const legacyData = isLegacy && !usesLeanOps;

  if (!usesLeanOps && !legacyData && stages.length === 0) {
    for (const item of order.items) {
      await ensureProductionStagesForOrderItem(orderId, item.id);
    }
    stages = await listAllProductionStagesForOrder(orderId);
  }

  const stageGroups = groupStagesByItem(stages);
  const qcGroups = groupQcByItem(qcRecords);
  const activeFiles = files.filter((f) => f.status === "ACTIVE");

  const items: OrderItemExecutionBundle[] = await Promise.all(
    order.items.map(async (item) => {
      const orderedQuantity = resolveOrderItemTotalQuantity(item);
      const itemFiles = activeFiles.filter((f) => f.orderItemId === item.id);
      const leanTracking = leanOpsByItem.get(item.id);
      const itemUsesLeanOps = Boolean(leanTracking);

      let itemStages: ProductionStageRecord[];
      if (leanTracking) {
        itemStages = mapLeanOpsTrackingToStages(orderId, leanTracking);
      } else if (legacyData) {
        itemStages = stageGroups.legacy;
      } else {
        itemStages =
          stageGroups.byItem.get(item.id) ??
          (await ensureProductionStagesForOrderItem(orderId, item.id));
      }

      let itemQc = legacyData ? qcGroups.legacy : qcGroups.byItem.get(item.id) ?? null;
      if (!legacyData && !itemQc) {
        itemQc = await getQcInspection(orderId, item.id);
      }

      const readiness = evaluateOrderItemReadiness({
        supplySource: item.supplySource,
        processingMethod: item.processingMethod,
        orderedQuantity,
        stages: itemStages,
        qc: itemQc,
        activeFileCount: itemFiles.length,
        hasDesignFile: itemHasDesignFile(itemFiles),
      });

      return {
        orderItemId: item.id,
        productName: [item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "Sản phẩm",
        colorSnapshot: item.colorSnapshot,
        skuSnapshot: item.skuSnapshot,
        quantity: orderedQuantity,
        unit: item.unit,
        supplySource: item.supplySource,
        processingMethod: item.processingMethod,
        stages: itemStages,
        qc: itemQc,
        readiness,
        activeFileCount: itemFiles.length,
        usesLeanOps: itemUsesLeanOps,
        leanOpsReadyQuantity: leanTracking ? resolveLeanOpsReadyQuantity(leanTracking) : 0,
      };
    }),
  );

  const orderReadinessState = aggregateOrderReadinessFromItems(items.map((i) => i.readiness.state));

  return {
    isLegacy: legacyData,
    usesLeanOps,
    legacyStages: legacyData ? stageGroups.legacy : [],
    legacyQc: legacyData ? qcGroups.legacy : null,
    items,
    orderReadiness: {
      state: orderReadinessState,
      stateLabel: ORDER_ITEM_READINESS_LABELS[orderReadinessState],
    },
  };
}

export async function getItemProductionStages(
  orderId: string,
  orderItemId: string,
): Promise<ProductionStageRecord[]> {
  const leanOps = await loadLeanOpsTrackingsForOrder(orderId);
  const tracking = leanOps.get(orderItemId);
  if (tracking) {
    return mapLeanOpsTrackingToStages(orderId, tracking);
  }

  const legacyCount = await prisma.orderProductionStage.count({
    where: { orderId, orderItemId: null },
  });
  if (legacyCount > 0) {
    return listProductionStages(orderId, { orderItemId: null });
  }
  return ensureProductionStagesForOrderItem(orderId, orderItemId);
}
