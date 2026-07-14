import "server-only";

import type {
  ContentMediaEntityType,
  ContentMediaPlacement,
  MediaBundleSlotType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isSingleAssetPlacement,
  mapBundleSlotToBlogPlacement,
  placementToLegacyBlogField,
  shouldClearLegacyUrl,
} from "@/features/content/blog-bundle-slot-map";
import { evaluateBlogMediaReadiness } from "@/features/content/blog-media-readiness";
import {
  calculateMediaBundleHealth,
  getMediaBundleForContent,
  type MediaBundleDetail,
} from "@/features/media/services/media-bundle.service";

const ASSIGNMENT_INCLUDE = {
  mediaAsset: {
    select: {
      id: true,
      url: true,
      thumbnailUrl: true,
      title: true,
      altText: true,
      caption: true,
      seoScore: true,
      seoReadinessStatus: true,
      visibility: true,
      orientation: true,
      width: true,
      height: true,
      contentSuitabilities: true,
      library: { select: { id: true, code: true, name: true } },
      role: { select: { id: true, code: true, name: true } },
    },
  },
} as const;

export type ContentMediaAssignmentRow = Prisma.ContentMediaAssignmentGetPayload<{
  include: typeof ASSIGNMENT_INCLUDE;
}>;

export type AssignContentMediaInput = {
  entityType: ContentMediaEntityType;
  entityId: string;
  mediaAssetId: string;
  placement: ContentMediaPlacement;
  slotKey?: string | null;
  sortOrder?: number;
  altTextOverride?: string | null;
  captionOverride?: string | null;
  metadata?: Prisma.InputJsonValue;
  /** When true, replace existing single-asset placements without prompting (API layer). */
  replaceExisting?: boolean;
};

export type ImportFromBundleInput = {
  entityType: ContentMediaEntityType;
  entityId: string;
  mediaBundleId: string;
  /** Keep BlogPost.mediaBundleId linked after import. */
  keepBundleLink?: boolean;
  /** Explicit slot ids to import; if omitted, import all mapped slots. */
  slotIds?: string[];
  /** Explicit asset ids to include (intersects with slot assets). */
  mediaAssetIds?: string[];
  /** Replace FEATURED/OG/COVER when already set. Default false. */
  replaceExisting?: boolean;
};

async function assertEntityExists(
  entityType: ContentMediaEntityType,
  entityId: string,
): Promise<void> {
  if (entityType === "BLOG_POST") {
    const post = await prisma.blogPost.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!post) throw new Error("Không tìm thấy bài viết.");
    return;
  }
  if (entityType === "LANDING_PAGE") {
    const page = await prisma.landingPageContent.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!page) throw new Error("Không tìm thấy landing page.");
    return;
  }
  // SEO_DRAFT / CASE_STUDY / OTHER: allow assignment records for future modules without hard fail
  // beyond requiring a non-empty id.
  if (!entityId.trim()) throw new Error("Thiếu mã thực thể nội dung.");
}

async function assertMediaAssetAssignable(params: {
  mediaAssetId: string;
  entityType: ContentMediaEntityType;
  entityId: string;
}): Promise<{ id: string; url: string; visibility: string }> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.mediaAssetId },
    select: { id: true, url: true, visibility: true },
  });
  if (!asset) throw new Error("Không tìm thấy media asset.");

  if (params.entityType === "BLOG_POST") {
    const post = await prisma.blogPost.findUnique({
      where: { id: params.entityId },
      select: { status: true },
    });
    if (post?.status === "PUBLISHED" && asset.visibility !== "PUBLIC") {
      throw new Error("Không thể gán media không PUBLIC cho bài viết đã xuất bản.");
    }
  }

  return asset;
}

