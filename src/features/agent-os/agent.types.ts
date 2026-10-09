/** Canonical agent identifiers for Phase G1 (code registry only, no DB). */
export const AGENT_IDS = [
  "ATTD_CTO",
  "CRM_AGENT",
  "PRICING_QUOTATION_AGENT",
  "PUBLIC_WEBSITE_AGENT",
  "SEO_AGENT",
  "QA_AGENT",
  "DEPLOYMENT_AGENT",
  "RELIABILITY_AGENT",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export type AgentTaskPriority = "P0" | "P1" | "P2" | "P3" | "unknown";

export type AgentEscalationRule = {
  condition: string;
  action: string;
};

export type AgentContract = {
  id: AgentId;
  displayName: string;
  role: string;
  mission: string;
  /** Canonical lane ids and human-readable area aliases this agent may own. */
  allowedTaskAreas: readonly string[];
  capabilities: readonly string[];
  forbiddenScopes: readonly string[];
  escalationRules: readonly AgentEscalationRule[];
  defaultPriority: AgentTaskPriority;
  active: boolean;
};

export type ParsedAgentIssueMetadata = {
  agentOverride: string | null;
  agentOverrideValid: boolean;
  taskAreaOverride: string | null;
  priority: AgentTaskPriority | null;
  parentTaskIssueNumber: number | null;
};

export type AgentRoutingReason =
  | "high_risk_escalation"
  | "metadata_agent_override"
  | "task_area"
  | "keyword_fallback"
  | "default_cto";

export type AgentRouteResult = {
  agentId: AgentId;
  displayName: string;
  reason: AgentRoutingReason;
  requiresHumanEscalation: boolean;
  metadata: ParsedAgentIssueMetadata;
  effectiveTaskArea: string;
  effectivePriority: AgentTaskPriority;
};

export type AgentWorkloadCounts = {
  active: number;
  blocked: number;
  queued: number;
};

export type AgentSummaryCard = {
  agentId: AgentId;
  displayName: string;
  active: boolean;
  counts: AgentWorkloadCounts;
};
