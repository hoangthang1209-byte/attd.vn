import "server-only";

import { prisma } from "@/lib/prisma";
import { buildContentQualityWarnings } from "@/features/blog/blog-readiness";
import type { BlogFaqItem } from "@/features/blog/types";
import {
  emptyPublishChecks,
  hashBlogPublicContent,
  validateBlogSlugShape,
  validateCanonicalUrl,
  validatePublicContentLinks,
  type ContentPublishReadiness,
} from "@/features/content/content-publish.types";
import {
  blockingQaBlocks,
  evaluateReviewPublishGate,
  missingCanonicalBlocks,
  missingSeoMetadataBlocks,
} from "@/features/content/content-publish-readiness.policy";

function hasFullGovernedHandoff(post: {
  sourceWritingDraftId: string | null;
  sourceReviewSessionId: string | null;
  sourceHandoffRecordId: string | null;
}): boolean {
  return Boolean(
    post.sourceWritingDraftId && post.sourceReviewSessionId && post.sourceHandoffRecordId
  );
}

function hasPipelineReviewLink(post: {
  sourceReviewSessionId: string | null;
}): boolean {
  return Boolean(post.sourceReviewSessionId);
}

/**
 * Publish readiness V2 — does NOT publish.
 *
 * Paths:
 * - Full governed handoff (draft + review + handoff triad): enforce handoff COMPLETED + Review APPROVED + draft APPROVED.
 * - Pipeline-linked Review (sourceReviewSessionId set, no handoff): enforce Review APPROVED; warn if Brief unapproved.
 * - Manual Blog (no review link): legacy Blog field checks only.
 *
 * Mandatory blockers (all paths): title, slug, body, meta title/description, canonical,
 * featured PUBLIC+alt, blocking QA (when draft linked), duplicate slug, unsafe/public-route issues.
 */