export async function listContentMediaAssignments(
  entityType: ContentMediaEntityType,
  entityId: string,
): Promise<ContentMediaAssignmentRow[]> {
  return prisma.contentMediaAssignment.findMany({
    where: { entityType, entityId },
    include: ASSIGNMENT_INCLUDE,
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getBlogMediaWorkspace(postId: string): Promise<{
  bundle: MediaBundleDetail | null;
  assignments: ContentMediaAssignmentRow[];
  readiness: ReturnType<typeof evaluateBlogMediaReadiness>;
  post: {
    id: string;
    title: string;
    status: string;
    featuredImageUrl: string | null;
    ogImageUrl: string | null;
    mediaBundleId: string | null;
  };
}> {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      status: true,
      featuredImageUrl: true,
      ogImageUrl: true,
      mediaBundleId: true,
      content: true,
    },
  });
  if (!post) throw new Error("Không tìm thấy bài viết.");

  const [assignments, bundle] = await Promise.all([
    listContentMediaAssignments("BLOG_POST", postId),
    post.mediaBundleId ? getMediaBundleForContent(post.mediaBundleId) : Promise.resolve(null),
  ]);

  const readiness = evaluateBlogMediaReadiness({
    status: post.status,
    featuredImageUrl: post.featuredImageUrl,
    ogImageUrl: post.ogImageUrl,
    contentLength: post.content?.length ?? 0,
    assignments: assignments.map((a) => ({
      placement: a.placement,
      mediaAsset: a.mediaAsset
        ? {
            visibility: a.mediaAsset.visibility,
            seoScore: a.mediaAsset.seoScore,
            altText: a.mediaAsset.altText,
          }
        : null,
    })),
    bundleHealthIncomplete: bundle
      ? bundle.health.status === "INCOMPLETE" || bundle.health.status === "BASIC"
      : false,
  });

  return { bundle, assignments, readiness, post };
}

async function syncBlogLegacyImageFields(
  tx: Prisma.TransactionClient,
  postId: string,
  placement: ContentMediaPlacement,
  assetUrl: string | null,
  mode: "set" | "clear-if-match",
  previousUrl?: string | null,
): Promise<void> {
  const field = placementToLegacyBlogField(placement);
  if (!field) return;

  if (mode === "set" && assetUrl) {
    await tx.blogPost.update({
      where: { id: postId },
      data: { [field]: assetUrl },
    });
    return;
  }

  if (mode === "clear-if-match") {
    const post = await tx.blogPost.findUnique({
      where: { id: postId },
      select: { featuredImageUrl: true, ogImageUrl: true },
    });
    if (!post) return;
    const current = field === "featuredImageUrl" ? post.featuredImageUrl : post.ogImageUrl;
    if (shouldClearLegacyUrl({ currentUrl: current, removedAssetUrl: previousUrl })) {
      await tx.blogPost.update({
        where: { id: postId },
        data: { [field]: null },
      });
    }
  }
}

export async function assignContentMedia(
  input: AssignContentMediaInput,
): Promise<ContentMediaAssignmentRow> {
  await assertEntityExists(input.entityType, input.entityId);
  const asset = await assertMediaAssetAssignable({
    mediaAssetId: input.mediaAssetId,
    entityType: input.entityType,
    entityId: input.entityId,
  });

  const slotKey = input.slotKey?.trim() || "";

  return prisma.$transaction(async (tx) => {
    if (isSingleAssetPlacement(input.placement)) {
      const existing = await tx.contentMediaAssignment.findMany({
        where: {
          entityType: input.entityType,
          entityId: input.entityId,
          placement: input.placement,
        },
        include: { mediaAsset: { select: { id: true, url: true } } },
      });

      const sameAsset = existing.find((row) => row.mediaAssetId === input.mediaAssetId);
      if (sameAsset) {
        return tx.contentMediaAssignment.findUniqueOrThrow({
          where: { id: sameAsset.id },
          include: ASSIGNMENT_INCLUDE,
        });
      }

      if (existing.length && !input.replaceExisting) {
        throw new Error(
          `Vị trí ${input.placement} đã có ảnh. Xác nhận thay thế trước khi gán mới.`,
        );
      }

      for (const row of existing) {
        await tx.contentMediaAssignment.delete({ where: { id: row.id } });
      }
    } else {
      const duplicate = await tx.contentMediaAssignment.findFirst({
        where: {
          entityType: input.entityType,
          entityId: input.entityId,
          placement: input.placement,
          mediaAssetId: input.mediaAssetId,
          slotKey,
        },
      });
      if (duplicate) {
        throw new Error("Media này đã được gán ở vị trí này.");
      }
    }

    let sortOrder = input.sortOrder;
    if (sortOrder == null) {
      const max = await tx.contentMediaAssignment.aggregate({
        where: {
          entityType: input.entityType,
          entityId: input.entityId,
          placement: input.placement,
        },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? -1) + 1;
    }

    const created = await tx.contentMediaAssignment.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        mediaAssetId: input.mediaAssetId,
        placement: input.placement,
        slotKey,
        sortOrder,
        altTextOverride: input.altTextOverride ?? null,
        captionOverride: input.captionOverride ?? null,
        metadata: input.metadata ?? undefined,
      },
      include: ASSIGNMENT_INCLUDE,
    });

    if (input.entityType === "BLOG_POST") {
      await syncBlogLegacyImageFields(tx, input.entityId, input.placement, asset.url, "set");
    }

    return created;
  });
}

