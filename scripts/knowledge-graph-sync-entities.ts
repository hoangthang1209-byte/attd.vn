/**
 * Sync Knowledge Graph entity projections from authoritative sources.
 * Dry-run by default. Pass --apply to write.
 *
 * Usage:
 *   npm run knowledge-graph:sync-entities
 *   npm run knowledge-graph:sync-entities -- --apply --source=Product,KnowledgeBaseEntry
 */
import { syncSupportedGraphEntities } from "../src/features/knowledge-graph/services/knowledge-graph-entity-sync.service";

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function getArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const dryRun = !hasFlag("--apply");
  const sourceArg = getArg("--source");
  const sourceTypes = sourceArg
    ? sourceArg.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const batchSize = Number(getArg("--batchSize") ?? 100);

  console.log(
    `[knowledge-graph:sync-entities] dryRun=${dryRun} sources=${sourceTypes?.join(",") ?? "all-v1"}`
  );

  const reports = await syncSupportedGraphEntities({ dryRun, sourceTypes, batchSize });
  console.log(JSON.stringify(reports, null, 2));
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
