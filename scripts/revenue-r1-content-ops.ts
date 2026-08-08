/**
 * Revenue Mode R1 — content ops apply script.
 *
 * Usage:
 *   npx tsx scripts/revenue-r1-content-ops.ts           # dry-run
 *   npx tsx scripts/revenue-r1-content-ops.ts --apply   # write via Prisma + blog service
 *
 * Never auto-publishes rewritten blogs. Archives public demo/seed posts.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normalizeBlogContent } from "../src/features/blog/content-normalizer";
import {
  R1_BLOG_XUONG_IN,
  buildR1XuongInHtml,
} from "../src/features/content/revenue/r1-blog-xuong-in.content";
import {
  R1_BLOG_FABRIC,
  buildR1FabricHtml,
} from "../src/features/content/revenue/r1-blog-fabric.content";
import { getWholesaleContent } from "../src/lib/wholesaleContent";

const APPLY = process.argv.includes("--apply");
const ACTOR = "revenue-r1-content-ops";

const DEMO_CASE_IDS = [
  "cmqfmdciw0058k004zec7yzag",
  "cmqfmdd0w0059k004b9sq49c2",
  "cmqfmddcu005ak004jxlayepk",
  "cmqfmddot005bk0040i5ts3ye",
] as const;

/** Seed / template / fabricated-claim blogs to remove from public. */
const ARCHIVE_BLOG_SLUGS = [
  "chuan-bi-file-thiet-ke-qua-tang",
  "tote-bag-canvas-vs-tui-vai-khong-det",
  "oem-private-label-dong-phuc",
  "non-dong-phuc-si-cach-chon",
  "checklist-dat-hang-dong-phuc-agency",
  "cach-chon-ao-polo-tron-dong-phuc",
  "combo-qua-tang-doanh-nghiep-hoi-nghi",
  "moq-la-gi-don-hang-si",
  "kho-si-dong-phuc-la-gi",
  "nguon-hang-ao-thun-polo-huong-dan-b2b-cho-dai-ly-va-doanh-nghiep",
  "nguon-hang-ao-thun-tron-gia-si-7-tieu-chi-chon-nha-cung-cap-uy-tin-nam-2026",
] as const;

const MEDIA_UPDATES: Array<{
  id: string;
  title: string;
  altText: string;
  suitabilities: Array<"BLOG_COVER" | "BLOG_INLINE" | "FEATURED_IMAGE">;
}> = [
  {
    id: "cmqfkgz0p000ajq04d4ncp46i",
    title: "Kho áo thun trơn sỉ",
    altText: "Áo thun trơn xếp trong kho sỉ ATTD",
    suitabilities: ["BLOG_COVER", "BLOG_INLINE", "FEATURED_IMAGE"],
  },
  {
    id: "cmqfkgww30009jq045rsg738o",
    title: "Kho áo thun oversize trơn",
    altText: "Áo thun oversize trơn xếp trong kho sỉ ATTD",
    suitabilities: ["BLOG_COVER", "BLOG_INLINE"],
  },
  {
    id: "cmrutsrbf0001ie04kbhbwlcb",
    title: "Áo thun regular cao cấp",
    altText: "Áo thun regular cao cấp — hình ảnh sản phẩm ATTD",
    suitabilities: ["BLOG_INLINE"],
  },
  {
    id: "cmqfkgv040008jq04y8jas69t",
    title: "Kho áo polo trơn",
    altText: "Áo polo trơn xếp trong kho sỉ ATTD",
    suitabilities: ["BLOG_INLINE"],
  },
  {
    id: "cmqfkgskc0007jq04kadfsmne",
    title: "Kho áo polo thể thao trơn",
    altText: "Áo polo thể thao trơn xếp trong kho sỉ ATTD",
    suitabilities: ["BLOG_INLINE"],
  },
];

