import type { SeoTopicStatus } from "@prisma/client";

/** Editorial status color tokens — reuse only these semantic families. */
export const CONTENT_STATUS_COLORS = {
  draft: { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" }, // blue
  needsReview: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" }, // orange
  blocked: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" }, // red
  published: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" }, // green
  scheduled: { bg: "#f5f3ff", fg: "#6d28d9", border: "#ddd6fe" }, // purple
  waiting: { bg: "#f8fafc", fg: "#475569", border: "#e2e8f0" },
} as const;

export type EditorialTaskGroup =
  | "needs_brief"
  | "needs_context"
  | "needs_writing"
  | "needs_review"
  | "ready_to_publish"
  | "recently_published";

export type EditorialNextAction = {
  label: string;
  href: (topicId: string) => string;
  group: EditorialTaskGroup;
};

/** Map topic pipeline status → one primary editorial next action (UX only). */
export function getTopicNextAction(status: SeoTopicStatus): EditorialNextAction {
  switch (status) {
    case "IDEA":
    case "RESEARCHING":
      return {
        label: "Duyệt chủ đề",
        href: (id) => `/admin/content/seo-topics/${id}`,
        group: "needs_brief",
      };
    case "APPROVED":
      return {
        label: "Tạo Brief",
        href: (id) => `/admin/content/seo-topics/${id}`,
        group: "needs_brief",
      };
    case "BRIEF_READY":
      return {
        label: "Xây dựng Context & viết bài",
        href: (id) => `/admin/content/seo-topics/${id}`,
        group: "needs_writing",
      };
    case "DRAFTING":
      return {
        label: "Tiếp tục viết / chạy QA",
        href: (id) => `/admin/content/seo-topics/${id}`,
        group: "needs_writing",
      };
    case "REVIEW":
      return {
        label: "Kiểm duyệt",
        href: (id) => `/admin/content/reviews`,
        group: "needs_review",
      };
    case "PUBLISHED":
      return {
        label: "Xem bài đã xuất bản",
        href: (id) => `/admin/content/seo-topics/${id}`,
        group: "recently_published",
      };
    case "PAUSED":
    case "REJECTED":
      return {
        label: "Xem lại chủ đề",
        href: (id) => `/admin/content/seo-topics/${id}`,
        group: "needs_brief",
      };
    case "ARCHIVED":
    default:
      return {
        label: "Mở chủ đề",
        href: (id) => `/admin/content/seo-topics/${id}`,
        group: "needs_brief",
      };
  }
}

export function topicStatusTone(status: SeoTopicStatus): keyof typeof CONTENT_STATUS_COLORS {
  if (status === "PUBLISHED") return "published";
  if (status === "REVIEW") return "needsReview";
  if (status === "REJECTED" || status === "PAUSED") return "blocked";
  if (status === "DRAFTING" || status === "BRIEF_READY" || status === "APPROVED") return "draft";
  return "waiting";
}

export const EDITORIAL_WORKFLOW_STEPS = [
  { key: "topic", label: "Chủ đề" },
  { key: "brief", label: "Brief" },
  { key: "context", label: "Context" },
  { key: "writing", label: "Viết bài" },
  { key: "qa", label: "QA" },
  { key: "review", label: "Kiểm duyệt" },
  { key: "blog", label: "Bản nháp Blog" },
  { key: "publish", label: "Xuất bản" },
] as const;

export type WorkflowNodeState = "completed" | "active" | "blocked" | "waiting";

/** Derive visual workflow node states from dashboard counts (display only). */
export function deriveWorkflowNodeStates(counts: {
  approvedTopics: number;
  briefReadyTopics: number;
  draftingTopics: number;
  reviewTopics: number;
  publishedTopics: number;
  overdueTopics: number;
  missingMediaTopics: number;
}): Record<(typeof EDITORIAL_WORKFLOW_STEPS)[number]["key"], WorkflowNodeState> {
  const activeWriting = counts.draftingTopics > 0 || counts.briefReadyTopics > 0;
  const activeReview = counts.reviewTopics > 0;
  return {
    topic: counts.approvedTopics > 0 || activeWriting || activeReview ? "completed" : "waiting",
    brief:
      counts.briefReadyTopics > 0 || counts.draftingTopics > 0 || activeReview
        ? "completed"
        : counts.approvedTopics > 0
          ? "active"
          : "waiting",
    context: counts.missingMediaTopics > 0 && activeWriting ? "blocked" : activeWriting ? "active" : "waiting",
    writing: counts.draftingTopics > 0 ? "active" : counts.reviewTopics > 0 || counts.publishedTopics > 0 ? "completed" : "waiting",
    qa: activeReview ? "completed" : counts.draftingTopics > 0 ? "active" : "waiting",
    review: activeReview ? "active" : counts.publishedTopics > 0 ? "completed" : "waiting",
    blog: counts.publishedTopics > 0 ? "completed" : activeReview ? "active" : "waiting",
    publish: counts.publishedTopics > 0 ? "completed" : counts.overdueTopics > 0 ? "blocked" : "waiting",
  };
}

export const EDITORIAL_TASK_GROUP_LABELS: Record<EditorialTaskGroup, string> = {
  needs_brief: "Cần Brief",
  needs_context: "Cần Context",
  needs_writing: "Cần viết bài",
  needs_review: "Cần kiểm duyệt",
  ready_to_publish: "Sẵn sàng xuất bản",
  recently_published: "Vừa xuất bản",
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_REVIEW: "Đang kiểm duyệt",
  CHANGES_REQUESTED: "Yêu cầu chỉnh sửa",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  SUPERSEDED: "Đã thay thế",
};
