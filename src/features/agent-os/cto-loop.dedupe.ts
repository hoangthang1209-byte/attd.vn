import type { CtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import type { CtoLoopProtectionContext } from "@/features/agent-os/cto-loop.types";

export const CTO_MAX_NO_PROGRESS_ATTEMPTS = 3;

/** Max consecutive orphan recoveries that could not attribute external effects. */
export const CTO_MAX_ORPHAN_UNCONFIRMED_ATTEMPTS = 3;

export type DerivedPendingActionResult =
  | { kind: "resolved"; action: CtoAllowedAction }
  | { kind: "ambiguous" };

/**
 * Legacy rows may only persist g3PendingActionKey. Derive the action when the key format is unambiguous.
 */
export function derivePendingActionFromIdempotencyKey(input: {
  pendingActionKey: string;
  storedPendingAction: CtoAllowedAction | null;
}): DerivedPendingActionResult {
  if (input.storedPendingAction) {
    return { kind: "resolved", action: input.storedPendingAction };
  }

  const segments = input.pendingActionKey.split(":");
  if (segments[0] !== "cto-g3" || segments.length < 2) {
    return { kind: "ambiguous" };
  }

  const actionSegment = segments[1];
  if (actionSegment === "post-build-approved") {
    return { kind: "resolved", action: "POST_BUILD_APPROVED" };
  }
  if (actionSegment === "ci-retry") {
    return { kind: "resolved", action: "REQUEST_CI_RETRY" };
  }

  return { kind: "ambiguous" };
}

export function buildCtoActionIdempotencyKey(parts: readonly string[]): string {
  return ["cto-g3", ...parts.filter((part) => part.length > 0)].join(":");
}

export function buildPostBuildApprovedDedupeKey(input: {
  issueNumber: number;
  prNumber: number | null;
  prHeadSha: string | null;
  reviewState: string | null;
  ciStatus: string | null;
}): string {
  return buildCtoActionIdempotencyKey([
    "post-build-approved",
    String(input.issueNumber),
    input.prNumber ? `pr-${input.prNumber}` : "no-pr",
    input.prHeadSha ?? "no-head",
    input.reviewState ?? "no-review",
    input.ciStatus ?? "no-ci",
  ]);
}

/**
 * Prevent re-posting identical BUILD_APPROVED when PR head + review/CI state unchanged.
 */
export function shouldSuppressDuplicateBuildApproved(input: {
  hasBuildApproved: boolean;
  proposedKey: string;
  lastActionIdempotencyKey: string | null;
}): boolean {
  if (input.hasBuildApproved) return true;
  if (!input.lastActionIdempotencyKey) return false;
  return input.lastActionIdempotencyKey === input.proposedKey;
}

export function shouldSkipDuplicateAction(context: CtoLoopProtectionContext): boolean {
  if (context.duplicateSourceEvent) return true;
  if (!context.proposedActionIdempotencyKey || !context.lastActionIdempotencyKey) {
    return false;
  }
  return context.proposedActionIdempotencyKey === context.lastActionIdempotencyKey;
}

export function detectNoProgressLoop(attemptCountWithoutProgress: number): boolean {
  return attemptCountWithoutProgress >= CTO_MAX_NO_PROGRESS_ATTEMPTS;
}

export function shouldBlockConcurrentExecution(input: {
  hasActiveNonTerminalRun: boolean;
  action: CtoAllowedAction;
}): boolean {
  if (!input.hasActiveNonTerminalRun) return false;
  return input.action === "POST_BUILD_APPROVED" || input.action === "REQUEST_CI_RETRY";
}

/**
 * Pending slot was claimed but audit persistence never recorded g3LastActionKey
 * (e.g. worker crash after external submit).
 */
export function isOrphanedPendingActionSlot(input: {
  pendingActionKey: string | null;
  lastActionKey: string | null;
  proposedKey: string;
}): boolean {
  if (!input.pendingActionKey) return false;
  if (input.pendingActionKey !== input.proposedKey) return false;
  return input.lastActionKey !== input.proposedKey;
}
