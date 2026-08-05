import type { OpsActivityEvent, OpsActivityKind } from "@/features/content/operations/content-operations.types";

/**
 * Sprint 17.1 — Operational Queues & Audit Foundation.
 *
 * Pure, display-only mapping functions that turn rows from *existing*
 * governed tables (ContentReviewDecision, ContentPublishEvent,
 * ContentHandoffRecord, AiGenerationRun / WritingGenerationRun,
 * WritingDraftVersion) into a single normalized `OpsActivityEvent` shape.
 *
 * No Prisma import, no fetch, no writes — the server service resolves the
 * raw rows and topic context, then hands plain objects to these functions.
 * There is intentionally no new "ContentOperationEvent" table: this module
 * is the entire audit trail, derived on read.
 */

const REVIEW_DECISION_LABELS: Record<string, string> = {
  APPROVE_SECTION: "Duyệt đoạn",
  REQUEST_CHANGES: "Yêu cầu chỉnh sửa",
  REJECT_SECTION: "Từ chối đoạn",
  APPROVE_DRAFT: "Duyệt bản thảo",
  REJECT_DRAFT: "Từ chối bản thảo",
  REOPEN_DRAFT: "Mở lại kiểm duyệt",
  HANDOFF_TO_BLOG: "Chuyển sang Blog",
};

const PUBLISH_ACTION_LABELS: Record<string, string> = {
  PUBLISH_NOW: "Xuất bản",
  SCHEDULE: "Lên lịch xuất bản",
  RESCHEDULE: "Đổi lịch xuất bản",
  CANCEL_SCHEDULE: "Hủy lịch xuất bản",
  UNPUBLISH: "Gỡ xuất bản",
  ARCHIVE: "Lưu trữ",
  RESTORE_DRAFT: "Trả về bản nháp",
};

export type ReviewDecisionEventInput = {
  id: string;
  reviewSessionId: string;
  decisionType: string;
  actorId: string;
  createdAt: string;
  topicId: string | null;
  topicTitle: string | null;
};

export function mapReviewDecisionEvent(input: ReviewDecisionEventInput): OpsActivityEvent {
  const label = REVIEW_DECISION_LABELS[input.decisionType] ?? input.decisionType;
  return {
    id: `review-decision:${input.id}`,
    at: input.createdAt,
    kind: "REVIEW_DECISION",
    actorId: input.actorId,
    topicId: input.topicId,
    entityType: "ContentReviewSession",
    entityId: input.reviewSessionId,
    href: `/admin/content/reviews/${input.reviewSessionId}`,
    text: input.topicTitle ? `${label}: ${input.topicTitle}` : label,
    sourceTable: "ContentReviewDecision",
  };
}

export type PublishEventInput = {
  id: string;
  blogPostId: string;
  blogTitle: string | null;
  action: string;
  status: string;
  requestedBy: string | null;
  createdAt: string;
  topicId: string | null;
};

export function mapPublishEvent(input: PublishEventInput): OpsActivityEvent {
  const failed = input.status === "FAILED";
  const kind: OpsActivityKind = failed
    ? "PUBLISH_FAILED"
    : input.action === "SCHEDULE" || input.action === "RESCHEDULE"
      ? "SCHEDULED"
      : "PUBLISHED";
  const actionLabel = PUBLISH_ACTION_LABELS[input.action] ?? input.action;
  const label = failed ? `${actionLabel} thất bại` : actionLabel;
  return {
    id: `publish-event:${input.id}`,
    at: input.createdAt,
    kind,
    actorId: input.requestedBy,
    topicId: input.topicId,
    entityType: "BlogPost",
    entityId: input.blogPostId,
    href: `/admin/blog/${input.blogPostId}`,
    text: input.blogTitle ? `${label}: ${input.blogTitle}` : label,
    sourceTable: "ContentPublishEvent",
  };
}

export type HandoffEventInput = {
  id: string;
  writingDraftId: string;
  status: string;
  targetEntityId: string | null;
  createdAt: string;
  topicId: string | null;
  topicTitle: string | null;
};

