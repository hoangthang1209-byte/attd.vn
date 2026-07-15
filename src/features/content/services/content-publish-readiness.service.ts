import "server-only";

import { prisma } from "@/lib/prisma";
import {
  emptyPublishChecks,
  hashBlogPublicContent,
  validateBlogSlugShape,
  validateCanonicalUrl,
  validatePublicContentLinks,
  type ContentPublishReadiness,
} from "@/features/content/content-publish.types";

function isGoverned(post: {
  sourceWritingDraftId: string | null;
  sourceReviewSessionId: string | null;
  sourceHandoffRecordId: string | null;
}): boolean {
  return Boolean(
    post.sourceWritingDraftId && post.sourceReviewSessionId && post.sourceHandoffRecordId
  );
}

/**
 * Publish readiness V2 — does NOT publish.
 * Governed posts require handoff + approved review; manual posts use legacy Blog checks.
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

  const governed = isGoverned(post);
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

  checks.contentValid = Boolean(post.content?.trim());
  if (!checks.contentValid) errors.push("Thiếu nội dung");

  checks.seoMetadataValid = Boolean(post.metaTitle?.trim() && post.metaDescription?.trim());
  if (!post.metaTitle?.trim()) warnings.push("Thiếu meta title");
  if (!post.metaDescription?.trim()) warnings.push("Thiếu meta description");
  if (post.metaDescription && post.metaDescription.trim().length < 50) {
    warnings.push("Meta description khá ngắn");
  }

  const canonicalErr = validateCanonicalUrl(post.canonicalUrl);
  checks.canonicalValid = !canonicalErr;
  if (canonicalErr) errors.push(canonicalErr);

  const linkErrors = validatePublicContentLinks(post.content);
  checks.internalLinksValid = linkErrors.length === 0;
  errors.push(...linkErrors);

  if (!post.ogImageUrl && !post.featuredImageUrl) {
    warnings.push("Thiếu ảnh Featured/OG");
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

  // Schema: only reject obviously fabricated rating schemas in content markers
  const schemaBad =
    /"@type"\s*:\s*"(AggregateRating|Review)"/i.test(post.content ?? "") ||
    /itemtype=["'][^"']*(AggregateRating|Review)/i.test(post.content ?? "");
  checks.schemaValid = !schemaBad;
  if (schemaBad) errors.push("Schema Review/AggregateRating không được phép (tránh fake rating)");

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
        // Hash drifted without flag — treat as material
        warnings.push("Content hash khác handoff snapshot");
      }
    }

    const review = post.sourceReviewSessionId
      ? await prisma.contentReviewSession.findUnique({ where: { id: post.sourceReviewSessionId } })
      : null;
    if (!review || review.status !== "APPROVED") {
      errors.push("Review session chưa APPROVED");
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
    governed,
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
