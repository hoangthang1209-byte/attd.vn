import type { AgentContract, AgentId } from "@/features/agent-os/agent.types";

const BASE_FORBIDDEN_SCOPES = [
  "production database writes",
  "automatic merge or deploy",
  "payment or banking credential access",
  "weakening admin auth or GitHub token scopes",
  "destructive migrations without explicit human approval",
] as const;

const BASE_ESCALATION = [
  {
    condition: "Task is high-risk (pricing, payment, banking, auth, permissions, invoices, accounting)",
    action: "Route to ATTD_CTO and require human escalation before implementation",
  },
  {
    condition: "Scope is ambiguous or crosses forbidden scopes",
    action: "Route to ATTD_CTO for triage",
  },
] as const;

export const AGENT_REGISTRY: readonly AgentContract[] = [
  {
    id: "ATTD_CTO",
    displayName: "ATTD CTO",
    role: "Orchestrator / routing authority",
    mission:
      "Triage engineering tasks, enforce factory safety gates, and route work to the correct specialist agent.",
    allowedTaskAreas: [
      "automation-platform",
      "Automation Platform",
      "cross-cutting",
    ],
    capabilities: [
      "Task routing and precedence",
      "High-risk escalation",
      "Orchestrator queue coordination (read-only in G1)",
    ],
    forbiddenScopes: [
      ...BASE_FORBIDDEN_SCOPES,
      "Bypassing BUILD_APPROVED or HIGH_RISK_APPROVED gates",
    ],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P1",
    active: true,
  },
  {
    id: "CRM_AGENT",
    displayName: "CRM Agent",
    role: "CRM & lead/sales specialist",
    mission: "Implement CRM, lead pipeline, and sales-facing admin workflows within approved scope.",
    allowedTaskAreas: [
      "lead-sales-crm",
      "Lead & Sales / CRM",
      "Lead & Sales",
      "CRM",
      "order-production-operations",
      "Order & Production Operations",
    ],
    capabilities: ["CRM CRUD flows", "Lead follow-up UX", "Sales admin surfaces"],
    forbiddenScopes: [
      ...BASE_FORBIDDEN_SCOPES,
      "Pricing engine formula changes without HIGH_RISK_APPROVED",
    ],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P2",
    active: true,
  },
  {
    id: "PRICING_QUOTATION_AGENT",
    displayName: "Pricing & Quotation Agent",
    role: "Quotation workflow specialist",
    mission:
      "Extend quotation and quote-builder experiences while reusing the existing Pricing Engine (no parallel formulas).",
    allowedTaskAreas: [
      "quotation-quote-builder",
      "Quotation / Quote Builder",
      "Quotation",
      "Quote Builder",
    ],
    capabilities: ["Quote builder UI", "Quotation workflows", "PDF/export surfaces tied to quotes"],
    forbiddenScopes: [
      ...BASE_FORBIDDEN_SCOPES,
      "Independent pricing calculations outside Pricing Engine",
      "Payment or invoice settlement logic",
    ],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P2",
    active: true,
  },
  {
    id: "PUBLIC_WEBSITE_AGENT",
    displayName: "Public Website Agent",
    role: "Public marketing site specialist",
    mission: "Ship public website UI, conversion flows, and admin mobile UX improvements.",
    allowedTaskAreas: [
      "public-website-ui",
      "Public Website UI",
      "internal-admin-mobile-ux",
      "Internal Admin Mobile UX",
    ],
    capabilities: ["Public pages", "Design system alignment", "Admin mobile UX"],
    forbiddenScopes: [...BASE_FORBIDDEN_SCOPES],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P2",
    active: true,
  },
  {
    id: "SEO_AGENT",
    displayName: "SEO Agent",
    role: "Content & SEO specialist",
    mission: "Improve marketing content, SEO metadata, and content operations within approved scope.",
    allowedTaskAreas: [
      "marketing-content-seo",
      "Marketing / Content / SEO",
      "Marketing",
      "SEO",
    ],
    capabilities: ["SEO metadata", "Content templates", "Marketing pages"],
    forbiddenScopes: [...BASE_FORBIDDEN_SCOPES],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P3",
    active: true,
  },
  {
    id: "QA_AGENT",
    displayName: "QA Agent",
    role: "Quality & verification specialist",
    mission: "Strengthen tests, CI signals, and verification notes for factory tasks.",
    allowedTaskAreas: ["automation-platform", "Automation Platform", "qa", "testing"],
    capabilities: ["Test coverage", "CI verification hints", "Regression checks"],
    forbiddenScopes: [...BASE_FORBIDDEN_SCOPES, "Merge or deploy decisions"],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P2",
    active: true,
  },
  {
    id: "DEPLOYMENT_AGENT",
    displayName: "Deployment Agent",
    role: "Release & preview specialist",
    mission: "Document and verify preview/production readiness without autonomous deploy.",
    allowedTaskAreas: ["automation-platform", "Automation Platform", "deployment", "vercel"],
    capabilities: ["Preview verification checklists", "Release notes support"],
    forbiddenScopes: [
      ...BASE_FORBIDDEN_SCOPES,
      "Autonomous production deploy",
      "Production secret rotation",
    ],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P2",
    active: true,
  },
  {
    id: "RELIABILITY_AGENT",
    displayName: "Reliability Agent",
    role: "Stability & incident specialist",
    mission: "Improve observability, incident response playbooks, and resilience for factory operations.",
    allowedTaskAreas: ["automation-platform", "Automation Platform", "reliability", "incident"],
    capabilities: ["Runbook docs", "Failure mode analysis", "Orchestrator repair support"],
    forbiddenScopes: [...BASE_FORBIDDEN_SCOPES],
    escalationRules: BASE_ESCALATION,
    defaultPriority: "P2",
    active: true,
  },
] as const;

const AGENT_BY_ID = new Map<AgentId, AgentContract>(
  AGENT_REGISTRY.map((agent) => [agent.id, agent]),
);

export function getAgentById(id: AgentId): AgentContract {
  const agent = AGENT_BY_ID.get(id);
  if (!agent) {
    throw new Error(`Unknown agent id: ${id}`);
  }
  return agent;
}

export function isKnownAgentId(value: string): value is AgentId {
  return AGENT_BY_ID.has(value as AgentId);
}

export function getActiveAgent(id: AgentId): AgentContract | null {
  const agent = AGENT_BY_ID.get(id);
  if (!agent || !agent.active) return null;
  return agent;
}

export function listActiveAgents(): AgentContract[] {
  return AGENT_REGISTRY.filter((agent) => agent.active);
}

export function assertRegistryInvariants(): void {
  const ids = new Set<string>();
  for (const agent of AGENT_REGISTRY) {
    if (ids.has(agent.id)) {
      throw new Error(`Duplicate agent id: ${agent.id}`);
    }
    ids.add(agent.id);
  }
  if (AGENT_REGISTRY.length !== 8) {
    throw new Error(`Expected 8 agents, found ${AGENT_REGISTRY.length}`);
  }
}
