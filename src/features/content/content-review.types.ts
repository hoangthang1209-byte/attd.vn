import { createHash } from "node:crypto";
import type {
  WritingQaIssue,
  WritingQaReport,
  WritingSectionDraft,
  WritingStructuredDraft,
  WritingSeverity,
} from "@/features/writing-engine/writing-engine.types";
import { sanitizeWritingSectionHtml } from "@/features/writing-engine/services/writing-section-sanitize.service";

export type ContentReviewStatus =
  | "NOT_STARTED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type ContentReviewSectionStatus =
  | "PENDING"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "LOCKED";

export type ContentReviewDecisionType =
  | "APPROVE_SECTION"
  | "REQUEST_CHANGES"
  | "REJECT_SECTION"
  | "APPROVE_DRAFT"
  | "REJECT_DRAFT"
  | "REOPEN_DRAFT"
  | "HANDOFF_TO_BLOG";

export type ContentReviewIssueStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export type ContentReviewReadiness = {
  readyToStart: boolean;
  readyToApprove: boolean;
  score: number;
  blockingIssues: string[];
  warnings: string[];
  sectionSummary: {
    total: number;
    approved: number;
    pending: number;
    changesRequested: number;
    rejected: number;
  };
};

export type ContentPublishReadiness = {
  ready: boolean;
  blogPostId: string;
  sourceWritingDraftId: string;
  sourceDraftVersion: number;
  approvedReviewSessionId: string;
  handoffRecordId: string;
  errors: string[];
  warnings: string[];
};

export type ContentDiffLine = {
  type: "same" | "add" | "del";
  text: string;
};

export function hashSectionContent(section: Pick<WritingSectionDraft, "html" | "plainText" | "heading">): string {
  return createHash("sha256")
    .update(JSON.stringify({ h: section.heading, p: section.plainText, html: section.html }))
    .digest("hex");
}

export function mapQaSeverity(severity: WritingSeverity): ContentReviewSeverity {
  return severity;
}

export type ContentReviewSeverity = "INFO" | "WARNING" | "ERROR" | "BLOCKING";

export function qaIssuesToReviewSeeds(qa: WritingQaReport | null | undefined): Array<{
  sectionId: string | null;
  code: string;
  severity: ContentReviewSeverity;
  message: string;
  suggestedFix: string | null;
  source: string;
  metadata: Record<string, unknown>;
}> {
  if (!qa?.issues?.length) return [];
  return qa.issues.map((issue: WritingQaIssue) => ({
    sectionId: issue.sectionId ?? null,
    code: issue.code,
    severity: mapQaSeverity(issue.severity),
    message: issue.message,
    suggestedFix: issue.suggestedFix ?? null,
    source: "DETERMINISTIC_QA",
    metadata: {
      factId: issue.factId ?? null,
      linkId: issue.linkId ?? null,
      mediaAssetId: issue.mediaAssetId ?? null,
    },
  }));
}

/** Lightweight line diff for review workspace (no heavy deps). */
export function diffPlainText(before: string, after: string): ContentDiffLine[] {
  const a = before.split(/\n/);
  const b = after.split(/\n/);
  const out: ContentDiffLine[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      if (left != null) out.push({ type: "same", text: left });
    } else {
      if (left != null) out.push({ type: "del", text: left });
      if (right != null) out.push({ type: "add", text: right });
    }
  }
  return out;
}

export function detectNumericChanges(before: string, after: string): string[] {
  const extract = (t: string) =>
    [...t.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => m[1].replace(",", "."));
  const a = new Set(extract(before));
  const b = new Set(extract(after));
  const warnings: string[] = [];
  for (const n of a) {
    if (!b.has(n)) warnings.push(`Removed numeric value: ${n}`);
  }
  for (const n of b) {
    if (!a.has(n)) warnings.push(`Added numeric value: ${n}`);
  }
  return warnings;
}

export function extractStructuredDraft(raw: unknown): WritingStructuredDraft | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as WritingStructuredDraft;
}

/** Sanitize approved HTML before Blog handoff (no publish). */
export function sanitizeBlogHandoffHtml(html: string): string {
  let out = sanitizeWritingSectionHtml(html);
  out = out.replace(/<h1[\s\S]*?<\/h1>/gi, "");
  return out.trim();
}

export type BlogHandoffFieldOptions = {
  title?: boolean;
  content?: boolean;
  seoMetadata?: boolean;
  faq?: boolean;
  mediaAssignments?: boolean;
  mediaBundle?: boolean;
};

export function buildBlogHandoffSnapshotHash(input: {
  writingDraftId: string;
  writingDraftVersion: number;
  reviewSessionId: string;
  mode: string;
  targetBlogPostId?: string | null;
  fields: BlogHandoffFieldOptions;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
