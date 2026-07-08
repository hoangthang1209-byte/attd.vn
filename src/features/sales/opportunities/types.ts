import type {
  PricingCalculationStatus,
  QuoteStatus,
  SalesOpportunityPriority,
  SalesOpportunityStage,
} from "@prisma/client";
import type { CrmActivityRecord } from "@/features/crm/types";

export type SalesOpportunityListRecord = {
  id: string;
  code: string;
  title: string;
  stage: SalesOpportunityStage;
  priority: SalesOpportunityPriority;
  leadId: string | null;
  customerId: string | null;
  contactId: string | null;
  quoteId: string | null;
  pricingCalculationId: string | null;
  estimatedValue: number | null;
  probability: number;
  expectedCloseDate: string | null;
  nextFollowUpAt: string | null;
  assignedTo: string | null;
  source: string | null;
  note: string | null;
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  leadLabel: string | null;
  customerLabel: string | null;
  quoteNo: string | null;
  pricingCalculationCode: string | null;
  isFollowUpOverdue: boolean;
};

export type SalesOpportunityStageStats = {
  count: number;
  estimatedValue: number;
};

export type SalesOpportunityPipelineStats = {
  total: number;
  totalEstimatedValue: number;
  quotedValue: number;
  wonValue: number;
  followUpOverdueCount: number;
  byStage: Record<SalesOpportunityStage, SalesOpportunityStageStats>;
};

export type SalesOpportunityPipelineResult = {
  opportunities: SalesOpportunityListRecord[];
  groupedByStage: Record<SalesOpportunityStage, SalesOpportunityListRecord[]>;
  stats: SalesOpportunityPipelineStats;
};

export type CreateSalesOpportunityInput = {
  title: string;
  stage?: SalesOpportunityStage;
  priority?: SalesOpportunityPriority;
  leadId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  quoteId?: string | null;
  pricingCalculationId?: string | null;
  estimatedValue?: number | null;
  probability?: number;
  expectedCloseDate?: string | null;
  nextFollowUpAt?: string | null;
  assignedTo?: string | null;
  source?: string | null;
  note?: string | null;
};

export type UpdateSalesOpportunityInput = Partial<CreateSalesOpportunityInput> & {
  lostReason?: string | null;
};

export type ListSalesOpportunitiesInput = {
  stage?: SalesOpportunityStage;
  priority?: SalesOpportunityPriority;
  search?: string;
  limit?: number;
};

export type SalesOpportunityLeadSummary = {
  id: string;
  code: string | null;
  fullName: string;
  companyName: string | null;
  company: string | null;
  phone: string;
  email: string | null;
};

export type SalesOpportunityCustomerSummary = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type SalesOpportunityContactSummary = {
  id: string;
  fullName: string;
  title: string | null;
  phone: string | null;
  email: string | null;
};

export type SalesOpportunityQuoteSummary = {
  id: string;
  quoteNo: string;
  status: QuoteStatus;
  totalAmount: number;
  validUntil: string | null;
  createdAt: string;
};

export type SalesOpportunityPricingSummary = {
  id: string;
  code: string;
  status: PricingCalculationStatus;
  totalAmount: number;
  createdAt: string;
};

export type SalesOpportunityTimelineEntry = {
  id: string;
  kind: "activity" | "opportunity";
  createdAt: string;
  type: string;
  title: string;
  content: string | null;
  outcome: string | null;
  nextFollowUpAt: string | null;
};

export type SalesOpportunityWorkspaceResult = {
  opportunity: SalesOpportunityListRecord;
  lead: SalesOpportunityLeadSummary | null;
  customer: SalesOpportunityCustomerSummary | null;
  contact: SalesOpportunityContactSummary | null;
  quote: SalesOpportunityQuoteSummary | null;
  pricingCalculation: SalesOpportunityPricingSummary | null;
  relatedQuotes: SalesOpportunityQuoteSummary[];
  relatedCalculations: SalesOpportunityPricingSummary[];
  activities: CrmActivityRecord[];
  timeline: SalesOpportunityTimelineEntry[];
};