export function mapHandoffEvent(input: HandoffEventInput): OpsActivityEvent {
  const label =
    input.status === "COMPLETED"
      ? "Đã chuyển sang Blog"
      : input.status === "FAILED"
        ? "Chuyển sang Blog thất bại"
        : "Đang chuyển sang Blog";
  return {
    id: `handoff:${input.id}`,
    at: input.createdAt,
    kind: "HANDOFF",
    actorId: null,
    topicId: input.topicId,
    entityType: "ContentHandoffRecord",
    entityId: input.id,
    href: input.targetEntityId ? `/admin/blog/${input.targetEntityId}` : null,
    text: input.topicTitle ? `${label}: ${input.topicTitle}` : label,
    sourceTable: "ContentHandoffRecord",
  };
}

export type GenerationEventInput = {
  id: string;
  status: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  topicId: string | null;
  requestedBy: string | null;
  sourceTable: "AiGenerationRun" | "WritingGenerationRun";
};

export function mapGenerationEvent(input: GenerationEventInput): OpsActivityEvent {
  const label =
    input.status === "FAILED"
      ? "Sinh nội dung AI thất bại"
      : input.status === "COMPLETED"
        ? "Đã sinh nội dung AI"
        : "Đang sinh nội dung AI";
  return {
    id: `generation:${input.sourceTable}:${input.id}`,
    at: input.createdAt,
    kind: "GENERATION",
    actorId: input.requestedBy,
    topicId: input.topicId,
    entityType: input.entityType,
    entityId: input.entityId,
    href: null,
    text: label,
    sourceTable: input.sourceTable,
  };
}

export type DraftVersionEventInput = {
  id: string;
  writingDraftId: string;
  version: number;
  reason: string;
  createdAt: string;
  createdBy: string | null;
  topicId: string | null;
  topicTitle: string | null;
};

export function mapDraftVersionEvent(input: DraftVersionEventInput): OpsActivityEvent {
  const kind: OpsActivityKind = input.version <= 1 ? "DRAFT_CREATED" : "DRAFT_UPDATED";
  const label = input.version <= 1 ? "Tạo bản nháp" : `Cập nhật bản nháp (v${input.version})`;
  return {
    id: `draft-version:${input.id}`,
    at: input.createdAt,
    kind,
    actorId: input.createdBy,
    topicId: input.topicId,
    entityType: "WritingDraftRecord",
    entityId: input.writingDraftId,
    href: input.topicId ? `/admin/content/topics/${input.topicId}` : null,
    text: input.topicTitle ? `${label}: ${input.topicTitle}` : label,
    sourceTable: "WritingDraftVersion",
  };
}

/** Merge heterogeneous events, newest-first, capped at `take` (default 40). */
export function mergeOpsActivityEvents(
  events: OpsActivityEvent[],
  options?: { take?: number },
): OpsActivityEvent[] {
  const take = options?.take ?? 40;
  return [...events]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, Math.max(0, take));
}

export type OpsActivityKindSummary = {
  kind: OpsActivityKind;
  count: number;
  latestAt: string;
};

/** Compact per-kind rollup (e.g. for a "what kind of activity" mini legend). */
export function groupOpsActivityEvents(events: OpsActivityEvent[]): OpsActivityKindSummary[] {
  const map = new Map<OpsActivityKind, OpsActivityKindSummary>();
  for (const event of events) {
    const existing = map.get(event.kind);
    if (existing) {
      existing.count += 1;
      if (new Date(event.at).getTime() > new Date(existing.latestAt).getTime()) existing.latestAt = event.at;
    } else {
      map.set(event.kind, { kind: event.kind, count: 1, latestAt: event.at });
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

/** Chronological (oldest → newest) ordering — used for a single topic's timeline panel. */
export function sortOpsActivityEventsChronological(events: OpsActivityEvent[]): OpsActivityEvent[] {
  return [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
