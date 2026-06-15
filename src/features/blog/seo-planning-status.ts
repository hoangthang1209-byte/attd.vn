import type { BlogPostStatus } from "@prisma/client";
import type { ClusterPriority } from "@/features/blog/content-clusters";
import type { SeoPlanPriority, SeoPlanStatus } from "@/features/blog/seo-planning-types";

export const SEO_PLAN_STATUSES: SeoPlanStatus[] = [
  "IDEA",
  "CLUSTERED",
  "WRITING",
  "REVIEW",
  "PUBLISHED",
  "OPTIMIZING",
  "TOP_10",
  "TOP_3",
];

export const SEO_PLAN_STATUS_LABELS: Record<SeoPlanStatus, string> = {
  IDEA: "Ý tưởng",
  CLUSTERED: "Đã lên Cluster",
  WRITING: "Đang viết",
  REVIEW: "Chờ duyệt",
  PUBLISHED: "Đã xuất bản",
  OPTIMIZING: "Đang SEO",
  TOP_10: "Top 10",
  TOP_3: "Top 3",
};

export const SEO_PLAN_PRIORITY_LABELS: Record<SeoPlanPriority, string> = {
  HIGH: "Cao",
  MEDIUM: "Trung bình",
  LOW: "Thấp",
};

export function clusterPriorityToPlanPriority(priority: number): SeoPlanPriority {
  if (priority <= 2) return "HIGH";
  if (priority <= 5) return "MEDIUM";
  return "LOW";
}

export function clusterPriorityLabelToPlanPriority(label: ClusterPriority): SeoPlanPriority {
  if (label === "high") return "HIGH";
  if (label === "medium") return "MEDIUM";
  return "LOW";
}

export function blogPostStatusToPlanStatus(status: BlogPostStatus): SeoPlanStatus {
  if (status === "PUBLISHED") return "PUBLISHED";
  if (status === "REVIEW") return "REVIEW";
  return "WRITING";
}

export function isPlanStatusTerminal(status: SeoPlanStatus): boolean {
  return status === "PUBLISHED" || status === "TOP_10" || status === "TOP_3";
}

export function planStatusSortOrder(status: SeoPlanStatus): number {
  return SEO_PLAN_STATUSES.indexOf(status);
}
