import "server-only";

import { prisma } from "@/lib/prisma";
import type { ContentPublishReadiness } from "@/features/content/content-review.types";

/**
 * Next-sprint publish guard contract — does NOT publish.
 */
export async function getContentPublishReadiness(
  blogPostId: string
): Promise<ContentPublishReadiness> {
  const post = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!post) {
    return {
      ready: false,
      blogPostId,
      sourceWritingDraftId: "",
      sourceDraftVersion: 0,
      approvedReviewSessionId: "",
      handoffRecordId: "",
      errors: ["Blog not found"],
      warnings: [],
    };
  }

  if (!["DRAFT", "REVIEW"].includes(post.status)) {
    errors.push(`Blog status ${post.status} không sẵn sàng publish từ draft workflow`);
  }
  if (!post.sourceWritingDraftId) errors.push("Thiếu source Writing Draft");
  if (!post.sourceReviewSessionId) errors.push("Thiếu approved review session");
  if (!post.sourceHandoffRecordId) errors.push("Thiếu handoff record");
  if (post.contentModifiedAfterHandoff) {
    warnings.push("Blog đã chỉnh sửa sau handoff — cần review lại trước khi publish");
  }
  if (!post.metaTitle) warnings.push("Thiếu meta title");
  if (!post.metaDescription) warnings.push("Thiếu meta description");
  if (!post.content?.trim()) errors.push("Thiếu nội dung");

  if (post.sourceHandoffRecordId) {
    const handoff = await prisma.contentHandoffRecord.findUnique({
      where: { id: post.sourceHandoffRecordId },
    });
    if (!handoff || handoff.status !== "COMPLETED") {
      errors.push("Handoff chưa COMPLETED");
    }
  }

  if (post.sourceReviewSessionId) {
    const review = await prisma.contentReviewSession.findUnique({
      where: { id: post.sourceReviewSessionId },
    });
    if (!review || review.status !== "APPROVED") {
      errors.push("Review session chưa APPROVED");
    }
  }

  return {
    ready: errors.length === 0,
    blogPostId: post.id,
    sourceWritingDraftId: post.sourceWritingDraftId ?? "",
    sourceDraftVersion: post.sourceWritingDraftVersion ?? 0,
    approvedReviewSessionId: post.sourceReviewSessionId ?? "",
    handoffRecordId: post.sourceHandoffRecordId ?? "",
    errors,
    warnings,
  };
}
