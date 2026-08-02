import { createHash } from "node:crypto";
import type { MediaBundleSlotType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findInlineMediaCandidates } from "@/features/content/inline-media/inline-media-candidates";
import {
  countWordsFromHtml,
  MIN_INLINE_SCORE_THRESHOLD,
  MIN_TEXT_DISTANCE_BETWEEN_IMAGES,
  resolveImageCountPolicy,
  SHORT_SECTION_CHAR_LIMIT,
} from "@/features/content/inline-media/image-count-policy";
import { defaultMediaPlacementRanker } from "@/features/content/inline-media/media-placement-ranker";
import { parseArticleSections } from "@/features/content/inline-media/parse-article-sections";
import { deriveSectionMediaIntent } from "@/features/content/inline-media/section-media-intent";
import type {
  InlineMediaBlock,
  InlineMediaPlan,
  InlineMediaPlanMode,
  ProposedInlinePlacement,
} from "@/features/content/inline-media/inline-media.types";
import {
  assignmentMetaToBlock,
  INLINE_META_KEY,
  isInlineMediaAssignmentMeta,
} from "@/features/content/inline-media/inline-media.types";

export type PlanInlineMediaPlacementInput = {
  topicId?: string | null;
  writingDraftId?: string | null;
  blogPostId?: string | null;
  mediaBundleId?: string | null;
  mode?: InlineMediaPlanMode;
  /** HTML override — used when planning against unsaved editor content. */
  contentHtml?: string | null;
  excludedMediaIds?: string[];
  rejectedMediaIds?: string[];
};

function blockIdFor(sectionId: string, mediaAssetId: string): string {
  return `imb_${createHash("sha1").update(`${sectionId}:${mediaAssetId}`).digest("hex").slice(0, 16)}`;
}

function pickPosition(intent: string, textLength: number): InlineMediaBlock["placement"]["position"] {
  if (intent === "CONTACT" || intent === "SHOWROOM") return "BEFORE_CTA";
  if (intent === "HERO_SUPPORT") return "AFTER_INTRO";
  if (textLength > 600) return "BETWEEN_PARAGRAPHS";
  return "AFTER_HEADING";
}

