import type { CustomerType, LeadStatus } from "@prisma/client";

export type ReportRangePreset =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "custom";

export type CrmReportFilters = {
  preset: ReportRangePreset;
  from: Date;
  to: Date;
  salesOwnerId?: string;
  leadSource?: string;
  leadStatus?: LeadStatus;
  customerType?: CustomerType;
  revenueCategoryId?: string;
};

export type CrmReportingMeta = {
  canViewFinancials: boolean;
  canSelectAnySalesOwner: boolean;
  selectedSalesOwnerId: string | null;
  rangeLabel: string;
};

export type CrmKpiCard = {
  key: string;
  label: string;
  value: number | string;
  href: string;
  kind: "count" | "money";
};

export type OverviewReportResponse = {
  meta: CrmReportingMeta;
  kpis: CrmKpiCard[];
};

export type PipelineStageMetric = {
  status: LeadStatus;
  label: string;
  count: number;
  overdueFollowUps: number;
  href: string;
};

export type PipelineReportResponse = {
  meta: CrmReportingMeta;
  byStage: PipelineStageMetric[];
  aging: Array<{ bucket: "0-3" | "4-7" | "8-14" | "15+"; count: number }>;
  lossReasons: Array<{ reason: string; count: number }>;
  hasReliableStageConversion: boolean;
};

export type SalesPerformanceRow = {
  employeeId: string;
  salesName: string;
  leadsAssigned: number;
  leadsContacted: number;
  leadsWon: number;
  leadsLost: number;
  followUpOverdue: number;
  activitiesCompleted: number;
  quotesCreated: number;
  quotesConvertedToOrders: number;
  customersCreated: number;
  ordersCreatedFromCrm: number;
  quoteValue: number | null;
  orderValue: number | null;
  averageOrderValue: number | null;
  leadsHref: string;
  quotesHref: string;
  ordersHref: string;
};

export type SalesReportResponse = {
  meta: CrmReportingMeta;
  rows: SalesPerformanceRow[];
};

export type LeadSourceRow = {
  source: string;
  label: string;
  newLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  quotesCreated: number;
  ordersCreated: number;
  conversionRate: number | null;
  financialValue: number | null;
  href: string;
};

export type LeadSourceReportResponse = {
  meta: CrmReportingMeta;
  rows: LeadSourceRow[];
};

export type CustomerReportResponse = {
  meta: CrmReportingMeta;
  kpis: Array<{ key: string; label: string; value: number | string; href?: string }>;
  inactivity: Array<{ label: string; count: number; href: string }>;
  typeBreakdown: Array<{ type: string; count: number }>;
  sourceBreakdown: Array<{ source: string; count: number }>;
  topCustomers: Array<{
    customerId: string;
    name: string;
    orderCount: number;
    value: number | null;
    href: string;
  }>;
};
