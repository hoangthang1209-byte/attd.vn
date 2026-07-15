import { seedBenchmarkSeoTopics } from "../src/features/knowledge-graph/evaluation/graph-benchmark-topic-seed.service";

async function main() {
  const apply = process.argv.includes("--apply");
  const report = await seedBenchmarkSeoTopics({ dryRun: !apply });
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
