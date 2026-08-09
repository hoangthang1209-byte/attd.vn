/**
 * R1.1 Article #4 pre-publish fix (canonical + inline media SoT + copy).
 *
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/revenue-r1-1-article4-fix.ts
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/revenue-r1-1-article4-fix.ts --apply
 *
 * Does NOT publish.
 */

import { prisma } from "../src/lib/prisma";
import { normalizeBlogContent } from "../src/features/blog/content-normalizer";
import { analyzeBlogContent } from "../src/features/blog/content-metrics";
import { evaluateBlogReadiness } from "../src/features/blog/blog-readiness";
import { parseMarkdownBlocks } from "../src/features/blog/block-parser";
import { assignContentMedia } from "../src/features/content/services/content-media-assignment.service";
import { getContentPublishReadiness } from "../src/features/content/services/content-publish-readiness.service";
import { resolveMediaDependencies } from "../src/features/media/lifecycle/media-dependency.service";
import { extractInlineMediaIdsFromHtml } from "../src/features/content/inline-media/inline-media-figure";
import {
  INLINE_META_KEY,
  type InlineMediaAssignmentMeta,
} from "../src/features/content/inline-media/inline-media.types";
import {
  R1_BLOG_FORM,
  R1_FORM_INLINE_BLOCK_IDS,
  buildR1FormHtml,
} from "../src/features/content/revenue/r1-blog-form.content";
import {
  R1_MEDIA,
  countInternalLinks,
  countWordsFromHtml,
} from "../src/features/content/revenue/r1-shared";
import type { BlogFaqItem } from "../src/features/blog/types";

const APPLY = process.argv.includes("--apply");
const BLOG_ID = "cmsk0932x0005rwjijj5udpl5";
const CANONICAL = `https://www.attd.vn/blog/${R1_BLOG_FORM.slug}`;

function inlineMeta(
  blockId: string,
  sectionHeading: string,
  reason: string,
): { [INLINE_META_KEY]: InlineMediaAssignmentMeta; source: string } {
  return {
    [INLINE_META_KEY]: {
      blockId,
      afterSectionId: sectionHeading.toLowerCase().replace(/\s+/g, "-"),
      position: "AFTER_INTRO",
      variant: "CONTENT_WIDTH",
      sourceCredit: null,
      locked: false,
      selectedBy: "EDITOR",
      selectionReason: reason,
      score: null,
      sectionHeading,
    },
    source: "revenue-r1-1-article4-fix",
  };
}

function snapshotContent(html: string) {
  const metrics = analyzeBlogContent({ content: html, faqJson: [...R1_BLOG_FORM.faqJson] });
  return {
    wordCount: countWordsFromHtml(html),
    bodyImages: metrics.bodyImages,
    dataMediaIds: extractInlineMediaIdsFromHtml(html),
    editorInlineBlocks: parseMarkdownBlocks(html).filter((b) => b.type === "inline-media").length,
    internalLinks: countInternalLinks(html),
  };
}

