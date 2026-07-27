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

/** Canonical document workspace path for a topic (UX alias of seo-topics detail). */
export function topicWorkspaceHref(topicId: string): string {
  return `/admin/content/topics/${topicId}`;
}

/** Map topic pipeline status → one primary editorial next action (UX only). */
export function getTopicNextAction(status: SeoTopicStatus): EditorialNextAction {
  switch (status) {
    case "IDEA":
    case "RESEARCHING":
      return {
        label: "Duyệt chủ đề",
        href: topicWorkspaceHref,
        group: "needs_brief",
      };
    case "APPROVED":
      return {
        label: "Tạo Brief",
        href: topicWorkspaceHref,
        group: "needs_brief",
      };
    case "BRIEF_READY":
      return {
        label: "Bắt đầu viết",
        href: topicWorkspaceHref,
        group: "needs_writing",
      };
    case "DRAFTING":
      return {
        label: "Continue Draft",
        href: topicWorkspaceHref,
        group: "needs_writing",
      };
    case "REVIEW":
      return {
        label: "Needs Review",
        href: () => `/admin/content/reviews`,
        group: "needs_review",
      };
    case "PUBLISHED":
      return {
        label: "Xem bài đã xuất bản",
        href: topicWorkspaceHref,
        group: "recently_published",
      };
    case "PAUSED":
    case "REJECTED":
      return {
        label: "Xem lại chủ đề",
        href: topicWorkspaceHref,
        group: "needs_brief",
      };
    case "ARCHIVED":
    default:
      return {
        label: "Open Workspace",
        href: topicWorkspaceHref,
        group: "needs_brief",
      };
  }
}

/** Display-only progress for topic rows / workspace header. */
export function getTopicProgressPercent(status: SeoTopicStatus): number {
  switch (status) {
    case "IDEA":
    case "RESEARCHING":
      return 12;
    case "APPROVED":
      return 25;
    case "BRIEF_READY":
      return 40;
    case "DRAFTING":
      return 62;
    case "REVIEW":
      return 80;
    case "PUBLISHED":
      return 100;
    case "PAUSED":
    case "REJECTED":
      return 35;
    case "ARCHIVED":
      return 100;
    default:
      return 0;
  }
}

export const DOCUMENT_WORKFLOW_STEPS = [
  { key: "idea", label: "Idea", sectionId: "overview" },
  { key: "brief", label: "Brief", sectionId: "brief" },
  { key: "outline", label: "Outline", sectionId: "writing" },
  { key: "draft", label: "Draft", sectionId: "writing" },
  { key: "qa", label: "QA", sectionId: "writing" },
  { key: "review", label: "Review", sectionId: "checklist" },
  { key: "publish", label: "Publish", sectionId: "checklist" },
] as const;

export type DocumentNodeState = "completed" | "active" | "waiting";

/** Per-topic document timeline (display only — no workflow changes). */
export function deriveTopicDocumentNodes(status: SeoTopicStatus): Record<
  (typeof DOCUMENT_WORKFLOW_STEPS)[number]["key"],
  DocumentNodeState
> {
  const order = ["idea", "brief", "outline", "draft", "qa", "review", "publish"] as const;
  const activeIndex =
    status === "IDEA" || status === "RESEARCHING"
      ? 0
      : status === "APPROVED"
        ? 1
        : status === "BRIEF_READY"
          ? 2
          : status === "DRAFTING"
            ? 3
            : status === "REVIEW"
              ? 5
              : status === "PUBLISHED" || status === "ARCHIVED"
                ? 6
                : 0;
  const result = {} as Record<(typeof order)[number], DocumentNodeState>;
  for (let i = 0; i < order.length; i += 1) {
    const key = order[i];
    if (status === "PUBLISHED" || status === "ARCHIVED") {
      result[key] = "completed";
    } else if (i < activeIndex) {
      result[key] = "completed";
    } else if (i === activeIndex) {
      result[key] = "active";
    } else {
      result[key] = "waiting";
    }
  }
  if (status === "DRAFTING") {
    result.outline = "completed";
    result.draft = "active";
    result.qa = "waiting";
  }
  if (status === "REVIEW") {
    result.outline = "completed";
    result.draft = "completed";
    result.qa = "completed";
    result.review = "active";
  }
  return result;
}

export type EditorialChecklistItem = {
  id: string;
  group: "content" | "seo" | "media" | "publish";
  label: string;
  done: boolean;
};

/** Editor-facing checklist derived from existing topic fields (display only). */
export function buildEditorialChecklist(input: {
  status: SeoTopicStatus;
  briefApproved: boolean;
  outlineCount: number;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  internalLinkCount: number;
  hasMediaBundle: boolean;
  mediaPlanOk: boolean;
  hasTargetUrl: boolean;
}): EditorialChecklistItem[] {
  const writingStarted = ["DRAFTING", "REVIEW", "PUBLISHED"].includes(input.status);
  const reviewed = ["REVIEW", "PUBLISHED"].includes(input.status);
  const published = input.status === "PUBLISHED";
  return [
    { id: "outline", group: "content", label: "Outline", done: input.outlineCount > 0 || input.briefApproved },
    { id: "intro", group: "content", label: "Introduction", done: writingStarted },
    { id: "sections", group: "content", label: "Sections", done: writingStarted },
    { id: "cta", group: "content", label: "CTA", done: input.briefApproved },
    { id: "title", group: "seo", label: "Title", done: input.hasMetaTitle || input.briefApproved },
    { id: "meta", group: "seo", label: "Meta", done: input.hasMetaDescription },
    { id: "links", group: "seo", label: "Internal links", done: input.internalLinkCount > 0 },
    { id: "hero", group: "media", label: "Hero", done: input.hasMediaBundle && input.mediaPlanOk },
    { id: "product", group: "media", label: "Product", done: input.hasMediaBundle },
    { id: "process", group: "media", label: "Process", done: input.mediaPlanOk },
    { id: "factory", group: "media", label: "Factory", done: input.mediaPlanOk },
    { id: "review", group: "publish", label: "Review", done: reviewed },
    { id: "blog", group: "publish", label: "Blog", done: published || Boolean(input.hasTargetUrl) },
    { id: "publish", group: "publish", label: "Publish", done: published },
  ];
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
