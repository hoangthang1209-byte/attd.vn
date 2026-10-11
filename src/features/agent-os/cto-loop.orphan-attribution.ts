import type { CtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import type { CtoObservation } from "@/features/agent-os/cto-loop.types";

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
}): boolean {
  if (!observationMatchesCiRetryKey(input.pendingIdempotencyKey, input.observation)) {
    return false;
  }
  const ciStatus = input.observation.pullRequest?.verification?.ciStatus ?? null;
  return ciStatus === "pending" || ciStatus === "success";
}

/**
 * Attribute external effects to a specific pending action — never treat unrelated BUILD_APPROVED as proof.
 */
export function observationConfirmsPendingExternalAction(input: {
  action: CtoAllowedAction;
  pendingIdempotencyKey: string;
  observation: CtoObservation;
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
    });
  }

  return false;
}
