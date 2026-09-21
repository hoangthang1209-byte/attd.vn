import type { AutomationCiStatus } from "@/features/automation/automation-task.types";

export type GitHubCheckRunConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | "stale"
  | null;

export type GitHubCheckRunStatus = "queued" | "in_progress" | "completed" | null;

export type GitHubCheckRunSummary = {
  status: GitHubCheckRunStatus;
  conclusion: GitHubCheckRunConclusion;
  name: string;
};

export type GitHubCommitStatusState = "error" | "failure" | "pending" | "success" | null;

export function createInitialCiStatus(): AutomationCiStatus {
  return {
    status: "unknown",
    reason: null,
  };
}

export function resolveCiStatusFromCheckRuns(input: {
  checkRuns: GitHubCheckRunSummary[];
  commitStatuses: GitHubCommitStatusState[];
  hasLinkedPullRequest: boolean;
}): AutomationCiStatus {
  if (!input.hasLinkedPullRequest) {
    return {
      status: "not_run",
      reason: "Chưa có PR liên kết.",
    };
  }

  const relevantRuns = input.checkRuns.filter((run) => run.status !== null);
  const relevantStatuses = input.commitStatuses.filter((state) => state !== null);

  if (relevantRuns.length === 0 && relevantStatuses.length === 0) {
    return {
      status: "not_run",
      reason: "Chưa có check run hoặc status context.",
    };
  }

  if (
    relevantRuns.some((run) => run.status === "queued" || run.status === "in_progress") ||
    relevantStatuses.some((state) => state === "pending")
  ) {
    return {
      status: "running",
      reason: null,
    };
  }

  const failedRun = relevantRuns.find(
    (run) =>
      run.status === "completed" &&
      run.conclusion &&
      !["success", "skipped", "neutral"].includes(run.conclusion),
  );
  const failedStatus = relevantStatuses.find((state) => state === "error" || state === "failure");

  if (failedRun || failedStatus) {
    return {
      status: "failed",
      reason: failedRun?.name ? `Check run lỗi: ${failedRun.name}` : "Status context báo lỗi.",
    };
  }

  const passedRun = relevantRuns.some(
    (run) => run.status === "completed" && run.conclusion === "success",
  );
  const passedStatus = relevantStatuses.some((state) => state === "success");

  if (passedRun || passedStatus) {
    return { status: "passed", reason: null };
  }

  return {
    status: "unknown",
    reason: "Không thể suy luận kết quả CI từ dữ liệu GitHub.",
  };
}
