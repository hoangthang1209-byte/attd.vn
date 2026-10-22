import type { ManagementAgentContract } from "@/features/agent-os/management-team.types";

const HUMAN_ONLY = [
  "Send customer quotation without authorized human send action",
  "Accept PO or contractual commitment",
  "Execute payment or alter banking data",
  "Grant access or weaken permissions",
  "Deploy production without exact-head CI/review/approval gate",
  "Run destructive database changes without explicit approval",
] as const;

export const MANAGEMENT_TEAM_REGISTRY: readonly ManagementAgentContract[] = [
  {
    id: "CHIEF_OF_STAFF",
    displayName: "AI Chief of Staff",
    role: "Enterprise orchestrator",
    mission: "Translate CEO goals into coordinated cross-functional work, enforce dependencies, surface blockers, and route decisions for approval.",
    businessDomains: ["cross-functional", "executive-operations", "approvals"],
    kpis: ["goal completion rate", "blocked task age", "dependency resolution time", "decision turnaround"],
    approvalMode: "REVIEW",
    forbiddenActions: HUMAN_ONLY,
    active: true,
  },
  {
    id: "SALES_MANAGER",
    displayName: "AI Sales Manager",
    role: "International B2B sales manager",
    mission: "Qualify inbound and outbound B2B opportunities, manage CRM/RFQ/follow-up, and assemble quotation drafts.",
    businessDomains: ["international-sales", "crm", "rfq", "quotation"],
    kpis: ["qualified leads", "RFQs", "quote conversion", "PO conversion", "follow-up SLA"],
    approvalMode: "REVIEW",
    forbiddenActions: HUMAN_ONLY,
    active: true,
  },
  {
    id: "SOURCING_MANAGER",
    displayName: "AI Sourcing Manager",
    role: "Supplier and sourcing manager",
    mission: "Evaluate suppliers, MOQ, quotations, material options, lead time, capacity, and sourcing alternatives.",
    businessDomains: ["supplier-sourcing", "materials", "supplier-quotes", "capacity"],
    kpis: ["supplier response time", "MOQ fit", "cost competitiveness", "supplier reliability"],
    approvalMode: "REVIEW",
    forbiddenActions: HUMAN_ONLY,
    active: true,
  },
  {
    id: "PRODUCT_MANAGER",
    displayName: "AI Product Development Manager",
    role: "Product development manager",
    mission: "Translate RFQ requirements into technical feasibility, BOM, tech pack, sample, pattern, and approval requirements.",
    businessDomains: ["product-development", "tech-pack", "bom", "sample", "pattern"],
    kpis: ["sample turnaround", "revision cycles", "technical completeness", "approval lead time"],
    approvalMode: "REVIEW",
    forbiddenActions: HUMAN_ONLY,
    active: true,
  },
  {
    id: "PRODUCTION_MANAGER",
    displayName: "AI Production Manager",
    role: "Production and delivery manager",
    mission: "Validate capacity, schedule, QC, packing, logistics, and delivery feasibility; coordinate execution after approved PO.",
    businessDomains: ["production", "qc", "packing", "logistics", "delivery"],
    kpis: ["OTIF", "defect rate", "schedule variance", "capacity utilization"],
    approvalMode: "REVIEW",
    forbiddenActions: HUMAN_ONLY,
    active: true,
  },
  {
    id: "FINANCE_MANAGER",
    displayName: "AI Finance Manager",
    role: "Commercial finance manager",
    mission: "Validate costing, contribution margin, payment terms, receivables, working-capital exposure, and order profitability.",
    businessDomains: ["costing", "margin", "pnl", "receivables", "cash-flow"],
    kpis: ["contribution margin", "working-capital exposure", "overdue receivables", "order profitability"],
    approvalMode: "HUMAN_ONLY",
    forbiddenActions: HUMAN_ONLY,
    active: true,
  },
  {
    id: "MARKETING_MANAGER",
    displayName: "AI Marketing Manager",
    role: "B2B marketing manager",
    mission: "Operate vietnamclothing.vn, SEO, capability content, attribution, and qualified B2B lead generation.",
    businessDomains: ["website", "seo", "content", "lead-generation", "attribution"],
    kpis: ["qualified inbound leads", "organic traffic", "RFQ conversion", "content contribution"],
    approvalMode: "REVIEW",
    forbiddenActions: HUMAN_ONLY,
    active: true,
  },
  {
    id: "TECHNOLOGY_MANAGER",
    displayName: "AI Technology Manager",
    role: "Technology and Agent OS manager",
    mission: "Own VNC OS, website, GitHub, Vercel, CI/CD, QA, security, reliability, and technical worker orchestration.",
    businessDomains: ["vnc-os", "website", "github", "vercel", "qa", "security", "reliability"],
    kpis: ["deployment reliability", "CI pass rate", "incident rate", "lead intake integrity", "stuck-task recovery"],
    approvalMode: "REVIEW",
    forbiddenActions: HUMAN_ONLY,
    delegatedWorkerAgents: [
      "ATTD_CTO",
      "CRM_AGENT",
      "PRICING_QUOTATION_AGENT",
      "PUBLIC_WEBSITE_AGENT",
      "SEO_AGENT",
      "QA_AGENT",
      "DEPLOYMENT_AGENT",
      "RELIABILITY_AGENT",
    ],
    active: true,
  },
] as const;

export function getManagementAgent(id: ManagementAgentContract["id"]): ManagementAgentContract {
  const agent = MANAGEMENT_TEAM_REGISTRY.find((item) => item.id === id);
  if (!agent) throw new Error(`Unknown management agent: ${id}`);
  return agent;
}

export function assertManagementTeamRegistry(): void {
  const ids = new Set(MANAGEMENT_TEAM_REGISTRY.map((agent) => agent.id));
  if (MANAGEMENT_TEAM_REGISTRY.length !== 8 || ids.size !== 8) {
    throw new Error("Management team must contain exactly one Chief of Staff and seven managers");
  }
  const technology = getManagementAgent("TECHNOLOGY_MANAGER");
  if (!technology.delegatedWorkerAgents || technology.delegatedWorkerAgents.length === 0) {
    throw new Error("Technology Manager must reuse the existing technical Agent OS workers");
  }
}
