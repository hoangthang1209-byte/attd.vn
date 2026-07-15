import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { revalidateBlogPaths } from "@/features/blog/revalidate";
import { assignContentMedia } from "@/features/content/services/content-media-assignment.service";
import { parseDraftJson, parsePlanJson } from "@/features/writing-engine/services/writing-engine.wiring";
import { renderDraftOutputs } from "@/features/writing-engine/services/writing-engine.wiring";
import { ContentReviewError } from "@/features/content/services/content-review.service";
import {
  buildBlogHandoffSnapshotHash,
  sanitizeBlogHandoffHtml,
  type BlogHandoffFieldOptions,
} from "@/features/content/content-review.types";
import { hashBlogPublicContent } from "@/features/content/content-publish.types";

export type BlogHandoffMode = "CREATE_NEW" | "UPDATE_EXISTING";
export type { BlogHandoffFieldOptions };
export { buildBlogHandoffSnapshotHash, sanitizeBlogHandoffHtml };

const DEFAULT_FIELDS: Required<BlogHandoffFieldOptions> = {
  title: true,
  content: true,
  seoMetadata: true,
  faq: true,
  mediaAssignments: true,
  mediaBundle: true,
};

function sanitizeBlogContent(html: string): string {
  return sanitizeBlogHandoffHtml(html);
}

