/**
 * Revenue Mode R1.1 — finish sourcing cluster (landings + 4 drafts).
 *
 *   npx tsx scripts/revenue-r1-1-content-ops.ts
 *   npx tsx scripts/revenue-r1-1-content-ops.ts --apply
 *
 * Never auto-publishes blogs.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normalizeBlogContent } from "../src/features/blog/content-normalizer";
import { getWholesaleContent } from "../src/lib/wholesaleContent";
import { getCollectionContent } from "../src/lib/collectionContent";
import {
  R1_BLOG_XUONG_IN,
  buildR1XuongInHtml,
} from "../src/features/content/revenue/r1-blog-xuong-in.content";
import {
  R1_BLOG_FABRIC,
  buildR1FabricHtml,
} from "../src/features/content/revenue/r1-blog-fabric.content";
import {
  R1_BLOG_PRINT,
  buildR1PrintHtml,
} from "../src/features/content/revenue/r1-blog-print.content";
import {
  R1_BLOG_FORM,
  buildR1FormHtml,
} from "../src/features/content/revenue/r1-blog-form.content";
import {
  countInlineImages,
  countInternalLinks,
  countWordsFromHtml,
} from "../src/features/content/revenue/r1-shared";

const APPLY = process.argv.includes("--apply");

async function hideMcdonaldCaseStudy() {
  const id = "cmqdbse1l0002i804ahnvu4a7";
  const row = await prisma.caseStudyRecord.findUnique({
    where: { id },
    select: { id: true, title: true, isVisible: true, quantity: true, timeline: true },
  });
  console.log("[case] McDonald audit", {
    found: Boolean(row),
    title: row?.title,
    isVisible: row?.isVisible,
    quantity: row?.quantity,
    timeline: row?.timeline,
    evidence:
      "Customer PROSPECT only; no linked order/quote; commercial claims unverified → hide",
  });
  if (!APPLY || !row || !row.isVisible) return;
  await prisma.caseStudyRecord.update({
    where: { id },
    data: { isVisible: false },
  });
}

async function syncWholesaleLanding(slug: string) {
  const staticContent = getWholesaleContent(slug);
  if (!staticContent) throw new Error(`Missing wholesale static: ${slug}`);
  const payload = {
    title: staticContent.h1,
    metaTitle: staticContent.seoTitle,
    metaDescription: staticContent.metaDescription,
    heroTitle: staticContent.h1,
    heroDescription: staticContent.heroIntro,
    seoContent: staticContent.intro,
    faqJson: staticContent.faq as unknown as Prisma.InputJsonValue,
    primaryCtaLabel: staticContent.primaryCta?.label ?? "Yêu cầu báo giá",
    primaryCtaHref: staticContent.primaryCta?.href ?? "/lien-he",
    secondaryCtaLabel: staticContent.secondaryCta?.label ?? "Tìm nguồn hàng",
    secondaryCtaHref: staticContent.secondaryCta?.href ?? "/ao-thun-tron",
    isPublished: true,
  };
  console.log("[landing]", slug, payload.metaTitle);
  if (!APPLY) return;
  await prisma.landingPageContent.upsert({
    where: { slug },
    create: { slug, ...payload },
    update: payload,
  });
}

async function syncCollectionLanding(slug: string) {
  const staticContent = getCollectionContent(slug);
  if (!staticContent) throw new Error(`Missing collection static: ${slug}`);
  const payload = {
    title: staticContent.displayName ?? staticContent.seoTitle,
    metaTitle: staticContent.seoTitle,
    metaDescription: staticContent.metaDescription,
    heroTitle: staticContent.displayName ?? staticContent.seoTitle,
    heroDescription: staticContent.shortIntro,
    seoContent: staticContent.intro,
    faqJson: staticContent.faq as unknown as Prisma.InputJsonValue,
    primaryCtaLabel: staticContent.primaryCta?.label ?? "Yêu cầu báo giá",
    primaryCtaHref: staticContent.primaryCta?.href ?? "/lien-he",
    secondaryCtaLabel: staticContent.secondaryCta?.label ?? "Xem áo thun trơn sỉ",
    secondaryCtaHref: staticContent.secondaryCta?.href ?? "/ao-thun-tron-si",
    isPublished: true,
  };
  console.log("[collection-cms]", slug, payload.metaTitle);
  if (!APPLY) return;
  await prisma.landingPageContent.upsert({
    where: { slug },
    create: { slug, ...payload },
    update: payload,
  });
}

type DraftSpec = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  tags: readonly string[];
  coverUrl: string;
  faqJson: readonly { question: string; answer: string }[];
  html: string;
  intent: string;
};

async function upsertDraft(spec: DraftSpec) {
  const content = normalizeBlogContent(spec.html);
  const stats = {
    words: countWordsFromHtml(content),
    images: countInlineImages(content),
    links: countInternalLinks(content),
  };
  console.log("[draft]", spec.slug, stats);

  if (!APPLY) return { ...spec, ...stats, status: "DRY_RUN" as const };

  const existing = spec.id
    ? await prisma.blogPost.findUnique({ where: { id: spec.id } })
    : await prisma.blogPost.findUnique({ where: { slug: spec.slug } });

  const data = {
    title: spec.title,
    slug: spec.slug,
    excerpt: spec.excerpt,
    content,
    featuredImageUrl: spec.coverUrl,
    ogImageUrl: spec.coverUrl,
    metaTitle: spec.metaTitle,
    metaDescription: spec.metaDescription,
    tags: [...spec.tags],
    faqJson: [...spec.faqJson],
    status: "DRAFT" as const,
    publishedAt: null,
    lastUnpublishedAt: new Date(),
  };

  const row = existing
    ? await prisma.blogPost.update({ where: { id: existing.id }, data })
    : await prisma.blogPost.create({ data });

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    intent: spec.intent,
    cover: row.featuredImageUrl,
    ...stats,
    cta: "/lien-he",
    qa: "PASS_LOCAL",
    review: "READY_FOR_HUMAN_REVIEW",
    publishReadiness: "DRAFT_NOT_PUBLISHED",
  };
}

async function printPublishQueue(
  articles: Array<{
    title: string;
    slug: string;
    intent: string;
    words: number;
    cover: string | null | undefined;
    images: number;
    links: number;
    cta: string;
    qa: string;
    review: string;
    publishReadiness: string;
    status: string;
  }>
) {
  console.log("\n========== HUMAN PUBLISH QUEUE (4) ==========");
  for (const [i, a] of articles.entries()) {
    console.log(`\n#${i + 1} ${a.title}`);
    console.log(`  Slug: /blog/${a.slug}`);
    console.log(`  Intent: ${a.intent}`);
    console.log(`  Status: ${a.status}`);
    console.log(`  Words: ${a.words}`);
    console.log(`  Cover: ${a.cover}`);
    console.log(`  Inline images: ${a.images}`);
    console.log(`  Internal links: ${a.links}`);
    console.log(`  CTA: ${a.cta}`);
    console.log(`  QA: ${a.qa}`);
    console.log(`  Review: ${a.review}`);
    console.log(`  Publish readiness: ${a.publishReadiness}`);
    console.log(`  Human action: Open admin blog editor → review → Content Review/Publish panel → Publish manually`);
  }
  console.log("\nDo NOT auto-publish. Polo cluster not started.");
}

async function main() {
  console.log(`R1.1 content ops (${APPLY ? "APPLY" : "DRY-RUN"})`);
  await hideMcdonaldCaseStudy();
  await syncWholesaleLanding("ao-thun-tron-si");
  await syncWholesaleLanding("kho-ao-thun-tron");
  await syncWholesaleLanding("nguon-hang-ao-thun-tron");
  await syncCollectionLanding("ao-thun-tron");

  const a1 = await upsertDraft({
    id: R1_BLOG_XUONG_IN.id,
    title: R1_BLOG_XUONG_IN.title,
    slug: R1_BLOG_XUONG_IN.slug,
    excerpt: R1_BLOG_XUONG_IN.excerpt,
    metaTitle: R1_BLOG_XUONG_IN.metaTitle,
    metaDescription: R1_BLOG_XUONG_IN.metaDescription,
    tags: R1_BLOG_XUONG_IN.tags,
    coverUrl: R1_BLOG_XUONG_IN.coverUrl,
    faqJson: R1_BLOG_XUONG_IN.faqJson,
    html: buildR1XuongInHtml(),
    intent: "Educational — chọn nguồn áo thun trơn cho xưởng in",
  });
  const a2 = await upsertDraft({
    id: R1_BLOG_FABRIC.id,
    title: R1_BLOG_FABRIC.title,
    slug: R1_BLOG_FABRIC.slug,
    excerpt: R1_BLOG_FABRIC.excerpt,
    metaTitle: R1_BLOG_FABRIC.metaTitle,
    metaDescription: R1_BLOG_FABRIC.metaDescription,
    tags: R1_BLOG_FABRIC.tags,
    coverUrl: R1_BLOG_FABRIC.coverUrl,
    faqJson: R1_BLOG_FABRIC.faqJson,
    html: buildR1FabricHtml(),
    intent: "Educational — cotton vs CVC vs polyester khi nhập áo trơn",
  });
  const a3 = await upsertDraft({
    title: R1_BLOG_PRINT.title,
    slug: R1_BLOG_PRINT.slug,
    excerpt: R1_BLOG_PRINT.excerpt,
    metaTitle: R1_BLOG_PRINT.metaTitle,
    metaDescription: R1_BLOG_PRINT.metaDescription,
    tags: R1_BLOG_PRINT.tags,
    coverUrl: R1_BLOG_PRINT.coverUrl,
    faqJson: R1_BLOG_PRINT.faqJson,
    html: buildR1PrintHtml(),
    intent: "Educational — chọn áo trơn theo in lụa / DTF / thêu",
  });
  const a4 = await upsertDraft({
    title: R1_BLOG_FORM.title,
    slug: R1_BLOG_FORM.slug,
    excerpt: R1_BLOG_FORM.excerpt,
    metaTitle: R1_BLOG_FORM.metaTitle,
    metaDescription: R1_BLOG_FORM.metaDescription,
    tags: R1_BLOG_FORM.tags,
    coverUrl: R1_BLOG_FORM.coverUrl,
    faqJson: R1_BLOG_FORM.faqJson,
    html: buildR1FormHtml(),
    intent: "Educational — regular vs oversize cho xưởng in",
  });

  const queue = [a1, a2, a3, a4].map((a) => ({
    title: a.title,
    slug: a.slug,
    intent: "intent" in a && typeof a.intent === "string" ? a.intent : "",
    words: a.words,
    cover: "cover" in a ? a.cover : ("coverUrl" in a ? (a as DraftSpec).coverUrl : null),
    images: a.images,
    links: a.links,
    cta: "cta" in a && typeof a.cta === "string" ? a.cta : "/lien-he",
    qa: "qa" in a && typeof a.qa === "string" ? a.qa : "PASS_LOCAL",
    review: "review" in a && typeof a.review === "string" ? a.review : "READY_FOR_HUMAN_REVIEW",
    publishReadiness:
      "publishReadiness" in a && typeof a.publishReadiness === "string"
        ? a.publishReadiness
        : "DRAFT_NOT_PUBLISHED",
    status: a.status,
  }));

  await printPublishQueue(queue);

  const visibleCases = await prisma.caseStudyRecord.count({ where: { isVisible: true } });
  const publishedBlogs = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  console.log("\n[summary] visible case studies:", visibleCases);
  console.log("[summary] published blogs:", publishedBlogs.map((b) => b.slug));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
