/**
 * Sync content graph entities: SeoTopic, MediaBundle, BlogPost.
 * Dry-run by default. Pass --apply to write.
 */
import { syncSupportedGraphEntities } from "../src/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import { CONTENT_SYNC_SOURCES } from "../src/features/knowledge-graph/knowledge-graph-concept-ownership";
import { writeGraphAuditLog } from "../src/features/knowledge-graph/services/knowledge-graph-audit.service";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(`[knowledge-graph:sync-content] dryRun=${dryRun}`);
  const reports = await syncSupportedGraphEntities({
    dryRun,
    sourceTypes: [...CONTENT_SYNC_SOURCES],
  });
  console.log(JSON.stringify(reports, null, 2));
  await writeGraphAuditLog({
    action: "ENTITY_SYNCED",
    summary: `content dryRun=${dryRun}`,
    metadata: reports as unknown as Record<string, unknown>,
  });
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
