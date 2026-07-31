/**
 * Pure policy for the governed "APPROVED Review -> Blog" handoff.
 *
 * Client-safe: no prisma, no server-only imports. The admin UI and the handoff
 * service share these rules so they can never disagree about which Blog is the
 * target, which fields may be written, or what a terminal Review looks like.
 */

export type BlogHandoffMatchedBy =
  | "EXPLICIT_TARGET"
  | "TOPIC_LINK"
  | "REVIEW_LINK"
  | "DRAFT_LINK"
  | "SLUG";

/** Editorial linkage is checked before slug — slug is the weakest signal. */
const MATCH_PRIORITY: BlogHandoffMatchedBy[] = [
  "EXPLICIT_TARGET",
  "TOPIC_LINK",
  "REVIEW_LINK",
  "DRAFT_LINK",
  "SLUG",
];

export type BlogHandoffCandidate = {
  blogPostId: string;
  slug: string;
  status: string;
  matchedBy: BlogHandoffMatchedBy;
};

export type BlogHandoffTarget =
  | {
      decision: "REUSE";
      blogPostId: string;
      matchedBy: BlogHandoffMatchedBy;
      candidates: BlogHandoffCandidate[];
    }
  | { decision: "CREATE"; blogPostId: null; matchedBy: null; candidates: [] }
  | {
      decision: "CONFLICT";
      blogPostId: null;
      matchedBy: null;
      candidates: BlogHandoffCandidate[];
      conflictIds: string[];
    };

/**
 * Resolve which Blog a handoff must write to.
 *
 * Reuse wins over creation whenever any editorial link exists, so a second Blog
 * is never produced for one editorial object. Two different Blogs reachable
 * from the same article is a conflict a human has to resolve — the handoff
 * must not pick one.
 */
export function resolveBlogHandoffTarget(input: {
  candidates: BlogHandoffCandidate[];
}): BlogHandoffTarget {
  const candidates = [...input.candidates].sort(
    (a, b) => MATCH_PRIORITY.indexOf(a.matchedBy) - MATCH_PRIORITY.indexOf(b.matchedBy)
  );
  if (candidates.length === 0) {
    return { decision: "CREATE", blogPostId: null, matchedBy: null, candidates: [] };
  }

  const distinctIds = [...new Set(candidates.map((c) => c.blogPostId))];
  if (distinctIds.length > 1) {
    return {
      decision: "CONFLICT",
      blogPostId: null,
      matchedBy: null,
      candidates,
      conflictIds: distinctIds,
    };
  }

  return {
    decision: "REUSE",
    blogPostId: distinctIds[0],
    matchedBy: candidates[0].matchedBy,
    candidates,
  };
}

export type HandoffFieldName =
  | "title"
  | "content"
  | "metaTitle"
  | "metaDescription"
  | "faq";

export type HandoffFieldClassification =
  | "IN_SYNC"
  | "SAFE_TO_SYNC"
  | "KEEP_BLOG_VALUE"
  | "CONFLICT_REQUIRES_HUMAN";

export type HandoffFieldPlan = {
  field: HandoffFieldName;
  classification: HandoffFieldClassification;
  reason: string;
};

/** Fields the Blog owns outright — a handoff never writes them. */
export const BLOG_OWNED_FIELDS = [
  "slug",
  "canonicalUrl",
  "featuredImageUrl",
  "ogImageUrl",
  "excerpt",
  "tags",
  "status",
  "publishedAt",
] as const;

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * A Blog carries human edits the handoff must not clobber when it drifted after
 * its last handoff, or when it holds content from outside this article chain.
 */
export function hasManualEditRisk(input: {
  contentModifiedAfterHandoff: boolean;
  lastHandoffAt: Date | string | null;
  blogSourceWritingDraftId: string | null;
  draftId: string;
}): boolean {
  if (input.contentModifiedAfterHandoff) return true;
  if (!input.lastHandoffAt) return input.blogSourceWritingDraftId !== input.draftId;
  return false;
}

/**
 * Decide, per field, whether the approved Draft value may replace the Blog
 * value. Equal values are never rewritten, empty Blog values are always safe to
 * fill, and a Blog with manual-edit risk keeps its value and reports a conflict.
 */
