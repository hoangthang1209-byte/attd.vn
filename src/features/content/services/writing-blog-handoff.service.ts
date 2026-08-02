import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { normalizeBlogContent } from "@/features/blog/content-normalizer";
import { revalidateBlogPaths } from "@/features/blog/revalidate";
import { assignContentMedia } from "@/features/content/services/content-media-assignment.service";
import { parseDraftJson, parsePlanJson } from "@/features/writing-engine/services/writing-engine.wiring";
import { renderDraftOutputs } from "@/features/writing-engine/services/writing-engine.wiring";
import { ContentReviewError } from "@/features/content/services/content-review.service";
import { getContentPublishReadiness } from "@/features/content/services/content-publish-readiness.service";
import {
  buildHandoffFailure,
  buildHandoffPlan,
  classifyHandoffField,
  faqAnswerToPlainText,
  hasManualEditRisk,
  resolveBlogHandoffTarget,
  resolveReviewHandoffView,
  type BlogHandoffCandidate,
  type HandoffFieldName,
  type HandoffFieldPlan,
  type HandoffStage,
} from "@/features/content/editorial/blog-handoff.policy";
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

type FaqEntry = { question: string; answer: string };

/**
 * Handoff is the only writer of governed Blog content, so it is the choke
 * point that guarantees the Blog never stores markdown: sanitize the approved
 * draft HTML, then convert any markdown island the model left behind.
 */
function sanitizeBlogContent(html: string): string {
  return normalizeBlogContent(sanitizeBlogHandoffHtml(html));
}

function serializeFaq(entries: FaqEntry[]): string {
  return entries.map((e) => `${e.question.trim()}|${e.answer.trim()}`).join("||");
}

function readBlogFaq(value: unknown): FaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const question = typeof row.question === "string" ? row.question : "";
    const answer = typeof row.answer === "string" ? row.answer : "";
    return question || answer ? [{ question, answer }] : [];
  });
}

function logHandoffEvent(entry: Record<string, unknown>): void {
  const line = JSON.stringify({ op: "content.handoff.blog", ...entry });
  if (entry.ok) console.info(line);
  else console.error(line);
}

/**
 * Every Blog reachable from this article, strongest editorial link first.
 * Slug is included last so a same-slug Blog is reused rather than colliding,
 * but editorial linkage always decides first.
 */
async function findBlogCandidates(input: {
  explicitTargetId?: string | null;
  topicTargetId?: string | null;
  reviewId: string;
  draftId: string;
  slug: string | null;
}): Promise<BlogHandoffCandidate[]> {
  const select = { id: true, slug: true, status: true } as const;
  const candidates: BlogHandoffCandidate[] = [];
  const push = (
    row: { id: string; slug: string; status: string } | null,
    matchedBy: BlogHandoffCandidate["matchedBy"]
  ) => {
    if (!row) return;
    candidates.push({ blogPostId: row.id, slug: row.slug, status: row.status, matchedBy });
  };

  if (input.explicitTargetId) {
    push(await prisma.blogPost.findUnique({ where: { id: input.explicitTargetId }, select }), "EXPLICIT_TARGET");
    // An explicit governed target wins outright — no need to widen the search.
    if (candidates.length > 0) return candidates;
  }
  if (input.topicTargetId) {
    push(await prisma.blogPost.findUnique({ where: { id: input.topicTargetId }, select }), "TOPIC_LINK");
  }
  for (const row of await prisma.blogPost.findMany({
    where: { sourceReviewSessionId: input.reviewId },
    select,
  })) {
    push(row, "REVIEW_LINK");
  }
  for (const row of await prisma.blogPost.findMany({
    where: { sourceWritingDraftId: input.draftId },
    select,
  })) {
    push(row, "DRAFT_LINK");
  }
  if (input.slug) {
    push(await prisma.blogPost.findUnique({ where: { slug: input.slug }, select }), "SLUG");
  }
  return candidates;
}

/**
 * Governed entry point: hand an APPROVED Review over to its Blog.
 *
 * Reuses the Blog already tied to this article, relinks it to the approved
 * Review, synchronizes only the fields that carry no human edits, and never
 * publishes. A second Blog for the same editorial object is impossible: the
 * resolver either reuses one or blocks on a conflict.
 */
