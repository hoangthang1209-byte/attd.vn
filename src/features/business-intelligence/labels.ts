export const EXECUTIVE_DASHBOARD_KPI_LABELS = {
  openPipelineValue: "Pipeline mở",
  weightedForecastValue: "Forecast có trọng số",
  wonValueThisMonth: "Won tháng này",
  quoteValueThisMonth: "Quote tháng này",
  orderValueThisMonth: "Order tháng này",
  averageGrossMargin: "Gross margin TB",
  overdueFollowUps: "Follow-up quá hạn",
  notificationCount: "Cảnh báo",
} as const;

export const EXECUTIVE_FUNNEL_LABELS: Record<string, string> = {
  lead: "Lead",
  opportunity: "Opportunity",
  costing: "Costing",
  quote: "Quote",
  won: "Won",
  order: "Order",
};

export const EXECUTIVE_SECTION_LABELS = {
  funnel: "Sales Funnel",
  opportunityByStage: "Opportunity theo giai đoạn",
  quoteAnalytics: "Quote Analytics",
  orderSnapshot: "Order Snapshot",
  followUpAlerts: "Follow-up & Alerts",
  topCustomers: "Top Customers",
  topProducts: "Top Products",
  margin: "Margin",
} as const;
