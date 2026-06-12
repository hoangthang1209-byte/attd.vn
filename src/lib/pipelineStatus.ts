import type { LeadPipelineStatus } from "@prisma/client";

export const PIPELINE_STATUS_LABELS: Record<LeadPipelineStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUOTED: "Đã báo giá",
  NEGOTIATING: "Đang đàm phán",
  WON: "Đã chốt",
  LOST: "Thất bại",
};

export const PIPELINE_STATUS_COLORS: Record<
  LeadPipelineStatus,
  { bg: string; color: string }
> = {
  NEW: { bg: "#f3f4f6", color: "#374151" },
  CONTACTED: { bg: "#dbeafe", color: "#1d4ed8" },
  QUOTED: { bg: "#fed7aa", color: "#c2410c" },
  NEGOTIATING: { bg: "#ede9fe", color: "#6d28d9" },
  WON: { bg: "#dcfce7", color: "#166534" },
  LOST: { bg: "#fee2e2", color: "#dc2626" },
};

export const ALL_PIPELINE_STATUSES: LeadPipelineStatus[] = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "NEGOTIATING",
  "WON",
  "LOST",
];
