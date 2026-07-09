import type { SalesFollowUpPriority, SalesFollowUpType } from "@/features/sales/follow-up/types";

export const SALES_FOLLOW_UP_TYPE_LABELS: Record<SalesFollowUpType, string> = {
  OPPORTUNITY_OVERDUE: "Cơ hội quá hạn",
  OPPORTUNITY_TODAY: "Cơ hội hôm nay",
  QUOTE_EXPIRING: "Báo giá sắp hết hạn",
  QUOTE_NO_RESPONSE: "Báo giá chưa phản hồi",
  LEAD_FOLLOW_UP: "Lead cần follow-up",
  ACTIVITY_FOLLOW_UP: "Hoạt động CRM",
};

export const SALES_FOLLOW_UP_PRIORITY_LABELS: Record<SalesFollowUpPriority, string> = {
  URGENT: "Khẩn cấp",
  HIGH: "Cao",
  NORMAL: "Bình thường",
  LOW: "Thấp",
};

export const SALES_FOLLOW_UP_PRIORITY_BADGE_CLASS: Record<SalesFollowUpPriority, string> = {
  URGENT: "admin-status-badge admin-status-badge--danger",
  HIGH: "admin-status-badge admin-status-badge--warning",
  NORMAL: "admin-status-badge admin-status-badge--info",
  LOW: "admin-status-badge admin-status-badge--neutral",
};
