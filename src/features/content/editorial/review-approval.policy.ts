/**
 * Pure policy helpers for the editorial Review approval UX.
 * Client-safe: no server-only imports, no database access.
 */

export type ReviewBlockerGroup =
  | "DRAFT_VERSION"
  | "REQUIRED_FACTS"
  | "FAQ"
  | "SECTION_APPROVALS"
  | "QA";

export type ReviewBlocker = {
  group: ReviewBlockerGroup;
  code: string;
  message: string;
  sectionId?: string | null;
};

export type ReviewBlockerGroupView = {
  group: ReviewBlockerGroup;
  label: string;
  summary: string;
  count: number;
  items: string[];
  collapsed: boolean;
};

export const REVIEW_BLOCKER_GROUP_LABELS: Record<ReviewBlockerGroup, string> = {
  DRAFT_VERSION: "Phiên bản bản nháp",
  REQUIRED_FACTS: "Dữ kiện bắt buộc",
  FAQ: "FAQ",
  SECTION_APPROVALS: "Duyệt đoạn",
  QA: "QA",
};

/**
 * Fact IDs produced by the AI retrieval layer are prefixed by source family.
 * Media families describe assets, not knowledge claims, so they must never be
 * validated as Knowledge required facts.
 */
export const MEDIA_FACT_ID_PREFIXES = ["bundle-", "media-"] as const;
export const MEDIA_FACT_SOURCE_TYPES = ["MEDIA_BUNDLE", "MEDIA_ASSET"] as const;

export function isMediaFactId(factId: string): boolean {
  return MEDIA_FACT_ID_PREFIXES.some((prefix) => factId.startsWith(prefix));
}

export function isMediaFactSourceType(sourceType: string | null | undefined): boolean {
  if (!sourceType) return false;
  return (MEDIA_FACT_SOURCE_TYPES as readonly string[]).includes(sourceType);
}

/** A fact only enters Knowledge required-fact validation when it is not media-derived. */
export function isKnowledgeRequiredFact(fact: {
  factId: string;
  sourceType?: string | null;
  required?: boolean;
}): boolean {
  if (fact.required === false) return false;
  return !isMediaFactId(fact.factId) && !isMediaFactSourceType(fact.sourceType);
}

export type FaqSchemaSignal = {
  valid: boolean;
  severity: "NONE" | "WARNING" | "ERROR";
  code: "FAQ_SCHEMA_WITHOUT_FAQ" | "FAQ_CONTENT_OUT_OF_SYNC" | null;
  message: string | null;
};

/**
 * FAQPage schema is valid only when the governed source actually carries FAQ
 * content. Structured FAQ entries render as visible FAQ, so either signal
 * satisfies the schema; a mismatch between the two is a sync warning.
 */
export function evaluateFaqSchemaSignal(input: {
  schemaTypes: string[];
  structuredFaqCount: number;
  visibleFaqCount: number;
}): FaqSchemaSignal {
  if (!input.schemaTypes.includes("FAQPage")) {
    return { valid: true, severity: "NONE", code: null, message: null };
  }

  const total = input.structuredFaqCount + input.visibleFaqCount;
  if (total === 0) {
    return {
      valid: false,
      severity: "ERROR",
      code: "FAQ_SCHEMA_WITHOUT_FAQ",
      message: "FAQPage schema without FAQ content",
    };
  }

  if (
    input.structuredFaqCount > 0 &&
    input.visibleFaqCount > 0 &&
    input.structuredFaqCount !== input.visibleFaqCount
  ) {
    return {
      valid: true,
      severity: "WARNING",
      code: "FAQ_CONTENT_OUT_OF_SYNC",
      message: `FAQ hiển thị (${input.visibleFaqCount}) khác FAQ có cấu trúc (${input.structuredFaqCount})`,
    };
  }

  return { valid: true, severity: "NONE", code: null, message: null };
}

const FAQ_HEADING_PATTERN = /(faq|câu hỏi thường gặp|hỏi\s*[-–&]\s*đáp|questions?)/i;

