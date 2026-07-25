import type {
  ItemProductionDeliveryStatus,
  ItemProductionProgressEventType,
  ItemProductionRiskStatus,
  ItemProductionStageKey,
  ItemProductionStageStatus,
  ItemProductionStatus,
} from "@prisma/client";

/** Query filters accepted by `listProductionItems` / `GET /api/manufacturing/production-items`. */
export type ProductionListFilters = {
  search?: string;
  orderId?: string;
  customerId?: string;
  productionStatus?: ItemProductionStatus;
  deliveryStatus?: ItemProductionDeliveryStatus;
  currentStage?: ItemProductionStageKey;
  riskStatus?: ItemProductionRiskStatus;
  supplierId?: string;
  assignedEmployeeId?: string;
  promisedFrom?: string;
  promisedTo?: string;
  onlyDelayed?: boolean;
  onlyStale?: boolean;
  readyToShip?: boolean;
  page?: number;
  pageSize?: number;
};

/** KPI counters returned alongside the paginated list. */
export type ProductionListKpis = {
  total: number;
  inProduction: number;
  awaitingQc: number;
  readyToShip: number;
  needsAttention: number;
  atRisk: number;
  delayed: number;
  stale: number;
};

export type ProductionStageDTO = {
  id: string;
  productionItemId: string;
  stageKey: ItemProductionStageKey;
  labelSnapshot: string;
  sequence: number;
  isApplicable: boolean;
  weight: number;
  status: ItemProductionStageStatus;
  plannedQuantity: number;
  receivedQuantity: number;
  inProgressQuantity: number;
  completedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  wasteQuantity: number;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  supplierId: string | null;
  note: string | null;
};

export type ProductionProgressEntryDTO = {
  id: string;
  productionStageId: string;
  eventType: ItemProductionProgressEventType;
  quantityDelta: number;
  acceptedQuantityDelta: number;
  rejectedQuantityDelta: number;
  reworkQuantityDelta: number;
  wasteQuantityDelta: number;
  previousStatus: ItemProductionStageStatus | null;
  nextStatus: ItemProductionStageStatus | null;
  note: string | null;
  happenedAt: string;
  createdByAdminUser: { id: string; username: string } | null;
};

export type ProductionOrderItemVariantDTO = {
  id: string;
  sizeValue: string | null;
  colorNameSnapshot: string | null;
  skuSnapshot: string | null;
  quantity: number;
  unit: string;
};

/** Order/customer/product context embedded on each production item row. */
export type ProductionOrderItemDTO = {
  id: string;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  colorSnapshot: string | null;
  skuSnapshot: string | null;
  designImageUrl: string | null;
  designMediaAsset: { id: string; url: string | null; thumbnailUrl: string | null } | null;
  variants: ProductionOrderItemVariantDTO[];
  order: {
    id: string;
    orderNo: string;
    status: string;
    customerId: string | null;
    customerNameSnapshot: string | null;
    customerCompanyName: string | null;
    customer: { id: string; name: string; code: string | null } | null;
  };
};

/** Shape returned per row from `GET /api/manufacturing/production-items`. */
export type ProductionItemListRowDTO = {
  id: string;
  orderedQuantity: number;
  plannedQuantity: number;
  readyQuantity: number;
  progressPercent: number | string;
  productionStatus: ItemProductionStatus;
  deliveryStatus: ItemProductionDeliveryStatus;
  riskStatus: ItemProductionRiskStatus;
  currentStageKey: ItemProductionStageKey | null;
  promisedDeliveryDate: string | null;
  lastProgressAt: string | null;
  rowVersion: number;
  supplier: { id: string; code: string; name: string } | null;
  assignedEmployee: { id: string; employeeCode: string; fullName: string } | null;
  workflowTemplate: { id: string; code: string; name: string } | null;
  stages: ProductionStageDTO[];
  orderItem: ProductionOrderItemDTO;
};

/** Full detail shape returned from `GET /api/manufacturing/production-items/[id]`, stages include history. */
export type ProductionItemDetailDTO = ProductionItemListRowDTO & {
  stages: Array<ProductionStageDTO & { history: ProductionProgressEntryDTO[] }>;
};

export type ProductionListResponse = {
  items: ProductionItemListRowDTO[];
  total: number;
  page: number;
  pageSize: number;
  kpis: ProductionListKpis;
};

/** Response shape for `GET /api/orders/[id]/item-production-summary`. */
export type OrderProductionSummaryDTO = {
  total: number;
  averageProgressPercent: number;
  readyQuantity: number;
  plannedQuantity: number;
  atRiskCount: number;
  delayedCount: number;
  items: Array<{
    id: string;
    progressPercent: number | string;
    readyQuantity: number;
    plannedQuantity: number;
    riskStatus: ItemProductionRiskStatus;
    productionStatus: ItemProductionStatus;
    deliveryStatus: ItemProductionDeliveryStatus;
  }>;
};
