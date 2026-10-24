import type { AgentId } from "@/features/agent-os/agent.types";

export const MANAGEMENT_AGENT_IDS = [
  "CHIEF_OF_STAFF",
  "SALES_MANAGER",
  "SOURCING_MANAGER",
  "PRODUCT_MANAGER",
  "PRODUCTION_MANAGER",
  "FINANCE_MANAGER",
  "MARKETING_MANAGER",
  "TECHNOLOGY_MANAGER",
] as const;

export type ManagementAgentId = (typeof MANAGEMENT_AGENT_IDS)[number];

export type ManagementApprovalMode = "AUTO" | "REVIEW" | "HUMAN_ONLY";

export type ManagementAgentContract = {
  id: ManagementAgentId;
  displayName: string;
  role: string;
  mission: string;
  businessDomains: readonly string[];
  kpis: readonly string[];
  approvalMode: ManagementApprovalMode;
  forbiddenActions: readonly string[];
  delegatedWorkerAgents?: readonly AgentId[];
  active: boolean;
};

export type RfqWorkflowStepId =
  | "sales_qualify"
  | "product_analyze"
  | "sourcing_check"
  | "production_check"
  | "finance_check"
  | "sales_draft_quote"
  | "chief_review";

export type RfqWorkflowStep = {
  id: RfqWorkflowStepId;
  owner: ManagementAgentId;
  dependsOn: readonly RfqWorkflowStepId[];
  outputKey: string;
  approvalMode: ManagementApprovalMode;
};

export type RfqWorkflowState = Partial<Record<RfqWorkflowStepId, "READY" | "RUNNING" | "DONE" | "BLOCKED" | "FAILED">>;
