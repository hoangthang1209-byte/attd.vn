/**
 * Safe DRAFT SEO strategy + benchmark topic seed (no publish, no fake metrics).
 */

import { prisma } from "@/lib/prisma";
import { syncGraphEntityForSource } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import { GRAPH_EVALUATION_BENCHMARKS } from "@/features/knowledge-graph/evaluation/graph-evaluation-benchmarks";

export const BENCHMARK_TOPIC_STRATEGY_CODE = "KG_EVAL_12_3";

export async function seedBenchmarkSeoTopics(opts: { dryRun?: boolean }) {
  const dryRun = opts.dryRun !== false;
  const report = {
    dryRun,
    strategyId: null as string | null,
    clusterId: null as string | null,
    topicsCreated: 0,
    topicsExisting: 0,
    entitiesSynced: 0,
    topics: [] as Array<{ id: string; title: string; status: string; created: boolean }>,
  };

  let strategy = await prisma.seoStrategy.findFirst({
    where: { code: BENCHMARK_TOPIC_STRATEGY_CODE },
  });
  if (!strategy && !dryRun) {
    strategy = await prisma.seoStrategy.create({
      data: {
        code: BENCHMARK_TOPIC_STRATEGY_CODE,
        name: "Knowledge Graph Evaluation Topics (12.3)",
        description: "DRAFT planning topics for graph retrieval evaluation — not published.",
        status: "DRAFT",
      },
    });
  }
  report.strategyId = strategy?.id ?? null;

  let cluster = strategy
    ? await prisma.seoTopicCluster.findFirst({
        where: { strategyId: strategy.id, code: "KG_EVAL_CLUSTER" },
      })
    : null;
  if (strategy && !cluster && !dryRun) {
    cluster = await prisma.seoTopicCluster.create({
      data: {
        strategyId: strategy.id,
        code: "KG_EVAL_CLUSTER",
        name: "Benchmark planning cluster",
        description: "Internal evaluation cluster",
        isActive: true,
      },
    });
  }
  report.clusterId = cluster?.id ?? null;

  for (const bench of GRAPH_EVALUATION_BENCHMARKS) {
    const existing = strategy
      ? await prisma.seoTopic.findFirst({
          where: {
            cluster: { strategyId: strategy.id },
            primaryKeyword: bench.query,
          },
        })
      : null;

    if (existing) {
      report.topicsExisting += 1;
      report.topics.push({
        id: existing.id,
        title: existing.title,
        status: existing.status,
        created: false,
      });
      if (!dryRun) {
        await syncGraphEntityForSource("SeoTopic", existing.id);
        report.entitiesSynced += 1;
      }
      continue;
    }

    if (dryRun || !cluster) {
      report.topicsCreated += 1;
      report.topics.push({
        id: "(dry-run)",
        title: bench.query,
        status: "IDEA",
        created: true,
      });
      continue;
    }

    const productId = bench.seedProductIds[0];
    const topic = await prisma.seoTopic.create({
      data: {
        clusterId: cluster.id,
        title: bench.query,
        primaryKeyword: bench.query,
        description: `DRAFT evaluation topic for ${bench.id}. Not published.`,
        searchIntent: "COMMERCIAL",
        contentType: "BLOG_ARTICLE",
        funnelStage: "CONSIDERATION",
        status: "IDEA",
        priority: "NORMAL",
        businessValue: 0,
        relevanceScore: 0,
        opportunityScore: 0,
        confidenceScore: 0,
        targetEntityType: productId ? "PRODUCT" : "NONE",
        targetEntityId: productId ?? null,
        notes: `Sprint 12.3 benchmark seed (${bench.id}). Internal planning only.`,
      },
    });
    report.topicsCreated += 1;
    report.topics.push({
      id: topic.id,
      title: topic.title,
      status: topic.status,
      created: true,
    });
    await syncGraphEntityForSource("SeoTopic", topic.id);
    report.entitiesSynced += 1;
  }

  return report;
}
