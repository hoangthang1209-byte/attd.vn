export type ExecutiveDashboardPayload = {
  kpis: {
    openPipelineValue: number;
    weightedForecastValue: number;
    wonValueThisMonth: number;
    quoteValueThisMonth: number;
    orderValueThisMonth: number;
    averageGrossMargin: number | null;
    overdueFollowUps: number;
    notificationCount: number;
  };

  deltas: {
    wonValueChangePct: number | null;
    quoteValueChangePct: number | null;
    orderValueChangePct: number | null;
  };

  opportunityByStage: Array<{
    stage: string;
    label: string;
    count: number;
    estimatedValue: number;
    weightedValue: number;
  }>;

  quoteByStatus: Array<{
    status: string;
    label: string;
    count: number;
    value: number;
  }>;

  orderByStatus: Array<{
    status: string;
    label: string;
    count: number;
    value: number;
  }>;

  funnel: Array<{
    key: string;
    label: string;
    count: number;
    value?: number;
  }>;

  followUp: {
    overdue: number;
    today: number;
    quoteExpiring: number;
    noResponse: number;
    leadFollowUp: number;
  };

  topCustomers: Array<{
    id: string;
    name: string;
    value: number;
    count: number;
    href: string;
  }>;

  topProducts: Array<{
    label: string;
    value: number;
    count: number;
  }>;

  margin: {
    average: number | null;
    highest: Array<{
      label: string;
      marginRate: number;
      value: number;
    }>;
    lowest: Array<{
      label: string;
      marginRate: number;
      value: number;
    }>;
  };

  alerts: Array<{
    id: string;
    title: string;
    severity: string;
    href: string;
  }>;

  generatedAt: string;
};
