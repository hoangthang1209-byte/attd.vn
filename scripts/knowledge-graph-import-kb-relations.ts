/**
 * Import KB relation arrays into Knowledge Graph as IMPORTED edges.
 * Dry-run by default. Pass --apply to write. Does not mutate source arrays.
 *
 * Usage:
 *   npm run knowledge-graph:import-kb-relations
 *   npm run knowledge-graph:import-kb-relations -- --apply
 */
import { importKnowledgeBaseArrayRelations } from "../src/features/knowledge-graph/services/knowledge-graph-kb-array-import.service";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(`[knowledge-graph:import-kb-relations] dryRun=${dryRun}`);
  const report = await importKnowledgeBaseArrayRelations({ dryRun });
  console.log(JSON.stringify(report, null, 2));
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