/** Count visible FAQ question/answer pairs rendered in the draft body. */
export function countVisibleFaqEntries(
  sections: Array<{ heading: string; html: string; plainText: string }>,
): number {
  let count = 0;
  for (const section of sections) {
    if (!FAQ_HEADING_PATTERN.test(section.heading)) continue;
    const headings = section.html.match(/<h[34][^>]*>/gi)?.length ?? 0;
    const strongs = section.html.match(/<strong[^>]*>/gi)?.length ?? 0;
    const questionLines = section.plainText
      .split("\n")
      .filter((line) => line.trim().endsWith("?")).length;
    count += Math.max(headings, strongs, questionLines);
  }
  return count;
}

export type BulkApproveSectionCandidate = {
  sectionId: string;
  heading: string;
  status: string;
  hasContent: boolean;
  hasBlockingQaIssue: boolean;
  hasUnresolvedRequiredFact: boolean;
  hasUnsafeClaim: boolean;
  isStale: boolean;
  /** Blocking/error QA codes for this section (empty when clean). */
  qaCodes?: string[];
  /** Required Knowledge fact IDs still unused by the section. */
  missingRequiredFactIds?: string[];
  /** Unsafe claim codes detected on the section. */
  unsafeClaimCodes?: string[];
  /** Current content hash of the draft section, when content exists. */
  contentHash?: string | null;
  required?: boolean;
};

export type BulkApproveExclusionReason =
  | "ALREADY_APPROVED"
  | "EMPTY_CONTENT"
  | "BLOCKING_QA"
  | "REQUIRED_FACT"
  | "UNSAFE_CLAIM"
  | "STALE"
  | "NEEDS_DECISION"
  | "MISSING_FROM_DRAFT";

export const BULK_APPROVE_EXCLUSION_LABELS: Record<BulkApproveExclusionReason, string> = {
  ALREADY_APPROVED: "Đã duyệt",
  EMPTY_CONTENT: "Chưa có nội dung",
  BLOCKING_QA: "Còn lỗi QA chặn",
  REQUIRED_FACT: "Dữ kiện bắt buộc chưa xử lý",
  UNSAFE_CLAIM: "Có tuyên bố chưa được phép",
  STALE: "Đoạn đã lệch phiên bản",
  NEEDS_DECISION: "Cần quyết định riêng (từ chối/yêu cầu sửa)",
  MISSING_FROM_DRAFT: "Không có trong bản nháp hiện tại",
};

export type BulkApproveSkipDetail = {
  sectionId: string;
  heading: string;
  reason: BulkApproveExclusionReason;
  qa: string[];
  requiredFact: string[];
  unsafeClaim: string[];
  stale: boolean;
  hash: string | null;
  required: boolean;
};

export type BulkApproveEligibleDetail = {
  sectionId: string;
  heading: string;
  hash: string | null;
  required: boolean;
};

export type BulkApproveCounts = {
  total: number;
  eligible: number;
  excluded: number;
  pending: number;
  requiredPending: number;
  optionalPending: number;
  approved: number;
};

export type BulkApprovePlan = {
  eligible: BulkApproveEligibleDetail[];
  excluded: BulkApproveSkipDetail[];
  blockers: string[];
  counts: BulkApproveCounts;
};

/**
 * Decide which sections a human may approve in one confirmed batch.
 * Only clean, current-version sections qualify — everything else stays manual.
 * UI and API must both call this same function.
 */
