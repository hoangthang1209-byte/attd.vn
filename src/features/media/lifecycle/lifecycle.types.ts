/**
 * Sprint 14.5 — Enterprise media asset lifecycle types.
 * Orthogonal to MediaVisibility. No Vision AI / embeddings.
 */

import type {
  MediaLifecycleAction,
  MediaLifecycleStatus,
  MediaRightsStatus,
  MediaVisibility,
} from "@prisma/client";

export type LifecycleTransitionErrorCode =
  | "ASSET_NOT_FOUND"
  | "INVALID_LIFECYCLE_TRANSITION"
  | "ASSET_HAS_PUBLIC_REFERENCES"
  | "REPLACEMENT_INVALID"
  | "REPLACEMENT_VISIBILITY_INVALID"
  | "REPLACEMENT_CYCLE"
  | "REFERENCE_UNSUPPORTED"
  | "REPLACE_WRITE_FAILED"
  | "REPLACE_VERIFY_FAILED"
  | "RIGHTS_EXPIRED"
  | "DELETE_BLOCKED"
  | "REASON_REQUIRED"
  | "BATCH_TOO_LARGE"
  | "PLAN_STALE";

export class MediaLifecycleError extends Error {
  readonly code: LifecycleTransitionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: LifecycleTransitionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MediaLifecycleError";
    this.code = code;
    this.details = details;
  }
}

export type MediaRelationMode =
  | "STRONG_FK"
  | "CONTENT_MEDIA_ASSIGNMENT"
  | "STRUCTURED_MEDIA_ID"
  | "EXACT_URL"
  | "LEGACY_URL";

export type MediaAssetDependency = {
  referenceType: string;
  referenceId: string;
  referenceLabel: string;
  referenceUrl: string | null;
  field: string | null;
  relationMode: MediaRelationMode;
  contentStatus: string | null;
  publicImpact: boolean;
  blocking: boolean;
  replaceable: boolean;
};

export type MediaDependencySummary = {
  mediaAssetId: string;
  total: number;
  publicCount: number;
  internalCount: number;
  blockingCount: number;
  replaceableCount: number;
  unsupportedCount: number;
  byModule: Record<string, MediaAssetDependency[]>;
  references: MediaAssetDependency[];
};

export type LifecycleTransitionInput = {
  mediaAssetId: string;
  toStatus: MediaLifecycleStatus;
  actorId?: string | null;
  reason?: string | null;
  replacementAssetId?: string | null;
  allowPublicWithoutReplacement?: boolean;
};

export type MediaRightsPatch = {
  rightsStatus?: MediaRightsStatus;
  rightsExpiresAt?: Date | null;
  rightsOwner?: string | null;
  rightsNotes?: string | null;
  usageRestriction?: string | null;
};

export type ReplacementPlanItem = MediaAssetDependency & {
  decision: "AUTO" | "MANUAL" | "UNSUPPORTED" | "BLOCKED";
  warning?: string | null;
};

export type MediaReplacementPlan = {
  sourceAssetId: string;
  replacementAssetId: string;
  total: number;
  replaceableAutomatically: number;
  needsManualReview: number;
  unsupported: number;
  blocked: number;
  publicImpact: number;
  items: ReplacementPlanItem[];
  warnings: string[];
  blockers: string[];
  /** Concurrency token — apply rejects when source/replacement/refs drift. */
  planToken: string;
  generatedAt: string;
  sourceUpdatedAt: string;
  replacementUpdatedAt: string;
  referenceSnapshotHash: string;
};

export type MediaReplacementApplyMode = "PREVIEW" | "APPLY_SUPPORTED" | "APPLY_SELECTED";

export type MediaReplacementApplyResult = {
  mode: MediaReplacementApplyMode;
  updated: number;
  skipped: number;
  failed: number;
  verified: boolean;
  details: Array<{
    referenceId: string;
    field: string | null;
    status: "updated" | "skipped" | "failed";
    message?: string;
  }>;
};

export type LifecycleQueueView =
  | "needs_review"
  | "deprecated"
  | "archived"
  | "retired"
  | "replacement_pending"
  | "rights_expiring"
  | "rights_expired"
  | "unknown_rights_public"
  | "unsupported_legacy";

export type LifecycleDashboardCounts = {
  active: number;
  reviewRequired: number;
  deprecated: number;
  archived: number;
  retired: number;
  replacementPending: number;
  rightsExpiring: number;
  rightsExpired: number;
  unknownRightsPublic: number;
  unused: number;
};

export type LifecycleAssetSnapshot = {
  id: string;
  title: string | null;
  altText: string | null;
  url: string;
  thumbnailUrl: string | null;
  visibility: MediaVisibility;
  lifecycleStatus: MediaLifecycleStatus;
  rightsStatus: MediaRightsStatus;
  rightsExpiresAt: Date | null;
  replacementAssetId: string | null;
  supersedesAssetId: string | null;
  lifecycleReason: string | null;
  lastLifecycleReviewAt: Date | null;
  nextLifecycleReviewAt: Date | null;
};

export const LIFECYCLE_ALLOWED_TRANSITIONS: Record<
  MediaLifecycleStatus,
  MediaLifecycleStatus[]
> = {
  ACTIVE: ["REVIEW_REQUIRED", "DEPRECATED", "ARCHIVED"],
  REVIEW_REQUIRED: ["ACTIVE", "DEPRECATED", "ARCHIVED"],
  DEPRECATED: ["ACTIVE", "ARCHIVED", "RETIRED"],
  ARCHIVED: ["ACTIVE", "RETIRED"],
  RETIRED: ["ACTIVE"],
};

export const LIFECYCLE_ACTION_FOR_STATUS: Partial<
  Record<MediaLifecycleStatus, MediaLifecycleAction>
> = {
  REVIEW_REQUIRED: "MARK_REVIEW_REQUIRED",
  ACTIVE: "RESTORE",
  DEPRECATED: "DEPRECATE",
  ARCHIVED: "ARCHIVE",
  RETIRED: "RETIRE",
};

/** Statuses blocked from new suggestions / default picker. */
export const LIFECYCLE_BLOCKED_FOR_NEW_USE: MediaLifecycleStatus[] = [
  "DEPRECATED",
  "ARCHIVED",
  "RETIRED",
];

export const MEDIA_LIFECYCLE_BULK_MAX = 100;
export const MEDIA_REPLACEMENT_CHAIN_MAX_DEPTH = 8;