export async function handoffApprovedReviewToBlog(input: {
  reviewId: string;
  actorId: string;
  fields?: BlogHandoffFieldOptions;
  overwriteFields?: HandoffFieldName[];
  requireCleanSync?: boolean;
}) {
  const review = await prisma.contentReviewSession.findUnique({ where: { id: input.reviewId } });
  if (!review) throw new ContentReviewError("Review not found", "REVIEW_NOT_FOUND", 404);
  if (review.status !== "APPROVED") {
    throw new ContentReviewError(
      `Phiên kiểm duyệt đang ở trạng thái ${review.status} — chỉ bàn giao được sau khi phê duyệt.`,
      "REVIEW_NOT_APPROVED",
      422
    );
  }

  const pendingSections = await prisma.contentReviewSection.count({
    where: { reviewSessionId: review.id, status: { not: "APPROVED" } },
  });
  if (pendingSections > 0) {
    throw new ContentReviewError(
      `${pendingSections} đoạn không còn ở trạng thái APPROVED — kiểm tra lại phiên kiểm duyệt.`,
      "SECTION_APPROVALS_LOST",
      409
    );
  }

  return handoffApprovedWritingDraftToBlog({
    writingDraftId: review.writingDraftId,
    draftVersion: review.writingDraftVersion,
    mode: "CREATE_NEW",
    fields: input.fields,
    overwriteFields: input.overwriteFields,
    requireCleanSync: input.requireCleanSync,
    requestedBy: input.actorId,
  });
}

