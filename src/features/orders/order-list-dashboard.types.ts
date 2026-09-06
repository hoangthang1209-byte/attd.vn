import type { OrderStatus } from "@prisma/client";
import type { OrderPaymentStateFilter } from "@/features/orders/order-labels";
import type { ProductionUrgency } from "@/features/orders/order-operations.types";

export type OrderListKpiKey =
  | "in_production"
  | "awaiting_qc"
  | "ready_to_ship"
  | "at_risk"
  | "overdue"
  | "needs_action";

export type OrderListQuickFilter =
  | "all"
  | "mine"
  | "in_production"
  | "awaiting_qc"
  | "missing_docs"
  | "missing_materials"
  | "ready_to_ship"
  | "overdue";

export type OrderListDashboardKpi = {
  key: OrderListKpiKey;
  label: string;
  count: number;
  tone: "blue" | "purple" | "green" | "orange" | "red" | "slate";
};

export type OrderListQuickFilterChip = {
  key: OrderListQuickFilter;
  label: string;
  count: number | null;
};

export type OrderListDashboardRow = {
  id: string;
  orderNo: string;
  createdAt: string;
  customerId: string | null;
  customerCompanyName: string | null;
  contactName: string | null;
  status: OrderStatus;
  productCount: number;
  totalQuantity: number;
  quantityUnit: string | null;
  productThumbnails: string[];
  deliveryExpectedAt: string | null;
  deliveryDeadlineRelative: string;
  deliveryDeadlineTone: "default" | "warn" | "danger" | "muted";
  progressPercent: number | null;
  progressLabel: string;
  progressTone: "muted" | "active" | "ok" | "warn" | "danger" | "purple";
  ownerName: string | null;
  ownerRole: string | null;
  deliveryMethodLabel: string | null;
  deliveryStateLabel: string;
  warnings: string[];
  productionUrgency: ProductionUrgency;
  totalAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentState?: OrderPaymentStateFilter;
};

export type OrderListDashboardSummary = {
  kpis: OrderListDashboardKpi[];
  quickFilters: OrderListQuickFilterChip[];
};

export type OrderListCustomerFilter = {
  id: string;
  name: string;
  code: string;
};

export type OrderListDashboardResponse = {
  orders: OrderListDashboardRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: OrderListDashboardSummary;
  /** Present when the list is filtered by an exact customerId. */
  customerFilter?: OrderListCustomerFilter | null;
  permissions: {
    canViewFinancials: boolean;
    canCreateOrders: boolean;
    employeeId: string | null;
  };
};

export type OrderListDashboardParams = {
  search?: string;
  /** Exact Order.customerId filter (cuid). */
  customerId?: string;
  status?: OrderStatus;
  paymentState?: OrderPaymentStateFilter;
  quickFilter?: OrderListQuickFilter;
  kpi?: OrderListKpiKey;
  mine?: boolean;
  page?: number;
  pageSize?: number;
};
