import type { AgentTaskPriority } from "@/features/agent-os/agent.types";
import type { CtoObservation, CtoPriorityEvaluation } from "@/features/agent-os/cto-loop.types";
import type { AutomationTaskRisk } from "@/features/automation/automation-task.types";

const PRIORITY_BASE: Record<AgentTaskPriority, number> = {
  P0: 0,
  P1: 1_000,
  P2: 2_000,
  P3: 3_000,
  unknown: 3_500,
};

const RISK_ADJUSTMENT: Record<AutomationTaskRisk, number> = {
  high: 100,
  medium: 250,
  low: 400,
  unknown: 300,
};

const BLOCKER_STATUSES = new Set(["blocked", "failed", "needs_fix", "stalled"]);

function resolveExplicitTier(observation: CtoObservation): AgentTaskPriority {
  if (observation.explicitPriority) return observation.explicitPriority;
  return observation.agentRoute.effectivePriority;
}

function stalenessTieBreaker(latestUpdateAt: string, nowMs: number): number {
  const updatedMs = Date.parse(latestUpdateAt);
  if (!Number.isFinite(updatedMs)) return 0;
  const ageMinutes = Math.max(0, Math.floor((nowMs - updatedMs) / 60_000));
  return Math.min(ageMinutes, 500);
}

/**
 * Deterministic priority score — lower is more urgent.
 * High-risk domains are handled by escalation in the loop engine, not by score alone.
 */
export function evaluateCtoTaskPriority(
  observation: CtoObservation,
  nowMs: number = Date.now(),
): CtoPriorityEvaluation {
  const tier = resolveExplicitTier(observation);
  let score = PRIORITY_BASE[tier];
  const reasons: string[] = [`ATTD_PRIORITY=${tier}`];

  score += RISK_ADJUSTMENT[observation.risk];
  reasons.push(`risk=${observation.risk}(+${RISK_ADJUSTMENT[observation.risk]})`);

  if (BLOCKER_STATUSES.has(observation.status)) {
    score -= 800;
    reasons.push("blocker/incident(-800)");
  }

  if (observation.status === "merged" && !observation.productionLive) {
    score -= 400;
    reasons.push("deploy-gap(-400)");
  }

  if (!observation.dependencyReady) {
    score += 5_000;
    reasons.push("dependency-not-ready(+5000)");
  }

  const stale = stalenessTieBreaker(observation.latestUpdateAt, nowMs);
  if (stale > 0) {
    score += stale;
    reasons.push(`staleness(+${stale})`);
  }

  return {
    score,
    tier,
    reason: reasons.join("; "),
  };
}