export async function handoffApprovedWritingDraftToBlog(input: {
  writingDraftId: string;
  draftVersion: number;
  mode: BlogHandoffMode;
  targetBlogPostId?: string | null;
  fields?: BlogHandoffFieldOptions;
  overwriteFields?: HandoffFieldName[];
  requireCleanSync?: boolean;
  requestedBy: string;
  confirmUpdate?: boolean;
}) {
  const fields = { ...DEFAULT_FIELDS, ...input.fields };
  const startedAt = Date.now();
  const diagnosticId = randomUUID().slice(0, 8);
  let stage: HandoffStage = "load_review";

  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: input.writingDraftId },
  });
  if (!draft) throw new ContentReviewError("Draft not found", "DRAFT_NOT_FOUND", 404);
  if (draft.status !== "APPROVED") {
    throw new ContentReviewError("Draft chưa APPROVED", "DRAFT_NOT_APPROVED", 422);
  }
  if (draft.version !== input.draftVersion) {
    throw new ContentReviewError(
      `Draft đang ở v${draft.version}, yêu cầu bàn giao v${input.draftVersion}.`,
      "DRAFT_VERSION_INVALID",
      409
    );
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

  stage = "policy";
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

  // ---- Resolve the target Blog before anything is written -------------------
  stage = "resolve_target";
  const intendedSlug = (structured.slug || topic.slug || toSlug(structured.title || topic.title)).trim();
  const explicitTargetId =
    input.mode === "UPDATE_EXISTING" ? input.targetBlogPostId ?? null : input.targetBlogPostId ?? null;

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
  }

  const candidates = await findBlogCandidates({
    explicitTargetId,
    topicTargetId: topic.targetEntityType === "BLOG_POST" ? topic.targetEntityId : null,
    reviewId: review.id,
    draftId: draft.id,
    slug: intendedSlug || null,
  });
  const target = resolveBlogHandoffTarget({ candidates });

  if (target.decision === "CONFLICT") {
    throw new ContentReviewError(
      `Có ${target.conflictIds.length} Blog cùng thuộc bài viết này — cần người chọn Blog đích trước khi bàn giao.`,
      "BLOG_CONFLICT",
      409,
      {
        ok: false,
        conflictIds: target.conflictIds,
        candidates: target.candidates,
      }
    );
  }
  if (input.mode === "UPDATE_EXISTING" && target.decision !== "REUSE") {
    throw new ContentReviewError("Blog not found", "BLOG_NOT_FOUND", 404);
  }

  const effectiveMode: BlogHandoffMode = target.decision === "REUSE" ? "UPDATE_EXISTING" : "CREATE_NEW";
  const targetBlogPostId = target.decision === "REUSE" ? target.blogPostId : null;

  const snapshotHash = buildBlogHandoffSnapshotHash({
    writingDraftId: draft.id,
    writingDraftVersion: draft.version,
    reviewSessionId: review.id,
    mode: effectiveMode,
    targetBlogPostId,
    fields,
  });

  const existingCompleted = await prisma.contentHandoffRecord.findFirst({
    where: { sourceSnapshotHash: snapshotHash, status: "COMPLETED" },
  });
  if (existingCompleted?.targetEntityId) {
    const blog = await prisma.blogPost.findUnique({
      where: { id: existingCompleted.targetEntityId },
      select: { id: true, status: true },
    });
    logHandoffEvent({
      ok: true,
      diagnosticId,
      reviewId: review.id,
      draftId: draft.id,
      blogId: existingCompleted.targetEntityId,
      idempotent: true,
      durationMs: Date.now() - startedAt,
    });
    return {
      handoff: existingCompleted,
      blogPostId: existingCompleted.targetEntityId,
      blogStatus: blog?.status ?? null,
      reused: true,
      relinked: false,
      relinkedFromReviewId: null,
      mode: effectiveMode,
      matchedBy: target.decision === "REUSE" ? target.matchedBy : null,
      synchronizedFields: [] as HandoffFieldName[],
      preservedFields: [] as HandoffFieldName[],
      conflicts: [] as HandoffFieldPlan[],
      adminRoute: `/admin/blog/${existingCompleted.targetEntityId}`,
      cacheHint: true,
      readiness: await getContentPublishReadiness(existingCompleted.targetEntityId),
      message: "Bàn giao đã hoàn tất trước đó — giữ nguyên Blog hiện có.",
    };
  }

  // ---- Plan the field writes ------------------------------------------------
  stage = "plan_fields";
  const draftFaq: FaqEntry[] = structured.faq.map((f) => ({
    question: f.question,
    // Answers render as text and go verbatim into JSON-LD, so never ship HTML.
    answer: faqAnswerToPlainText(f.answerHtml),
  }));

  const existingBlog = targetBlogPostId
    ? await prisma.blogPost.findUnique({ where: { id: targetBlogPostId } })
    : null;
  if (targetBlogPostId && !existingBlog) {
    throw new ContentReviewError("Blog not found", "BLOG_NOT_FOUND", 404);
  }
  if (existingBlog?.status === "PUBLISHED") {
    throw new ContentReviewError(
      "Không ghi đè Blog PUBLISHED. Tạo draft mới hoặc chỉnh qua luồng xuất bản.",
      "PUBLISHED_PROTECTED",
      409
    );
  }

  const manualEditRisk = existingBlog
    ? hasManualEditRisk({
        contentModifiedAfterHandoff: existingBlog.contentModifiedAfterHandoff,
        lastHandoffAt: existingBlog.lastHandoffAt,
        blogSourceWritingDraftId: existingBlog.sourceWritingDraftId,
        draftId: draft.id,
      })
    : false;

  const classifications: HandoffFieldPlan[] = [];
  if (existingBlog) {
    const enabled: Array<{ field: HandoffFieldName; on: boolean; draft: string; blog: string }> = [
      { field: "title", on: fields.title, draft: structured.title ?? "", blog: existingBlog.title },
      { field: "content", on: fields.content, draft: contentHtml, blog: existingBlog.content ?? "" },
      {
        field: "metaTitle",
        on: fields.seoMetadata,
        draft: structured.metaTitle ?? "",
        blog: existingBlog.metaTitle ?? "",
      },
      {
        field: "metaDescription",
        on: fields.seoMetadata,
        draft: structured.metaDescription ?? "",
        blog: existingBlog.metaDescription ?? "",
      },
      {
        field: "faq",
        on: fields.faq,
        draft: serializeFaq(draftFaq),
        blog: serializeFaq(readBlogFaq(existingBlog.faqJson)),
      },
    ];
    for (const entry of enabled) {
      if (!entry.on) {
        classifications.push({
          field: entry.field,
          classification: "KEEP_BLOG_VALUE",
          reason: "Không nằm trong phạm vi bàn giao đã chọn",
        });
        continue;
      }
      classifications.push(
        classifyHandoffField({
          field: entry.field,
          draftValue: entry.draft,
          blogValue: entry.blog,
          manualEditRisk,
        })
      );
    }
  }

  const fieldPlan = buildHandoffPlan({
    classifications,
    overwriteFields: input.overwriteFields,
  });
  if (input.requireCleanSync && fieldPlan.conflicts.length > 0) {
    throw new ContentReviewError(
      `${fieldPlan.conflicts.length} trường có chỉnh sửa thủ công trên Blog — cần người xác nhận ghi đè.`,
      "CONTENT_CONFLICT",
      409,
      { ok: false, conflicts: fieldPlan.conflicts }
    );
  }

  const relinkedFromReviewId =
    existingBlog && existingBlog.sourceReviewSessionId !== review.id
      ? existingBlog.sourceReviewSessionId
      : null;
  const blogCountBefore = await prisma.blogPost.count();

  stage = "write_handoff_record";
  let handoff = await prisma.contentHandoffRecord.create({
    data: {
      writingDraftId: draft.id,
      writingDraftVersion: draft.version,
      reviewSessionId: review.id,
      targetType: "BLOG_POST",
      mode: effectiveMode,
      status: "PENDING",
      fieldMapping: fields as Prisma.InputJsonValue,
      sourceSnapshotHash: snapshotHash,
      requestedBy: input.requestedBy,
    },
  });

  try {
    let blogId: string;

    stage = "write_blog";
    if (existingBlog) {
      const sync = new Set(fieldPlan.synchronized);
      // Linkage and traceability are always written; content only when planned.
      const updateData: Prisma.BlogPostUpdateInput = {
        contentModifiedAfterHandoff: false,
        lastHandoffAt: new Date(),
        sourceWritingDraftId: draft.id,
        sourceWritingDraftVersion: draft.version,
        sourceReviewSessionId: review.id,
        sourceHandoffRecordId: handoff.id,
      };
      if (sync.has("title")) updateData.title = structured.title || existingBlog.title;
      if (sync.has("content")) updateData.content = contentHtml;
      if (sync.has("metaTitle")) updateData.metaTitle = structured.metaTitle ?? existingBlog.metaTitle;
      if (sync.has("metaDescription")) {
        updateData.metaDescription = structured.metaDescription ?? existingBlog.metaDescription;
      }
      if (sync.has("faq")) updateData.faqJson = draftFaq as unknown as Prisma.InputJsonValue;
      if (fields.mediaBundle && topic.mediaBundleId && !existingBlog.mediaBundleId) {
        updateData.mediaBundle = { connect: { id: topic.mediaBundleId } };
      }

      await prisma.blogPost.update({ where: { id: existingBlog.id }, data: updateData });
      blogId = existingBlog.id;
    } else {
      const title = structured.title || topic.title;
      if (!intendedSlug) throw new ContentReviewError("Không tạo được slug", "SLUG_INVALID", 400);

      const tags = topic.keywords
        .filter((k) => k.keywordType !== "NEGATIVE")
        .slice(0, 12)
        .map((k) => k.keyword);

      const post = await prisma.$transaction(async (tx) => {
        const created = await tx.blogPost.create({
          data: {
            title: fields.title ? title : topic.title,
            slug: intendedSlug,
            excerpt: planJson.titlePlan?.h1?.slice(0, 300) ?? null,
            content: fields.content ? contentHtml : null,
            metaTitle: fields.seoMetadata ? structured.metaTitle ?? null : null,
            metaDescription: fields.seoMetadata ? structured.metaDescription ?? null : null,
            status: "DRAFT",
            faqJson: fields.faq ? (draftFaq as unknown as Prisma.InputJsonValue) : [],
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

    stage = "write_media";
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
          const isInline = blogPlacement === "INLINE";
          await assignContentMedia({
            entityType: "BLOG_POST",
            entityId: blogId,
            mediaAssetId: placement.mediaAssetId,
            placement: blogPlacement,
            // Stable slotKey keeps re-handoff idempotent for INLINE rows.
            slotKey: isInline ? placement.id : undefined,
            sortOrder: placement.sortOrder,
            altTextOverride: placement.altText,
            captionOverride: placement.caption ?? null,
            replaceExisting: blogPlacement === "FEATURED" || blogPlacement === "OG_IMAGE",
            metadata: isInline
              ? {
                  inline: {
                    blockId: placement.id,
                    afterSectionId: placement.sectionId ?? "",
                    position:
                      placement.placement === "INLINE_BEFORE"
                        ? "AFTER_HEADING"
                        : "BETWEEN_PARAGRAPHS",
                    variant: "CONTENT_WIDTH",
                    sourceCredit: null,
                    locked: false,
                    selectedBy: "SYSTEM",
                    selectionReason: "Writing plan handoff",
                    score: null,
                    sectionHeading: null,
                  },
                  source: "writing-handoff",
                }
              : undefined,
          });
        } catch {
          // Skip invalid/private assets without failing whole handoff
        }
      }
    }

    stage = "write_handoff_record";
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
          status: blogAfter?.status ?? "DRAFT",
          title: blogAfter?.title ?? structured.title,
          slug: blogAfter?.slug ?? intendedSlug,
          contentHash,
          reusedExistingBlog: Boolean(existingBlog),
          synchronizedFields: fieldPlan.synchronized,
          preservedFields: fieldPlan.preserved,
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

    stage = "write_audit";
    // Repeated handoffs must not pile up identical history rows.
    const priorDecision = await prisma.contentReviewDecision.findFirst({
      where: {
        reviewSessionId: review.id,
        decisionType: "HANDOFF_TO_BLOG",
        note: `Blog ${blogId}`,
      },
    });
    if (!priorDecision) {
      await prisma.contentReviewDecision.create({
        data: {
          reviewSessionId: review.id,
          decisionType: "HANDOFF_TO_BLOG",
          actorId: input.requestedBy,
          note: `Blog ${blogId}`,
          metadata: {
            handoffId: handoff.id,
            mode: effectiveMode,
            blogId,
            writingDraftId: draft.id,
            draftVersion: draft.version,
            reusedExistingBlog: Boolean(existingBlog),
            relinkedFromReviewId,
            synchronizedFields: fieldPlan.synchronized,
            preservedFields: fieldPlan.preserved,
          } as Prisma.InputJsonValue,
        },
      });
    }

    stage = "verify";
    const verified = await prisma.blogPost.findUnique({
      where: { id: blogId },
      select: {
        id: true,
        slug: true,
        status: true,
        publishedAt: true,
        sourceReviewSessionId: true,
        sourceHandoffRecordId: true,
      },
    });
    const blogCountAfter = await prisma.blogPost.count();
    const duplicateCreated = existingBlog ? blogCountAfter !== blogCountBefore : false;
    const consistent =
      verified?.sourceReviewSessionId === review.id &&
      verified?.sourceHandoffRecordId === handoff.id &&
      verified?.status !== "PUBLISHED" &&
      verified?.publishedAt === null &&
      (!existingBlog || (verified?.id === existingBlog.id && verified?.slug === existingBlog.slug)) &&
      !duplicateCreated;
    if (!consistent) {
      throw new ContentReviewError(
        "Bàn giao bị hủy: trạng thái sau khi ghi không nhất quán.",
        "HANDOFF_VERIFY_FAILED",
        500,
        {
          ok: false,
          blogId,
          duplicateCreated,
          blogStatus: verified?.status ?? null,
          linkedReviewId: verified?.sourceReviewSessionId ?? null,
        }
      );
    }

    if (verified?.slug) revalidateBlogPaths(verified.slug);

    stage = "readiness";
    const readiness = await getContentPublishReadiness(blogId);

    logHandoffEvent({
      ok: true,
      diagnosticId,
      reviewId: review.id,
      draftId: draft.id,
      draftVersion: draft.version,
      blogId,
      blogStatus: verified?.status ?? null,
      mode: effectiveMode,
      reused: Boolean(existingBlog),
      relinkedFromReviewId,
      synchronized: fieldPlan.synchronized,
      conflicts: fieldPlan.conflicts.map((c) => c.field),
      readinessReady: readiness.ready,
      durationMs: Date.now() - startedAt,
    });

    return {
      handoff,
      reviewId: review.id,
      blogPostId: blogId,
      blogStatus: verified?.status ?? null,
      reused: Boolean(existingBlog),
      relinked: Boolean(relinkedFromReviewId),
      relinkedFromReviewId,
      mode: effectiveMode,
      matchedBy: target.decision === "REUSE" ? target.matchedBy : null,
      synchronizedFields: fieldPlan.synchronized,
      preservedFields: fieldPlan.preserved,
      conflicts: fieldPlan.conflicts,
      adminRoute: `/admin/blog/${blogId}`,
      cacheHint: false,
      readiness,
      message: existingBlog
        ? "Đã bàn giao sang Blog DRAFT hiện có — không tạo Blog mới, không publish."
        : "Đã bàn giao sang Blog DRAFT — không publish.",
    };
  } catch (err) {
    await prisma.contentHandoffRecord.update({
      where: { id: handoff.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Handoff failed",
        completedAt: new Date(),
      },
    });
    const failure = err as { name?: string; code?: string; message?: string };
    logHandoffEvent({
      ok: false,
      diagnosticId,
      reviewId: review.id,
      draftId: draft.id,
      blogId: targetBlogPostId,
      stage,
      durationMs: Date.now() - startedAt,
      errorName: failure?.name ?? "Error",
      errorCode: failure?.code ?? null,
      errorMessage: (failure?.message ?? "unknown").slice(0, 300),
    });
    if (err instanceof ContentReviewError) throw err;
    const shaped = buildHandoffFailure({
      stage,
      diagnosticId,
      errorName: failure?.name,
      errorCode: failure?.code,
    });
    throw new ContentReviewError(shaped.message, shaped.code, 500, {
      ok: false,
      ...shaped.details,
    });
  }
}

/**
 * What the Review page needs to render its terminal/handoff state: the Blog
 * this article already owns, whether it still points at an older Review, and
 * (once approved) whether that Blog is publish-ready. Read-only.
 */
export async function getReviewHandoffStatus(reviewId: string) {
  const review = await prisma.contentReviewSession.findUnique({ where: { id: reviewId } });
  if (!review) return null;

  const linked = await prisma.blogPost.findMany({
    where: {
      OR: [
        { sourceReviewSessionId: reviewId },
        { sourceWritingDraftId: review.writingDraftId },
      ],
    },
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
      sourceReviewSessionId: true,
      sourceHandoffRecordId: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const blog = linked[0] ?? null;

  const readiness =
    review.status === "APPROVED" && blog ? await getContentPublishReadiness(blog.id) : null;

  const view = resolveReviewHandoffView({
    reviewId,
    reviewStatus: review.status,
    blog: blog
      ? {
          id: blog.id,
          status: blog.status,
          sourceReviewSessionId: blog.sourceReviewSessionId,
          sourceHandoffRecordId: blog.sourceHandoffRecordId,
        }
      : null,
    blogPublishReady: readiness?.ready ?? null,
  });

  return {
    ...view,
    approvedAt: review.approvedAt,
    approvedBy: review.approvedBy,
    draftVersion: review.writingDraftVersion,
    blog: blog
      ? {
          id: blog.id,
          slug: blog.slug,
          status: blog.status,
          publishedAt: blog.publishedAt,
          sourceReviewSessionId: blog.sourceReviewSessionId,
          sourceHandoffRecordId: blog.sourceHandoffRecordId,
          adminRoute: `/admin/blog/${blog.id}`,
          publicUrl: `/blog/${blog.slug}`,
        }
      : null,
    // More than one Blog for the same article is a human decision, never a
    // silent pick — the CTA must not run a handoff in that state.
    candidateConflict: linked.length > 1 ? linked.map((b) => b.id) : null,
    readiness: readiness
      ? { ready: readiness.ready, errors: readiness.errors, warnings: readiness.warnings }
      : null,
  };
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