async function syncLandingAoThunTronSi() {
  const staticContent = getWholesaleContent("ao-thun-tron-si");
  if (!staticContent) throw new Error("Missing static wholesale content for ao-thun-tron-si");

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

  console.log("[landing] ao-thun-tron-si", {
    metaTitle: payload.metaTitle,
    primaryCta: `${payload.primaryCtaLabel} -> ${payload.primaryCtaHref}`,
    faqCount: staticContent.faq.length,
  });

  if (!APPLY) return;

  await prisma.landingPageContent.upsert({
    where: { slug: "ao-thun-tron-si" },
    create: { slug: "ao-thun-tron-si", ...payload },
    update: payload,
  });
}

async function rewriteBlogsAsDraft() {
  const xuongHtml = buildR1XuongInHtml();
  const fabricHtml = buildR1FabricHtml();

  console.log("[blog] rewrite -> DRAFT", {
    to: R1_BLOG_XUONG_IN.slug,
    title: R1_BLOG_XUONG_IN.title,
    chars: xuongHtml.length,
  });
  console.log("[blog] rewrite -> DRAFT", {
    slug: R1_BLOG_FABRIC.slug,
    title: R1_BLOG_FABRIC.title,
    chars: fabricHtml.length,
  });

  if (!APPLY) return;

  await prisma.blogPost.update({
    where: { id: R1_BLOG_XUONG_IN.id },
    data: {
      title: R1_BLOG_XUONG_IN.title,
      slug: R1_BLOG_XUONG_IN.slug,
      excerpt: R1_BLOG_XUONG_IN.excerpt,
      content: normalizeBlogContent(xuongHtml),
      featuredImageUrl: R1_BLOG_XUONG_IN.coverUrl,
      metaTitle: R1_BLOG_XUONG_IN.metaTitle,
      metaDescription: R1_BLOG_XUONG_IN.metaDescription,
      ogImageUrl: R1_BLOG_XUONG_IN.coverUrl,
      tags: [...R1_BLOG_XUONG_IN.tags],
      faqJson: [...R1_BLOG_XUONG_IN.faqJson],
      status: "DRAFT",
      publishedAt: null,
      lastUnpublishedAt: new Date(),
    },
  });

  await prisma.blogPost.update({
    where: { id: R1_BLOG_FABRIC.id },
    data: {
      title: R1_BLOG_FABRIC.title,
      slug: R1_BLOG_FABRIC.slug,
      excerpt: R1_BLOG_FABRIC.excerpt,
      content: normalizeBlogContent(fabricHtml),
      featuredImageUrl: R1_BLOG_FABRIC.coverUrl,
      metaTitle: R1_BLOG_FABRIC.metaTitle,
      metaDescription: R1_BLOG_FABRIC.metaDescription,
      ogImageUrl: R1_BLOG_FABRIC.coverUrl,
      tags: [...R1_BLOG_FABRIC.tags],
      faqJson: [...R1_BLOG_FABRIC.faqJson],
      status: "DRAFT",
      publishedAt: null,
      lastUnpublishedAt: new Date(),
    },
  });
}

async function archiveDemoBlogs() {
  for (const slug of ARCHIVE_BLOG_SLUGS) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, status: true, title: true, featuredImageUrl: true },
    });
    if (!post) {
      console.log("[archive] missing", slug);
      continue;
    }
    const isPicsum = post.featuredImageUrl?.includes("picsum.photos");
    console.log("[archive]", slug, {
      status: post.status,
      picsum: Boolean(isPicsum),
      title: post.title,
    });
    if (!APPLY) continue;
    if (post.status === "ARCHIVED") continue;
    await prisma.blogPost.update({
      where: { id: post.id },
      data: {
        status: "ARCHIVED",
        publishedAt: null,
        lastUnpublishedAt: new Date(),
      },
    });
  }
}

async function hideDemoCaseStudies() {
  for (const id of DEMO_CASE_IDS) {
    const row = await prisma.caseStudyRecord.findUnique({
      where: { id },
      select: { id: true, title: true, isVisible: true, imageUrl: true },
    });
    if (!row) {
      console.log("[case] missing", id);
      continue;
    }
    console.log("[case] hide", {
      id: row.id,
      title: row.title,
      isVisible: row.isVisible,
      picsum: row.imageUrl.includes("picsum.photos"),
    });
    if (!APPLY) continue;
    await prisma.caseStudyRecord.update({
      where: { id },
      data: { isVisible: false },
    });
  }
}

