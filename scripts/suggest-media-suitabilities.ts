/**
 * Dry-run suitability suggestions from role codes.
 * Does not call AI. Does not touch storage.
 *
 * Usage:
 *   npx tsx scripts/suggest-media-suitabilities.ts
 *   npx tsx scripts/suggest-media-suitabilities.ts --apply
 */
import { prisma } from "../src/lib/prisma";
import {
  inferSuggestedSuitabilities,
  normalizeContentSuitabilities,
} from "../src/features/media/services/media-content-intelligence.service";

const BATCH_SIZE = 100;
const apply = process.argv.includes("--apply");

async function main() {
  let cursor: string | undefined;
  let processed = 0;
  let proposable = 0;
  let updated = 0;

  console.log(`[media:suggest-suitabilities] mode=${apply ? "APPLY" : "DRY-RUN"}`);

  for (;;) {
    const batch = await prisma.mediaAsset.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        contentSuitabilities: true,
        role: { select: { code: true } },
      },
    });
    if (!batch.length) break;

    for (const asset of batch) {
      processed += 1;
      const suggested = inferSuggestedSuitabilities({ roleCode: asset.role?.code });
      if (!suggested.length) continue;

      const existing = new Set(asset.contentSuitabilities);
      const toAdd = suggested.filter((item) => !existing.has(item));
      if (!toAdd.length) continue;

      proposable += 1;
      const next = normalizeContentSuitabilities([...asset.contentSuitabilities, ...toAdd]);
      console.log(
        JSON.stringify({
          id: asset.id,
          role: asset.role?.code ?? null,
          current: asset.contentSuitabilities,
          suggestedAdd: toAdd,
          next,
        }),
      );

      if (apply) {
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { contentSuitabilities: next },
        });
        updated += 1;
      }
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH_SIZE) break;
  }

  console.log(
    `[media:suggest-suitabilities] done processed=${processed} proposable=${proposable} updated=${updated}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