export async function getContentPublishReadiness(
  blogPostId: string,
  options?: { forScheduleExecution?: boolean }
): Promise<ContentPublishReadiness> {
  const post = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks = emptyPublishChecks();

  if (!post) {
    return {
      ready: false,
      blogPostId,
      governed: false,
      contentHash: "",
      materiallyChangedAfterHandoff: false,
      checks,
      errors: ["Blog not found"],
      warnings: [],
    };
  }

  const governed = hasFullGovernedHandoff(post);
  const pipelineReview = hasPipelineReviewLink(post);
  const contentHash = hashBlogPublicContent({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    faqJson: post.faqJson,
    featuredImageUrl: post.featuredImageUrl,
    ogImageUrl: post.ogImageUrl,
    canonicalUrl: post.canonicalUrl,
    tags: post.tags,
  });

  const statusOk = options?.forScheduleExecution
    ? post.status === "SCHEDULED"
    : ["DRAFT", "REVIEW", "SCHEDULED"].includes(post.status);
  checks.statusEligible = statusOk;
  if (!statusOk) {
    errors.push(`Trạng thái ${post.status} không đủ điều kiện xuất bản`);
  }

  checks.titleValid = Boolean(post.title?.trim());
  if (!checks.titleValid) errors.push("Thiếu tiêu đề");

  const slugErr = validateBlogSlugShape(post.slug);
  checks.slugValid = !slugErr;
  if (slugErr) errors.push(slugErr);

  if (post.slug?.trim()) {
    const dup = await prisma.blogPost.findFirst({
      where: {
        slug: post.slug.trim(),
        NOT: { id: post.id },
      },
      select: { id: true },
    });
    if (dup) {
      checks.slugValid = false;
      errors.push("Slug Blog bị trùng");
    }
  }

  checks.contentValid = Boolean(post.content?.trim());
  if (!checks.contentValid) errors.push("Thiếu nội dung");

  checks.seoMetadataValid = !missingSeoMetadataBlocks(post.metaTitle, post.metaDescription);
  if (!post.metaTitle?.trim()) errors.push("Thiếu meta title");
  if (!post.metaDescription?.trim()) errors.push("Thiếu meta description");
  if (post.metaDescription && post.metaDescription.trim().length < 50) {
    warnings.push("Meta description khá ngắn");
  }

  if (missingCanonicalBlocks(post.canonicalUrl)) {
    checks.canonicalValid = false;
    errors.push("Thiếu canonical");
  } else {
    const canonicalErr = validateCanonicalUrl(post.canonicalUrl);
    checks.canonicalValid = !canonicalErr;
    if (canonicalErr) errors.push(canonicalErr);
  }

  const linkErrors = validatePublicContentLinks(post.content);
  checks.internalLinksValid = linkErrors.length === 0;
  errors.push(...linkErrors);

  // Content-quality signals come from the same evaluator the editor renders,
  // so the API and the workspace never disagree on a number.
  warnings.push(
    ...buildContentQualityWarnings({
      content: post.content ?? "",
      faqJson: Array.isArray(post.faqJson) ? (post.faqJson as BlogFaqItem[]) : [],
      tags: Array.isArray(post.tags) ? (post.tags as string[]) : [],
    })
  );

  if (!post.ogImageUrl && !post.featuredImageUrl) {
    // Featured is enforced as blocker via media readiness; OG remains a warning when featured exists.
    warnings.push("Thiếu ảnh OG (sẽ fallback Featured nếu có)");
  } else if (!post.ogImageUrl) {
    warnings.push("Thiếu ảnh OG (sẽ fallback Featured nếu có)");
  }

  let faqOk = true;
  try {
    const faq = Array.isArray(post.faqJson) ? post.faqJson : [];
    for (const item of faq as Array<{ question?: string; answer?: string }>) {
      if (!item?.question?.trim() || !String(item?.answer ?? "").trim()) {
        faqOk = false;
        break;
      }
    }
    if (faq.length === 0) warnings.push("Chưa có FAQ");
  } catch {
    faqOk = false;
  }
  checks.faqValid = faqOk;
  if (!faqOk) errors.push("FAQ không hợp lệ");

  const schemaBad =
    /"@type"\s*:\s*"(AggregateRating|Review)"/i.test(post.content ?? "") ||
    /itemtype=["'][^"']*(AggregateRating|Review)/i.test(post.content ?? "");
  checks.schemaValid = !schemaBad;
  if (schemaBad) errors.push("Schema Review/AggregateRating không được phép (tránh fake rating)");

  // Unsafe commercial claims that should not ship without human review
  const unsafeClaim =
    /\bMOQ\s*[:=]?\s*\d+/i.test(post.content ?? "") ||
    /giá\s*(chỉ\s*)?từ\s*[\d.,]+\s*(đ|vnd|k)/i.test(post.content ?? "") ||
    /giao\s*trong\s*\d+\s*(ngày|giờ)/i.test(post.content ?? "");
  if (unsafeClaim) {
    errors.push("Phát hiện claim nhạy cảm (MOQ/giá/lead-time) — cần human confirm trước khi publish");
  }

  checks.publicVisibilityValid = true;
  checks.mediaValid = true;
  try {
    const { assertBlogPublishMediaReady } = await import(
      "@/features/content/services/content-media-assignment.service"
    );
    await assertBlogPublishMediaReady(post.id);
  } catch (err) {
    checks.mediaValid = false;
    checks.publicVisibilityValid = false;
    errors.push(err instanceof Error ? err.message : "Media chưa sẵn sàng xuất bản");
  }

  let sourceSnapshotHash: string | null = null;
  const materiallyChanged = Boolean(post.contentModifiedAfterHandoff);
  const acknowledged = Boolean(post.publishReadinessAcknowledgedAt);

  // Brief policy: launch workflow treats Brief approval as required before Context,
  // but Blog publish historically does not hard-block on Brief. Keep as explicit warning.
  const linkedTopic = await prisma.seoTopic.findFirst({
    where: { targetEntityType: "BLOG_POST", targetEntityId: post.id },
    select: { id: true },
  });
  if (linkedTopic) {
    const brief = await prisma.seoContentBrief.findUnique({
      where: { topicId: linkedTopic.id },
      select: { approvedAt: true, approvedBy: true },
    });
    if (brief && !brief.approvedAt) {
      warnings.push("Brief chưa được human approve (không chặn publish theo policy hiện tại)");
    }
  }

  // Blocking QA from linked writing draft (warning-only QA does not block)
  if (post.sourceWritingDraftId) {
    const draft = await prisma.writingDraftRecord.findUnique({
      where: { id: post.sourceWritingDraftId },
      select: { qaReport: true },
    });
    const qa = draft?.qaReport as { issues?: Array<{ severity?: string; message?: string }> } | null;
    if (blockingQaBlocks(qa?.issues)) {
      const first = (qa?.issues ?? []).find(
        (i) => i.severity === "BLOCKING" || i.severity === "ERROR"
      );
      errors.push(`QA blocking: ${first?.message ?? "có lỗi QA"}`);
    }
  }

  if (governed) {
    checks.sourceApproved = false;
    checks.handoffCompleted = false;
    checks.draftVersionMatches = false;
    checks.reviewStillValid = false;

    const handoff = post.sourceHandoffRecordId
      ? await prisma.contentHandoffRecord.findUnique({ where: { id: post.sourceHandoffRecordId } })
      : null;
    if (!handoff || handoff.status !== "COMPLETED") {
      errors.push("Handoff chưa COMPLETED");
    } else {
      checks.handoffCompleted = true;
      sourceSnapshotHash = handoff.sourceSnapshotHash;
      const snap = handoff.resultSnapshot as { contentHash?: string } | null;
      if (snap?.contentHash && snap.contentHash !== contentHash && !materiallyChanged) {
        warnings.push("Content hash khác handoff snapshot");
      }
    }

    const review = post.sourceReviewSessionId
      ? await prisma.contentReviewSession.findUnique({ where: { id: post.sourceReviewSessionId } })
      : null;
    const gate = evaluateReviewPublishGate(review?.status);
    if (!gate.ok) {
      errors.push(gate.error!);
    } else {
      checks.sourceApproved = true;
      checks.reviewStillValid = true;
    }

    const draft = post.sourceWritingDraftId
      ? await prisma.writingDraftRecord.findUnique({ where: { id: post.sourceWritingDraftId } })
      : null;
    if (!draft || draft.status !== "APPROVED") {
      errors.push("Writing Draft nguồn chưa APPROVED");
      checks.sourceApproved = false;
    } else if (
      post.sourceWritingDraftVersion != null &&
      draft.version !== post.sourceWritingDraftVersion
    ) {
      errors.push("Draft version không khớp nguồn đã handoff");
    } else {
      checks.draftVersionMatches = true;
    }

    if (post.needsContentReview) {
      errors.push("Blog đang chờ kiểm duyệt lại (Gửi lại kiểm duyệt)");
    }

    if (materiallyChanged && !acknowledged) {
      errors.push("Nội dung đã chỉnh sau handoff — cần xác nhận biên tập trước khi publish");
      checks.contentAcknowledged = false;
    } else {
      checks.contentAcknowledged = true;
      if (materiallyChanged && acknowledged) {
        warnings.push("Thay đổi biên tập đã được xác nhận");
      }
    }
  } else if (pipelineReview) {
    // Content pipeline Blog linked to a Review without full handoff triad.
    checks.handoffCompleted = true; // handoff not required on this path
    checks.draftVersionMatches = true;
    checks.contentAcknowledged = true;
    checks.sourceApproved = false;
    checks.reviewStillValid = false;

    const review = await prisma.contentReviewSession.findUnique({
      where: { id: post.sourceReviewSessionId! },
    });
    const gate = evaluateReviewPublishGate(review?.status);
    if (!gate.ok) {
      errors.push(gate.error!);
    } else {
      checks.sourceApproved = true;
      checks.reviewStillValid = true;
    }
  } else {
    // Manual Blog — no writing traceability required
    checks.sourceApproved = true;
    checks.handoffCompleted = true;
    checks.draftVersionMatches = true;
    checks.reviewStillValid = true;
    checks.contentAcknowledged = true;
  }

  const ready = errors.length === 0;

  return {
    ready,
    blogPostId: post.id,
    governed: governed || pipelineReview,
    sourceWritingDraftId: post.sourceWritingDraftId,
    sourceDraftVersion: post.sourceWritingDraftVersion,
    approvedReviewSessionId: post.sourceReviewSessionId,
    handoffRecordId: post.sourceHandoffRecordId,
    contentHash,
    sourceSnapshotHash,
    materiallyChangedAfterHandoff: materiallyChanged,
    checks,
    errors,
    warnings,
  };
}
