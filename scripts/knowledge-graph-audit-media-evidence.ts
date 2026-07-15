import { auditMediaEvidenceForBenchmarks } from "../src/features/knowledge-graph/evaluation/graph-media-evidence-pilot.service";

async function main() {
  const report = await auditMediaEvidenceForBenchmarks();
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
