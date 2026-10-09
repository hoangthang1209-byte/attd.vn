import { resolveCanonicalLaneId } from "@/features/automation/automation-lane.constants";
import { TASK_AREA_UNCLASSIFIED } from "@/features/automation/automation-status.parser";
import { getActiveAgent, getAgentById } from "@/features/agent-os/agent-registry";
import { parseAgentIssueMetadata } from "@/features/agent-os/agent-metadata.parser";
import type { AgentId, AgentRouteResult, AgentTaskPriority } from "@/features/agent-os/agent.types";
import type { AutomationTaskRisk } from "@/features/automation/automation-task.types";

const HIGH_RISK_KEYWORD_PATTERN =
  /\b(pricing|payment|banking|sepay|reconciliation|invoice|accounting|authentication|authorization|permission|migrate|migration)\b/i;

const KEYWORD_AGENT_RULES: Array<{ pattern: RegExp; agentId: AgentId }> = [
  { pattern: /\b(crm|lead|sales)\b/i, agentId: "CRM_AGENT" },
  { pattern: /\b(seo|marketing|content)\b/i, agentId: "SEO_AGENT" },
  { pattern: /\b(quote|quotation)\b/i, agentId: "PRICING_QUOTATION_AGENT" },
  { pattern: /\b(homepage|public website|landing)\b/i, agentId: "PUBLIC_WEBSITE_AGENT" },
  { pattern: /\b(deploy|vercel|preview)\b/i, agentId: "DEPLOYMENT_AGENT" },
  { pattern: /\b(test|qa|ci)\b/i, agentId: "QA_AGENT" },
  { pattern: /\b(reliability|incident|uptime|observability)\b/i, agentId: "RELIABILITY_AGENT" },
];

const LANE_TO_AGENT: Record<string, AgentId> = {
  "lead-sales-crm": "CRM_AGENT",
  "public-website-ui": "PUBLIC_WEBSITE_AGENT",
  "automation-platform": "ATTD_CTO",
  "marketing-content-seo": "SEO_AGENT",
  "quotation-quote-builder": "PRICING_QUOTATION_AGENT",
  "internal-admin-mobile-ux": "PUBLIC_WEBSITE_AGENT",
  "order-production-operations": "CRM_AGENT",
};

export type RouteAutomationTaskInput = {
  title: string;
  body: string | null;
  comments: readonly { body: string }[];
  taskArea: string;
  risk: AutomationTaskRisk;
};

function isHighRiskTask(input: RouteAutomationTaskInput): boolean {
  if (input.risk === "high") return true;
  const haystack = [input.title, input.body ?? "", ...input.comments.map((c) => c.body)].join("\n");
  return HIGH_RISK_KEYWORD_PATTERN.test(haystack);
}

function resolveEffectiveTaskArea(
  parsedArea: string | null,
  legacyTaskArea: string,
): string {
  if (parsedArea) return parsedArea;
  return legacyTaskArea;
}

function routeByTaskArea(taskArea: string): AgentId | null {
  if (taskArea === TASK_AREA_UNCLASSIFIED) return null;
  const laneId = resolveCanonicalLaneId(taskArea);
  if (laneId && LANE_TO_AGENT[laneId]) {
    return LANE_TO_AGENT[laneId] ?? null;
  }
  return null;
}

function routeByKeywords(text: string): AgentId | null {
  for (const rule of KEYWORD_AGENT_RULES) {
    if (rule.pattern.test(text)) {
      return rule.agentId;
    }
  }
  return null;
}

function resolvePriority(
  metadataPriority: AgentTaskPriority | null,
  agentDefault: AgentTaskPriority,
): AgentTaskPriority {
  if (metadataPriority) return metadataPriority;
  return agentDefault;
}

/**
 * Pure routing: maps a normalized task to an agent. Does not perform GitHub writes.
 */
export function routeAutomationTask(input: RouteAutomationTaskInput): AgentRouteResult {
  const metadata = parseAgentIssueMetadata({
    body: input.body,
    comments: input.comments,
  });

  const effectiveTaskArea = resolveEffectiveTaskArea(metadata.taskAreaOverride, input.taskArea);
  const highRisk = isHighRiskTask(input);

  if (highRisk) {
    const cto = getAgentById("ATTD_CTO");
    return {
      agentId: "ATTD_CTO",
      displayName: cto.displayName,
      reason: "high_risk_escalation",
      requiresHumanEscalation: true,
      metadata,
      effectiveTaskArea,
      effectivePriority: resolvePriority(metadata.priority, cto.defaultPriority),
    };
  }

  if (metadata.agentOverrideValid && metadata.agentOverride) {
    const overrideAgent = getActiveAgent(metadata.agentOverride as AgentId);
    if (overrideAgent) {
      return {
        agentId: overrideAgent.id,
        displayName: overrideAgent.displayName,
        reason: "metadata_agent_override",
        requiresHumanEscalation: false,
        metadata,
        effectiveTaskArea,
        effectivePriority: resolvePriority(metadata.priority, overrideAgent.defaultPriority),
      };
    }
  }

  const areaAgent = routeByTaskArea(effectiveTaskArea);
  if (areaAgent) {
    const agent = getAgentById(areaAgent);
    return {
      agentId: areaAgent,
      displayName: agent.displayName,
      reason: "task_area",
      requiresHumanEscalation: false,
      metadata,
      effectiveTaskArea,
      effectivePriority: resolvePriority(metadata.priority, agent.defaultPriority),
    };
  }

  const keywordHaystack = [
    input.title,
    input.body ?? "",
    effectiveTaskArea,
    ...input.comments.map((comment) => comment.body),
  ].join("\n");
  const keywordAgent = routeByKeywords(keywordHaystack);
  if (keywordAgent) {
    const agent = getAgentById(keywordAgent);
    return {
      agentId: keywordAgent,
      displayName: agent.displayName,
      reason: "keyword_fallback",
      requiresHumanEscalation: false,
      metadata,
      effectiveTaskArea,
      effectivePriority: resolvePriority(metadata.priority, agent.defaultPriority),
    };
  }

  const cto = getAgentById("ATTD_CTO");
  return {
    agentId: "ATTD_CTO",
    displayName: cto.displayName,
    reason: "default_cto",
    requiresHumanEscalation: false,
    metadata,
    effectiveTaskArea,
    effectivePriority: resolvePriority(metadata.priority, cto.defaultPriority),
  };
}