async function main() {
  const before = await prisma.blogPost.findUnique({
    where: { id: BLOG_ID },
    select: {
      id: true,
      slug: true,
      status: true,
      canonicalUrl: true,
      content: true,
      featuredImageUrl: true,
      ogImageUrl: true,
    },
  });
  if (!before) throw new Error(`Blog not found: ${BLOG_ID}`);

  const beforeInlineAssignments = await prisma.contentMediaAssignment.count({
    where: { entityType: "BLOG_POST", entityId: BLOG_ID, placement: "INLINE" },
  });
  const beforeAssignments = await prisma.contentMediaAssignment.count({
    where: { entityType: "BLOG_POST", entityId: BLOG_ID },
  });
  const beforeSnap = snapshotContent(before.content ?? "");

  console.log("[before]", {
    status: before.status,
    canonicalUrl: before.canonicalUrl,
    assignmentsTotal: beforeAssignments,
    assignmentsInline: beforeInlineAssignments,
    ...beforeSnap,
  });

  const content = normalizeBlogContent(buildR1FormHtml());

  if (APPLY) {
    await prisma.blogPost.update({
      where: { id: BLOG_ID },
      data: {
        title: R1_BLOG_FORM.title,
        slug: R1_BLOG_FORM.slug,
        excerpt: R1_BLOG_FORM.excerpt,
        metaTitle: R1_BLOG_FORM.metaTitle,
        metaDescription: R1_BLOG_FORM.metaDescription,
        tags: [...R1_BLOG_FORM.tags],
        faqJson: R1_BLOG_FORM.faqJson,
        content,
        featuredImageUrl: R1_BLOG_FORM.coverUrl,
        ogImageUrl: R1_BLOG_FORM.coverUrl,
        canonicalUrl: CANONICAL,
        status: "DRAFT",
      },
    });

    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: R1_MEDIA.khoOversize.id,
      placement: "FEATURED",
      replaceExisting: true,
      altTextOverride: R1_MEDIA.khoOversize.alt,
    });
    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: R1_MEDIA.khoOversize.id,
      placement: "OG_IMAGE",
      replaceExisting: true,
      altTextOverride: R1_MEDIA.khoOversize.alt,
    });

    await prisma.contentMediaAssignment.deleteMany({
      where: { entityType: "BLOG_POST", entityId: BLOG_ID, placement: "INLINE" },
    });

    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: R1_MEDIA.regularDetail.id,
      placement: "INLINE",
      slotKey: R1_FORM_INLINE_BLOCK_IDS.regular,
      sortOrder: 0,
      altTextOverride: R1_MEDIA.regularDetail.alt,
      captionOverride: "Regular — nền phổ biến cho đồng phục và merchandise.",
      metadata: inlineMeta(
        R1_FORM_INLINE_BLOCK_IDS.regular,
        "Regular: khi nào hợp lý?",
        "Pre-existing inline image registered to ContentMediaAssignment SoT",
      ),
    });
    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: R1_MEDIA.khoThun.id,
      placement: "INLINE",
      slotKey: R1_FORM_INLINE_BLOCK_IDS.stock,
      sortOrder: 1,
      altTextOverride: R1_MEDIA.khoThun.alt,
      captionOverride: "Nhập form theo dữ liệu đơn thật, không chỉ theo ảnh trend.",
      metadata: inlineMeta(
        R1_FORM_INLINE_BLOCK_IDS.stock,
        "Oversize: khi nào hợp lý?",
        "Pre-existing inline image registered to ContentMediaAssignment SoT",
      ),
    });
  }

  const after = await prisma.blogPost.findUniqueOrThrow({
    where: { id: BLOG_ID },
    select: {
      id: true,
      slug: true,
      status: true,
      canonicalUrl: true,
      content: true,
      featuredImageUrl: true,
      ogImageUrl: true,
      faqJson: true,
      tags: true,
      metaTitle: true,
      metaDescription: true,
      title: true,
      excerpt: true,
    },
  });

  const html = APPLY ? after.content ?? "" : content;
  const afterSnap = snapshotContent(html);
  const afterAssignments = await prisma.contentMediaAssignment.findMany({
    where: { entityType: "BLOG_POST", entityId: BLOG_ID },
    select: { placement: true, mediaAssetId: true, slotKey: true, sortOrder: true },
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
  });

  const publishReadiness = APPLY ? await getContentPublishReadiness(BLOG_ID) : null;

  const localReadiness = evaluateBlogReadiness({
    title: APPLY ? after.title : R1_BLOG_FORM.title,
    slug: APPLY ? after.slug : R1_BLOG_FORM.slug,
    excerpt: APPLY ? after.excerpt ?? undefined : R1_BLOG_FORM.excerpt,
    content: html,
    metaTitle: APPLY ? after.metaTitle ?? "" : R1_BLOG_FORM.metaTitle,
    metaDescription: APPLY ? after.metaDescription ?? "" : R1_BLOG_FORM.metaDescription,
    featuredImageUrl: APPLY ? after.featuredImageUrl : R1_BLOG_FORM.coverUrl,
    ogImageUrl: APPLY ? after.ogImageUrl : R1_BLOG_FORM.coverUrl,
    tags: APPLY ? ((after.tags as string[]) ?? []) : [...R1_BLOG_FORM.tags],
    faqJson: (APPLY ? after.faqJson : R1_BLOG_FORM.faqJson) as BlogFaqItem[],
    server: publishReadiness
      ? {
          ready: publishReadiness.ready,
          errors: publishReadiness.errors,
          warnings: publishReadiness.warnings,
        }
      : null,
  });

  const blogDeps = async (assetId: string) => {
    const summary = await resolveMediaDependencies(assetId);
    return summary.references
      .filter((d) => d.referenceId === BLOG_ID)
      .map((d) => ({
        field: d.field,
        mode: d.relationMode,
        type: d.referenceType,
      }));
  };

  console.log("[after]", {
    apply: APPLY,
    status: after.status,
    canonicalUrl: after.canonicalUrl,
    expectedCanonical: CANONICAL,
    ...afterSnap,
    assignments: afterAssignments,
    seoScore: localReadiness.quality.score,
    blogStatus: localReadiness.status,
    blockers: localReadiness.blockers.map((b) => b.label),
    warnings: localReadiness.warnings.map((w) => w.label),
    publishReady: publishReadiness?.ready ?? null,
    publishErrors: publishReadiness?.errors ?? null,
    publishWarnings: publishReadiness?.warnings ?? null,
    damDeps: {
      regularDetail: await blogDeps(R1_MEDIA.regularDetail.id),
      khoThun: await blogDeps(R1_MEDIA.khoThun.id),
      cover: await blogDeps(R1_MEDIA.khoOversize.id),
    },
    counts: {
      bodyImagesBefore: beforeSnap.bodyImages,
      bodyImagesAfter: afterSnap.bodyImages,
      inlineAssignmentsBefore: beforeInlineAssignments,
      inlineAssignmentsAfter: afterAssignments.filter((a) => a.placement === "INLINE").length,
      editorInlineBlocksBefore: beforeSnap.editorInlineBlocks,
      editorInlineBlocksAfter: afterSnap.editorInlineBlocks,
    },
  });

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to persist.");
  } else {
    console.log("\nApplied. Status remains DRAFT — not published.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
