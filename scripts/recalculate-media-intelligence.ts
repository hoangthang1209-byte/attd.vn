/**
 * Idempotent Media Asset Intelligence metric recalculation.
 * Does not change content metadata, storage, or URLs.
 *
 * Usage: npx tsx scripts/recalculate-media-intelligence.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  intelligenceInputFromAsset,
  metricsToPrismaUpdate,
  recalculateMediaIntelligence,
} from "../src/features/media/services/media-intelligence.service";

const BATCH_SIZE = 100;

async function main() {
  let cursor: string | undefined;
  let processed = 0;
  let updated = 0;

  console.log("[media:recalculate-intelligence] starting…");

  for (;;) {
    const batch = await prisma.mediaAsset.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: { _count: { select: { collections: true } } },
    });

    if (!batch.length) break;

    for (const asset of batch) {
      const metrics = recalculateMediaIntelligence(intelligenceInputFromAsset(asset));
      const next = metricsToPrismaUpdate(metrics);
      const changed =
        asset.seoScore !== next.seoScore ||
        asset.metadataCompleteness !== next.metadataCompleteness ||
        asset.seoReadinessStatus !== next.seoReadinessStatus;

      if (changed) {
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: next,
        });
        updated += 1;
      }
      processed += 1;
    }

    cursor = batch[batch.length - 1]?.id;
    console.log(`[media:recalculate-intelligence] processed=${processed} updated=${updated}`);
    if (batch.length < BATCH_SIZE) break;
  }

  console.log(`[media:recalculate-intelligence] done. processed=${processed} updated=${updated}`);
}

main()
  .catch((err) => {
    console.error("[media:recalculate-intelligence] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