async function loadPlanContext(input: PlanInlineMediaPlacementInput): Promise<{
  html: string;
  topicId: string | null;
  mediaBundleId: string | null;
  coverMediaIds: Set<string>;
  existingBlocks: InlineMediaBlock[];
  entityType: "BLOG_POST" | "WRITING_DRAFT" | null;
  entityId: string | null;
  topicKeywords: string[];
}> {
  let html = input.contentHtml?.trim() || "";
  let topicId = input.topicId ?? null;
  let mediaBundleId = input.mediaBundleId ?? null;
  const coverMediaIds = new Set<string>();
  const existingBlocks: InlineMediaBlock[] = [];
  let entityType: "BLOG_POST" | "WRITING_DRAFT" | null = null;
  let entityId: string | null = null;
  let topicKeywords: string[] = [];

  if (input.blogPostId) {
    entityType = "BLOG_POST";
    entityId = input.blogPostId;
    const post = await prisma.blogPost.findUnique({
      where: { id: input.blogPostId },
      select: {
        content: true,
        mediaBundleId: true,
        sourceWritingDraftId: true,
      },
    });
    if (!post) throw new Error("Không tìm thấy bài Blog.");
    if (!html) html = post.content ?? "";
    mediaBundleId = mediaBundleId ?? post.mediaBundleId;

    if (!topicId && post.sourceWritingDraftId) {
      const draft = await prisma.writingDraftRecord.findUnique({
        where: { id: post.sourceWritingDraftId },
        select: { writingPlan: { select: { topicId: true } } },
      });
      topicId = draft?.writingPlan?.topicId ?? null;
    }

    const assignments = await prisma.contentMediaAssignment.findMany({
      where: { entityType: "BLOG_POST", entityId: input.blogPostId },
      include: {
        mediaAsset: { select: { altText: true, caption: true } },
      },
    });

    for (const row of assignments) {
      if (row.placement === "FEATURED" || row.placement === "COVER" || row.placement === "OG_IMAGE") {
        coverMediaIds.add(row.mediaAssetId);
      }
      if (row.placement !== "INLINE") continue;
      const metaRoot =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null;
      const inline = metaRoot?.[INLINE_META_KEY];
      if (isInlineMediaAssignmentMeta(inline)) {
        existingBlocks.push(
          assignmentMetaToBlock(
            row.mediaAssetId,
            inline,
            row.altTextOverride?.trim() || row.mediaAsset.altText || "Hình minh họa ATTD",
            row.captionOverride ?? row.mediaAsset.caption,
          ),
        );
      }
    }
  }

  if (input.writingDraftId) {
    entityType = entityType ?? "WRITING_DRAFT";
    entityId = entityId ?? input.writingDraftId;
    const draft = await prisma.writingDraftRecord.findUnique({
      where: { id: input.writingDraftId },
      select: {
        structuredDraft: true,
        renderedHtml: true,
        writingPlan: {
          select: {
            topicId: true,
          },
        },
      },
    });
    if (!draft) throw new Error("Không tìm thấy Writing Draft.");
    topicId = topicId ?? draft.writingPlan?.topicId ?? null;

    const structured = draft.structuredDraft as {
      rendered?: { html?: string };
      sections?: Array<{ heading: string; html: string }>;
      media?: Array<{ mediaAssetId: string; placement: string }>;
    } | null;

    if (!html) {
      if (draft.renderedHtml) html = draft.renderedHtml;
      else if (structured?.rendered?.html) html = structured.rendered.html;
      else if (structured?.sections?.length) {
        html = structured.sections
          .map((section) => `<h2>${section.heading}</h2>\n${section.html}`)
          .join("\n");
      }
    }

    for (const media of structured?.media ?? []) {
      if (
        media.placement === "FEATURED" ||
        media.placement === "COVER" ||
        media.placement === "OG_IMAGE"
      ) {
        coverMediaIds.add(media.mediaAssetId);
      }
    }
  }

  if (!html.trim()) throw new Error("Không có nội dung HTML để lập kế hoạch ảnh.");

  if (topicId) {
    const topic = await prisma.seoTopic.findUnique({
      where: { id: topicId },
      select: {
        mediaBundleId: true,
        primaryKeyword: true,
        title: true,
        keywords: { select: { keyword: true }, take: 12 },
      },
    });
    if (!mediaBundleId) mediaBundleId = topic?.mediaBundleId ?? null;
    topicKeywords = [
      topic?.primaryKeyword,
      topic?.title,
      ...(topic?.keywords.map((row) => row.keyword) ?? []),
    ].filter((value): value is string => Boolean(value?.trim()));
  }

  return {
    html,
    topicId,
    mediaBundleId,
    coverMediaIds,
    existingBlocks,
    entityType,
    entityId,
    topicKeywords,
  };
}

/**
 * Plan inline media placements. Never mutates content. Never overwrites locked
 * or editor-selected blocks in APPLY/REBUILD modes (those are honored here by
 * reserving their sections/assets).
 */