export function selectBulkApprovableSections(input: {
  reviewIsStale: boolean;
  sections: BulkApproveSectionCandidate[];
}): BulkApprovePlan {
  const eligible: BulkApprovePlan["eligible"] = [];
  const excluded: BulkApprovePlan["excluded"] = [];
  const blockers = new Set<string>();

  for (const section of input.sections) {
    const skip = (
      reason: BulkApproveExclusionReason
    ): void => {
      excluded.push({
        sectionId: section.sectionId,
        heading: section.heading,
        reason,
        qa: section.qaCodes ?? [],
        requiredFact: section.missingRequiredFactIds ?? [],
        unsafeClaim: section.unsafeClaimCodes ?? [],
        stale: section.isStale || input.reviewIsStale,
        hash: section.contentHash ?? null,
        required: section.required === true,
      });
      if (reason !== "ALREADY_APPROVED") {
        blockers.add(BULK_APPROVE_EXCLUSION_LABELS[reason]);
      }
    };

    if (input.reviewIsStale || section.isStale) {
      skip("STALE");
      continue;
    }
    if (section.status === "APPROVED") {
      skip("ALREADY_APPROVED");
      continue;
    }
    if (section.status === "REJECTED" || section.status === "CHANGES_REQUESTED") {
      skip("NEEDS_DECISION");
      continue;
    }
    if (!section.hasContent) {
      skip("EMPTY_CONTENT");
      continue;
    }
    if (section.hasBlockingQaIssue) {
      skip("BLOCKING_QA");
      continue;
    }
    if (section.hasUnresolvedRequiredFact) {
      skip("REQUIRED_FACT");
      continue;
    }
    if (section.hasUnsafeClaim) {
      skip("UNSAFE_CLAIM");
      continue;
    }
    eligible.push({
      sectionId: section.sectionId,
      heading: section.heading,
      hash: section.contentHash ?? null,
      required: section.required === true,
    });
  }

  const approved = input.sections.filter((s) => s.status === "APPROVED").length;
  const pending = input.sections.filter((s) => s.status === "PENDING" || s.status === "LOCKED").length;
  const requiredPending = input.sections.filter(
    (s) => s.required && (s.status === "PENDING" || s.status === "LOCKED")
  ).length;
  const optionalPending = input.sections.filter(
    (s) => !s.required && (s.status === "PENDING" || s.status === "LOCKED")
  ).length;

  return {
    eligible,
    excluded,
    blockers: [...blockers],
    counts: {
      total: input.sections.length,
      eligible: eligible.length,
      excluded: excluded.length,
      pending,
      requiredPending,
      optionalPending,
      approved,
    },
  };
}

export type ApprovalChecklistItem = {
  id:
    | "latest_draft"
    | "required_facts"
    | "faq"
    | "sections"
    | "qa"
    | "media";
  label: string;
  passed: boolean;
  detail: string | null;
};

/**
 * Compact pre-approval checklist shown above the final Approve button.
 * Section wording uses the same pending/required counts as the bulk panel.
 */
export function buildApprovalChecklist(input: {
  usesLatestDraft: boolean;
  requiredFactsSatisfied: boolean;
  faqValid: boolean;
  requiredSectionsApproved: boolean;
  blockingQaCleared: boolean;
  mediaReady: boolean;
  latestDraftVersion?: number | null;
  reviewDraftVersion?: number | null;
  pendingRequiredSections?: number;
  pendingSections?: number;
  totalSections?: number;
}): ApprovalChecklistItem[] {
  const pendingRequired = input.pendingRequiredSections ?? 0;
  const pending = input.pendingSections ?? pendingRequired;
  const total = input.totalSections ?? pending;
  return [
    {
      id: "latest_draft",
      label: "Review dùng bản nháp mới nhất",
      passed: input.usesLatestDraft,
      detail: input.usesLatestDraft
        ? null
        : `Review v${input.reviewDraftVersion ?? "?"} · bản nháp v${input.latestDraftVersion ?? "?"}`,
    },
    {
      id: "required_facts",
      label: "Dữ kiện bắt buộc đã đủ",
      passed: input.requiredFactsSatisfied,
      detail: null,
    },
    { id: "faq", label: "FAQ hợp lệ", passed: input.faqValid, detail: null },
    {
      id: "sections",
      label: "Đã duyệt các đoạn bắt buộc",
      passed: input.requiredSectionsApproved,
      detail:
        pending > 0
          ? `${pending}/${total} đoạn chưa duyệt · ${pendingRequired} bắt buộc còn chờ`
          : null,
    },
    { id: "qa", label: "Không còn lỗi QA chặn", passed: input.blockingQaCleared, detail: null },
    { id: "media", label: "Media sẵn sàng", passed: input.mediaReady, detail: null },
  ];
}

