import type {
  SalesOpportunityPriority,
  SalesOpportunityStage,
} from "@prisma/client";

export const SALES_OPPORTUNITY_STAGE_ORDER: SalesOpportunityStage[] = [
  "NEW",
  "CONTACTED",
  "CONSULTING",
  "COSTING",
  "QUOTED",
  "NEGOTIATING",
  "WON",
  "LOST",
];

export const SALES_OPPORTUNITY_STAGE_LABELS: Record<SalesOpportunityStage, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  CONSULTING: "Đang tư vấn",
  COSTING: "Đang tính giá",
  QUOTED: "Đã báo giá",
  NEGOTIATING: "Đàm phán",
  WON: "Thắng",
  LOST: "Thua",
};

export const SALES_OPPORTUNITY_PRIORITY_LABELS: Record<SalesOpportunityPriority, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  URGENT: "Khẩn",
};

export const SALES_OPPORTUNITY_PRIORITY_BADGE_CLASS: Record<SalesOpportunityPriority, string> = {
  LOW: "admin-status-badge admin-status-badge--neutral",
  NORMAL: "admin-status-badge admin-status-badge--info",
  HIGH: "admin-status-badge admin-status-badge--warning",
  URGENT: "admin-status-badge admin-status-badge--danger",
};