export async function planInlineMediaPlacement(
  input: PlanInlineMediaPlacementInput,
): Promise<InlineMediaPlan> {
  const started = Date.now();
  const mode = input.mode ?? "SUGGEST_ONLY";
  const ctx = await loadPlanContext(input);
  const wordCount = countWordsFromHtml(ctx.html);
  const policy = resolveImageCountPolicy(wordCount);
  const sections = parseArticleSections(ctx.html);

  const warnings: string[] = [];
  const gaps: string[] = [];
  const skippedSections: InlineMediaPlan["skippedSections"] = [];
  const placements: ProposedInlinePlacement[] = [];

  const lockedOrEditor = ctx.existingBlocks.filter(
    (block) => block.locked || block.selectedBy === "EDITOR",
  );
  const usedMediaIds = new Set<string>([
    ...lockedOrEditor.map((block) => block.mediaAssetId),
    ...(input.excludedMediaIds ?? []),
  ]);
  const reservedSections = new Set(lockedOrEditor.map((block) => block.placement.afterSectionId));
  const usedCollectionIds = new Map<string, number>();
  const rejected = new Set(input.rejectedMediaIds ?? []);

  // Preserve locked/editor blocks as proposed placements so the UI can show them.
  for (const block of lockedOrEditor) {
    const section = sections.find((item) => item.id === block.placement.afterSectionId);
    if (!section) continue;
    placements.push({
      block,
      candidate: {
        mediaAssetId: block.mediaAssetId,
        url: "",
        thumbnailUrl: null,
        title: null,
        altText: block.altText,
        caption: block.caption,
        width: null,
        height: null,
        orientation: "UNKNOWN",
        seoScore: 0,
        seoReadinessStatus: "BASIC",
        visibility: "PUBLIC",
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
      section,
      score: {
        total: block.score ?? 100,
        signals: [{ key: "preserved", points: block.score ?? 100, detail: "Locked/editor placement" }],
      },
    });
  }

  const eligible = sections.filter((section) => {
    if (section.excluded) {
      skippedSections.push({ sectionId: section.id, heading: section.heading, reason: "Excluded section type" });
      return false;
    }
    if (section.level !== 2) {
      skippedSections.push({ sectionId: section.id, heading: section.heading, reason: "Prefer major H2 sections" });
      return false;
    }
    if (reservedSections.has(section.id)) return false;
    if (section.textLength < 80) {
      skippedSections.push({ sectionId: section.id, heading: section.heading, reason: "Section too short" });
      return false;
    }
    return true;
  });

  // Prefer major sections with stronger intents first.
  const intentPriority: Record<string, number> = {
    MATERIAL_DETAIL: 10,
    PRINT_METHOD: 9,
    PROCESS: 8,
    SIZE_CHART: 7,
    PRODUCT_OVERVIEW: 6,
    HERO_SUPPORT: 5,
    FIT: 5,
    FACTORY: 4,
    CONTACT: 3,
    GENERAL: 1,
  };

  eligible.sort((a, b) => {
    const pa = intentPriority[a.intent] ?? 0;
    const pb = intentPriority[b.intent] ?? 0;
    if (pb !== pa) return pb - pa;
    return b.textLength - a.textLength;
  });

  let bundleHitCount = 0;
  let discoveryHitCount = 0;
  let candidateCount = 0;
  let brokenBundleUrlCount = 0;
  const scores: number[] = [];
  const candidateCache = new Map<
    string,
    Awaited<ReturnType<typeof findInlineMediaCandidates>>
  >();

  const targetSlots = Math.max(0, policy.recommended - lockedOrEditor.length);

  for (const section of eligible) {
    if (placements.length >= policy.max) break;
    const systemCount = placements.filter((p) => p.block.selectedBy === "SYSTEM").length;
    if (systemCount >= targetSlots && placements.length >= Math.min(policy.recommended, policy.max)) {
      break;
    }

    // Enforce spacing vs every already chosen section.
    const tooClose = placements.some((existing) => {
      const distance = Math.abs(section.headingStart - existing.section.headingStart);
      return distance < MIN_TEXT_DISTANCE_BETWEEN_IMAGES;
    });
    if (tooClose) {
      skippedSections.push({
        sectionId: section.id,
        heading: section.heading,
        reason: "Too close to another image",
      });
      continue;
    }

    // Intent is heading-driven only — topic keywords must not rewrite every
    // section to PRODUCT_OVERVIEW just because the topic mentions "áo polo".
    const derived = deriveSectionMediaIntent({ heading: section.heading });
    const cacheKey = `${derived.intent}|${[...usedMediaIds].sort().join(",")}`;
    let retrieved = candidateCache.get(cacheKey);
    if (!retrieved) {
      retrieved = await findInlineMediaCandidates({
        topicId: ctx.topicId,
        sectionId: section.id,
        sectionHeading: section.heading,
        intent: derived.intent,
        preferredSlots: derived.preferredSlots as MediaBundleSlotType[],
        preferredSuitabilities: derived.preferredSuitabilities,
        mediaBundleId: ctx.mediaBundleId,
        excludedMediaIds: [...usedMediaIds],
        topicKeywords: ctx.topicKeywords,
        limit: 24,
      });
      candidateCache.set(cacheKey, retrieved);
    }

    const { candidates, bundleHits, discoveryHits, brokenBundleUrlCount: broken } = retrieved;

    bundleHitCount += bundleHits;
    discoveryHitCount += discoveryHits;
    brokenBundleUrlCount = Math.max(brokenBundleUrlCount, broken);
    candidateCount += candidates.length;

    if (!candidates.length) {
      gaps.push(`Không có ứng viên phù hợp cho “${section.heading}”.`);
      skippedSections.push({ sectionId: section.id, heading: section.heading, reason: "No candidates" });
      continue;
    }

    const ranked = await defaultMediaPlacementRanker.rank({
      candidates,
      scoreInput: {
        intent: derived.intent,
        preferredSlots: derived.preferredSlots,
        preferredSuitabilities: derived.preferredSuitabilities,
        sectionHeading: section.heading,
        sectionKeywords: ctx.topicKeywords,
        usedMediaIds,
        usedCollectionIds,
        coverMediaIds: ctx.coverMediaIds,
        rejectedMediaIds: rejected,
      },
    });

    const best = ranked[0];
    if (!best || best.score.total < MIN_INLINE_SCORE_THRESHOLD) {
      skippedSections.push({
        sectionId: section.id,
        heading: section.heading,
        reason: `Best score ${best?.score.total ?? 0} below threshold`,
      });
      gaps.push(`Ứng viên yếu cho “${section.heading}” — bỏ qua.`);
      continue;
    }

    if (section.textLength < SHORT_SECTION_CHAR_LIMIT) {
      // Still allow one image, but only if score is strong.
      if (best.score.total < MIN_INLINE_SCORE_THRESHOLD + 10) {
        skippedSections.push({
          sectionId: section.id,
          heading: section.heading,
          reason: "Short section needs stronger candidate",
        });
        continue;
      }
    }

    const position = pickPosition(derived.intent, section.textLength);
    const altText =
      best.candidate.altText?.trim() ||
      best.candidate.title?.trim() ||
      `${section.heading} — minh họa ATTD`;

    const block: InlineMediaBlock = {
      id: blockIdFor(section.id, best.candidate.mediaAssetId),
      type: "IMAGE",
      mediaAssetId: best.candidate.mediaAssetId,
      placement: { afterSectionId: section.id, position },
      variant: "CONTENT_WIDTH",
      caption: best.candidate.caption,
      altText,
      sourceCredit: null,
      locked: false,
      selectedBy: "SYSTEM",
      selectionReason: best.score.signals
        .slice()
        .sort((a, b) => b.points - a.points)
        .slice(0, 3)
        .map((signal) => signal.detail)
        .join("; "),
      score: best.score.total,
    };

    placements.push({ block, candidate: best.candidate, section, score: best.score });
    usedMediaIds.add(best.candidate.mediaAssetId);
    scores.push(best.score.total);
    for (const collectionId of best.candidate.collectionIds) {
      usedCollectionIds.set(collectionId, (usedCollectionIds.get(collectionId) ?? 0) + 1);
    }
  }

  if (placements.length < policy.min) {
    warnings.push(
      `Chỉ đề xuất ${placements.length}/${policy.min} ảnh tối thiểu — thiếu tài sản phù hợp hơn là ép ảnh yếu.`,
    );
  }

  if (brokenBundleUrlCount > 0) {
    warnings.push(
      `${brokenBundleUrlCount} ảnh trong Media Bundle không có URL công khai hợp lệ (ví dụ Vercel Blob đã bị chặn) — cần migrate sang CDN công khai trước khi dùng làm ảnh nội dung.`,
    );
  }

  if (mode !== "SUGGEST_ONLY") {
    warnings.push("Chế độ apply/rebuild chỉ chạy khi editor xác nhận qua API apply.");
  }

  return {
    targetCount: policy.recommended,
    proposedCount: placements.length,
    placements,
    skippedSections,
    gaps,
    warnings,
    durationMs: Date.now() - started,
    diagnostics: {
      candidateCount,
      bundleHitCount,
      discoveryHitCount,
      scoreRange: scores.length ? { min: Math.min(...scores), max: Math.max(...scores) } : null,
    },
  };
}
