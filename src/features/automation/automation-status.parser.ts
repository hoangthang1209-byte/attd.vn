import type {
  AutomationTaskRisk,
  AutomationStatusComment,
  NormalizedTaskStatus,
} from "@/features/automation/automation-task.types";

export const STATUS_LABEL_PREFIX = "status:";
export const RISK_LABEL_PREFIX = "risk:";

/** Labels queried from GitHub for automation task discovery. */
export const AUTOMATION_STATUS_GITHUB_LABELS = [
  "status:backlog",
  "status:approved",
  "status:building",
  "status:pr-open",
  "status:ci-review",
  "status:needs-fix",
  "status:ready-merge",
  "status:ready-to-merge",
  "status:merged",
  "status:failed",
  "status:ci-failed",
  "status:blocked",
  "status:stalled",
  "status:superseded",
  "status:queued",
] as const;

const STATUS_LABEL_TO_NORMALIZED: Record<string, NormalizedTaskStatus> = {
  "status:backlog": "backlog",
  "status:approved": "approved",
  "status:building": "building",
  "status:pr-open": "pr_open",
  "status:ci-review": "ci_review",
  "status:needs-fix": "needs_fix",
  "status:ready-merge": "ready_to_merge",
  "status:ready-to-merge": "ready_to_merge",
  "status:merged": "merged",
  "status:failed": "failed",
  "status:ci-failed": "needs_fix",
  "status:blocked": "blocked",
  "status:stalled": "stalled",
  "status:superseded": "superseded",
  "status:queued": "queued",
};

const RISK_LABEL_TO_NORMALIZED: Record<string, AutomationTaskRisk> = {
  "risk:low": "low",
  "risk:medium": "medium",
  "risk:high": "high",
};

const BLOCKER_COMMENT_PREFIXES = [
  "TASK_STALLED:",
  "ORCHESTRATOR_BLOCKED:",
  "ORCHESTRATOR_QUEUE_DEFERRED:",
  "ORCHESTRATOR_REPAIR_TRIGGERED:",
  "ORCHESTRATOR_CI_REPAIR_TRIGGERED:",
  "READY TO MERGE",
] as const;

const STATUS_COMMENT_PREFIXES = [
  ...BLOCKER_COMMENT_PREFIXES,
  "ORCHESTRATOR_IDEMPOTENCY:",
  "BUILD_APPROVED",
] as const;

export function parseNormalizedStatus(labels: string[]): {
  status: NormalizedTaskStatus;
  statusLabel: string | null;
} {
  const statusLabel = labels.find((label) => label.startsWith(STATUS_LABEL_PREFIX)) ?? null;
  if (!statusLabel) {
    return { status: "backlog", statusLabel: null };
  }

  return {
    status: STATUS_LABEL_TO_NORMALIZED[statusLabel] ?? "unknown",
    statusLabel,
  };
}

export function parseAutomationRisk(labels: string[]): {
  risk: AutomationTaskRisk;
  riskLabel: string | null;
} {
  const riskLabel = labels.find((label) => label.startsWith(RISK_LABEL_PREFIX)) ?? null;
  if (!riskLabel) {
    return { risk: "unknown", riskLabel: null };
  }

  return {
    risk: RISK_LABEL_TO_NORMALIZED[riskLabel] ?? "unknown",
    riskLabel,
  };
}

export function extractBlockerReason(comments: AutomationStatusComment[]): string | null {
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const body = comments[index]?.body.trim();
    if (!body) continue;

    for (const prefix of BLOCKER_COMMENT_PREFIXES) {
      if (body.startsWith(prefix) || body.includes(prefix)) {
        return body.split("\n")[0]?.trim() ?? body;
      }
    }
  }

  return null;
}

export function filterRecentStatusComments(
  comments: AutomationStatusComment[],
  limit = 5,
): AutomationStatusComment[] {
  return comments
    .filter((comment) => {
      const body = comment.body.trim();
      return STATUS_COMMENT_PREFIXES.some(
        (prefix) => body.startsWith(prefix) || body.includes(prefix),
      );
    })
    .slice(-limit);
}

export function isMergedToday(isoTimestamp: string, now = new Date()): boolean {
  const updated = new Date(isoTimestamp);
  if (Number.isNaN(updated.getTime())) return false;

  return (
    updated.getUTCFullYear() === now.getUTCFullYear() &&
    updated.getUTCMonth() === now.getUTCMonth() &&
    updated.getUTCDate() === now.getUTCDate()
  );
}

export function isOpenAutomationTask(status: NormalizedTaskStatus, isOpen: boolean): boolean {
  if (!isOpen) return false;
  return status !== "merged" && status !== "superseded";
}

const TERMINAL_TASK_STATUSES = new Set<NormalizedTaskStatus>(["merged", "superseded"]);

/** Skip linked-PR REST lookups for closed or terminal tasks. */
export function shouldFetchLinkedPullRequest(
  status: NormalizedTaskStatus,
  isOpen: boolean,
): boolean {
  if (!isOpen) return false;
  return !TERMINAL_TASK_STATUSES.has(status);
}

/** Prefer PR merge time, then issue close time; avoid generic updated_at for merge metrics. */
export function resolveMergeTimestamp(input: {
  status: NormalizedTaskStatus;
  closedAt: string | null;
  linkedPullRequestMergedAt: string | null;
}): string | null {
  if (input.status !== "merged") return null;
  return input.linkedPullRequestMergedAt ?? input.closedAt;
}
