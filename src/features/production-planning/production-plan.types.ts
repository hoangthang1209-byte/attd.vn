import type { ProductionPlanPriority, ProductionPlanStatus } from "@prisma/client";

export type ProductionPlanKpiKey =
  | "not_planned"
  | "missing_docs"
  | "missing_materials"
  | "ready_to_start"
  | "in_progress"
  | "awaiting_qc"
  | "at_risk"
  | "overdue";

export type ProductionPlanQuickFilter =
  | "all"
  | "mine"
  | "not_planned"
  | "missing_docs"
  | "missing_materials"
  | "ready_to_start"
  | "in_progress"
  | "awaiting_qc"
  | "overdue";

export type ProductionPlanListParams = {
  search?: string;
  kpi?: ProductionPlanKpiKey;
  quickFilter?: ProductionPlanQuickFilter;
  mine?: boolean;
  status?: ProductionPlanStatus;
  priority?: ProductionPlanPriority;
  ownerId?: string;
  page?: number;
  pageSize?: number;
};

export type ProductionPlanDocStatus = "ok" | "missing" | "needs_update";
export type ProductionPlanMaterialStatus = "ok" | "shortage" | "pending";
export type ProductionPlanQcStatus =
  | "not_applicable"
  | "awaiting"
  | "passed"
  | "rework";

export type ProductionPlanRiskTone = "green" | "yellow" | "orange" | "red";

export type ProductionPlanJobRow = {
  orderItemId: string;
  planId: string | null;
  jobCode: string;
  orderId: string;
  orderNo: string;
  customerName: string | null;
  canViewCustomer: boolean;
  productName: string;
  productThumbnail: string | null;
  colorSpec: string | null;
  processingMethodLabel: string;
  quantity: number;
  quantityUnit: string;
  deliveryDeadline: string | null;
  internalDeadline: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  ownerId: string | null;
  ownerName: string | null;
  workshopName: string | null;
  priority: ProductionPlanPriority;
  status: ProductionPlanStatus;
  statusLabel: string;
  docStatus: ProductionPlanDocStatus;
  docStatusLabel: string;
  materialStatus: ProductionPlanMaterialStatus;
  materialStatusLabel: string;
  qcStatus: ProductionPlanQcStatus;
  qcStatusLabel: string;
  risks: string[];
  riskTone: ProductionPlanRiskTone;
  progressPercent: number | null;
  canEditPlan: boolean;
};

export type ProductionPlanListResponse = {
  rows: ProductionPlanJobRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    kpis: Array<{ key: ProductionPlanKpiKey; label: string; count: number; tone: string }>;
    quickFilters: Array<{ key: ProductionPlanQuickFilter; label: string; count: number | null }>;
  };
};

export type ProductionPlanUpsertInput = {
  internalDeadlineAt?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  productionOwnerId?: string | null;
  productionTeamName?: string | null;
  priority?: ProductionPlanPriority;
  estimatedLeadDays?: number | null;
  planningNote?: string | null;
  riskNote?: string | null;
  status?: ProductionPlanStatus;
};

export type ProductionPlanDetail = ProductionPlanJobRow & {
  orderStatus: string;
  supplySourceLabel: string;
  readinessLabel: string;
  planningNote: string | null;
  riskNote: string | null;
  estimatedLeadDays: number | null;
  warnings: string[];
};

export type ProductionBoardColumnKey =
  | "waiting_docs"
  | "waiting_materials"
  | "ready_to_start"
  | "in_progress"
  | "awaiting_qc"
  | "rework"
  | "completed";

export type ProductionBoardCard = {
  orderItemId: string;
  jobCode: string;
  orderNo: string;
  productName: string;
  quantity: number;
  quantityUnit: string;
  internalDeadline: string | null;
  ownerName: string | null;
  risks: string[];
  riskTone: ProductionPlanRiskTone;
  priority: ProductionPlanPriority;
};

export type ProductionBoardResponse = {
  columns: Array<{
    key: ProductionBoardColumnKey;
    label: string;
    cards: ProductionBoardCard[];
  }>;
};

export type ProductionDashboardSection = {
  key: string;
  label: string;
  count: number;
  href: string;
};

export type ProductionDashboardResponse = {
  sections: ProductionDashboardSection[];
  myJobs: ProductionPlanJobRow[];
  upcomingDeadlines: ProductionPlanJobRow[];
  ownerWorkload: Array<{ ownerId: string; ownerName: string; count: number }>;
  defaultMine: boolean;
  canEditPlans: boolean;
};
