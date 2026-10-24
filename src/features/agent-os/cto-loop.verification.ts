import type { CtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import type {
  CtoObservation,
  CtoVerificationExpectation,
  CtoVerificationOutcome,
} from "@/features/agent-os/cto-loop.types";

export function buildVerificationExpectation(
  action: CtoAllowedAction,
): CtoVerificationExpectation {
  switch (action) {
    case "POST_BUILD_APPROVED":
      return { kind: "build_approved", requiresChange: true };
    case "REQUEST_CI_RETRY":
      return { kind: "ci_status", requiresChange: true };
    case "ADVANCE_AFTER_VERIFIED_STATE":
      return { kind: "run_status", requiresChange: true };
    case "ASSIGN_AGENT":
      return { kind: "run_status", requiresChange: false };
    case "WAIT_EXTERNAL":
    case "WAIT_HUMAN":
      return { kind: "none", requiresChange: false };
    case "ESCALATE_HIGH_RISK":
    case "ESCALATE_NO_PROGRESS":
      return { kind: "none", requiresChange: false };
    default:
      return { kind: "none", requiresChange: false };
  }
}

function prVerificationFingerprint(observation: CtoObservation): string {
  const pr = observation.pullRequest;
  if (!pr) return "no-pr";
  const verification = pr.verification;
  return [
    pr.headShaFingerprint ?? "no-head",
    verification?.ciStatus ?? "ci-unknown",
    verification?.reviewStatus ?? "review-unknown",
    pr.merged ? "merged" : "open",
  ].join("|");
}

function observationSignalFingerprint(observation: CtoObservation): string {
  return [
    observation.status,
    observation.hasBuildApproved ? "approved" : "no-approved",
    prVerificationFingerprint(observation),
    observation.productionLive ? "prod-live" : "prod-not-live",
  ].join("::");
}

export function evaluateCtoVerification(input: {
  action: CtoAllowedAction;
  expectation: CtoVerificationExpectation;
  before: CtoObservation;
  after: CtoObservation;
  executionSubmitted: boolean;
}): CtoVerificationOutcome {
  if (input.action === "NOOP" || input.action === "RECORD_DECISION") {
    return "skipped";
  }

  if (!input.executionSubmitted) {
    return "failed";
  }

  if (input.expectation.kind === "none" || !input.expectation.requiresChange) {
    return input.executionSubmitted ? "verified" : "pending";
  }

  const beforeSignal = observationSignalFingerprint(input.before);
  const afterSignal = observationSignalFingerprint(input.after);

  if (input.expectation.kind === "build_approved") {
    if (input.after.hasBuildApproved && !input.before.hasBuildApproved) return "verified";
    if (input.after.hasBuildApproved && input.before.hasBuildApproved) return "verified";
    return beforeSignal === afterSignal ? "pending" : "verified";
  }

  return beforeSignal === afterSignal ? "pending" : "verified";
}