/**
 * Collapse repeated blockers (notably per-section approval errors) into
 * a small set of groups suitable for an inline panel.
 * When `counts` is provided, the section summary uses the same numbers as
 * the bulk panel and checklist (pending/total · required pending).
 */
export function groupApprovalBlockers(
  blockers: ReviewBlocker[],
  counts?: Pick<BulkApproveCounts, "pending" | "total" | "requiredPending">
): ReviewBlockerGroupView[] {
  const order: ReviewBlockerGroup[] = [
    "DRAFT_VERSION",
    "REQUIRED_FACTS",
    "FAQ",
    "SECTION_APPROVALS",
    "QA",
  ];

  const views: ReviewBlockerGroupView[] = [];
  for (const group of order) {
    const items = blockers.filter((b) => b.group === group);
    if (items.length === 0) continue;

    const collapsed = group === "SECTION_APPROVALS" && items.length > 3;
    const notApproved = items.filter((i) => i.code === "SECTION_NOT_APPROVED").length;

    let summary = items[0].message;
    if (collapsed) {
      if (counts) {
        summary = `${counts.pending}/${counts.total} đoạn chưa duyệt · ${counts.requiredPending} bắt buộc còn chờ`;
      } else if (notApproved > 0) {
        summary = `${notApproved} đoạn bắt buộc chưa được duyệt`;
      } else {
        summary = `${items.length} vấn đề ở phần duyệt đoạn`;
      }
    }

    views.push({
      group,
      label: REVIEW_BLOCKER_GROUP_LABELS[group],
      summary,
      count: items.length,
      items: collapsed ? items.slice(0, 3).map((i) => i.message) : items.map((i) => i.message),
      collapsed,
    });
  }
  return views;
}

export type FinalApprovalInvariantCode =
  | "CHECKLIST_ITEM_FAILED"
  | "REVIEW_NOT_ACTIVE"
  | "SECTION_REJECTED"
  | "SECTION_CHANGES_REQUESTED"
  | "UNMAPPED_BLOCKER";

export type FinalApprovalInvariant = {
  code: FinalApprovalInvariantCode;
  message: string;
  /** Checklist row the reviewer should look at, when the invariant maps to one. */
  checklistId?: ApprovalChecklistItem["id"];
};

export type FinalApprovalDecision = {
  ok: boolean;
  /** Review is already APPROVED — the caller should replay, not re-approve. */
  alreadyApproved: boolean;
  failed: FinalApprovalInvariant[];
};

/**
 * The single source of truth for "may this Review be finally approved".
 *
 * The UI checklist and this gate read the same inputs on purpose: whenever the
 * gate refuses, at least one invariant is returned, and any blocker that no
 * checklist row covers is reported as UNMAPPED_BLOCKER rather than failing
 * silently behind an all-green checklist.
 */
