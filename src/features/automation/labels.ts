import type { AgentRoutingReason, AgentTaskPriority } from "@/features/agent-os/agent.types";
import type {
  AutomationTaskRisk,
  NormalizedTaskStatus,
  ProductionDeploymentStatus,
} from "@/features/automation/automation-task.types";

export const AUTOMATION_STATUS_LABELS: Record<NormalizedTaskStatus, string> = {
  backlog: "Chưa xử lý",
  approved: "Đã duyệt",
  building: "Đang build",
  pr_open: "PR mở",
  ci_review: "CI / Review",
  needs_fix: "Cần sửa",
  ready_to_merge: "Sẵn sàng merge",
  merged: "Đã merge",
  failed: "Thất bại",
  blocked: "Bị chặn",
  queued: "Đang chờ",
  stalled: "Tạm dừng",
  superseded: "Đã thay thế",
  unknown: "Không xác định",
};

export const AUTOMATION_RISK_LABELS: Record<AutomationTaskRisk, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  unknown: "Chưa xác định",
};

export const AUTOMATION_STATUS_BADGE_CLASS: Record<NormalizedTaskStatus, string> = {
  backlog: "admin-status-badge admin-status-badge--neutral",
  approved: "admin-status-badge admin-status-badge--info",
  building: "admin-status-badge admin-status-badge--info",
  pr_open: "admin-status-badge admin-status-badge--info",
  ci_review: "admin-status-badge admin-status-badge--warning",
  needs_fix: "admin-status-badge admin-status-badge--warning",
  ready_to_merge: "admin-status-badge admin-status-badge--success",
  merged: "admin-status-badge admin-status-badge--success",
  failed: "admin-status-badge admin-status-badge--danger",
  blocked: "admin-status-badge admin-status-badge--danger",
  queued: "admin-status-badge admin-status-badge--warning",
  stalled: "admin-status-badge admin-status-badge--danger",
  superseded: "admin-status-badge admin-status-badge--neutral",
  unknown: "admin-status-badge admin-status-badge--neutral",
};

export const AUTOMATION_RISK_BADGE_CLASS: Record<AutomationTaskRisk, string> = {
  low: "admin-status-badge admin-status-badge--success",
  medium: "admin-status-badge admin-status-badge--warning",
  high: "admin-status-badge admin-status-badge--danger",
  unknown: "admin-status-badge admin-status-badge--neutral",
};

export const AUTOMATION_STATUS_FILTER_OPTIONS: Array<{
  value: NormalizedTaskStatus | "all";
  label: string;
}> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "backlog", label: AUTOMATION_STATUS_LABELS.backlog },
  { value: "approved", label: AUTOMATION_STATUS_LABELS.approved },
  { value: "building", label: AUTOMATION_STATUS_LABELS.building },
  { value: "pr_open", label: AUTOMATION_STATUS_LABELS.pr_open },
  { value: "ci_review", label: AUTOMATION_STATUS_LABELS.ci_review },
  { value: "needs_fix", label: AUTOMATION_STATUS_LABELS.needs_fix },
  { value: "ready_to_merge", label: AUTOMATION_STATUS_LABELS.ready_to_merge },
  { value: "merged", label: AUTOMATION_STATUS_LABELS.merged },
  { value: "failed", label: AUTOMATION_STATUS_LABELS.failed },
  { value: "blocked", label: AUTOMATION_STATUS_LABELS.blocked },
  { value: "queued", label: AUTOMATION_STATUS_LABELS.queued },
  { value: "stalled", label: AUTOMATION_STATUS_LABELS.stalled },
  { value: "superseded", label: AUTOMATION_STATUS_LABELS.superseded },
];

export const AUTOMATION_RISK_FILTER_OPTIONS: Array<{
  value: AutomationTaskRisk | "all";
  label: string;
}> = [
  { value: "all", label: "Tất cả rủi ro" },
  { value: "low", label: AUTOMATION_RISK_LABELS.low },
  { value: "medium", label: AUTOMATION_RISK_LABELS.medium },
  { value: "high", label: AUTOMATION_RISK_LABELS.high },
  { value: "unknown", label: AUTOMATION_RISK_LABELS.unknown },
];

export const AUTOMATION_OPEN_FILTER_OPTIONS = [
  { value: "all" as const, label: "Tất cả" },
  { value: "open" as const, label: "Đang mở" },
  { value: "closed" as const, label: "Đã đóng" },
];

export const AUTOMATION_PR_STATE_SUFFIX: Record<"merged" | "open" | "closed", string> = {
  merged: " (đã merge)",
  open: " (đang mở)",
  closed: " (đã đóng)",
};

export const AUTOMATION_PRODUCTION_STATUS_LABELS: Record<ProductionDeploymentStatus, string> = {
  live: "Đã lên production",
  deploying: "Đang deploy",
  not_live: "Chưa lên production",
  unknown: "Không xác định",
};

export const AUTOMATION_PRODUCTION_STATUS_BADGE_CLASS: Record<ProductionDeploymentStatus, string> = {
  live: "admin-status-badge admin-status-badge--success",
  deploying: "admin-status-badge admin-status-badge--info",
  not_live: "admin-status-badge admin-status-badge--neutral",
  unknown: "admin-status-badge admin-status-badge--warning",
};

export const AUTOMATION_AGENT_PRIORITY_LABELS: Record<AgentTaskPriority, string> = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
  unknown: "—",
};

export const AUTOMATION_AGENT_ROUTING_LABELS: Record<AgentRoutingReason, string> = {
  high_risk_escalation: "Leo thang rủi ro cao",
  metadata_agent_override: "ATTD_AGENT",
  task_area: "Theo mảng",
  keyword_fallback: "Từ khóa",
  default_cto: "Mặc định CTO",
};
