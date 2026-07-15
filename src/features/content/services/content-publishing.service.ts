import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidateBlogPaths } from "@/features/blog/revalidate";
import { getContentPublishReadiness } from "@/features/content/services/content-publish-readiness.service";
import {
  assertSupportedPublishTarget,
  buildPublishIdempotencyHash,
  type ContentPublishAction,
  type ContentPublishReadiness,
} from "@/features/content/content-publish.types";

export class ContentPublishError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "ContentPublishError";
    this.code = code;
    this.status = status;
  }
}

const MAX_SCHEDULE_DAYS = 180;
const DUE_BATCH_SIZE = 20;

function readinessSnapshot(readiness: ContentPublishReadiness): Prisma.InputJsonValue {
  return {
    ready: readiness.ready,
    governed: readiness.governed,
    errors: readiness.errors.slice(0, 40),
    warnings: readiness.warnings.slice(0, 40),
    checks: readiness.checks,
    contentHash: readiness.contentHash,
  };
}

async function findCompletedByIdempotency(hash: string) {
  return prisma.contentPublishEvent.findFirst({
    where: { idempotencyHash: hash, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
}

export async function publishBlogNow(input: {
  blogPostId: string;
  actorId: string;
  confirmChecked?: boolean;
}) {
  if (!input.confirmChecked) {
    throw new ContentPublishError(
      "Cần xác nhận: Tôi xác nhận nội dung đã được kiểm tra và sẵn sàng xuất bản.",
      "CONFIRM_REQUIRED",
      400
    );
  }

  const post = await prisma.blogPost.findUnique({ where: { id: input.blogPostId } });
  if (!post) throw new ContentPublishError("Blog not found", "NOT_FOUND", 404);

  const readiness = await getContentPublishReadiness(post.id);
  if (!readiness.ready) {
    throw new ContentPublishError(
      `Chưa sẵn sàng xuất bản: ${readiness.errors.join("; ")}`,
      "NOT_READY",
      422
    );
  }

  const idempotencyHash = buildPublishIdempotencyHash({
    blogPostId: post.id,
    action: "PUBLISH_NOW",
    contentHash: readiness.contentHash,
    sourceVersion: post.sourceWritingDraftVersion,
    actorId: input.actorId,
  });
  const existing = await findCompletedByIdempotency(idempotencyHash);
  if (existing) {
    return {
      event: existing,
      post: await prisma.blogPost.findUnique({ where: { id: post.id } }),
      adminRoute: `/admin/blog/${post.id}`,
      publicRoute: `/blog/${post.slug}`,
      cacheHint: true,
      warnings: [] as string[],
      message: "Idempotent — đã xuất bản trước đó với cùng nội dung.",
    };
  }

  const event = await prisma.contentPublishEvent.create({
    data: {
      blogPostId: post.id,
      action: "PUBLISH_NOW",
      status: "PENDING",
      requestedBy: input.actorId,
      previousStatus: post.status,
      nextStatus: "PUBLISHED",
      readinessSnapshot: readinessSnapshot(readiness),
      sourceHandoffId: post.sourceHandoffRecordId,
      sourceWritingDraftId: post.sourceWritingDraftId,
      sourceDraftVersion: post.sourceWritingDraftVersion,
      contentSnapshotHash: readiness.contentHash,
      idempotencyHash,
    },
  });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.blogPost.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          lastPublishedAt: new Date(),
          publishedBy: input.actorId,
          scheduledAt: null,
          scheduledBy: null,
          publishVersion: { increment: 1 },
          lastPublishedContentHash: readiness.contentHash,
          needsContentReview: false,
        },
      });
      await tx.contentPublishEvent.update({
        where: { id: event.id },
        data: { status: "COMPLETED", completedAt: new Date(), nextStatus: "PUBLISHED" },
      });
      return row;
    });

    const warnings: string[] = [];
    try {
      revalidateBlogPaths(updated.slug);
    } catch (err) {
      warnings.push(
        `Revalidation failed: ${err instanceof Error ? err.message : "unknown"} — DB đã PUBLISHED`
      );
    }

    return {
      event: await prisma.contentPublishEvent.findUnique({ where: { id: event.id } }),
      post: updated,
      adminRoute: `/admin/blog/${updated.id}`,
      publicRoute: `/blog/${updated.slug}`,
      cacheHint: false,
      warnings,
      message: "Đã xuất bản.",
    };
  } catch (err) {
    await prisma.contentPublishEvent.update({
      where: { id: event.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Publish failed",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function scheduleBlogPublish(input: {
  blogPostId: string;
  actorId: string;
  scheduledFor: Date;
  confirmChecked?: boolean;
}) {
  if (!input.confirmChecked) {
    throw new ContentPublishError("Cần xác nhận trước khi lên lịch.", "CONFIRM_REQUIRED", 400);
  }
  const when = input.scheduledFor;
  if (!(when instanceof Date) || Number.isNaN(when.getTime())) {
    throw new ContentPublishError("Thời gian lịch không hợp lệ", "INVALID_SCHEDULE", 400);
  }
  if (when.getTime() <= Date.now() + 60_000) {
    throw new ContentPublishError("Lịch phải ở tương lai (ít nhất ~1 phút).", "SCHEDULE_PAST", 400);
  }
  const max = Date.now() + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000;
  if (when.getTime() > max) {
    throw new ContentPublishError(
      `Không lên lịch quá ${MAX_SCHEDULE_DAYS} ngày.`,
      "SCHEDULE_TOO_FAR",
      400
    );
  }

  const post = await prisma.blogPost.findUnique({ where: { id: input.blogPostId } });
  if (!post) throw new ContentPublishError("Blog not found", "NOT_FOUND", 404);
  if (!["DRAFT", "REVIEW", "SCHEDULED"].includes(post.status)) {
    throw new ContentPublishError(
      `Không lên lịch từ status ${post.status}`,
      "INVALID_STATUS",
      409
    );
  }

  const readiness = await getContentPublishReadiness(post.id);
  if (!readiness.ready) {
    throw new ContentPublishError(
      `Chưa sẵn sàng lên lịch: ${readiness.errors.join("; ")}`,
      "NOT_READY",
      422
    );
  }

  const idempotencyHash = buildPublishIdempotencyHash({
    blogPostId: post.id,
    action: "SCHEDULE",
    contentHash: readiness.contentHash,
    sourceVersion: post.sourceWritingDraftVersion,
    scheduledFor: when.toISOString(),
    actorId: input.actorId,
  });
  const existing = await findCompletedByIdempotency(idempotencyHash);
  if (existing) {
    return {
      event: existing,
      post: await prisma.blogPost.findUnique({ where: { id: post.id } }),
      cacheHint: true,
      message: "Idempotent schedule.",
    };
  }

  const event = await prisma.contentPublishEvent.create({
    data: {
      blogPostId: post.id,
      action: post.status === "SCHEDULED" ? "RESCHEDULE" : "SCHEDULE",
      status: "PENDING",
      requestedBy: input.actorId,
      scheduledFor: when,
      previousStatus: post.status,
      nextStatus: "SCHEDULED",
      readinessSnapshot: readinessSnapshot(readiness),
      sourceHandoffId: post.sourceHandoffRecordId,
      sourceWritingDraftId: post.sourceWritingDraftId,
      sourceDraftVersion: post.sourceWritingDraftVersion,
      contentSnapshotHash: readiness.contentHash,
      idempotencyHash,
    },
  });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.blogPost.update({
        where: { id: post.id },
        data: {
          status: "SCHEDULED",
          scheduledAt: when,
          scheduledBy: input.actorId,
        },
      });
      await tx.contentPublishEvent.update({
        where: { id: event.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      return row;
    });
    return {
      event: await prisma.contentPublishEvent.findUnique({ where: { id: event.id } }),
      post: updated,
      cacheHint: false,
      message: "Đã lên lịch. Readiness sẽ được kiểm tra lại khi đến hạn.",
    };
  } catch (err) {
    await prisma.contentPublishEvent.update({
      where: { id: event.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Schedule failed",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function rescheduleBlogPublish(input: {
  blogPostId: string;
  actorId: string;
  scheduledFor: Date;
  confirmChecked?: boolean;
}) {
  return scheduleBlogPublish(input);
}

export async function cancelScheduledPublish(input: {
  blogPostId: string;
  actorId: string;
}) {
  const post = await prisma.blogPost.findUnique({ where: { id: input.blogPostId } });
  if (!post) throw new ContentPublishError("Blog not found", "NOT_FOUND", 404);

  if (post.status !== "SCHEDULED") {
    // Idempotent cancel
    return {
      post,
      message: "Không có lịch active — idempotent.",
      cacheHint: true,
    };
  }

  const event = await prisma.contentPublishEvent.create({
    data: {
      blogPostId: post.id,
      action: "CANCEL_SCHEDULE",
      status: "PENDING",
      requestedBy: input.actorId,
      previousStatus: post.status,
      nextStatus: "DRAFT",
      sourceHandoffId: post.sourceHandoffRecordId,
      sourceWritingDraftId: post.sourceWritingDraftId,
      sourceDraftVersion: post.sourceWritingDraftVersion,
    },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.blogPost.update({
      where: { id: post.id },
      data: { status: "DRAFT", scheduledAt: null, scheduledBy: null },
    });
    await tx.contentPublishEvent.update({
      where: { id: event.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return row;
  });

  return {
    event: await prisma.contentPublishEvent.findUnique({ where: { id: event.id } }),
    post: updated,
    message: "Đã hủy lịch — Blog về DRAFT.",
  };
}

export async function unpublishBlog(input: {
  blogPostId: string;
  actorId: string;
  archive?: boolean;
}) {
  const post = await prisma.blogPost.findUnique({ where: { id: input.blogPostId } });
  if (!post) throw new ContentPublishError("Blog not found", "NOT_FOUND", 404);

  const nextStatus = input.archive ? "ARCHIVED" : "DRAFT";
  if (post.status !== "PUBLISHED" && post.status !== "SCHEDULED") {
    if (post.status === nextStatus) {
      return { post, message: "Idempotent unpublish.", cacheHint: true };
    }
  }

  const action: ContentPublishAction = input.archive ? "ARCHIVE" : "UNPUBLISH";
  const event = await prisma.contentPublishEvent.create({
    data: {
      blogPostId: post.id,
      action,
      status: "PENDING",
      requestedBy: input.actorId,
      previousStatus: post.status,
      nextStatus,
      sourceHandoffId: post.sourceHandoffRecordId,
      sourceWritingDraftId: post.sourceWritingDraftId,
      sourceDraftVersion: post.sourceWritingDraftVersion,
    },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.blogPost.update({
      where: { id: post.id },
      data: {
        status: nextStatus,
        publishedAt: null,
        lastUnpublishedAt: new Date(),
        scheduledAt: null,
        scheduledBy: null,
      },
    });
    await tx.contentPublishEvent.update({
      where: { id: event.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return row;
  });

  const warnings: string[] = [];
  try {
    revalidateBlogPaths(updated.slug);
  } catch (err) {
    warnings.push(err instanceof Error ? err.message : "revalidate failed");
  }

  return {
    event: await prisma.contentPublishEvent.findUnique({ where: { id: event.id } }),
    post: updated,
    warnings,
    message: input.archive ? "Đã lưu trữ." : "Đã gỡ xuất bản.",
  };
}

export async function archiveBlog(input: { blogPostId: string; actorId: string }) {
  return unpublishBlog({ ...input, archive: true });
}

export async function acknowledgePublishChanges(input: {
  blogPostId: string;
  actorId: string;
  note: string;
  confirmFactualChanges?: boolean;
}) {
  if (!input.note.trim()) {
    throw new ContentPublishError("Ghi chú bắt buộc khi xác nhận thay đổi.", "NOTE_REQUIRED", 400);
  }
  const post = await prisma.blogPost.findUnique({ where: { id: input.blogPostId } });
  if (!post) throw new ContentPublishError("Blog not found", "NOT_FOUND", 404);
  if (!post.sourceHandoffRecordId) {
    throw new ContentPublishError("Chỉ áp dụng Blog governed.", "NOT_GOVERNED", 400);
  }

  // Soft factual/numeric drift check vs last published or empty
  const prior = post.lastPublishedContentHash ? "" : "";
  void prior;
  if (!input.confirmFactualChanges && post.contentModifiedAfterHandoff) {
    // require checkbox for material edits
    throw new ContentPublishError(
      "Cần confirmFactualChanges=true khi nội dung đã đổi sau handoff.",
      "CONFIRM_FACTUAL",
      400
    );
  }

  const updated = await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      publishReadinessAcknowledgedAt: new Date(),
      publishReadinessAcknowledgedBy: input.actorId,
      publishAckNote: input.note.trim(),
      needsContentReview: false,
    },
  });

  const readiness = await getContentPublishReadiness(post.id);
  return { post: updated, readiness, message: "Đã ghi nhận xác nhận biên tập." };
}

/**
 * Explicit status/issue workflow — no reverse Blog→WritingDraft compiler.
 */
export async function sendBlogBackToReview(input: {
  blogPostId: string;
  actorId: string;
  note: string;
}) {
  if (!input.note.trim()) {
    throw new ContentPublishError("Ghi chú bắt buộc.", "NOTE_REQUIRED", 400);
  }
  const post = await prisma.blogPost.findUnique({ where: { id: input.blogPostId } });
  if (!post) throw new ContentPublishError("Blog not found", "NOT_FOUND", 404);
  if (!post.sourceReviewSessionId) {
    throw new ContentPublishError("Blog không có review nguồn.", "NO_REVIEW", 400);
  }

  await prisma.$transaction(async (tx) => {
    const nextStatus =
      post.status === "PUBLISHED" ? "PUBLISHED" : post.status === "SCHEDULED" ? "REVIEW" : "REVIEW";
    await tx.blogPost.update({
      where: { id: post.id },
      data: {
        needsContentReview: true,
        status: nextStatus,
        publishReadinessAcknowledgedAt: null,
        publishReadinessAcknowledgedBy: null,
        publishAckNote: null,
        ...(post.status === "SCHEDULED" ? { scheduledAt: null, scheduledBy: null } : {}),
      },
    });
    await tx.contentReviewIssue.create({
      data: {
        reviewSessionId: post.sourceReviewSessionId!,
        code: "BLOG_MATERIAL_EDIT",
        severity: "WARNING",
        status: "OPEN",
        message: `Gửi lại kiểm duyệt từ Blog: ${input.note.trim()}`,
        suggestedFix: "Review lại nội dung Blog hoặc tạo handoff mới từ Writing Draft đã duyệt.",
        source: "BLOG_EDITOR",
        metadata: { blogPostId: post.id, actorId: input.actorId } as Prisma.InputJsonValue,
      },
    });
    await tx.contentPublishEvent.create({
      data: {
        blogPostId: post.id,
        action: "RESTORE_DRAFT",
        status: "COMPLETED",
        requestedBy: input.actorId,
        previousStatus: post.status,
        nextStatus,
        completedAt: new Date(),
        metadata: { note: input.note.trim(), sendBackToReview: true },
      },
    });
  });

  return {
    message:
      "Đã đánh dấu cần kiểm duyệt lại. Không reverse-compile Blog → WritingDraft (tránh mất dữ liệu).",
  };
}

export async function processDueScheduledPosts(input?: { limit?: number; now?: Date }) {
  const now = input?.now ?? new Date();
  const limit = Math.min(input?.limit ?? DUE_BATCH_SIZE, 50);
  const due = await prisma.blogPost.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  let published = 0;
  let failed = 0;
  let skipped = 0;
  const results: Array<{ blogPostId: string; ok: boolean; message: string }> = [];

  for (const post of due) {
    const event = await prisma.contentPublishEvent.create({
      data: {
        blogPostId: post.id,
        action: "PUBLISH_NOW",
        status: "PENDING",
        requestedBy: "cron:publish-due",
        scheduledFor: post.scheduledAt,
        previousStatus: post.status,
        nextStatus: "PUBLISHED",
        sourceHandoffId: post.sourceHandoffRecordId,
        sourceWritingDraftId: post.sourceWritingDraftId,
        sourceDraftVersion: post.sourceWritingDraftVersion,
        metadata: { dueProcessor: true },
      },
    });

    try {
      // Claim-ish: only proceed if still SCHEDULED
      const claimed = await prisma.blogPost.updateMany({
        where: { id: post.id, status: "SCHEDULED", scheduledAt: { lte: now } },
        data: { updatedAt: new Date() },
      });
      if (claimed.count === 0) {
        skipped += 1;
        await prisma.contentPublishEvent.update({
          where: { id: event.id },
          data: { status: "CANCELLED", errorMessage: "Already processed", completedAt: new Date() },
        });
        results.push({ blogPostId: post.id, ok: false, message: "skipped" });
        continue;
      }

      const readiness = await getContentPublishReadiness(post.id, { forScheduleExecution: true });
      await prisma.contentPublishEvent.update({
        where: { id: event.id },
        data: {
          readinessSnapshot: readinessSnapshot(readiness),
          contentSnapshotHash: readiness.contentHash,
        },
      });

      if (!readiness.ready) {
        failed += 1;
        await prisma.$transaction(async (tx) => {
          await tx.blogPost.update({
            where: { id: post.id },
            data: {
              status: "DRAFT",
              scheduledAt: null,
              scheduledBy: null,
            },
          });
          await tx.contentPublishEvent.update({
            where: { id: event.id },
            data: {
              status: "FAILED",
              nextStatus: "DRAFT",
              errorMessage: readiness.errors.join("; "),
              completedAt: new Date(),
            },
          });
        });
        results.push({ blogPostId: post.id, ok: false, message: readiness.errors.join("; ") });
        continue;
      }

      if (
        post.lastPublishedContentHash &&
        post.lastPublishedContentHash === readiness.contentHash &&
        post.status === "PUBLISHED"
      ) {
        skipped += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.blogPost.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
            lastPublishedAt: now,
            publishedBy: post.scheduledBy ?? "cron:publish-due",
            scheduledAt: null,
            scheduledBy: null,
            publishVersion: { increment: 1 },
            lastPublishedContentHash: readiness.contentHash,
          },
        });
        await tx.contentPublishEvent.update({
          where: { id: event.id },
          data: { status: "COMPLETED", completedAt: new Date(), nextStatus: "PUBLISHED" },
        });
      });

      try {
        revalidateBlogPaths(post.slug);
      } catch {
        // log-only
      }
      published += 1;
      results.push({ blogPostId: post.id, ok: true, message: "published" });
    } catch (err) {
      failed += 1;
      await prisma.contentPublishEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "due failed",
          completedAt: new Date(),
        },
      });
      await prisma.blogPost
        .update({
          where: { id: post.id },
          data: { status: "DRAFT", scheduledAt: null, scheduledBy: null },
        })
        .catch(() => undefined);
      results.push({
        blogPostId: post.id,
        ok: false,
        message: err instanceof Error ? err.message : "failed",
      });
    }
  }

  return {
    scanned: due.length,
    published,
    failed,
    skipped,
    results,
  };
}

export async function getPublishEvent(eventId: string) {
  const event = await prisma.contentPublishEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new ContentPublishError("Event not found", "NOT_FOUND", 404);
  return event;
}

export async function listPublishEvents(blogPostId: string, take = 50) {
  return prisma.contentPublishEvent.findMany({
    where: { blogPostId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function listPublishingQueue(filters?: {
  kind?: "ready" | "scheduled" | "failed" | "recent" | "modified" | "invalidated";
  take?: number;
}) {
  const take = filters?.take ?? 30;
  switch (filters?.kind) {
    case "scheduled":
      return prisma.blogPost.findMany({
        where: { status: "SCHEDULED" },
        orderBy: { scheduledAt: "asc" },
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          scheduledAt: true,
          sourceWritingDraftId: true,
          contentModifiedAfterHandoff: true,
          updatedAt: true,
        },
      });
    case "recent":
      return prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { lastPublishedAt: "desc" },
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          lastPublishedAt: true,
          sourceWritingDraftId: true,
          updatedAt: true,
        },
      });
    case "modified":
      return prisma.blogPost.findMany({
        where: { contentModifiedAfterHandoff: true },
        orderBy: { updatedAt: "desc" },
        take,
      });
    case "failed": {
      const events = await prisma.contentPublishEvent.findMany({
        where: { status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take,
      });
      return events;
    }
    default:
      return prisma.blogPost.findMany({
        where: { status: { in: ["DRAFT", "REVIEW"] }, sourceHandoffRecordId: { not: null } },
        orderBy: { updatedAt: "desc" },
        take,
      });
  }
}

/** Future multi-target contract — Blog only for now. */
export async function publishContentTarget(input: {
  targetType: string;
  targetId: string;
  actorId: string;
  action: "PUBLISH_NOW" | "SCHEDULE";
  scheduledFor?: Date;
  confirmChecked?: boolean;
}) {
  assertSupportedPublishTarget(input.targetType);
  if (input.action === "SCHEDULE") {
    if (!input.scheduledFor) {
      throw new ContentPublishError("scheduledFor required", "SCHEDULE_REQUIRED", 400);
    }
    return scheduleBlogPublish({
      blogPostId: input.targetId,
      actorId: input.actorId,
      scheduledFor: input.scheduledFor,
      confirmChecked: input.confirmChecked,
    });
  }
  return publishBlogNow({
    blogPostId: input.targetId,
    actorId: input.actorId,
    confirmChecked: input.confirmChecked,
  });
}