export function classifyHandoffField(input: {
  field: HandoffFieldName;
  draftValue: string | null | undefined;
  blogValue: string | null | undefined;
  manualEditRisk: boolean;
}): HandoffFieldPlan {
  const draftValue = normalize(input.draftValue);
  const blogValue = normalize(input.blogValue);

  if (!draftValue) {
    return {
      field: input.field,
      classification: "KEEP_BLOG_VALUE",
      reason: "Bản duyệt không có giá trị cho trường này",
    };
  }
  if (draftValue === blogValue) {
    return { field: input.field, classification: "IN_SYNC", reason: "Đã trùng khớp" };
  }
  if (!blogValue) {
    return { field: input.field, classification: "SAFE_TO_SYNC", reason: "Blog đang trống" };
  }
  if (input.manualEditRisk) {
    return {
      field: input.field,
      classification: "CONFLICT_REQUIRES_HUMAN",
      reason: "Blog có chỉnh sửa thủ công sau bàn giao — cần người xác nhận ghi đè",
    };
  }
  return {
    field: input.field,
    classification: "SAFE_TO_SYNC",
    reason: "Blog chưa có chỉnh sửa thủ công, đồng bộ từ bản đã duyệt",
  };
}

export type HandoffPlan = {
  fields: HandoffFieldPlan[];
  synchronized: HandoffFieldName[];
  preserved: HandoffFieldName[];
  conflicts: HandoffFieldPlan[];
};

/**
 * Build the write plan. `overwriteFields` is an explicit human opt-in that
 * upgrades a conflicting field to a write; without it conflicts are preserved.
 */
export function buildHandoffPlan(input: {
  classifications: HandoffFieldPlan[];
  overwriteFields?: HandoffFieldName[];
}): HandoffPlan {
  const overwrite = new Set(input.overwriteFields ?? []);
  const synchronized: HandoffFieldName[] = [];
  const preserved: HandoffFieldName[] = [];
  const conflicts: HandoffFieldPlan[] = [];

  for (const plan of input.classifications) {
    if (plan.classification === "SAFE_TO_SYNC") {
      synchronized.push(plan.field);
      continue;
    }
    if (plan.classification === "CONFLICT_REQUIRES_HUMAN") {
      if (overwrite.has(plan.field)) {
        synchronized.push(plan.field);
        continue;
      }
      conflicts.push(plan);
      preserved.push(plan.field);
      continue;
    }
    preserved.push(plan.field);
  }

  return { fields: input.classifications, synchronized, preserved, conflicts };
}

/**
 * FAQ answers render as text on the public page and go verbatim into JSON-LD,
 * so the draft's answer HTML must be flattened before it reaches the Blog.
 */
export function faqAnswerToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|div|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export type ReviewHandoffState =
  | "APPROVAL_IN_PROGRESS"
  | "NEEDS_HANDOFF"
  | "BLOG_DRAFT"
  | "BLOG_READY"
  | "BLOG_PUBLISHED"
  | "SUPERSEDED"
  | "REJECTED";

export type ReviewHandoffView = {
  state: ReviewHandoffState;
  terminal: boolean;
  /** APPROVED is a success, never an approval error. */
  successBanner: { title: string; body: string } | null;
  ctaLabel: string | null;
  ctaKind: "OPEN_BLOG" | "RUN_HANDOFF" | "OPEN_SUCCESSOR" | null;
  /** The Blog points at an older Review and must be relinked by the handoff. */
  needsRelink: boolean;
};

export const APPROVED_REVIEW_BANNER = {
  title: "Đã phê duyệt",
  body: "Phiên kiểm duyệt đã hoàn tất. Tiếp tục với Blog Draft để kiểm tra trước khi xuất bản.",
} as const;

/**
 * What the Review page should offer, given the Review status and the Blog it
 * is (or is not) linked to. Terminal success states never reuse the approval
 * blocker UI.
 */
