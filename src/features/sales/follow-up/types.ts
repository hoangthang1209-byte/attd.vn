export type SalesFollowUpType =
  | "OPPORTUNITY_OVERDUE"
  | "OPPORTUNITY_TODAY"
  | "QUOTE_EXPIRING"
  | "QUOTE_NO_RESPONSE"
  | "LEAD_FOLLOW_UP"
  | "ACTIVITY_FOLLOW_UP";

export type SalesFollowUpPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export type SalesFollowUpItem = {
  id: string;
  type: SalesFollowUpType;
  priority: SalesFollowUpPriority;
  title: string;
  subtitle?: string | null;
  dueAt?: string | null;
  amount?: number | null;
  customerLabel?: string | null;
  contactLabel?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  opportunityId?: string | null;
  leadId?: string | null;
  quoteId?: string | null;
  activityId?: string | null;
  href?: string | null;
  reason: string;
};

export type SalesFollowUpCenterStats = {
  total: number;
  urgent: number;
  overdue: number;
  today: number;
  quoteExpiring: number;
  noResponse: number;
  leadFollowUp: number;
};

export type SalesFollowUpCenterResult = {
  items: SalesFollowUpItem[];
  stats: SalesFollowUpCenterStats;
};
