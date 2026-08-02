import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";
import { assignContentMedia } from "@/features/content/services/content-media-assignment.service";
import {
  buildInlineMediaFigureHtml,
  removeInlineFigureByBlockId,
  removeInlineFigureByMediaId,
} from "@/features/content/inline-media/inline-media-figure";
import { insertFigureIntoHtml, parseArticleSections } from "@/features/content/inline-media/parse-article-sections";
import type {
  InlineMediaAssignmentMeta,
  InlineMediaApplyResult,
  InlineMediaBlock,
  ProposedInlinePlacement,
} from "@/features/content/inline-media/inline-media.types";
import {
  assignmentMetaToBlock,
  blockToAssignmentMeta,
  INLINE_META_KEY,
  isInlineMediaAssignmentMeta,
} from "@/features/content/inline-media/inline-media.types";
import { serializeInlineMediaPlan } from "@/features/content/inline-media/serialize-inline-media-plan";

export { serializeInlineMediaPlan };

function readInlineMeta(metadata: Prisma.JsonValue | null): InlineMediaAssignmentMeta | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const inline = (metadata as Record<string, unknown>)[INLINE_META_KEY];
  return isInlineMediaAssignmentMeta(inline) ? inline : null;
}

async function loadBlogContent(blogPostId: string) {
  const post = await prisma.blogPost.findUnique({
    where: { id: blogPostId },
    select: { id: true, content: true, status: true },
  });
  if (!post) throw new Error("Không tìm thấy bài Blog.");
  return post;
}

