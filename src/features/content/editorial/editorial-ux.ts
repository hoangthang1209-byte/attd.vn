import type { SeoTopicStatus } from "@prisma/client";
import { readBoolPref, writeBoolPref } from "@/features/blog/editor-preferences";

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
        label: "Tiếp tục viết",
        href: topicWorkspaceHref,
        group: "needs_writing",
      };
    case "REVIEW":
      return {
        label: "Mở kiểm duyệt",
        href: () => `/admin/content/reviews`,
        group: "needs_review",
      };
    case "PUBLISHED":
      return {
        label: "Xem bài đã đăng",
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

export type TopicPrimaryCta = {
  label: string;
  href: string | null;
  /** True when the action should scroll within the current page instead of navigating. */
  staysOnPage: boolean;
  intent: string;
};

/**
 * One primary call-to-action for the document header — display only. Never
 * invents a workflow step; only surfaces a link/scroll target for the
 * governed transition that is already available for the current status.
 */
export function resolveTopicPrimaryCta(input: {
  status: SeoTopicStatus;
  hasActiveReviewId?: string | null;
  hasBlogDraft?: boolean;
  publishedUrl?: string | null;
}): TopicPrimaryCta {
  const { status, hasActiveReviewId, hasBlogDraft, publishedUrl } = input;

  if (status === "PUBLISHED") {
    return {
      label: "Xem bài đã đăng",
      href: publishedUrl ?? null,
      staysOnPage: !publishedUrl,
      intent: "view_published",
    };
  }

  if (status === "REVIEW") {
    if (hasActiveReviewId) {
      return {
        label: "Mở kiểm duyệt",
        href: `/admin/content/reviews/${hasActiveReviewId}`,
        staysOnPage: false,
        intent: "open_review",
      };
    }
    if (hasBlogDraft) {
      return {
        label: "Mở Blog Draft",
        href: "/admin/content/reviews",
        staysOnPage: false,
        intent: "open_blog_draft",
      };
    }
    return {
      label: "Mở kiểm duyệt",
      href: "/admin/content/reviews",
      staysOnPage: false,
      intent: "open_review",
    };
  }

  if (status === "DRAFTING") {
    return { label: "Tiếp tục viết", href: null, staysOnPage: true, intent: "continue_writing" };
  }

  if (status === "BRIEF_READY") {
    return { label: "Bắt đầu viết", href: null, staysOnPage: true, intent: "start_writing" };
  }

  if (status === "APPROVED") {
    return { label: "Tạo Brief", href: null, staysOnPage: true, intent: "create_brief" };
  }

  const fallback = getTopicNextAction(status);
  return { label: fallback.label, href: null, staysOnPage: true, intent: "review_topic" };
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

export type EditorialChecklistGroupKey = "content" | "seo" | "media" | "review" | "publish";

export type EditorialChecklistItem = {
  id: string;
  group: EditorialChecklistGroupKey;
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
  /** Only true when a real QA run has passed — never inferred. */
  qaPassed?: boolean;
}): EditorialChecklistItem[] {
  const writingStarted = ["DRAFTING", "REVIEW", "PUBLISHED"].includes(input.status);
  const reviewed = ["REVIEW", "PUBLISHED"].includes(input.status);
  const published = input.status === "PUBLISHED";
  return [
    { id: "outline", group: "content", label: "Có dàn ý", done: input.outlineCount > 0 || input.briefApproved },
    { id: "intro", group: "content", label: "Có phần mở đầu", done: writingStarted },
    { id: "sections", group: "content", label: "Có nội dung các phần", done: writingStarted },
    { id: "cta", group: "content", label: "Có CTA", done: input.briefApproved },
    { id: "title", group: "seo", label: "Có tiêu đề SEO", done: input.hasMetaTitle || input.briefApproved },
    { id: "meta", group: "seo", label: "Có mô tả meta", done: input.hasMetaDescription },
    { id: "links", group: "seo", label: "Có liên kết nội bộ", done: input.internalLinkCount > 0 },
    { id: "hero", group: "media", label: "Có ảnh bìa", done: input.hasMediaBundle && input.mediaPlanOk },
    { id: "product", group: "media", label: "Có ảnh trong bài", done: input.hasMediaBundle },
    { id: "process", group: "media", label: "Có ảnh quy trình", done: input.mediaPlanOk },
    { id: "factory", group: "media", label: "Có ảnh nhà máy", done: input.mediaPlanOk },
    { id: "qa", group: "review", label: "Đã chạy QA", done: Boolean(input.qaPassed) },
    { id: "review", group: "review", label: "Đã được duyệt", done: reviewed },
    { id: "blog", group: "publish", label: "Đã tạo bản nháp Blog", done: published || Boolean(input.hasTargetUrl) },
    { id: "publish", group: "publish", label: "Sẵn sàng xuất bản", done: published },
  ];
}

export const EDITORIAL_CHECKLIST_GROUP_LABELS: Record<EditorialChecklistGroupKey, string> = {
  content: "Nội dung",
  seo: "SEO",
  media: "Hình ảnh",
  review: "Kiểm duyệt",
  publish: "Xuất bản",
};

const CHECKLIST_GROUP_ORDER: EditorialChecklistGroupKey[] = ["content", "seo", "media", "review", "publish"];

export type ChecklistGroupSummary = {
  key: EditorialChecklistGroupKey;
  label: string;
  total: number;
  done: number;
  tone: "complete" | "needs_attention" | "blocked";
};

/** Compact 5-group readiness summary for the rail/header — display only. */
export function summarizeChecklistGroups(items: EditorialChecklistItem[]): ChecklistGroupSummary[] {
  return CHECKLIST_GROUP_ORDER.map((key) => {
    const groupItems = items.filter((item) => item.group === key);
    const total = groupItems.length;
    const done = groupItems.filter((item) => item.done).length;
    const tone: ChecklistGroupSummary["tone"] =
      total === 0 || done === total ? "complete" : done === 0 ? "blocked" : "needs_attention";
    return { key, label: EDITORIAL_CHECKLIST_GROUP_LABELS[key], total, done, tone };
  }).filter((group) => group.total > 0);
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

// ── Sprint 16.2 — Editorial Workspace UX 2.0 ──────────────────────────────
// Pure, additive display helpers for the document-first topic workspace.
// None of these change workflow semantics; they only shape how existing
// data is summarized in the header / toolbar / rail.

const STAGE_LABELS: Record<SeoTopicStatus, string> = {
  IDEA: "Ý tưởng",
  RESEARCHING: "Đang nghiên cứu",
  APPROVED: "Đã duyệt chủ đề",
  BRIEF_READY: "Sẵn sàng viết",
  DRAFTING: "Bản nháp",
  REVIEW: "Kiểm duyệt",
  PUBLISHED: "Đã xuất bản",
  PAUSED: "Tạm dừng",
  REJECTED: "Từ chối",
  ARCHIVED: "Lưu trữ",
};

export type EditorialProgressSnapshot = {
  stageLabel: string;
  progressPercent: number;
  wordCount: number | null;
  wordTargetMin: number | null;
  wordTargetMax: number | null;
  sectionsWithContent: number | null;
  sectionsTotal: number | null;
  mediaReady: boolean;
  mediaGaps: number | null;
  internalLinkCount: number;
  ctaReady: boolean;
  qaBlockers: number | null;
  qaWarnings: number | null;
  reviewState: string | null;
};

/**
 * Rich, display-only progress snapshot for the context rail. Every writing
 * metric is optional — callers that don't have live draft data yet (e.g.
 * before a Writing Plan exists) simply pass nothing and the UI shows dashes.
 */
export function buildEditorialProgressSnapshot(input: {
  status: SeoTopicStatus;
  wordCount?: number | null;
  wordTargetMin?: number | null;
  wordTargetMax?: number | null;
  sectionsWithContent?: number | null;
  sectionsTotal?: number | null;
  mediaReady?: boolean;
  mediaGaps?: number | null;
  internalLinkCount?: number;
  ctaReady?: boolean;
  qaBlockers?: number | null;
  qaWarnings?: number | null;
  reviewState?: string | null;
}): EditorialProgressSnapshot {
  return {
    stageLabel: STAGE_LABELS[input.status] ?? "—",
    progressPercent: getTopicProgressPercent(input.status),
    wordCount: input.wordCount ?? null,
    wordTargetMin: input.wordTargetMin ?? null,
    wordTargetMax: input.wordTargetMax ?? null,
    sectionsWithContent: input.sectionsWithContent ?? null,
    sectionsTotal: input.sectionsTotal ?? null,
    mediaReady: Boolean(input.mediaReady),
    mediaGaps: input.mediaGaps ?? null,
    internalLinkCount: input.internalLinkCount ?? 0,
    ctaReady: Boolean(input.ctaReady),
    qaBlockers: input.qaBlockers ?? null,
    qaWarnings: input.qaWarnings ?? null,
    reviewState: input.reviewState ?? null,
  };
}

export type SectionEditorialState = "empty" | "drafting" | "needs_attention" | "qa_ok" | "approved";

export const SECTION_EDITORIAL_STATE_LABELS: Record<SectionEditorialState, string> = {
  empty: "Chưa viết",
  drafting: "Đang viết",
  needs_attention: "Cần kiểm tra",
  qa_ok: "Đạt QA",
  approved: "Đã duyệt",
};

/**
 * Derives a section's display state from real signals only — `approved` is
 * reachable only through an explicit `reviewApproved: true`, never inferred
 * from word count or QA alone.
 */
export function deriveSectionEditorialState(input: {
  hasHtml: boolean;
  wordCount?: number;
  qaFailed?: boolean;
  reviewApproved?: boolean;
}): SectionEditorialState {
  if (input.reviewApproved === true) return "approved";
  if (!input.hasHtml) return "empty";
  if (input.qaFailed === true) return "needs_attention";
  if (input.qaFailed === false) return "qa_ok";
  return "drafting";
}

export type OutlineNavItem = {
  id: string;
  level: "H2" | "H3";
  heading: string;
  depth: number;
  index: number;
};

/** Flattens a brief outline into a navigable, indentable list (no repeated level text needed by the UI). */
export function flattenOutlineForNav(
  outline: Array<{ level: "H2" | "H3"; heading: string; sortOrder?: number }>,
): OutlineNavItem[] {
  return outline.map((row, index) => ({
    id: `outline-${index}`,
    level: row.level,
    heading: row.heading.trim() || `Mục ${index + 1}`,
    depth: row.level === "H3" ? 1 : 0,
    index,
  }));
}

export type EditorialActivityGroup = {
  key: string;
  text: string;
  count: number;
  at: string;
};

/** Groups duplicate activity entries (e.g. repeated autosave notes) and sorts newest-first. */
export function groupEditorialActivity(
  items: Array<{ at: string; text: string }>,
): EditorialActivityGroup[] {
  const map = new Map<string, EditorialActivityGroup>();
  for (const item of items) {
    const existing = map.get(item.text);
    if (existing) {
      existing.count += 1;
      if (new Date(item.at).getTime() > new Date(existing.at).getTime()) existing.at = item.at;
    } else {
      map.set(item.text, { key: item.text, text: item.text, count: 1, at: item.at });
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** localStorage key for whether the writer last preferred Focus mode on this workspace. */
export const TOPIC_FOCUS_PREF_KEY = "attd.editor.topicFocus";

export function readTopicFocusPreference(): boolean {
  return readBoolPref(TOPIC_FOCUS_PREF_KEY) === true;
}

export function writeTopicFocusPreference(value: boolean): void {
  writeBoolPref(TOPIC_FOCUS_PREF_KEY, value);
}