export function evaluateFinalApproval(input: {
  reviewStatus: string;
  checklist: ApprovalChecklistItem[];
  blockers: ReviewBlocker[];
  rejectedSections: number;
  changesRequestedSections: number;
}): FinalApprovalDecision {
  if (input.reviewStatus === "APPROVED") {
    return { ok: false, alreadyApproved: true, failed: [] };
  }

  const failed: FinalApprovalInvariant[] = [];
  // Blocker codes already spoken for by a stronger invariant below, so the
  // reviewer is not shown the same problem twice.
  const coveredCodes = new Set<string>();

  if (!isActiveReviewStatus(input.reviewStatus)) {
    failed.push({
      code: "REVIEW_NOT_ACTIVE",
      message: `Phiên kiểm duyệt ở trạng thái ${input.reviewStatus} — không thể phê duyệt.`,
    });
    coveredCodes.add("REVIEW_NOT_EDITABLE");
  }

  for (const item of input.checklist) {
    if (item.passed) continue;
    failed.push({
      code: "CHECKLIST_ITEM_FAILED",
      checklistId: item.id,
      message: item.detail ? `${item.label} — ${item.detail}` : item.label,
    });
  }

  if (input.rejectedSections > 0) {
    failed.push({
      code: "SECTION_REJECTED",
      checklistId: "sections",
      message: `${input.rejectedSections} đoạn đang bị reject — xử lý trước khi phê duyệt.`,
    });
  }
  if (input.changesRequestedSections > 0) {
    failed.push({
      code: "SECTION_CHANGES_REQUESTED",
      checklistId: "sections",
      message: `${input.changesRequestedSections} đoạn đang yêu cầu sửa — xử lý trước khi phê duyệt.`,
    });
  }

  // Safety net: a blocker whose group has no failing checklist row would
  // otherwise be an all-green checklist over a refusing server.
  const failedChecklistIds = new Set(
    input.checklist.filter((i) => !i.passed).map((i) => i.id)
  );
  for (const blocker of input.blockers) {
    if (coveredCodes.has(blocker.code)) continue;
    if (blockerCoveredByChecklist(blocker.group, failedChecklistIds)) continue;
    failed.push({
      code: "UNMAPPED_BLOCKER",
      message: `${blocker.code}: ${blocker.message}`,
    });
  }

  return { ok: failed.length === 0, alreadyApproved: false, failed };
}

const BLOCKER_GROUP_CHECKLIST_IDS: Record<ReviewBlockerGroup, ApprovalChecklistItem["id"][]> = {
  DRAFT_VERSION: ["latest_draft"],
  REQUIRED_FACTS: ["required_facts"],
  FAQ: ["faq"],
  SECTION_APPROVALS: ["sections"],
  QA: ["qa", "media"],
};

function blockerCoveredByChecklist(
  group: ReviewBlockerGroup,
  failedChecklistIds: Set<ApprovalChecklistItem["id"]>
): boolean {
  return BLOCKER_GROUP_CHECKLIST_IDS[group].some((id) => failedChecklistIds.has(id));
}

/** Toast copy for an approval refused by the final invariants. */
export function finalApprovalToastMessage(decision: FinalApprovalDecision): string {
  if (decision.alreadyApproved) return "Review đã được phê duyệt trước đó.";
  if (decision.failed.length === 0) return "Chưa đủ điều kiện phê duyệt.";
  const first = decision.failed[0].message;
  return decision.failed.length === 1
    ? `Chưa đủ điều kiện phê duyệt: ${first}`
    : `Chưa đủ điều kiện phê duyệt: ${first} (+${decision.failed.length - 1} mục khác)`;
}

/**
 * Post-write invariants for a committed final approval. Checked inside the
 * transaction so an inconsistent write rolls back instead of leaving a
 * half-approved Review behind.
 */
export function isApprovalWriteConsistent(input: {
  reviewStatus?: string | null;
  reviewApprovedBy?: string | null;
  reviewApprovedAt?: Date | string | null;
  draftStatus?: string | null;
  draftApprovedBy?: string | null;
  draftVersion?: number | null;
  expectedDraftVersion: number;
  approveDecisions: number;
}): boolean {
  return (
    input.reviewStatus === "APPROVED" &&
    Boolean(input.reviewApprovedBy) &&
    Boolean(input.reviewApprovedAt) &&
    input.draftStatus === "APPROVED" &&
    Boolean(input.draftApprovedBy) &&
    input.draftVersion === input.expectedDraftVersion &&
    input.approveDecisions === 1
  );
}

/**
 * Stages of the final approval request, in execution order. The stage that
 * failed is the only implementation detail the reviewer is shown.
 */