export async function replaceContentMediaPlacement(params: {
  entityType: ContentMediaEntityType;
  entityId: string;
  placement: ContentMediaPlacement;
  mediaAssetIds: string[];
  slotKeys?: string[];
}): Promise<ContentMediaAssignmentRow[]> {
  await assertEntityExists(params.entityType, params.entityId);

  return prisma.$transaction(async (tx) => {
    const previous = await tx.contentMediaAssignment.findMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        placement: params.placement,
      },
      include: { mediaAsset: { select: { url: true } } },
    });

    await tx.contentMediaAssignment.deleteMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        placement: params.placement,
      },
    });

    const created: ContentMediaAssignmentRow[] = [];
    let index = 0;
    for (const mediaAssetId of params.mediaAssetIds) {
      const asset = await assertMediaAssetAssignable({
        mediaAssetId,
        entityType: params.entityType,
        entityId: params.entityId,
      });
      const row = await tx.contentMediaAssignment.create({
        data: {
          entityType: params.entityType,
          entityId: params.entityId,
          mediaAssetId,
          placement: params.placement,
          slotKey: params.slotKeys?.[index]?.trim() || "",
          sortOrder: index,
        },
        include: ASSIGNMENT_INCLUDE,
      });
      created.push(row);
      if (params.entityType === "BLOG_POST" && index === 0) {
        await syncBlogLegacyImageFields(tx, params.entityId, params.placement, asset.url, "set");
      }
      index += 1;
    }

    if (params.entityType === "BLOG_POST" && params.mediaAssetIds.length === 0) {
      const prevUrl = previous[0]?.mediaAsset?.url ?? null;
      await syncBlogLegacyImageFields(
        tx,
        params.entityId,
        params.placement,
        null,
        "clear-if-match",
        prevUrl,
      );
    }

    return created;
  });
}

export async function removeContentMediaAssignment(
  assignmentId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.contentMediaAssignment.findUnique({
      where: { id: assignmentId },
      include: { mediaAsset: { select: { url: true } } },
    });
    if (!existing) throw new Error("Không tìm thấy gán media.");

    await tx.contentMediaAssignment.delete({ where: { id: assignmentId } });

    if (existing.entityType === "BLOG_POST") {
      await syncBlogLegacyImageFields(
        tx,
        existing.entityId,
        existing.placement,
        null,
        "clear-if-match",
        existing.mediaAsset.url,
      );
    }
  });
}

export async function reorderContentMediaAssignments(params: {
  entityType: ContentMediaEntityType;
  entityId: string;
  placement: ContentMediaPlacement;
  orderedAssignmentIds: string[];
}): Promise<ContentMediaAssignmentRow[]> {
  await assertEntityExists(params.entityType, params.entityId);

  return prisma.$transaction(async (tx) => {
    const rows = await tx.contentMediaAssignment.findMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        placement: params.placement,
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const id of params.orderedAssignmentIds) {
      if (!byId.has(id)) throw new Error("Danh sách sắp xếp chứa gán media không hợp lệ.");
    }

    let order = 0;
    for (const id of params.orderedAssignmentIds) {
      await tx.contentMediaAssignment.update({
        where: { id },
        data: { sortOrder: order++ },
      });
    }

    return tx.contentMediaAssignment.findMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        placement: params.placement,
      },
      include: ASSIGNMENT_INCLUDE,
      orderBy: { sortOrder: "asc" },
    });
  });
}

