/**
 * Backfill publicShortCode for existing quotes.
 * Run: npx tsx scripts/backfill-quote-public-short-codes.ts
 */
import { PrismaClient } from "@prisma/client";
import { ensureQuotePublicShortCode } from "../src/features/quotes/quote-public-link.service";

const prisma = new PrismaClient();
const BATCH_SIZE = 50;

async function main() {
  const totalMissing = await prisma.quote.count({
    where: { publicShortCode: null },
  });

  console.log(`Quotes missing publicShortCode: ${totalMissing}`);

  let processed = 0;
  let success = 0;
  let skipped = 0;
  let failures = 0;

  while (true) {
    const batch = await prisma.quote.findMany({
      where: { publicShortCode: null },
      select: { id: true, quoteNo: true },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    for (const quote of batch) {
      processed += 1;
      try {
        const code = await ensureQuotePublicShortCode(quote.id);
        const refreshed = await prisma.quote.findUnique({
          where: { id: quote.id },
          select: { publicShortCode: true },
        });
        if (refreshed?.publicShortCode === code) {
          success += 1;
          console.log(`OK ${quote.quoteNo} -> ${code}`);
        } else {
          skipped += 1;
          console.log(`SKIP ${quote.quoteNo} (already assigned elsewhere)`);
        }
      } catch (error) {
        failures += 1;
        console.error(`FAIL ${quote.quoteNo}:`, error);
      }
    }
  }

  console.log("---");
  console.log(`Processed: ${processed}`);
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failures: ${failures}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
