import type { CtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import type { CtoObservation } from "@/features/agent-os/cto-loop.types";
import type { PullRequestVerificationCiStatus } from "@/features/automation/automation-task.types";

export const G3_CI_RETRY_BASELINE_CI_STATUS_KEY = "g3CiRetryBaselineCiStatus";

export function readCiRetryBaselineCiStatus(
  summary: Record<string, string | number | boolean | null>,
): PullRequestVerificationCiStatus | null {
  const raw = summary[G3_CI_RETRY_BASELINE_CI_STATUS_KEY];
  if (raw === "success" || raw === "failure" || raw === "pending" || raw === "unknown") {
    return raw;
  }
  return null;
}

function parsePostBuildApprovedKeySegments(pendingIdempotencyKey: string): {
  issueNumber: number;
  prToken: string;
  headToken: string;
} | null {
  const segments = pendingIdempotencyKey.split(":");
  if (segments[0] !== "cto-g3" || segments[1] !== "post-build-approved" || segments.length < 6) {
    return null;
  }
  const issueNumber = Number(segments[2]);
  if (!Number.isFinite(issueNumber)) return null;
  return {
    issueNumber,
    prToken: segments[3] ?? "no-pr",
    headToken: segments[4] ?? "no-head",
  };
}

function parseCiRetryKeySegments(pendingIdempotencyKey: string): {
  issueNumber: number;
  prToken: string;
  headToken: string;
} | null {
  const segments = pendingIdempotencyKey.split(":");
  if (segments[0] !== "cto-g3" || segments[1] !== "ci-retry" || segments.length < 5) {
    return null;
  }
  const issueNumber = Number(segments[2]);
  if (!Number.isFinite(issueNumber)) return null;
  return {
    issueNumber,
    prToken: segments[3] ?? "no-pr",
    headToken: segments[4] ?? "no-head",
  };
}

function observationMatchesPostBuildApprovedStableIdentity(
  pendingIdempotencyKey: string,
  observation: CtoObservation,
): boolean {
  const parsed = parsePostBuildApprovedKeySegments(pendingIdempotencyKey);
  if (!parsed || parsed.issueNumber !== observation.issueNumber) return false;
  if (!observation.hasBuildApproved) return false;

  const pr = observation.pullRequest;
  const prToken = pr?.number ? `pr-${pr.number}` : "no-pr";
  const headToken = pr?.headShaFingerprint ?? "no-head";
  return parsed.prToken === prToken && parsed.headToken === headToken;
}

function observationMatchesCiRetryKey(
  pendingIdempotencyKey: string,
  observation: CtoObservation,
): boolean {
  const parsed = parseCiRetryKeySegments(pendingIdempotencyKey);
  if (!parsed || parsed.issueNumber !== observation.issueNumber) return false;

  const pr = observation.pullRequest;
  const prToken = pr?.number ? `pr-${pr.number}` : "no-pr";
  const headToken = pr?.headShaFingerprint ?? "no-head";
  return parsed.prToken === prToken && parsed.headToken === headToken;
}

function observationConfirmsCiRetry(input: {
  pendingIdempotencyKey: string;
  observation: CtoObservation;
  ciRetryBaselineCiStatus: PullRequestVerificationCiStatus | null;
}): boolean {
  if (!observationMatchesCiRetryKey(input.pendingIdempotencyKey, input.observation)) {
    return false;
  }
  const ciStatus = input.observation.pullRequest?.verification?.ciStatus ?? null;
  if (ciStatus === "pending") {
    return true;
  }
  if (ciStatus !== "success") {
    return false;
  }

  const baseline = input.ciRetryBaselineCiStatus;
  if (baseline == null) {
    return false;
  }
  return baseline === "failure" || baseline === "unknown";
}

/**
 * Attribute external effects to a specific pending action — never treat unrelated BUILD_APPROVED as proof.
 */
export function observationConfirmsPendingExternalAction(input: {
  action: CtoAllowedAction;
  pendingIdempotencyKey: string;
  observation: CtoObservation;
  ciRetryBaselineCiStatus?: PullRequestVerificationCiStatus | null;
}): boolean {
  if (input.action === "POST_BUILD_APPROVED") {
    return observationMatchesPostBuildApprovedStableIdentity(
      input.pendingIdempotencyKey,
      input.observation,
    );
  }

  if (input.action === "REQUEST_CI_RETRY") {
    return observationConfirmsCiRetry({
      pendingIdempotencyKey: input.pendingIdempotencyKey,
      observation: input.observation,
      ciRetryBaselineCiStatus: input.ciRetryBaselineCiStatus ?? null,
    });
  }

  return false;
}