export async function assignBundleSlotToContent(params: {
  entityType: ContentMediaEntityType;
  entityId: string;
  mediaBundleId: string;
  slotId: string;
  mediaAssetId: string;
  replaceExisting?: boolean;
}): Promise<ContentMediaAssignmentRow> {
  const slot = await prisma.mediaBundleSlot.findFirst({
    where: { id: params.slotId, mediaBundleId: params.mediaBundleId },
    select: { id: true, slotType: true },
  });
  if (!slot) throw new Error("Không tìm thấy vị trí trong Bundle.");

  const link = await prisma.mediaBundleSlotAsset.findUnique({
    where: {
      mediaBundleSlotId_mediaAssetId: {
        mediaBundleSlotId: slot.id,
        mediaAssetId: params.mediaAssetId,
      },
    },
  });
  if (!link) throw new Error("Media không thuộc vị trí Bundle đã chọn.");

  const placement = mapBundleSlotToBlogPlacement(slot.slotType as MediaBundleSlotType);
  if (!placement) throw new Error("Loại vị trí Bundle không hỗ trợ cho nội dung này.");

  return assignContentMedia({
    entityType: params.entityType,
    entityId: params.entityId,
    mediaAssetId: params.mediaAssetId,
    placement,
    slotKey: slot.id,
    replaceExisting: params.replaceExisting,
    metadata: { source: "bundle-slot", mediaBundleId: params.mediaBundleId, slotType: slot.slotType },
  });
}

export async function importBundleAssetsToContent(
  input: ImportFromBundleInput,
): Promise<{
  created: ContentMediaAssignmentRow[];
  skipped: Array<{ mediaAssetId: string; reason: string }>;
  bundle: MediaBundleDetail | null;
}> {
  await assertEntityExists(input.entityType, input.entityId);
  const bundle = await getMediaBundleForContent(input.mediaBundleId);
  if (!bundle) throw new Error("Không tìm thấy bộ media.");
  if (bundle.status === "ARCHIVED") {
    throw new Error("Không thể nhập từ Bundle đã lưu trữ. Bundle đang liên kết vẫn xem được.");
  }
  if (!bundle.isActive) {
    throw new Error("Bundle không hoạt động — không thể chọn mới.");
  }

  const created: ContentMediaAssignmentRow[] = [];
  const skipped: Array<{ mediaAssetId: string; reason: string }> = [];
  const assetFilter = input.mediaAssetIds ? new Set(input.mediaAssetIds) : null;
  const slotFilter = input.slotIds ? new Set(input.slotIds) : null;

  const existing = await listContentMediaAssignments(input.entityType, input.entityId);
  const occupiedSingles = new Set(
    existing.filter((a) => isSingleAssetPlacement(a.placement)).map((a) => a.placement),
  );
  const existingKeys = new Set(
    existing.map((a) => `${a.placement}:${a.mediaAssetId}:${a.slotKey}`),
  );

  for (const slot of bundle.slots) {
    if (slotFilter && !slotFilter.has(slot.id)) continue;
    const placement = mapBundleSlotToBlogPlacement(slot.slotType);
    if (!placement) continue;

    for (const item of slot.assets) {
      const mediaAssetId = item.id;
      if (assetFilter && !assetFilter.has(mediaAssetId)) continue;

      const key = `${placement}:${mediaAssetId}:${slot.id}`;
      if (existingKeys.has(key) || existingKeys.has(`${placement}:${mediaAssetId}:`)) {
        skipped.push({ mediaAssetId, reason: "Đã gán" });
        continue;
      }

      if (isSingleAssetPlacement(placement) && occupiedSingles.has(placement)) {
        if (!input.replaceExisting) {
          skipped.push({
            mediaAssetId,
            reason: `${placement} đã có ảnh — cần xác nhận thay thế`,
          });
          continue;
        }
      }

      try {
        const row = await assignContentMedia({
          entityType: input.entityType,
          entityId: input.entityId,
          mediaAssetId,
          placement,
          slotKey: slot.id,
          replaceExisting: input.replaceExisting,
          metadata: {
            source: "bundle-import",
            mediaBundleId: input.mediaBundleId,
            slotType: slot.slotType,
          },
        });
        created.push(row);
        existingKeys.add(key);
        if (isSingleAssetPlacement(placement)) occupiedSingles.add(placement);
      } catch (err) {
        skipped.push({
          mediaAssetId,
          reason: err instanceof Error ? err.message : "Không thể gán",
        });
      }
    }
  }

  if (input.keepBundleLink !== false && input.entityType === "BLOG_POST") {
    await prisma.blogPost.update({
      where: { id: input.entityId },
      data: { mediaBundleId: input.mediaBundleId },
    });
  }

  const refreshed = await getMediaBundleForContent(input.mediaBundleId);
  return { created, skipped, bundle: refreshed };
}

