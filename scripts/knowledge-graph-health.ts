/**
 * Print Knowledge Graph health diagnostics.
 *
 * Usage: npm run knowledge-graph:health
 */
import { calculateKnowledgeGraphHealth } from "../src/features/knowledge-graph/services/knowledge-graph-health.service";

async function main() {
  const health = await calculateKnowledgeGraphHealth();
  console.log(JSON.stringify(health, null, 2));
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
