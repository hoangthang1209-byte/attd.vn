/**
 * Exact/alias product semantic relation importer.
 * Dry-run by default. Pass --apply to write. No fuzzy matching.
 */
import { importProductSemanticRelations } from "../src/features/knowledge-graph/services/knowledge-graph-product-semantic-import.service";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(`[knowledge-graph:import-product-semantics] dryRun=${dryRun}`);
  const report = await importProductSemanticRelations({ dryRun });
  // Trim proposals in console for readability
  const { proposals, ...rest } = report;
  console.log(JSON.stringify({ ...rest, proposalSample: proposals.slice(0, 30) }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