async function listInlineAssignments(blogPostId: string) {
  return prisma.contentMediaAssignment.findMany({
    where: { entityType: "BLOG_POST", entityId: blogPostId, placement: "INLINE" },
    include: {
      mediaAsset: {
        select: {
          id: true,
          url: true,
          altText: true,
          caption: true,
          width: true,
          height: true,
          visibility: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

function rebuildContentWithPlacements(
  baseHtml: string,
  placements: ProposedInlinePlacement[],
): string {
  // Start from content with previous system figures for these block ids removed.
  let html = baseHtml;
  for (const placement of placements) {
    html = removeInlineFigureByBlockId(html, placement.block.id);
    html = removeInlineFigureByMediaId(html, placement.block.mediaAssetId);
  }

  // Re-parse sections against the cleaned HTML.
  const sections = parseArticleSections(html);
  // Insert from bottom to top so earlier offsets stay valid.
  const ordered = [...placements].sort(
    (a, b) => b.section.headingStart - a.section.headingStart,
  );

  for (const placement of ordered) {
    const section =
      sections.find((item) => item.id === placement.section.id) ??
      sections.find((item) => item.heading === placement.section.heading);
    if (!section) continue;

    if (!placement.candidate.url) continue;
    if (placement.block.altText.trim() === "") continue;

    const figure = buildInlineMediaFigureHtml({
      mediaAssetId: placement.block.mediaAssetId,
      url: placement.candidate.url,
      altText: placement.block.altText,
      caption: placement.block.caption,
      sourceCredit: placement.block.sourceCredit,
      variant: placement.block.variant,
      width: placement.candidate.width,
      height: placement.candidate.height,
      blockId: placement.block.id,
    });

    html = insertFigureIntoHtml(html, section, figure, placement.block.placement.position);
  }

  return html.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Apply a reviewed plan to a Blog post.
 * - Never overwrites locked or editor-selected placements.
 * - Idempotent: re-applying the same plan yields the same assignments.
 * - Does not change publish status.
 */
export async function applyInlineMediaPlan(input: {
  blogPostId: string;
  placements: ProposedInlinePlacement[];
  /** When true, remove prior SYSTEM/unlocked inline placements not in the plan. */
  rebuildUnlocked?: boolean;
}): Promise<InlineMediaApplyResult> {
  const post = await loadBlogContent(input.blogPostId);
  const existing = await listInlineAssignments(input.blogPostId);
  const warnings: string[] = [];

  const lockedOrEditor = existing.filter((row) => {
    const meta = readInlineMeta(row.metadata);
    return Boolean(meta && (meta.locked || meta.selectedBy === "EDITOR"));
  });
  const lockedIds = new Set(lockedOrEditor.map((row) => row.mediaAssetId));
  const lockedBlockIds = new Set(
    lockedOrEditor
      .map((row) => readInlineMeta(row.metadata)?.blockId)
      .filter(Boolean) as string[],
  );

  let removedUnlocked = 0;
  if (input.rebuildUnlocked) {
    for (const row of existing) {
      const meta = readInlineMeta(row.metadata);
      if (meta && (meta.locked || meta.selectedBy === "EDITOR")) continue;
      // Keep if the plan still references this asset/block.
      const stillWanted = input.placements.some(
        (placement) =>
          placement.block.mediaAssetId === row.mediaAssetId ||
          placement.block.id === meta?.blockId,
      );
      if (stillWanted) continue;
      await prisma.contentMediaAssignment.delete({ where: { id: row.id } });
      removedUnlocked += 1;
    }
  }

  const accepted: ProposedInlinePlacement[] = [];
  let skippedLocked = 0;

  for (const placement of input.placements) {
    if (lockedIds.has(placement.block.mediaAssetId) || lockedBlockIds.has(placement.block.id)) {
      // Preserve existing locked/editor block as-is.
      skippedLocked += 1;
      continue;
    }

    if (placement.candidate.visibility && placement.candidate.visibility !== "PUBLIC") {
      warnings.push(`Bỏ qua asset không PUBLIC: ${placement.block.mediaAssetId}`);
      continue;
    }

    // Resolve URL if the planner preserved a locked stub without url.
    let url = placement.candidate.url;
    let width = placement.candidate.width;
    let height = placement.candidate.height;
    if (!url) {
      const asset = await prisma.mediaAsset.findUnique({
        where: { id: placement.block.mediaAssetId },
        select: { url: true, width: true, height: true, visibility: true, altText: true },
      });
      if (!asset || asset.visibility !== "PUBLIC") {
        warnings.push(`Asset không dùng được: ${placement.block.mediaAssetId}`);
        continue;
      }
      url = getPublicMediaUrl(asset.url) ?? "";
      width = asset.width;
      height = asset.height;
      if (!placement.block.altText.trim() && asset.altText) {
        placement.block.altText = asset.altText;
      }
    }
    if (!url) {
      warnings.push(`Không resolve được URL công khai: ${placement.block.mediaAssetId}`);
      continue;
    }
    if (!placement.block.altText.trim()) {
      warnings.push(`Thiếu alt — bỏ qua: ${placement.block.mediaAssetId}`);
      continue;
    }

    accepted.push({
      ...placement,
      candidate: { ...placement.candidate, url, width, height },
    });
  }

  // Also keep locked placements in the HTML rebuild.
  const preservedPlacements: ProposedInlinePlacement[] = [];
  for (const row of lockedOrEditor) {
    const meta = readInlineMeta(row.metadata);
    if (!meta) continue;
    const publicUrl = getPublicMediaUrl(row.mediaAsset.url);
    if (!publicUrl) continue;
    const block = assignmentMetaToBlock(
      row.mediaAssetId,
      meta,
      row.altTextOverride?.trim() || row.mediaAsset.altText || "Hình minh họa ATTD",
      row.captionOverride ?? row.mediaAsset.caption,
    );
    const sections = parseArticleSections(post.content ?? "");
    const section =
      sections.find((item) => item.id === block.placement.afterSectionId) ??
      sections.find((item) => item.heading === meta.sectionHeading) ??
      sections[0];
    if (!section) continue;
    preservedPlacements.push({
      block,
      section,
      candidate: {
        mediaAssetId: row.mediaAssetId,
        url: publicUrl,
        thumbnailUrl: null,
        title: null,
        altText: block.altText,
        caption: block.caption,
        width: row.mediaAsset.width,
        height: row.mediaAsset.height,
        orientation: "UNKNOWN",
        seoScore: 0,
        seoReadinessStatus: "BASIC",
        visibility: row.mediaAsset.visibility,
        contentSuitabilities: [],
        subjectTerms: [],
        useCaseTerms: [],
        industryTerms: [],
        libraryCode: null,
        roleCode: null,
        collectionIds: [],
        source: "ASSIGNMENT",
        bundleSlotType: null,
      },
      score: { total: block.score ?? 100, signals: [] },
    });
  }

  const nextContent = rebuildContentWithPlacements(post.content ?? "", [
    ...preservedPlacements,
    ...accepted,
  ]);

  // Persist assignments for accepted system placements.
  let applied = 0;
  let sortOrder = 0;
  for (const placement of accepted) {
    const metadata: Prisma.InputJsonValue = {
      [INLINE_META_KEY]: blockToAssignmentMeta(placement.block, placement.section.heading),
      source: "inline-media-planner",
    };

    // Idempotent: replace any prior row with the same block slotKey.
    await prisma.contentMediaAssignment.deleteMany({
      where: {
        entityType: "BLOG_POST",
        entityId: input.blogPostId,
        placement: "INLINE",
        slotKey: placement.block.id,
      },
    });

    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: input.blogPostId,
      mediaAssetId: placement.block.mediaAssetId,
      placement: "INLINE",
      slotKey: placement.block.id,
      sortOrder: sortOrder++,
      altTextOverride: placement.block.altText,
      captionOverride: placement.block.caption,
      metadata,
      replaceExisting: false,
    });
    applied += 1;
  }

  await prisma.blogPost.update({
    where: { id: input.blogPostId },
    data: {
      content: nextContent,
      // Do not touch status / publishedAt.
      contentModifiedAfterHandoff: true,
    },
  });

  const blocks = [...preservedPlacements, ...accepted].map((item) => item.block);

  return {
    applied,
    skippedLocked,
    removedUnlocked,
    content: nextContent,
    blocks,
    warnings,
  };
}

export async function replaceInlineMediaPlacement(input: {
  blogPostId: string;
  blockId: string;
  mediaAssetId: string;
  selectedBy?: "SYSTEM" | "EDITOR";
}): Promise<{ block: InlineMediaBlock; content: string }> {
  const post = await loadBlogContent(input.blogPostId);
  const existing = await listInlineAssignments(input.blogPostId);
  const current = existing.find((row) => readInlineMeta(row.metadata)?.blockId === input.blockId);
  if (!current) throw new Error("Không tìm thấy placement cần thay.");

  const meta = readInlineMeta(current.metadata);
  if (!meta) throw new Error("Placement thiếu metadata inline.");
  if (meta.locked) throw new Error("Placement đang khóa — mở khóa trước khi thay.");

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: input.mediaAssetId },
    select: {
      id: true,
      url: true,
      altText: true,
      caption: true,
      width: true,
      height: true,
      visibility: true,
    },
  });
  if (!asset || asset.visibility !== "PUBLIC") {
    throw new Error("Chỉ được thay bằng asset PUBLIC.");
  }
  const url = getPublicMediaUrl(asset.url);
  if (!url) throw new Error("Asset không có URL công khai hợp lệ.");

  const altText = asset.altText?.trim() || current.altTextOverride || "Hình minh họa ATTD";
  const block: InlineMediaBlock = {
    id: meta.blockId,
    type: "IMAGE",
    mediaAssetId: asset.id,
    placement: {
      afterSectionId: meta.afterSectionId,
      position: meta.position,
    },
    variant: meta.variant,
    caption: asset.caption,
    altText,
    sourceCredit: meta.sourceCredit,
    locked: false,
    selectedBy: input.selectedBy ?? "EDITOR",
    selectionReason: "Biên tập viên thay thế",
    score: meta.score,
  };

  await prisma.contentMediaAssignment.delete({ where: { id: current.id } });
  await assignContentMedia({
    entityType: "BLOG_POST",
    entityId: input.blogPostId,
    mediaAssetId: asset.id,
    placement: "INLINE",
    slotKey: block.id,
    sortOrder: current.sortOrder,
    altTextOverride: altText,
    captionOverride: asset.caption,
    metadata: {
      [INLINE_META_KEY]: blockToAssignmentMeta(block, meta.sectionHeading),
      source: "inline-media-replace",
    },
  });

  let html = removeInlineFigureByBlockId(post.content ?? "", block.id);
  html = removeInlineFigureByMediaId(html, current.mediaAssetId);
  const sections = parseArticleSections(html);
  const section =
    sections.find((item) => item.id === block.placement.afterSectionId) ??
    sections.find((item) => item.heading === meta.sectionHeading);
  if (section) {
    const figure = buildInlineMediaFigureHtml({
      mediaAssetId: asset.id,
      url,
      altText,
      caption: asset.caption,
      sourceCredit: block.sourceCredit,
      variant: block.variant,
      width: asset.width,
      height: asset.height,
      blockId: block.id,
    });
    html = insertFigureIntoHtml(html, section, figure, block.placement.position);
  }

  await prisma.blogPost.update({
    where: { id: input.blogPostId },
    data: { content: html, contentModifiedAfterHandoff: true },
  });

  return { block, content: html };
}

export async function lockInlineMediaPlacement(input: {
  blogPostId: string;
  blockId: string;
  locked: boolean;
}): Promise<InlineMediaBlock> {
  const existing = await listInlineAssignments(input.blogPostId);
  const current = existing.find((row) => readInlineMeta(row.metadata)?.blockId === input.blockId);
  if (!current) throw new Error("Không tìm thấy placement.");
  const meta = readInlineMeta(current.metadata);
  if (!meta) throw new Error("Placement thiếu metadata inline.");

  const nextMeta = { ...meta, locked: input.locked };
  const metadata: Prisma.InputJsonValue = {
    ...(typeof current.metadata === "object" && current.metadata && !Array.isArray(current.metadata)
      ? (current.metadata as Record<string, unknown>)
      : {}),
    [INLINE_META_KEY]: nextMeta,
  };

  await prisma.contentMediaAssignment.update({
    where: { id: current.id },
    data: { metadata },
  });

  return assignmentMetaToBlock(
    current.mediaAssetId,
    nextMeta,
    current.altTextOverride?.trim() || current.mediaAsset.altText || "Hình minh họa ATTD",
    current.captionOverride ?? current.mediaAsset.caption,
  );
}

export async function removeInlineMediaPlacement(input: {
  blogPostId: string;
  blockId: string;
}): Promise<{ content: string }> {
  const post = await loadBlogContent(input.blogPostId);
  const existing = await listInlineAssignments(input.blogPostId);
  const current = existing.find((row) => readInlineMeta(row.metadata)?.blockId === input.blockId);
  if (!current) throw new Error("Không tìm thấy placement.");
  const meta = readInlineMeta(current.metadata);
  if (meta?.locked) throw new Error("Placement đang khóa — mở khóa trước khi xóa.");

  await prisma.contentMediaAssignment.delete({ where: { id: current.id } });
  const content = removeInlineFigureByBlockId(
    removeInlineFigureByMediaId(post.content ?? "", current.mediaAssetId),
    input.blockId,
  );
  await prisma.blogPost.update({
    where: { id: input.blogPostId },
    data: { content, contentModifiedAfterHandoff: true },
  });
  return { content };
}

export async function listInlineMediaBlocks(blogPostId: string): Promise<InlineMediaBlock[]> {
  const existing = await listInlineAssignments(blogPostId);
  const blocks: InlineMediaBlock[] = [];
  for (const row of existing) {
    const meta = readInlineMeta(row.metadata);
    if (!meta) continue;
    blocks.push(
      assignmentMetaToBlock(
        row.mediaAssetId,
        meta,
        row.altTextOverride?.trim() || row.mediaAsset.altText || "Hình minh họa ATTD",
        row.captionOverride ?? row.mediaAsset.caption,
      ),
    );
  }
  return blocks;
}
