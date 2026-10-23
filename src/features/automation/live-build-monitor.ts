import type { AutomationTask } from "@/features/automation/automation-task.types";

export type BuildLiveStatus = "running" | "waiting" | "stalled" | "blocked" | "completed" | "unknown";
export type BuildMonitorItem = {
  issueNumber: number;
  title: string;
  status: BuildLiveStatus;
  reason: string;
  lastActivityAt: string;
  prUrl: string | null;
  headSha: string | null;
};

/**
 * Important: GitHub issue/PR activity does not prove a Builder process is alive.
 * Until a trusted run heartbeat is connected, never output 'running' from
 * GitHub task data alone.
 */
export function deriveLiveBuildMonitor(
  tasks: readonly AutomationTask[],
  nowMs: number,
  staleMinutes = 30,
): BuildMonitorItem[] {
  return tasks.filter(t => t.isOpen).map((t) => {
    const ageMs = nowMs - Date.parse(t.latestUpdateAt);
    const stale = Number.isFinite(ageMs) && ageMs > staleMinutes * 60_000;
    let status: BuildLiveStatus = "unknown";
    let reason = "Chưa có heartbeat hoặc trạng thái run được xác thực.";
    if (["failed", "blocked", "stalled"].includes(t.status)) {
      status = "blocked";
      reason = t.blockerReason || "Task bị chặn theo GitHub.";
    } else if (["building", "approved", "queued", "pr_open", "ci_review", "needs_fix", "ready_to_merge"].includes(t.status)) {
      status = stale && t.status === "building" ? "stalled" : "waiting";
      reason = status === "stalled"
        ? "Task được đánh dấu đang build nhưng không có hoạt động GitHub gần đây; cần kiểm tra run thực tế."
        : "Task/PR tồn tại nhưng chưa có bằng chứng tiến trình đang chạy.";
    } else if (t.status === "backlog") {
      status = "waiting";
      reason = "Đang trong backlog, chưa xác nhận Builder được kích hoạt.";
    }
    return {
      issueNumber: t.issueNumber,
      title: t.title,
      status,
      reason,
      lastActivityAt: t.latestUpdateAt,
      prUrl: t.linkedPullRequest?.url ?? null,
      headSha: t.linkedPullRequest?.verification?.headSha ?? null,
    };
  }).sort((a,b)=>Date.parse(b.lastActivityAt)-Date.parse(a.lastActivityAt));
}
