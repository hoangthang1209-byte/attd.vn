export type NotificationSeverity = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type NotificationType =
  | "OPPORTUNITY_OVERDUE"
  | "READY_FOR_HANDOVER"
  | "FOLLOW_UP_TODAY"
  | "QUOTE_EXPIRING"
  | "QUOTE_NO_RESPONSE"
  | "NEW_ORDER"
  | "ORDER_OVERDUE"
  | "CRM_ACTIVITY";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  href: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  dueAt?: string | null;
};

export type NotificationCenterStats = {
  total: number;
  urgent: number;
  high: number;
  normal: number;
  low: number;
};

export type NotificationCenterResponse = {
  notifications: NotificationItem[];
  stats: NotificationCenterStats;
};
