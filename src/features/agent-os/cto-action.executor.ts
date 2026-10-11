import { assertCtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import type { CtoActionExecutionResult, CtoLoopPlan, CtoObservation } from "@/features/agent-os/cto-loop.types";
import {
  approveBuildForIssue,
  type ApproveBuildResponse,
} from "@/features/automation/automation-approve-build.service";

export type CtoActionExecutorDeps = {
  postBuildApproved: (issueNumber: number) => Promise<ApproveBuildResponse>;
};

/** Server default wires POST_BUILD_APPROVED through the existing factory gate; tests may inject doubles. */
export function resolveCtoActionExecutorDeps(deps?: CtoActionExecutorDeps): CtoActionExecutorDeps {
  if (deps) return deps;
  return {
    postBuildApproved: async (issueNumber) => approveBuildForIssue(String(issueNumber)),
  };
}

export async function executeCtoAllowedAction(input: {
  plan: CtoLoopPlan;
  observation: CtoObservation;
  deps?: CtoActionExecutorDeps;
}): Promise<CtoActionExecutionResult> {
  const action = assertCtoAllowedAction(input.plan.selectedAction);
  const base: CtoActionExecutionResult = {
    action,
    idempotencyKey: input.plan.idempotencyKey,
    submitted: false,
  };

  switch (action) {
    case "NOOP":
    case "RECORD_DECISION":
      return { ...base, submitted: true, skippedReason: "no_side_effect" };

    case "ASSIGN_AGENT":
    case "WAIT_EXTERNAL":
    case "WAIT_HUMAN":
    case "ADVANCE_AFTER_VERIFIED_STATE":
    case "ESCALATE_HIGH_RISK":
    case "ESCALATE_NO_PROGRESS":
      return { ...base, submitted: true, externalReference: input.plan.assignedAgentId };

    case "REQUEST_CI_RETRY":
      return {
        ...base,
        submitted: true,
        skippedReason: "orchestrator_ci_path_recorded",
        externalReference: input.observation.pullRequest
          ? `pr-${input.observation.pullRequest.number}`
          : undefined,
      };

    case "POST_BUILD_APPROVED": {
      if (!input.deps) {
        return { ...base, skippedReason: "executor_deps_missing" };
      }
      const response = await input.deps.postBuildApproved(input.observation.issueNumber);
      const approved =
        response.result === "approved_now" || response.result === "already_approved";
      return {
        ...base,
        submitted: approved,
        skippedReason: approved ? undefined : response.result,
        externalReference: `issue-${response.issueNumber}`,
      };
    }

    default: {
      const _exhaustive: never = action;
      return { ...base, skippedReason: String(_exhaustive) };
    }
  }
}
