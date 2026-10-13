import type { ReportRangePreset } from "@/features/crm/reporting.types";

export type GrowthReportFilters = {
  preset: ReportRangePreset;
  from: Date;
  to: Date;
  rangeLabel: string;
  marketingChannel?: string | null;
};

export type GrowthDashboardKpi = {
  key: string;
  label: string;
  value: number;
  kind: "count" | "money";
  href?: string;
};

export type GrowthChannelRow = {
  channel: string;
  channelLabel: string;
  campaign: string | null;
  campaignLabel: string;
  leads: number;
  qualifiedLeads: number;
  quotations: number;
  orders: number;
  revenue: number | null;
  conversionRate: number | null;
  href: string;
};

export type GrowthDashboardResponse = {
  meta: {
    rangeLabel: string;
    canViewFinancials: boolean;
  };
  kpis: GrowthDashboardKpi[];
  rows: GrowthChannelRow[];
};
