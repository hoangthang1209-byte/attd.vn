/**
 * Exact-URL backfill of Blog ContentMediaAssignment rows from featuredImageUrl / ogImageUrl.
 *
 * Dry-run by default. Pass --apply to write.
 * Safe to re-run: skips already-assigned placements / assets.
 * Never mutates MediaAsset storage/URL fields or Blog URL fields.
 *
 * Usage:
 *   npx tsx scripts/backfill-blog-media-assignments.ts
 *   npx tsx scripts/backfill-blog-media-assignments.ts --apply
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const BATCH = 100;

type Report = {
  scanned: number;
  matchedFeatured: number;
  matchedOg: number;
  unmatchedFeatured: number;
  unmatchedOg: number;
  ambiguousFeatured: number;
  ambiguousOg: number;
  alreadyAssigned: number;
  written: number;
};

async function findAssetsByExactUrl(url: string) {
  return prisma.mediaAsset.findMany({
    where: { OR: [{ url }, { thumbnailUrl: url }] },
    select: { id: true, url: true },
    take: 5,
  });
}

async function main() {
  const report: Report = {
    scanned: 0,
    matchedFeatured: 0,
    matchedOg: 0,
    unmatchedFeatured: 0,
    unmatchedOg: 0,
    ambiguousFeatured: 0,
    ambiguousOg: 0,
    alreadyAssigned: 0,
    written: 0,
  };

  console.log(`[backfill-blog-assignments] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  let cursor: string | undefined;
  for (;;) {
    const posts = await prisma.blogPost.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        featuredImageUrl: true,
        ogImageUrl: true,
      },
    });
    if (!posts.length) break;
    cursor = posts[posts.length - 1]?.id;

    for (const post of posts) {
      report.scanned += 1;

      for (const [placement, url] of [
        ["FEATURED", post.featuredImageUrl] as const,
        ["OG_IMAGE", post.ogImageUrl] as const,
      ]) {
        if (!url?.trim()) continue;

        const existing = await prisma.contentMediaAssignment.findFirst({
          where: {
            entityType: "BLOG_POST",
            entityId: post.id,
            placement,
          },
          select: { id: true, mediaAssetId: true },
        });
        if (existing) {
          report.alreadyAssigned += 1;
          continue;
        }

        const assets = await findAssetsByExactUrl(url.trim());
        if (assets.length === 0) {
          if (placement === "FEATURED") report.unmatchedFeatured += 1;
          else report.unmatchedOg += 1;
          continue;
        }
        if (assets.length > 1) {
          if (placement === "FEATURED") report.ambiguousFeatured += 1;
          else report.ambiguousOg += 1;
          console.log(
            `  ambiguous ${placement} post=${post.id} url=${url} matches=${assets.length}`,
          );
          continue;
        }

        const asset = assets[0]!;
        if (placement === "FEATURED") report.matchedFeatured += 1;
        else report.matchedOg += 1;

        if (!APPLY) {
          console.log(
            `  would-assign ${placement} post=${post.id} asset=${asset.id} title=${post.title.slice(0, 40)}`,
          );
          continue;
        }

        await prisma.contentMediaAssignment.create({
          data: {
            entityType: "BLOG_POST",
            entityId: post.id,
            mediaAssetId: asset.id,
            placement,
            slotKey: "",
            sortOrder: 0,
            metadata: { source: "backfill-exact-url" },
          },
        });
        report.written += 1;
      }
    }
  }

  console.log("[backfill-blog-assignments] report", report);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
