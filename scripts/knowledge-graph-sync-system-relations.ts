/**
 * Sync system-derived Knowledge Graph relationships.
 * Dry-run by default. Pass --apply to write.
 *
 * Usage:
 *   npm run knowledge-graph:sync-system-relations
 *   npm run knowledge-graph:sync-system-relations -- --apply
 */
import { syncSystemDerivedRelationships } from "../src/features/knowledge-graph/services/knowledge-graph-system-sync.service";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(`[knowledge-graph:sync-system-relations] dryRun=${dryRun}`);
  const report = await syncSystemDerivedRelationships({ dryRun });
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