async function updateMediaMetadata() {
  for (const item of MEDIA_UPDATES) {
    console.log("[media]", item.id, item.title, item.suitabilities.join(","));
    if (!APPLY) continue;
    await prisma.mediaAsset.update({
      where: { id: item.id },
      data: {
        title: item.title,
        altText: item.altText,
        contentSuitabilities: { set: item.suitabilities },
      },
    });
  }
}

async function activateCoreCategories() {
  const slugs = ["ao-thun-tron", "ao-polo-tron"];
  for (const slug of slugs) {
    const row = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, isActive: true, name: true },
    });
    if (!row) {
      console.log("[category] missing", slug);
      continue;
    }
    console.log("[category]", slug, { isActive: row.isActive, name: row.name });
    if (!APPLY || row.isActive) continue;
    await prisma.category.update({
      where: { id: row.id },
      data: { isActive: true },
    });
  }
}

async function renameBlankExportProducts() {
  const targets = [
    { slug: "ao-thun-blank-export", name: "Áo thun trơn xuất khẩu" },
    { slug: "ao-polo-blank-export", name: "Áo polo trơn xuất khẩu" },
  ];
  for (const t of targets) {
    const product = await prisma.product.findUnique({
      where: { slug: t.slug },
      select: { id: true, name: true },
    });
    if (!product) {
      console.log("[product] missing", t.slug);
      continue;
    }
    console.log("[product] rename", product.name, "->", t.name);
    if (!APPLY) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { name: t.name },
    });
  }
}

async function fixPublishedPoloBlankWording() {
  const post = await prisma.blogPost.findUnique({
    where: { slug: "huong-dan-chon-ao-polo-dong-phuc-cong-ty" },
    select: { id: true, content: true, status: true },
  });
  if (!post?.content) {
    console.log("[polo-guide] missing content");
    return;
  }
  let next = post.content;
  next = next
    .replace(/phôi blank/gi, "áo trơn")
    .replace(/\bblank\b/gi, "trơn")
    .replace(
      /href="\/blog\/cach-chon-ao-polo-tron-dong-phuc"/g,
      'href="/ao-polo-tron"'
    )
    .replace(
      /href="\/blog\/nguon-hang-ao-thun-polo-huong-dan-b2b-cho-dai-ly-va-doanh-nghiep"/g,
      'href="/ao-polo-tron-si"'
    );
  if (next === post.content) {
    console.log("[polo-guide] no public wording/link changes needed");
    return;
  }
  console.log("[polo-guide] scrub blank + archived links", { status: post.status });
  if (!APPLY) return;
  await prisma.blogPost.update({
    where: { id: post.id },
    data: { content: normalizeBlogContent(next) },
  });
}

async function summarizePublicBlogs() {
  const rows = await prisma.blogPost.findMany({
    select: { slug: true, status: true, title: true, featuredImageUrl: true },
    orderBy: { status: "asc" },
  });
  console.log("\n[summary] blogs");
  for (const r of rows) {
    console.log(
      `- ${r.status.padEnd(10)} ${r.slug} | ${r.title}${
        r.featuredImageUrl?.includes("picsum") ? " | PICSUM" : ""
      }`
    );
  }
}

async function main() {
  console.log(`Revenue R1 content ops (${APPLY ? "APPLY" : "DRY-RUN"}) actor=${ACTOR}`);
  await syncLandingAoThunTronSi();
  await rewriteBlogsAsDraft();
  await archiveDemoBlogs();
  await hideDemoCaseStudies();
  await updateMediaMetadata();
  await activateCoreCategories();
  await renameBlankExportProducts();
  await fixPublishedPoloBlankWording();
  await summarizePublicBlogs();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
