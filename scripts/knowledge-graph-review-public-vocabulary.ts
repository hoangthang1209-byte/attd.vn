/**
 * Dry-run by default. Pass --apply to mark reviewed terms PUBLIC and resync graph.
 */
import { reviewPublicVocabulary } from "../src/features/knowledge-graph/evaluation/graph-public-vocabulary.service";

async function main() {
  const apply = process.argv.includes("--apply");
  const actorArg = process.argv.find((a) => a.startsWith("--actor="));
  const report = await reviewPublicVocabulary({
    dryRun: !apply,
    actorId: actorArg?.slice("--actor=".length) ?? "sprint-12.3-vocab-review",
  });
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
