/**
 * Pure publish-readiness policy helpers (unit-testable, no DB).
 */

export type ReviewGateStatus = "IN_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | string;

export type ReviewGateResult = {
  ok: boolean;
  error?: string;
};

export function evaluateReviewPublishGate(status: ReviewGateStatus | null | undefined): ReviewGateResult {
  if (!status) {
    return { ok: false, error: "Blog thiếu Review session hợp lệ" };
  }
  if (status === "REJECTED") {
    return { ok: false, error: "Review session REJECTED — không thể xuất bản" };
  }
  if (status !== "APPROVED") {
    return { ok: false, error: "Review session chưa APPROVED" };
  }
  return { ok: true };
}

export function isHumanKnowledgeApprover(approvedBy: string | null | undefined): boolean {
  if (!approvedBy?.trim()) return false;
  const v = approvedBy.trim().toLowerCase();
  if (v.includes("content-ops") || v.includes("sprint") || v.includes("script") || v.includes("bot")) {
    return false;
  }
  return true;
}

export function classifyAutomatedKnowledgePromotion(input: {
  approvedBy: string | null | undefined;
  evidenceUrl?: string | null;
  text?: string | null;
}): "SAFE" | "NEEDS_HUMAN_CONFIRMATION" | "REVERT_REQUIRED" {
  if (!isHumanKnowledgeApprover(input.approvedBy)) {
    return "REVERT_REQUIRED";
  }
  if (!input.evidenceUrl?.trim()) return "NEEDS_HUMAN_CONFIRMATION";
  const text = input.text ?? "";
  if (/\b\d+\s*gsm\b/i.test(text) || /\bMOQ\b/i.test(text) || /\b24\s*h\b/i.test(text)) {
    return "NEEDS_HUMAN_CONFIRMATION";
  }
  return "SAFE";
}

export function missingCanonicalBlocks(canonical: string | null | undefined): boolean {
  return !canonical?.trim();
}

export function missingSeoMetadataBlocks(metaTitle: string | null | undefined, metaDescription: string | null | undefined): boolean {
  return !metaTitle?.trim() || !metaDescription?.trim();
}

export function blockingQaBlocks(
  issues: Array<{ severity?: string }> | null | undefined
): boolean {
  return (issues ?? []).some((i) => i.severity === "BLOCKING" || i.severity === "ERROR");
}

export function warningOnlyQaDoesNotBlock(
  issues: Array<{ severity?: string }> | null | undefined
): boolean {
  const list = issues ?? [];
  if (list.length === 0) return true;
  return list.every((i) => i.severity === "WARNING" || i.severity === "INFO");
}

export function duplicateSlugBlocks(currentId: string, otherIdWithSameSlug: string | null): boolean {
  return Boolean(otherIdWithSameSlug && otherIdWithSameSlug !== currentId);
}

export type FeaturedPublishMediaInput = {
  featuredAssigned: boolean;
  featuredVisibility?: string | null;
  featuredAlt?: string | null;
  legacyFeaturedUrl?: string | null;
};

export function evaluateFeaturedPublishBlockers(input: FeaturedPublishMediaInput): string[] {
  const errors: string[] = [];
  const hasFeatured = input.featuredAssigned || Boolean(input.legacyFeaturedUrl?.trim());
  if (!hasFeatured) {
    errors.push("Thiếu ảnh Featured bắt buộc.");
    return errors;
  }
  if (input.featuredAssigned) {
    if (input.featuredVisibility !== "PUBLIC") {
      errors.push("Ảnh Featured phải PUBLIC.");
    }
    if (!input.featuredAlt?.trim()) {
      errors.push("Ảnh Featured thiếu alt text bắt buộc.");
    }
  }
  return errors;
}
