import type { NotificationSeverity, NotificationType } from "@/features/notifications/types";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  OPPORTUNITY_OVERDUE: "Cơ hội quá hạn",
  READY_FOR_HANDOVER: "Sẵn sàng bàn giao",
  FOLLOW_UP_TODAY: "Follow-up hôm nay",
  QUOTE_EXPIRING: "Báo giá sắp hết hạn",
  QUOTE_NO_RESPONSE: "Báo giá chưa phản hồi",
  NEW_ORDER: "Đơn hàng mới",
  ORDER_OVERDUE: "Đơn hàng quá hạn giao",
  CRM_ACTIVITY: "Hoạt động CRM",
};

export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  URGENT: "Khẩn cấp",
  HIGH: "Cao",
  NORMAL: "Bình thường",
  LOW: "Thấp",
};

export const NOTIFICATION_SEVERITY_BADGE_CLASS: Record<NotificationSeverity, string> = {
  URGENT: "admin-status-badge admin-status-badge--danger",
  HIGH: "admin-status-badge admin-status-badge--warning",
  NORMAL: "admin-status-badge admin-status-badge--info",
  LOW: "admin-status-badge admin-status-badge--neutral",
};