export async function setBlogMediaBundleLink(
  postId: string,
  mediaBundleId: string | null,
): Promise<void> {
  await assertEntityExists("BLOG_POST", postId);
  if (mediaBundleId) {
    const bundle = await prisma.mediaBundle.findUnique({
      where: { id: mediaBundleId },
      select: { id: true, status: true, isActive: true },
    });
    if (!bundle) throw new Error("Không tìm thấy bộ media.");
    // Allow keeping inactive/archived if already linked; block new selection of archived.
    if (bundle.status === "ARCHIVED") {
      throw new Error("Không thể chọn Bundle đã lưu trữ.");
    }
    if (!bundle.isActive) {
      throw new Error("Không thể chọn Bundle không hoạt động.");
    }
  }
  await prisma.blogPost.update({
    where: { id: postId },
    data: { mediaBundleId },
  });
}

export async function clearContentMediaAssignments(
  entityType: ContentMediaEntityType,
  entityId: string,
): Promise<number> {
  const result = await prisma.contentMediaAssignment.deleteMany({
    where: { entityType, entityId },
  });
  return result.count;
}

export async function listBundlesConsumingBlog(mediaBundleId: string): Promise<
  Array<{ id: string; title: string; status: string; slug: string }>
> {
  return prisma.blogPost.findMany({
    where: { mediaBundleId },
    select: { id: true, title: true, status: true, slug: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function countBundleBlogConsumers(mediaBundleId: string): Promise<number> {
  return prisma.blogPost.count({ where: { mediaBundleId } });
}

/** Public detail helpers: prefer relational featured/og URLs. */
export async function resolveBlogFeaturedImageUrl(post: {
  id: string;
  featuredImageUrl?: string | null;
}): Promise<string | null> {
  const featured = await prisma.contentMediaAssignment.findFirst({
    where: {
      entityType: "BLOG_POST",
      entityId: post.id,
      placement: "FEATURED",
    },
    include: {
      mediaAsset: { select: { url: true, visibility: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  if (featured?.mediaAsset?.visibility === "PUBLIC") {
    return featured.mediaAsset.url;
  }
  return post.featuredImageUrl ?? null;
}

export async function resolveBlogOgImageFromAssignments(post: {
  id: string;
  ogImageUrl?: string | null;
  featuredImageUrl?: string | null;
}): Promise<string | null> {
  const og = await prisma.contentMediaAssignment.findFirst({
    where: {
      entityType: "BLOG_POST",
      entityId: post.id,
      placement: "OG_IMAGE",
    },
    include: {
      mediaAsset: { select: { url: true, visibility: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  if (og?.mediaAsset?.visibility === "PUBLIC") return og.mediaAsset.url;

  const featured = await prisma.contentMediaAssignment.findFirst({
    where: {
      entityType: "BLOG_POST",
      entityId: post.id,
      placement: "FEATURED",
    },
    include: {
      mediaAsset: { select: { url: true, visibility: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  if (featured?.mediaAsset?.visibility === "PUBLIC") return featured.mediaAsset.url;

  return post.ogImageUrl || post.featuredImageUrl || null;
}

export async function assertBlogPublishMediaReady(postId: string): Promise<void> {
  const workspace = await getBlogMediaWorkspace(postId);
  const readiness = evaluateBlogMediaReadiness({
    status: "PUBLISHED",
    requireFeatured: false,
    featuredImageUrl: workspace.post.featuredImageUrl,
    ogImageUrl: workspace.post.ogImageUrl,
    contentLength: 0,
    assignments: workspace.assignments.map((a) => ({
      placement: a.placement,
      mediaAsset: a.mediaAsset
        ? {
            visibility: a.mediaAsset.visibility,
            seoScore: a.mediaAsset.seoScore,
            altText: a.mediaAsset.altText,
          }
        : null,
    })),
    bundleHealthIncomplete:
      workspace.bundle != null &&
      (workspace.bundle.health.status === "INCOMPLETE" ||
        workspace.bundle.health.status === "BASIC"),
  });
  if (!readiness.ready) {
    throw new Error(readiness.errors.join(" ") || "Media chưa sẵn sàng để xuất bản.");
  }
}