export function resolveReviewHandoffView(input: {
  reviewId: string;
  reviewStatus: string;
  blog: {
    id: string;
    status: string;
    sourceReviewSessionId: string | null;
    /** Formal handoff triad — missing means the Blog was linked without a governed handoff. */
    sourceHandoffRecordId?: string | null;
  } | null;
  blogPublishReady?: boolean | null;
}): ReviewHandoffView {
  if (input.reviewStatus === "SUPERSEDED") {
    return {
      state: "SUPERSEDED",
      terminal: true,
      successBanner: null,
      ctaLabel: "Mở phiên kiểm duyệt mới",
      ctaKind: "OPEN_SUCCESSOR",
      needsRelink: false,
    };
  }
  if (input.reviewStatus === "REJECTED") {
    return {
      state: "REJECTED",
      terminal: true,
      successBanner: null,
      ctaLabel: null,
      ctaKind: null,
      needsRelink: false,
    };
  }
  if (input.reviewStatus !== "APPROVED") {
    return {
      state: "APPROVAL_IN_PROGRESS",
      terminal: false,
      successBanner: null,
      ctaLabel: null,
      ctaKind: null,
      needsRelink: false,
    };
  }

  const banner = { title: APPROVED_REVIEW_BANNER.title, body: APPROVED_REVIEW_BANNER.body };
  if (!input.blog) {
    return {
      state: "NEEDS_HANDOFF",
      terminal: true,
      successBanner: banner,
      ctaLabel: "Hoàn tất bàn giao sang Blog Draft",
      ctaKind: "RUN_HANDOFF",
      needsRelink: false,
    };
  }

  const needsRelink = input.blog.sourceReviewSessionId !== input.reviewId;
  // Linked without a completed handoff record still needs the governed handoff
  // pass (traceability + conflict-aware sync), even when the Review id matches.
  const needsFormalHandoff = !input.blog.sourceHandoffRecordId;
  if (input.blog.status === "PUBLISHED") {
    return {
      state: "BLOG_PUBLISHED",
      terminal: true,
      successBanner: banner,
      ctaLabel: "Đã xuất bản — mở bài viết",
      ctaKind: "OPEN_BLOG",
      needsRelink: false,
    };
  }
  if (needsRelink || needsFormalHandoff) {
    return {
      state: "NEEDS_HANDOFF",
      terminal: true,
      successBanner: banner,
      ctaLabel: "Hoàn tất bàn giao sang Blog Draft",
      ctaKind: "RUN_HANDOFF",
      needsRelink,
    };
  }
  if (input.blogPublishReady === true) {
    return {
      state: "BLOG_READY",
      terminal: true,
      successBanner: banner,
      ctaLabel: "Sẵn sàng xuất bản — mở Blog Draft",
      ctaKind: "OPEN_BLOG",
      needsRelink: false,
    };
  }
  return {
    state: "BLOG_DRAFT",
    terminal: true,
    successBanner: banner,
    ctaLabel: "Mở Blog Draft",
    ctaKind: "OPEN_BLOG",
    needsRelink: false,
  };
}

export type HandoffStage =
  | "load_review"
  | "policy"
  | "resolve_target"
  | "plan_fields"
  | "write_blog"
  | "write_media"
  | "write_handoff_record"
  | "write_audit"
  | "verify"
  | "readiness";

export const HANDOFF_STAGE_LABELS: Record<HandoffStage, string> = {
  load_review: "tải phiên kiểm duyệt",
  policy: "kiểm tra điều kiện bàn giao",
  resolve_target: "xác định Blog đích",
  plan_fields: "lập kế hoạch đồng bộ trường",
  write_blog: "ghi Blog",
  write_media: "gán media",
  write_handoff_record: "ghi bản ghi bàn giao",
  write_audit: "ghi nhật ký bàn giao",
  verify: "xác minh sau khi ghi",
  readiness: "tính lại publish readiness",
};

export type HandoffErrorCode =
  | "BLOG_CONFLICT"
  | "BLOG_NOT_FOUND"
  | "REVIEW_NOT_APPROVED"
  | "DRAFT_VERSION_INVALID"
  | "CONTENT_CONFLICT"
  | "HANDOFF_WRITE_FAILED"
  | "HANDOFF_VERIFY_FAILED";

/**
 * Client-facing shape for an unexpected handoff failure: names the stage and a
 * diagnostic id the reviewer can quote. No stack traces or row payloads.
 */
export function buildHandoffFailure(input: {
  stage: HandoffStage;
  diagnosticId: string;
  errorName?: string | null;
  errorCode?: string | null;
}): {
  ok: false;
  code: HandoffErrorCode;
  message: string;
  details: { stage: HandoffStage; stageLabel: string; diagnosticId: string; errorCode: string };
} {
  const errorCode = input.errorCode || input.errorName || "UNKNOWN";
  const stageLabel = HANDOFF_STAGE_LABELS[input.stage];
  return {
    ok: false,
    code: "HANDOFF_WRITE_FAILED",
    message:
      `Bàn giao thất bại ở bước "${stageLabel}" (mã ${errorCode}, mã tra cứu ${input.diagnosticId}). ` +
      "Blog không bị xuất bản và không có Blog trùng nào được tạo.",
    details: { stage: input.stage, stageLabel, diagnosticId: input.diagnosticId, errorCode },
  };
}