export async function handoffApprovedWritingDraftToBlog(input: {
  writingDraftId: string;
  draftVersion: number;
  mode: BlogHandoffMode;
  targetBlogPostId?: string | null;
  fields?: BlogHandoffFieldOptions;
  requestedBy: string;
  confirmUpdate?: boolean;
}) {
  const fields = { ...DEFAULT_FIELDS, ...input.fields };

  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: input.writingDraftId },
  });
  if (!draft) throw new ContentReviewError("Draft not found", "DRAFT_NOT_FOUND", 404);
  if (draft.status !== "APPROVED") {
    throw new ContentReviewError("Draft chưa APPROVED", "DRAFT_NOT_APPROVED", 422);
  }
  if (draft.version !== input.draftVersion) {
    throw new ContentReviewError("Draft version không khớp", "VERSION_MISMATCH", 409);
  }

  const review = await prisma.contentReviewSession.findFirst({
    where: {
      writingDraftId: draft.id,
      writingDraftVersion: draft.version,
      status: "APPROVED",
    },
    orderBy: { approvedAt: "desc" },
  });
  if (!review) {
    throw new ContentReviewError("Không có review session APPROVED", "REVIEW_NOT_APPROVED", 422);
  }

  const plan = await prisma.writingPlanRecord.findUnique({ where: { id: draft.writingPlanId } });
  if (!plan) throw new ContentReviewError("Plan not found", "PLAN_NOT_FOUND", 404);
  if (plan.status === "SUPERSEDED") {
    throw new ContentReviewError("Writing Plan superseded", "PLAN_SUPERSEDED", 409);
  }

  const context = await prisma.contentContextBuild.findUnique({
    where: { id: plan.contextBuildId },
  });
  if (!context || context.status === "SUPERSEDED") {
    throw new ContentReviewError("Context Build invalid/superseded", "CONTEXT_INVALID", 409);
  }

  const snapshotHash = buildBlogHandoffSnapshotHash({
    writingDraftId: draft.id,
    writingDraftVersion: draft.version,
    reviewSessionId: review.id,
    mode: input.mode,
    targetBlogPostId: input.targetBlogPostId ?? null,
    fields,
  });

  const existingCompleted = await prisma.contentHandoffRecord.findFirst({
    where: { sourceSnapshotHash: snapshotHash, status: "COMPLETED" },
  });
  if (existingCompleted?.targetEntityId) {
    return {
      handoff: existingCompleted,
      blogPostId: existingCompleted.targetEntityId,
      adminRoute: `/admin/blog/${existingCompleted.targetEntityId}`,
      cacheHint: true,
      message: "Idempotent — trả về handoff đã hoàn tất.",
    };
  }

  const structured = parseDraftJson(draft as never);
  const planJson = parsePlanJson(plan as never);
  const rendered = draft.renderedHtml
    ? { html: draft.renderedHtml, markdown: draft.renderedMarkdown, plainText: null }
    : renderDraftOutputs(structured);
  const contentHtml = sanitizeBlogContent(rendered.html ?? "");

  const topic = await prisma.seoTopic.findUnique({
    where: { id: plan.topicId },
    include: { keywords: true },
  });
  if (!topic) throw new ContentReviewError("SEO Topic not found", "TOPIC_NOT_FOUND", 404);

  let handoff = await prisma.contentHandoffRecord.create({
    data: {
      writingDraftId: draft.id,
      writingDraftVersion: draft.version,
      reviewSessionId: review.id,
      targetType: "BLOG_POST",
      mode: input.mode,
      status: "PENDING",
      fieldMapping: fields as Prisma.InputJsonValue,
      sourceSnapshotHash: snapshotHash,
      requestedBy: input.requestedBy,
    },
  });

  try {
    let blogId: string;

    if (input.mode === "UPDATE_EXISTING") {
      if (!input.targetBlogPostId) {
        throw new ContentReviewError("targetBlogPostId bắt buộc", "TARGET_REQUIRED", 400);
      }
      if (!input.confirmUpdate) {
        throw new ContentReviewError(
          "Cần confirmUpdate=true để cập nhật Blog hiện có",
          "CONFIRM_REQUIRED",
          400
        );
      }
      const target = await prisma.blogPost.findUnique({
        where: { id: input.targetBlogPostId },
      });
      if (!target) throw new ContentReviewError("Blog not found", "BLOG_NOT_FOUND", 404);
      if (target.status === "PUBLISHED") {
        throw new ContentReviewError(
          "Không ghi đè Blog PUBLISHED. Tạo draft mới hoặc chỉnh qua luồng xuất bản.",
          "PUBLISHED_PROTECTED",
          409
        );
      }

      const updateData: Prisma.BlogPostUpdateInput = {
        contentModifiedAfterHandoff: false,
        lastHandoffAt: new Date(),
        sourceWritingDraftId: draft.id,
        sourceWritingDraftVersion: draft.version,
        sourceReviewSessionId: review.id,
        sourceHandoffRecordId: handoff.id,
      };
      if (fields.title) updateData.title = structured.title || target.title;
      if (fields.content) updateData.content = contentHtml;
      if (fields.seoMetadata) {
        updateData.metaTitle = structured.metaTitle ?? target.metaTitle;
        updateData.metaDescription = structured.metaDescription ?? target.metaDescription;
      }
      if (fields.faq) {
        updateData.faqJson = structured.faq.map((f) => ({
          question: f.question,
          answer: f.answerHtml,
        })) as Prisma.InputJsonValue;
      }
      if (fields.mediaBundle && topic.mediaBundleId) {
        updateData.mediaBundle = { connect: { id: topic.mediaBundleId } };
      }

      await prisma.blogPost.update({ where: { id: target.id }, data: updateData });
      blogId = target.id;
    } else {
      // CREATE_NEW — reuse existing topic target if still DRAFT, else create
      if (topic.targetEntityType === "BLOG_POST" && topic.targetEntityId) {
        const linked = await prisma.blogPost.findUnique({
          where: { id: topic.targetEntityId },
        });
        if (linked && linked.status === "PUBLISHED") {
          throw new ContentReviewError(
            "Topic đã liên kết Blog PUBLISHED — dùng UPDATE_EXISTING không được. Chọn tạo slug mới thủ công hoặc unpublish.",
            "PUBLISHED_LINKED",
            409
          );
        }
        if (linked && linked.status !== "PUBLISHED") {
          // Avoid leaving a dangling PENDING row when delegating to UPDATE_EXISTING.
          await prisma.contentHandoffRecord.update({
            where: { id: handoff.id },
            data: {
              status: "SUPERSEDED",
              errorMessage: "Delegated to UPDATE_EXISTING for topic-linked Blog draft",
              completedAt: new Date(),
            },
          });
          return handoffApprovedWritingDraftToBlog({
            ...input,
            mode: "UPDATE_EXISTING",
            targetBlogPostId: linked.id,
            confirmUpdate: true,
          });
        }
      }

      const title = structured.title || topic.title;
      let slug = (structured.slug || topic.slug || toSlug(title)).trim();
      if (!slug) throw new ContentReviewError("Không tạo được slug", "SLUG_INVALID", 400);

      const slugTaken = await prisma.blogPost.findUnique({ where: { slug } });
      if (slugTaken) {
        slug = `${slug}-${draft.version}`.slice(0, 80);
        const again = await prisma.blogPost.findUnique({ where: { slug } });
        if (again) throw new ContentReviewError(`Slug "${slug}" đã tồn tại`, "SLUG_TAKEN", 409);
      }

      const tags = topic.keywords
        .filter((k) => k.keywordType !== "NEGATIVE")
        .slice(0, 12)
        .map((k) => k.keyword);

      const post = await prisma.$transaction(async (tx) => {
        const created = await tx.blogPost.create({
          data: {
            title: fields.title ? title : topic.title,
            slug,
            excerpt: planJson.titlePlan?.h1?.slice(0, 300) ?? null,
            content: fields.content ? contentHtml : null,
            metaTitle: fields.seoMetadata ? structured.metaTitle ?? null : null,
            metaDescription: fields.seoMetadata ? structured.metaDescription ?? null : null,
            status: "DRAFT",
            faqJson: fields.faq
              ? (structured.faq.map((f) => ({
                  question: f.question,
                  answer: f.answerHtml,
                })) as Prisma.InputJsonValue)
              : [],
            tags,
            mediaBundleId: fields.mediaBundle ? topic.mediaBundleId : null,
            sourceWritingDraftId: draft.id,
            sourceWritingDraftVersion: draft.version,
            sourceReviewSessionId: review.id,
            sourceHandoffRecordId: handoff.id,
            contentModifiedAfterHandoff: false,
            lastHandoffAt: new Date(),
          },
        });

        await tx.seoTopic.update({
          where: { id: topic.id },
          data: {
            targetEntityType: "BLOG_POST",
            targetEntityId: created.id,
            targetUrl: `/blog/${created.slug}`,
            status:
              topic.status === "IDEA" || topic.status === "APPROVED" || topic.status === "BRIEF_READY"
                ? "DRAFTING"
                : topic.status,
          },
        });

        return created;
      });

      blogId = post.id;
    }

    if (fields.mediaAssignments) {
      for (const placement of structured.media) {
        const map: Record<string, "FEATURED" | "OG_IMAGE" | "COVER" | "INLINE"> = {
          FEATURED: "FEATURED",
          OG_IMAGE: "OG_IMAGE",
          COVER: "COVER",
          INLINE_BEFORE: "INLINE",
          INLINE_AFTER: "INLINE",
          GALLERY: "INLINE",
          BACKGROUND: "INLINE",
        };
        const blogPlacement = map[placement.placement] ?? "INLINE";
        try {
          await assignContentMedia({
            entityType: "BLOG_POST",
            entityId: blogId,
            mediaAssetId: placement.mediaAssetId,
            placement: blogPlacement,
            sortOrder: placement.sortOrder,
            altTextOverride: placement.altText,
            captionOverride: placement.caption ?? null,
            replaceExisting: blogPlacement === "FEATURED" || blogPlacement === "OG_IMAGE",
          });
        } catch {
          // Skip invalid/private assets without failing whole handoff
        }
      }
    }

    const blogAfter = await prisma.blogPost.findUnique({ where: { id: blogId } });
    const contentHash = blogAfter
      ? hashBlogPublicContent({
          title: blogAfter.title,
          slug: blogAfter.slug,
          excerpt: blogAfter.excerpt,
          content: blogAfter.content,
          metaTitle: blogAfter.metaTitle,
          metaDescription: blogAfter.metaDescription,
          faqJson: blogAfter.faqJson,
          featuredImageUrl: blogAfter.featuredImageUrl,
          ogImageUrl: blogAfter.ogImageUrl,
          canonicalUrl: blogAfter.canonicalUrl,
          tags: blogAfter.tags,
        })
      : null;

    handoff = await prisma.contentHandoffRecord.update({
      where: { id: handoff.id },
      data: {
        status: "COMPLETED",
        targetEntityId: blogId,
        completedAt: new Date(),
        resultSnapshot: {
          blogPostId: blogId,
          status: "DRAFT",
          title: structured.title,
          slug: structured.slug,
          contentHash,
        } as Prisma.InputJsonValue,
      },
    });

    await prisma.blogPost.update({
      where: { id: blogId },
      data: {
        sourceHandoffRecordId: handoff.id,
        contentModifiedAfterHandoff: false,
        publishReadinessAcknowledgedAt: null,
        publishReadinessAcknowledgedBy: null,
        publishAckNote: null,
        needsContentReview: false,
      },
    });

    await prisma.contentReviewDecision.create({
      data: {
        reviewSessionId: review.id,
        decisionType: "HANDOFF_TO_BLOG",
        actorId: input.requestedBy,
        note: `Blog ${blogId}`,
        metadata: { handoffId: handoff.id, mode: input.mode },
      },
    });

    const blog = await prisma.blogPost.findUnique({ where: { id: blogId } });
    if (blog) revalidateBlogPaths(blog.slug);

    return {
      handoff,
      blogPostId: blogId,
      adminRoute: `/admin/blog/${blogId}`,
      cacheHint: false,
      message: "Đã handoff sang Blog DRAFT — không publish.",
    };
  } catch (err) {
    await prisma.contentHandoffRecord.update({
      where: { id: handoff.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Handoff failed",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function getContentHandoff(handoffId: string) {
  const row = await prisma.contentHandoffRecord.findUnique({ where: { id: handoffId } });
  if (!row) throw new ContentReviewError("Handoff not found", "HANDOFF_NOT_FOUND", 404);
  return row;
}

export async function markBlogModifiedAfterHandoff(blogPostId: string) {
  const post = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
  if (!post?.sourceHandoffRecordId) return;
  await prisma.blogPost.update({
    where: { id: blogPostId },
    data: {
      contentModifiedAfterHandoff: true,
      publishReadinessAcknowledgedAt: null,
      publishReadinessAcknowledgedBy: null,
      publishAckNote: null,
    },
  });
}
