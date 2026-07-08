import type {
  SalesOpportunityPriority,
  SalesOpportunityStage,
} from "@prisma/client";

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
