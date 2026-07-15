/**
 * Sync canonical PrintMethod rows + SUPPORTS curated edges.
 * Dry-run default. --apply required. --approve --actor= for ACTIVE.
 */
import { syncPrintMethods } from "../src/features/knowledge-graph/evaluation/graph-print-method-sync.service";

async function main() {
  const apply = process.argv.includes("--apply");
  const approve = process.argv.includes("--approve");
  const actorArg = process.argv.find((a) => a.startsWith("--actor="));
  if (approve && !apply) {
    console.error("--approve requires --apply");
    process.exitCode = 1;
    return;
  }
  const report = await syncPrintMethods({
    dryRun: !apply,
    approve,
    actorId: actorArg?.slice("--actor=".length) ?? null,
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
