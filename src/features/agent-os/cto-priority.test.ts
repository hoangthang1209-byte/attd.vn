import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateCtoTaskPriority } from "@/features/agent-os/cto-priority";
import type { CtoObservation } from "@/features/agent-os/cto-loop.types";
import type { AgentRouteResult } from "@/features/agent-os/agent.types";

function baseObservation(overrides: Partial<CtoObservation> = {}): CtoObservation {
  const agentRoute: AgentRouteResult = {
    agentId: "QA_AGENT",
    displayName: "QA",
    reason: "task_area",
    requiresHumanEscalation: false,
    agentOverrideAreaMismatch: false,
    metadata: {
      agentOverride: null,
      agentOverrideValid: false,
      taskAreaOverride: null,
      priority: null,
      parentTaskIssueNumber: null,
    },
    effectiveTaskArea: "automation-platform",
    effectivePriority: "P2",
  };

  return {
    issueNumber: 1,
    status: "backlog",
    risk: "low",
    taskArea: "Automation Platform",
    hasBuildApproved: false,
    blockerReason: null,
    isOpen: true,
    agentRoute,
    pullRequest: null,
    productionLive: false,
    dependencyReady: true,
    parentTaskIssueNumber: null,
    latestUpdateAt: "2026-01-01T00:00:00.000Z",
    explicitPriority: null,
    approveBuildEligible: false,
    ...overrides,
  };
}

describe("evaluateCtoTaskPriority", () => {
  it("ranks P0 above P3 with deterministic scores", () => {
    const p0 = evaluateCtoTaskPriority(
      baseObservation({ explicitPriority: "P0" }),
      Date.parse("2026-01-01T01:00:00.000Z"),
    );
    const p3 = evaluateCtoTaskPriority(
      baseObservation({ explicitPriority: "P3" }),
      Date.parse("2026-01-01T01:00:00.000Z"),
    );
    assert.ok(p0.score < p3.score);
  });

  it("deprioritizes tasks with unready dependencies", () => {
    const ready = evaluateCtoTaskPriority(baseObservation({ dependencyReady: true }));
    const blocked = evaluateCtoTaskPriority(baseObservation({ dependencyReady: false }));
    assert.ok(ready.score < blocked.score);
  });

  it("uses staleness only as a tie-breaker bump", () => {
    const fresh = evaluateCtoTaskPriority(
      baseObservation({ latestUpdateAt: "2026-01-01T00:00:00.000Z" }),
      Date.parse("2026-01-01T00:30:00.000Z"),
    );
    const stale = evaluateCtoTaskPriority(
      baseObservation({ latestUpdateAt: "2026-01-01T00:00:00.000Z" }),
      Date.parse("2026-01-01T06:00:00.000Z"),
    );
    assert.ok(stale.score > fresh.score);
    assert.ok(stale.score - fresh.score <= 500);
  });
});
