import type { OrderActualCostCategory, OrderActualCostCloseStatus, OrderStatus } from "@prisma/client";

export type OrderActualCostEntryRecord = {
  id: string;
  orderId: string;
  orderItemId: string | null;
  category: OrderActualCostCategory;
  label: string | null;
  description: string | null;
  amount: number;
  currency: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderActualCostItemRollup = {
  orderItemId: string;
  productName: string;
  quantity: number;
  unit: string;
  estimatedCost: number | null;
  actualAttributedCost: number;
  costVariance: number | null;
};

export type OrderActualCostSummary = {
  orderId: string;
  orderNo: string;
  orderStatus: OrderStatus;
  currency: string;
  /** Live VAT-exclusive commercial value from Order fields. */
  commercialValue: number;
  hasCloseRecord: boolean;
  status: OrderActualCostCloseStatus | null;
  /** Frozen estimated baseline when close record exists; else live estimate. */
  estimatedCommercialValue: number;
  estimatedCost: number | null;
  estimatedGrossMargin: number | null;
  estimatedGrossMarginRate: number | null;
  hasEstimatedCost: boolean;
  actualCostTotal: number | null;
  actualGrossMargin: number | null;
  actualGrossMarginRate: number | null;
  costVariance: number | null;
  hasActualEntries: boolean;
  closedAt: string | null;
  closedByUserId: string | null;
  reopenedAt: string | null;
  reopenedByUserId: string | null;
  note: string | null;
  needsCloseWarning: boolean;
  entries: OrderActualCostEntryRecord[];
  itemRollups: OrderActualCostItemRollup[];
  sharedActualCostTotal: number;
};

export type UpsertOrderActualCostEntryInput = {
  orderItemId?: string | null;
  category: OrderActualCostCategory;
  label?: string | null;
  description?: string | null;
  amount: number;
};
