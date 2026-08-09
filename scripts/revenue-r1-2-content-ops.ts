/**
 * Sprint R1.2 — apply polished drafts + canonical + ContentMediaAssignment SoT.
 *
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/revenue-r1-2-content-ops.ts
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/revenue-r1-2-content-ops.ts --apply
 *
 * Never publishes. Never calls paid providers.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normalizeBlogContent } from "../src/features/blog/content-normalizer";
import { assignContentMedia } from "../src/features/content/services/content-media-assignment.service";
import { getContentPublishReadiness } from "../src/features/content/services/content-publish-readiness.service";
import { resolveMediaDependencies } from "../src/features/media/lifecycle/media-dependency.service";
import { extractInlineMediaIdsFromHtml } from "../src/features/content/inline-media/inline-media-figure";
import { parseMarkdownBlocks } from "../src/features/blog/block-parser";
import { runEditorialQa } from "../src/features/content/editorial/editorial-qa";
import { buildDefaultBlogCanonical } from "../src/features/content/editorial/blog-canonical";
import {
  INLINE_META_KEY,
  type InlineMediaAssignmentMeta,
} from "../src/features/content/inline-media/inline-media.types";
import {
  R1_BLOG_XUONG_IN,
  R1_XUONG_IN_INLINE_BLOCK_IDS,
  buildR1XuongInHtml,
} from "../src/features/content/revenue/r1-blog-xuong-in.content";
import {
  R1_BLOG_FABRIC,
  R1_FABRIC_INLINE_BLOCK_IDS,
  buildR1FabricHtml,
} from "../src/features/content/revenue/r1-blog-fabric.content";
import {
  R1_BLOG_PRINT,
  R1_PRINT_INLINE_BLOCK_IDS,
  buildR1PrintHtml,
} from "../src/features/content/revenue/r1-blog-print.content";
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

const APPLY = process.argv.includes("--apply");

type InlineSpec = {
  media: { id: string; url: string; alt: string };
  blockId: string;
  sectionHeading: string;
  caption: string;
  sortOrder: number;
};

type DraftSpec = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  tags: readonly string[];
  cover: { id: string; url: string; alt: string };
  faqJson: readonly { question: string; answer: string }[];
  html: string;
  inlines: InlineSpec[];
};

function inlineMeta(
  blockId: string,
  sectionHeading: string,
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
      selectionReason: "R1.2 reconcile existing body images to ContentMediaAssignment SoT",
      score: null,
      sectionHeading,
    },
    source: "revenue-r1-2-content-ops",
  };
}

const DRAFTS: DraftSpec[] = [
  {
    id: R1_BLOG_XUONG_IN.id,
    title: R1_BLOG_XUONG_IN.title,
    slug: R1_BLOG_XUONG_IN.slug,
    excerpt: R1_BLOG_XUONG_IN.excerpt,
    metaTitle: R1_BLOG_XUONG_IN.metaTitle,
    metaDescription: R1_BLOG_XUONG_IN.metaDescription,
    tags: R1_BLOG_XUONG_IN.tags,
    cover: R1_MEDIA.khoThun,
    faqJson: R1_BLOG_XUONG_IN.faqJson,
    html: buildR1XuongInHtml(),
    inlines: [
      {
        media: R1_MEDIA.khoOversize,
        blockId: R1_XUONG_IN_INLINE_BLOCK_IDS.oversize,
        sectionHeading: "Xưởng in cần gì ở nguồn áo trơn?",
        caption: "Oversize trơn — thường gặp ở local brand và campaign.",
        sortOrder: 0,
      },
      {
        media: R1_MEDIA.regularDetail,
        blockId: R1_XUONG_IN_INLINE_BLOCK_IDS.regular,
        sectionHeading: "Form: regular hay oversize?",
        caption: "Regular — nền phổ biến cho đồng phục và merchandise.",
        sortOrder: 1,
      },
    ],
  },
  {
    id: R1_BLOG_FABRIC.id,
    title: R1_BLOG_FABRIC.title,
    slug: R1_BLOG_FABRIC.slug,
    excerpt: R1_BLOG_FABRIC.excerpt,
    metaTitle: R1_BLOG_FABRIC.metaTitle,
    metaDescription: R1_BLOG_FABRIC.metaDescription,
    tags: R1_BLOG_FABRIC.tags,
    cover: R1_MEDIA.khoOversize,
    faqJson: R1_BLOG_FABRIC.faqJson,
    html: buildR1FabricHtml(),
    inlines: [
      {
        media: R1_MEDIA.khoThun,
        blockId: R1_FABRIC_INLINE_BLOCK_IDS.stock,
        sectionHeading: "Ba nhóm chất liệu phổ biến",
        caption: "Chọn chất liệu trước khi chốt màu/size số lượng lớn.",
        sortOrder: 0,
      },
      {
        media: R1_MEDIA.regularDetail,
        blockId: R1_FABRIC_INLINE_BLOCK_IDS.detail,
        sectionHeading: "Cotton: cảm giác mặc và định vị",
        caption: "Quan sát mặt vải và đường may trên mẫu thật.",
        sortOrder: 1,
      },
    ],
  },
  {
    id: R1_BLOG_PRINT.id,
    title: R1_BLOG_PRINT.title,
    slug: R1_BLOG_PRINT.slug,
    excerpt: R1_BLOG_PRINT.excerpt,
    metaTitle: R1_BLOG_PRINT.metaTitle,
    metaDescription: R1_BLOG_PRINT.metaDescription,
    tags: R1_BLOG_PRINT.tags,
    cover: R1_MEDIA.regularDetail,
    faqJson: R1_BLOG_PRINT.faqJson,
    html: buildR1PrintHtml(),
    inlines: [
      {
        media: R1_MEDIA.khoThun,
        blockId: R1_PRINT_INLINE_BLOCK_IDS.stock,
        sectionHeading: "Trước khi chọn kỹ thuật: bốn yếu tố của áo trơn",
        caption: "Kiểm tra mặt vải và form trên hàng kho trước khi chốt kỹ thuật.",
        sortOrder: 0,
      },
      {
        media: R1_MEDIA.khoOversize,
        blockId: R1_PRINT_INLINE_BLOCK_IDS.oversize,
        sectionHeading: "Thêu",
        caption: "Oversize thay đổi diện tích và vị trí trang trí so với regular.",
        sortOrder: 1,
      },
    ],
  },
  {
    id: R1_BLOG_FORM.id,
    title: R1_BLOG_FORM.title,
    slug: R1_BLOG_FORM.slug,
    excerpt: R1_BLOG_FORM.excerpt,
    metaTitle: R1_BLOG_FORM.metaTitle,
    metaDescription: R1_BLOG_FORM.metaDescription,
    tags: R1_BLOG_FORM.tags,
    cover: R1_MEDIA.khoOversize,
    faqJson: R1_BLOG_FORM.faqJson,
    html: buildR1FormHtml(),
    inlines: [
      {
        media: R1_MEDIA.regularDetail,
        blockId: R1_FORM_INLINE_BLOCK_IDS.regular,
        sectionHeading: "Regular: khi nào hợp lý?",
        caption: "Regular — nền phổ biến cho đồng phục và merchandise.",
        sortOrder: 0,
      },
      {
        media: R1_MEDIA.khoThun,
        blockId: R1_FORM_INLINE_BLOCK_IDS.stock,
        sectionHeading: "Oversize: khi nào hợp lý?",
        caption: "Nhập form theo dữ liệu đơn thật, không chỉ theo ảnh trend.",
        sortOrder: 1,
      },
    ],
  },
];

async function applyDraft(spec: DraftSpec) {
  const content = normalizeBlogContent(spec.html);
  const canonicalUrl = buildDefaultBlogCanonical(spec.slug);

  if (APPLY) {
    await prisma.blogPost.update({
      where: { id: spec.id },
      data: {
        title: spec.title,
        slug: spec.slug,
        excerpt: spec.excerpt,
        metaTitle: spec.metaTitle,
        metaDescription: spec.metaDescription,
        tags: [...spec.tags],
        faqJson: spec.faqJson as unknown as Prisma.InputJsonValue,
        content,
        featuredImageUrl: spec.cover.url,
        ogImageUrl: spec.cover.url,
        canonicalUrl,
        status: "DRAFT",
      },
    });

    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: spec.id,
      mediaAssetId: spec.cover.id,
      placement: "FEATURED",
      replaceExisting: true,
      altTextOverride: spec.cover.alt,
    });
    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: spec.id,
      mediaAssetId: spec.cover.id,
      placement: "OG_IMAGE",
      replaceExisting: true,
      altTextOverride: spec.cover.alt,
    });

    await prisma.contentMediaAssignment.deleteMany({
      where: { entityType: "BLOG_POST", entityId: spec.id, placement: "INLINE" },
    });

    for (const inline of spec.inlines) {
      await assignContentMedia({
        entityType: "BLOG_POST",
        entityId: spec.id,
        mediaAssetId: inline.media.id,
        placement: "INLINE",
        slotKey: inline.blockId,
        sortOrder: inline.sortOrder,
        altTextOverride: inline.media.alt,
        captionOverride: inline.caption,
        metadata: inlineMeta(inline.blockId, inline.sectionHeading),
      });
    }
  }

  const post = await prisma.blogPost.findUniqueOrThrow({
    where: { id: spec.id },
    select: {
      id: true,
      status: true,
      slug: true,
      canonicalUrl: true,
      content: true,
      faqJson: true,
    },
  });
  const html = APPLY ? post.content ?? content : content;
  const assignments = await prisma.contentMediaAssignment.findMany({
    where: { entityType: "BLOG_POST", entityId: spec.id },
    select: { placement: true, mediaAssetId: true, slotKey: true },
  });
  const readiness = APPLY ? await getContentPublishReadiness(spec.id) : null;
  const editorial = runEditorialQa({
    title: spec.title,
    content: html,
    metaTitle: spec.metaTitle,
    metaDescription: spec.metaDescription,
    canonicalUrl: APPLY ? post.canonicalUrl : canonicalUrl,
    faqCount: spec.faqJson.length,
    expectedInlineMediaIds: spec.inlines.map((i) => i.media.id),
  });

  const dam: Record<string, unknown> = {};
  for (const inline of spec.inlines) {
    const summary = await resolveMediaDependencies(inline.media.id);
    dam[inline.media.id] = summary.references
      .filter((r) => r.referenceId === spec.id)
      .map((r) => ({ field: r.field, mode: r.relationMode }));
  }

  return {
    id: spec.id,
    slug: spec.slug,
    status: post.status,
    canonicalUrl: APPLY ? post.canonicalUrl : canonicalUrl,
    wordCount: countWordsFromHtml(html),
    internalLinks: countInternalLinks(html),
    bodyImages: (html.match(/<img\b/gi) || []).length,
    editorInlineBlocks: parseMarkdownBlocks(html).filter((b) => b.type === "inline-media").length,
    dataMediaIds: extractInlineMediaIdsFromHtml(html),
    assignments,
    editorialReady: editorial.readyForReview,
    editorialWarnings: editorial.warnings,
    publishReady: readiness?.ready ?? null,
    publishErrors: readiness?.errors ?? null,
    publishWarnings: readiness?.warnings ?? null,
    dam,
  };
}

async function main() {
  const results = [];
  for (const draft of DRAFTS) {
    results.push(await applyDraft(draft));
  }
  console.log(JSON.stringify({ apply: APPLY, results }, null, 2));
  if (!APPLY) console.log("\nDry-run only. Re-run with --apply to persist. Status stays DRAFT.");
  else console.log("\nApplied. All four remain DRAFT — not published.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
