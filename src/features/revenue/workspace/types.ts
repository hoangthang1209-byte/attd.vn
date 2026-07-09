export type RevenueWorkspaceTimelineType =
  | "OPPORTUNITY"
  | "LEAD"
  | "QUOTE"
  | "COSTING"
  | "ORDER"
  | "ACTIVITY";

export type RevenueWorkspacePayload = {
  opportunity: {
    id: string;
    code: string;
    title: string;
    stage: string;
    priority: string;
    estimatedValue: number | null;
    probability: number;
    expectedCloseDate: string | null;
    nextFollowUpAt: string | null;
    assignedTo: string | null;
    source: string | null;
    note: string | null;
    lostReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  customer: {
    id: string | null;
    label: string | null;
    code?: string | null;
    phone?: string | null;
    email?: string | null;
    taxCode?: string | null;
    address?: string | null;
  };
  contact: {
    id: string | null;
    label: string | null;
    phone?: string | null;
    email?: string | null;
    title?: string | null;
  };
  lead: {
    id: string | null;
    code?: string | null;
    label: string | null;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
  };
  currentQuote: {
    id: string | null;
    quoteNo: string | null;
    status: string | null;
    totalAmount: number | null;
    validUntil: string | null;
    publicShortCode?: string | null;
  };
  pricingCalculation: {
    id: string | null;
    code: string | null;
    totalAmount: number | null;
    status: string | null;
    resultSnapshot?: unknown;
  };
  order: {
    id: string | null;
    orderNo: string | null;
    status: string | null;
    totalAmount?: number | null;
    deliveryDate?: string | null;
  };
  relatedQuotes: Array<{
    id: string;
    quoteNo: string;
    status: string;
    totalAmount: number;
    validUntil: string | null;
    createdAt: string;
  }>;
  relatedPricingCalculations: Array<{
    id: string;
    code: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
  relatedOrders: Array<{
    id: string;
    orderNo: string;
    status: string;
    totalAmount: number | null;
    deliveryDate: string | null;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    type: RevenueWorkspaceTimelineType;
    title: string;
    description?: string | null;
    at: string;
    href?: string | null;
  }>;
  stats: {
    estimatedValue: number | null;
    quoteValue: number | null;
    orderValue: number | null;
    grossMargin?: number | null;
    probability: number;
  };
};
