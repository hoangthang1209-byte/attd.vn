import type { CtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import { buildPostBuildApprovedDedupeKey } from "@/features/agent-os/cto-loop.dedupe";
import type { CtoObservation } from "@/features/agent-os/cto-loop.types";

function buildPostBuildApprovedKeyFromObservation(observation: CtoObservation): string {
  return buildPostBuildApprovedDedupeKey({
    issueNumber: observation.issueNumber,
    prNumber: observation.pullRequest?.number ?? null,
    prHeadSha: observation.pullRequest?.headShaFingerprint ?? null,
    reviewState: observation.pullRequest?.verification?.reviewStatus ?? null,
    ciStatus: observation.pullRequest?.verification?.ciStatus ?? null,
  });
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

/**
 * Attribute external effects to a specific pending action — never treat unrelated BUILD_APPROVED as proof.
 */
export function observationConfirmsPendingExternalAction(input: {
  action: CtoAllowedAction;
  pendingIdempotencyKey: string;
  observation: CtoObservation;
}): boolean {
  if (input.action === "POST_BUILD_APPROVED") {
    if (!input.observation.hasBuildApproved) return false;
    const correlatedKey = buildPostBuildApprovedKeyFromObservation(input.observation);
    return input.pendingIdempotencyKey === correlatedKey;
  }

  if (input.action === "REQUEST_CI_RETRY") {
    if (!observationMatchesCiRetryKey(input.pendingIdempotencyKey, input.observation)) {
      return false;
    }
    const ciStatus = input.observation.pullRequest?.verification?.ciStatus ?? null;
    return ciStatus !== "failure";
  }

  return false;
}
