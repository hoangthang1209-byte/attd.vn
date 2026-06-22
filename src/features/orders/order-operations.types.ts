import type { OrderStatus } from "@prisma/client";
import type { ProductionBoardQcFilter } from "@/features/orders/production-execution-labels";

export type ProductionUrgency =
  | "OVERDUE"
  | "TODAY"
  | "UPCOMING"
  | "NO_DUE_DATE"
  | "ON_TRACK";

export type DeliveryReadiness =
  | "READY"
  | "MISSING_INFO"
  | "LATE"
  | "IN_TRANSIT"
  | "COMPLETED";

export type ProductionDueFilter =
  | "overdue"
  | "today"
  | "upcoming"
  | "upcoming3"
  | "upcoming7"
  | "none";

export type ProductionBoardItemVariant = {
  productName: string | null;
  colorName: string | null;
  sizeValue: string | null;
  quantity: number;
  unit: string;
  sku: string | null;
};

export type ProductionBoardOrder = {
  id: string;
  orderNo: string;
  sourceQuoteNo: string | null;
  customerCompanyName: string | null;
  contactName: string | null;
  salesName: string | null;
  status: OrderStatus;
  productionOwnerId: string | null;
  productionOwnerName: string | null;
  productionDueDate: string | null;
  productionStartedAt: string | null;
  productionNote: string | null;
  orderDate: string;
  readyToShipAt: string | null;
  primaryProductName: string | null;
  extraProductCount: number;
  totalQuantity: number;
  primaryUnit: string | null;
  productionUrgency: ProductionUrgency;
  itemVariants: ProductionBoardItemVariant[];
  executionStageProgress: string;
  executionQcStatusLabel: string;
  executionPackingLabel: string;
  executionHandoverLabel: string;
  executionHandoverReady: boolean;
  executionQcFilterKey: ProductionBoardQcFilter;
  executionHandoverOverride: boolean;
};

export type ProductionBoardSummary = {
  confirmedCount: number;
  inProductionCount: number;
  dueSoonCount: number;
  overdueCount: number;
  readyToShipCount: number;
  needsQcCount: number;
  needsReworkCount: number;
  awaitingPackingCount: number;
  handoverReadyCount: number;
};

export type DeliveryBoardOrder = {
  id: string;
  orderNo: string;
  customerCompanyName: string | null;
  deliveryRecipientName: string | null;
  deliveryRecipientPhone: string | null;
  deliveryAddress: string | null;
  deliveryMethodName: string | null;
  deliveryCarrier: string | null;
  deliveryTrackingCode: string | null;
  deliveryExpectedAt: string | null;
  deliveryOwnerName: string | null;
  deliveryNote: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  status: OrderStatus;
  deliveryReadiness: DeliveryReadiness;
  missingDeliveryFields: string[];
  executionHandoverLabel: string | null;
  executionHandoverOverride: boolean;
  executionQcStatusLabel: string | null;
};

export type DeliveryBoardSummary = {
  readyToShipCount: number;
  shippedCount: number;
  lateCount: number;
  missingInfoCount: number;
  completedTodayCount: number;
};

export type OrderOperationalSummary = {
  newOrders: number;
  awaitingConfirmation: number;
  inProduction: number;
  productionDueSoon: number;
  productionOverdue: number;
  readyToShip: number;
  inTransit: number;
  missingDeliveryInfo: number;
  totalOutstandingActive: number;
};
