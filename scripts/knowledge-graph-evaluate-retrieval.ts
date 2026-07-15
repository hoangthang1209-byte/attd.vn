/**
 * Run governed graph retrieval evaluation (baseline vs expansion preview).
 * Does not enable production expansion flags.
 */
import { getKnowledgeGraphExpansionFlagSnapshot } from "../src/features/knowledge-graph/evaluation/graph-expansion-flags";
import { runGraphRetrievalEvaluation } from "../src/features/knowledge-graph/evaluation/graph-retrieval-evaluator.service";
import { evaluateKnowledgeGraphPilotReadiness } from "../src/features/knowledge-graph/evaluation/graph-pilot-readiness.service";
import { SPRINT_12_2_EVALUATION_RUN_ID } from "../src/features/knowledge-graph/evaluation/graph-12-2-failure-map";

async function main() {
  const persist = process.argv.includes("--persist");
  const consumerArg = process.argv.find((a) => a.startsWith("--consumers="));
  const consumers = consumerArg
    ? (consumerArg.slice("--consumers=".length).split(",") as Array<
        "SEO_TOPIC_PLANNER" | "SEO_BRIEF"
      >)
    : (["SEO_TOPIC_PLANNER", "SEO_BRIEF"] as const);

  console.log(
    JSON.stringify(
      {
        flags: getKnowledgeGraphExpansionFlagSnapshot(),
        compareToSprint12_2: SPRINT_12_2_EVALUATION_RUN_ID,
      },
      null,
      2
    )
  );

  const result = await runGraphRetrievalEvaluation({
    consumers: [...consumers],
    depth: 1,
    persist,
    requestedBy: "cli:knowledge-graph-evaluate-retrieval",
  });

  const readiness = await evaluateKnowledgeGraphPilotReadiness({
    latestRunId: result.runId,
  });

  const summary = {
    overallVerdict: result.overallVerdict,
    overallReasons: result.overallReasons,
    recommendation: result.recommendation,
    readiness,
    byConsumer: result.byConsumer,
    durationMs: result.durationMs,
    runId: result.runId,
    productionFlags: result.productionFlags,
    benchmarks: result.benchmarks.map((b) => ({
      id: b.benchmarkId,
      consumer: b.consumer,
      improved: b.metrics.improved,
      precision: b.judgment.precision,
      recall: b.judgment.recall,
      contextGrowthPercent: b.judgment.contextGrowthPercent,
      pathsFound: b.pathsFound.length,
      missingRequired: b.missingRequiredPaths.length,
      visibilitySafe: b.judgment.visibilitySafe,
      authorityPreserved: b.judgment.directAuthorityPreserved,
      gaps: b.gaps.slice(0, 5),
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
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