export const APPROVAL_STAGE_LABELS = {
  load_review: "tải phiên kiểm duyệt",
  policy: "kiểm tra điều kiện phê duyệt",
  render: "kết xuất bản nháp đã duyệt",
  write_review_status: "ghi trạng thái phê duyệt",
  write_draft_record: "ghi bản nháp đã duyệt",
  write_version_snapshot: "lưu ảnh chụp phiên bản",
  write_decision: "ghi quyết định kiểm duyệt",
  verify: "xác minh sau khi ghi",
  reload: "tải lại phiên kiểm duyệt",
} as const;

export type ApprovalStage = keyof typeof APPROVAL_STAGE_LABELS;

/** Stages after which the interactive transaction has already committed. */
const COMMITTED_STAGES: ApprovalStage[] = ["reload"];

export type FinalApprovalFailure = {
  ok: false;
  code: "APPROVE_WRITE_FAILED";
  message: string;
  details: {
    stage: ApprovalStage;
    stageLabel: string;
    errorCode: string;
    rolledBack: boolean;
  };
};

/**
 * Client-facing shape for an unexpected approval failure: names the stage and
 * an error code the reviewer can quote, and says whether anything was saved.
 * Never carries stack traces, SQL, or row payloads.
 */
export function buildFinalApprovalFailure(input: {
  stage: ApprovalStage;
  errorName?: string | null;
  errorCode?: string | null;
}): FinalApprovalFailure {
  const errorCode = input.errorCode || input.errorName || "UNKNOWN";
  const rolledBack = !COMMITTED_STAGES.includes(input.stage);
  const stageLabel = APPROVAL_STAGE_LABELS[input.stage];
  return {
    ok: false,
    code: "APPROVE_WRITE_FAILED",
    message:
      `Phê duyệt thất bại ở bước "${stageLabel}" (mã ${errorCode}). ` +
      (rolledBack
        ? "Không có thay đổi nào được lưu — thử lại, nếu vẫn lỗi hãy gửi mã này cho kỹ thuật."
        : "Dữ liệu đã được ghi nhưng không tải lại được — tải lại trang để xem trạng thái."),
    details: { stage: input.stage, stageLabel, errorCode, rolledBack },
  };
}

/** Short toast copy — details belong in the inline grouped panel. */
export function approvalToastMessage(groups: ReviewBlockerGroupView[]): string {
  if (groups.length === 0) return "Chưa đủ điều kiện phê duyệt.";
  return `Chưa đủ điều kiện phê duyệt. Xem ${groups.length} nhóm vấn đề cần xử lý.`;
}

/** Review statuses that still accept reviewer decisions. */
export const ACTIVE_REVIEW_STATUSES = [
  "NOT_STARTED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
] as const;

export function isActiveReviewStatus(status: string): boolean {
  return (ACTIVE_REVIEW_STATUSES as readonly string[]).includes(status);
}

export type ReviewRestartMode = "STALE" | "ORPHAN_RECOVERY" | "OPEN_SUCCESSOR" | "NONE";

/**
 * Which restart affordance a Review should offer.
 * A SUPERSEDED Review without a successor is an interrupted restart and is the
 * only closed state that may be restarted, as a recovery path.
 */
export function resolveReviewRestartMode(input: {
  sessionStatus: string;
  hasSuccessor: boolean;
  stale: boolean;
}): ReviewRestartMode {
  if (input.hasSuccessor) return "OPEN_SUCCESSOR";
  if (input.sessionStatus === "SUPERSEDED") return "ORPHAN_RECOVERY";
  if (isActiveReviewStatus(input.sessionStatus) && input.stale) return "STALE";
  return "NONE";
}

export const STALE_REVIEW_BANNER = {
  title: "Bản nháp đã thay đổi sau khi phiên kiểm duyệt này được tạo.",
  primaryAction: "Tạo phiên kiểm duyệt mới",
  secondaryAction: "Xem thay đổi",
  bulkApproveAction: "Duyệt tất cả đoạn đạt điều kiện",
} as const;
