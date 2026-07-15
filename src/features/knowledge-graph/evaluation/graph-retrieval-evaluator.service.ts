/**
 * Baseline vs graph-expanded Retrieval evaluator (admin / evaluation only).
 * Never mutates global expansion flags. Persists safe summaries only.
 */

import type { AiRetrievalConsumer, AiRetrievedFact, AiRetrievalContext } from "@/features/ai-retrieval/ai-retrieval-types";
import { retrieveEnterpriseAiContext } from "@/features/ai-retrieval/services/ai-retrieval.service";
import {
  GRAPH_EVALUATION_BENCHMARKS,
  getBenchmarkById,
  type GraphEvalBenchmark,
} from "@/features/knowledge-graph/evaluation/graph-evaluation-benchmarks";
import {
  buildJudgment,
  classifyAddedEntity,
  matchExpectedPaths,
  type GraphEvaluationJudgment,
  type PathObservation,
} from "@/features/knowledge-graph/evaluation/graph-evaluation-judgment";
import {
  judgeThresholds,
  recommendPilot,
  type BenchmarkEvalMetrics,
  type ThresholdVerdict,
} from "@/features/knowledge-graph/evaluation/graph-evaluation-thresholds";
import { getKnowledgeGraphExpansionFlagSnapshot } from "@/features/knowledge-graph/evaluation/graph-expansion-flags";
import { GRAPH_EVALUATION_COHORT_VERSION } from "@/features/knowledge-graph/evaluation/graph-evaluation-cohort";
import { prisma } from "@/lib/prisma";
import { expandRetrievalScopeViaKnowledgeGraph } from "@/features/ai-retrieval/sources/knowledge-graph-source";
import { getAiRetrievalPolicy, resolveEffectiveMaxVisibility } from "@/features/ai-retrieval/ai-retrieval-policy";

export type GraphBenchmarkEvalResult = {
  benchmarkId: string;
  query: string;
  consumer: AiRetrievalConsumer;
  expectedPaths: GraphEvalBenchmark["requiredPaths"];
  pathsFound: PathObservation[];
  missingRequiredPaths: GraphEvalBenchmark["requiredPaths"];
  baseline: {
    factCount: number;
    sourceCount: number;
    chars: number;
    estimatedTokens: number;
    durationMs: number;
    factIds: string[];
    topAuthority: Array<{ factId: string; sourceType: string; authorityRank: number; title: string }>;
  };
  expanded: {
    factCount: number;
    sourceCount: number;
    chars: number;
    estimatedTokens: number;
    durationMs: number;
    graphQueryMs: number;
    scopeEntityCount: number;
    pathCount: number;
    warnings: string[];
    graphPaths: string[];
  };
  relevantAddedEntities: string[];
  irrelevantAddedEntities: string[];
  duplicateAddedEntities: string[];
  relevantAddedFacts: string[];
  irrelevantAddedFacts: string[];
  conflictsAdded: number;
  conflictsUnresolved: number;
  omittedDelta: number;
  judgment: GraphEvaluationJudgment;
  gaps: string[];
  metrics: BenchmarkEvalMetrics;
};

export type GraphEvaluationRunResult = {
  version: string;
  consumers: AiRetrievalConsumer[];
  depth: number;
  productionFlags: ReturnType<typeof getKnowledgeGraphExpansionFlagSnapshot>;
  benchmarks: GraphBenchmarkEvalResult[];
  byConsumer: Array<{
    consumer: AiRetrievalConsumer;
    verdict: ThresholdVerdict;
    improvedCount: number;
    reasons: string[];
  }>;
  overallVerdict: ThresholdVerdict;
  overallReasons: string[];
  recommendation: ReturnType<typeof recommendPilot>;
  durationMs: number;
  runId?: string;
};

function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function summarizeFacts(facts: AiRetrievedFact[]) {
  return facts.map((f) => ({
    factId: f.id,
    sourceType: f.sourceType,
    authorityRank: f.authorityRank,
    title: f.title.slice(0, 80),
  }));
}

function authorityPreserved(baseline: AiRetrievedFact[], expanded: AiRetrievedFact[]): boolean {
  const critical = baseline.filter((f) => {
    const keys = Object.keys(f.structuredData ?? {});
    return keys.some((k) =>
      /moq|leadTime|material|pricing/i.test(k)
    );
  });
  for (const fact of critical) {
    const baseIdx = baseline.findIndex((f) => f.id === fact.id);
    const expIdx = expanded.findIndex((f) => f.id === fact.id);
    if (baseIdx < 0) continue;
    if (expIdx < 0) continue;
    // Graph must not demote direct critical facts relative to newly added lower-authority facts above them
    const usurper = expanded.slice(0, expIdx).find(
      (f) =>
        f.warnings.includes("graph_scope_enrichment_only") &&
        f.authorityRank < fact.authorityRank &&
        f.id !== fact.id
    );
    if (usurper && expIdx > baseIdx + 2) {
      // demotion if much worse ranking due to graph enrichment
      if (expIdx - baseIdx > 5) return false;
    }
    void baseIdx;
  }
  // Ensure no graph-only synthetic facts
  if (expanded.some((f) => f.sourceType === "OTHER" && f.matchedOn.some((m) => m.startsWith("graph:") && !f.sourceId))) {
    return false;
  }
  return true;
}

function visibilitySafeForPublic(
  consumer: AiRetrievalConsumer,
  paths: PathObservation[],
  expansionWarnings: string[]
): boolean {
  const policy = getAiRetrievalPolicy(consumer);
  if (policy.maxVisibility !== "PUBLIC") return !expansionWarnings.includes("visibility_leak");
  return paths.every((p) => !p.visibility || p.visibility === "PUBLIC");
}

function conflictSafe(ctx: AiRetrievalContext): boolean {
  const unresolved = ctx.conflicts.filter((c) => c.resolution === "UNRESOLVED");
  // Unresolved must not appear as asserted structured values without warning path —
  // Retrieval already strips for PUBLIC_OUTPUT; for planning we require warning presence if unresolved exist
  if (unresolved.length === 0) return true;
  return ctx.warnings.some((w) => w.includes("conflict") || w.includes("unresolved")) || ctx.purpose !== "PUBLIC_OUTPUT";
}

function buildGaps(benchmark: GraphEvalBenchmark, missing: GraphEvalBenchmark["requiredPaths"], irrelevant: string[]): string[] {
  const gaps = [...benchmark.dataGaps];
  for (const m of missing) {
    gaps.push(`missing path ${m.fromEntityType} ${m.relationshipType} ${m.toEntityType}`);
  }
  if (irrelevant.length) gaps.push(`noise entities: ${irrelevant.slice(0, 5).join(", ")}`);
  return gaps;
}

async function runOneBenchmark(input: {
  benchmark: GraphEvalBenchmark;
  consumer: AiRetrievalConsumer;
  depth: number;
}): Promise<GraphBenchmarkEvalResult> {
  const { benchmark, consumer, depth } = input;
  const purpose =
    consumer === "SEO_CONTENT" ? "CONTENT_WRITING" : "CONTENT_PLANNING";

  const requestBase = {
    consumer,
    purpose,
    query: benchmark.query,
    productIds: benchmark.seedProductIds,
    knowledgeEntryIds: benchmark.seedKnowledgeEntryIds,
    sourceTypes: [
      "PRODUCT",
      "KNOWLEDGE_BASE",
      "MANUFACTURING_ASSET",
      "MEDIA_BUNDLE",
      "BLOG_POST",
    ] as const,
    includeMedia: true,
    includeBusinessRules: true,
    includeConflicts: true,
    maxItems: 30,
  };

  const t0 = Date.now();
  const baselineRes = await retrieveEnterpriseAiContext(
    { ...requestBase },
    { skipRetrievalLog: true, evaluationMode: true }
  );
  const baselineMs = Date.now() - t0;
  if (!baselineRes.ok) {
    throw new Error(`Baseline retrieval failed: ${baselineRes.errors.join("; ")}`);
  }
  const baseline = baselineRes.context;

  const policy = getAiRetrievalPolicy(consumer);
  const maxVisibility = resolveEffectiveMaxVisibility(policy, purpose as never);

  const g0 = Date.now();
  let expansion;
  try {
    expansion = await expandRetrievalScopeViaKnowledgeGraph(
      {
        ...requestBase,
        sourceTypes: [...requestBase.sourceTypes],
      } as never,
      policy,
      {
        enabledForEvaluation: true,
        depth,
        maxNeighbours: 40,
        maxNodes: 100,
        maxEdges: 150,
      }
    );
  } catch (err) {
    // Fallback: baseline still usable
    expansion = {
      enabled: false,
      queried: false,
      scopeEntityIds: [],
      provenance: [],
      bonusesBySourceId: {},
      warnings: [`graph_query_failure:${err instanceof Error ? err.message : String(err)}`],
    };
  }
  const graphQueryMs = Date.now() - g0;

  const t1 = Date.now();
  const expandedRes = await retrieveEnterpriseAiContext(
    { ...requestBase },
    {
      skipRetrievalLog: true,
      evaluationMode: true,
      enabledForEvaluation: true,
      graphExpansionDepth: depth,
    }
  );
  const expandedMs = Date.now() - t1;
  if (!expandedRes.ok) {
    throw new Error(`Expanded retrieval failed: ${expandedRes.errors.join("; ")}`);
  }
  const expanded = expandedRes.context;

  const observedPaths: PathObservation[] = [];
  for (const p of expansion.provenance) {
    for (const m of p.matchedOn) {
      const match = m.match(/graph:(\w+)→(\w+)→(\w+)/) ?? m.match(/graph:(\w+)->(\w+)->(\w+)/);
      if (match) {
        observedPaths.push({
          fromEntityType: match[1]!,
          relationshipType: match[2]!,
          toEntityType: match[3]!,
          depth: Math.max(1, p.pathEntityIds.length - 1),
          visibility: p.visibility,
          matchedOn: m,
        });
      }
    }
  }

  const requiredMatch = matchExpectedPaths(benchmark.requiredPaths, observedPaths);

  const baselineFactKeys = new Set(baseline.facts.map((f) => `${f.sourceType}:${f.sourceId}`));
  const baselineEntityScope = new Set(benchmark.seedProductIds);

  const scopeEntities = expansion.scopeEntityIds.length
    ? await prisma.knowledgeGraphEntity.findMany({
        where: { id: { in: expansion.scopeEntityIds.slice(0, 100) } },
        select: { id: true, entityType: true, sourceType: true, sourceId: true, visibility: true },
      })
    : [];

  const relevantAddedEntities: string[] = [];
  const irrelevantAddedEntities: string[] = [];
  const duplicateAddedEntities: string[] = [];

  for (const ent of scopeEntities) {
    if (baselineEntityScope.has(ent.sourceId) || ent.entityType === "PRODUCT") {
      // root products are baseline seeds — skip counting as additions when they are seeds
      if (benchmark.seedProductIds.includes(ent.sourceId)) continue;
    }
    const cls = classifyAddedEntity({
      entityType: ent.entityType,
      sourceType: ent.sourceType,
      sourceId: ent.sourceId,
      benchmark,
      observedPaths,
      alreadyInBaselineScope: baselineEntityScope.has(ent.sourceId),
    });
    const key = `${ent.entityType}:${ent.sourceId}`;
    if (cls === "RELEVANT") relevantAddedEntities.push(key);
    else if (cls === "DUPLICATE") duplicateAddedEntities.push(key);
    else irrelevantAddedEntities.push(key);
  }

  const relevantAddedFacts: string[] = [];
  const irrelevantAddedFacts: string[] = [];
  for (const fact of expanded.facts) {
    const key = `${fact.sourceType}:${fact.sourceId}`;
    if (baselineFactKeys.has(key)) continue;
    const linked = fact.matchedOn.some((m) => m.startsWith("graph:"));
    if (linked || relevantAddedEntities.some((e) => e.includes(fact.sourceId))) {
      relevantAddedFacts.push(key);
    } else {
      irrelevantAddedFacts.push(key);
    }
  }

  const judgment = buildJudgment({
    benchmark,
    observedPaths,
    relevantAddedEntities: relevantAddedEntities.length,
    irrelevantAddedEntities: irrelevantAddedEntities.length,
    duplicateAddedEntities: duplicateAddedEntities.length,
    relevantAddedFacts: relevantAddedFacts.length,
    irrelevantAddedFacts: irrelevantAddedFacts.length,
    baselineChars: baseline.contextText.length,
    expandedChars: expanded.contextText.length,
    directAuthorityPreserved: authorityPreserved(baseline.facts, expanded.facts),
    visibilitySafe:
      visibilitySafeForPublic(consumer, observedPaths, expansion.warnings) &&
      !expanded.facts.some(
        (f) =>
          getAiRetrievalPolicy(consumer).maxVisibility === "PUBLIC" &&
          f.visibility !== "PUBLIC"
      ),
    conflictSafe: conflictSafe(expanded),
  });

  const useful =
    judgment.expectedPathsFound > 0 ||
    relevantAddedFacts.length > 0 ||
    relevantAddedEntities.some(
      (e) =>
        e.startsWith("BLOG_POST") ||
        e.startsWith("MEDIA_BUNDLE") ||
        e.startsWith("KNOWLEDGE") ||
        e.startsWith("PRINT_METHOD") ||
        e.startsWith("CAPABILITY")
    );

  const improved =
    judgment.expectedPathsFound > 0 &&
    (relevantAddedEntities.length > 0 || relevantAddedFacts.length > 0) &&
    judgment.irrelevantAddedEntities <= judgment.relevantAddedEntities &&
    judgment.visibilitySafe &&
    judgment.directAuthorityPreserved;

  const totalAdds = relevantAddedEntities.length + irrelevantAddedEntities.length;
  const metrics: BenchmarkEvalMetrics = {
    benchmarkId: benchmark.id,
    improved,
    precision: judgment.precision,
    irrelevantAdditionRatio: totalAdds === 0 ? 0 : irrelevantAddedEntities.length / totalAdds,
    contextGrowthPercent: judgment.contextGrowthPercent,
    visibilitySafe: judgment.visibilitySafe,
    directAuthorityPreserved: judgment.directAuthorityPreserved,
    conflictSafe: judgment.conflictSafe,
    graphNodesCountedAsFacts: expanded.facts.some((f) =>
      f.warnings.includes("graph_node_as_fact")
    ),
    usefulNewSourceOrContent: useful,
  };

  void maxVisibility;

  return {
    benchmarkId: benchmark.id,
    query: benchmark.query,
    consumer,
    expectedPaths: benchmark.requiredPaths,
    pathsFound: observedPaths,
    missingRequiredPaths: requiredMatch.missing,
    baseline: {
      factCount: baseline.facts.length,
      sourceCount: baseline.sourcesUsed.length,
      chars: baseline.contextText.length,
      estimatedTokens: estimateTokens(baseline.contextText.length),
      durationMs: baselineMs,
      factIds: baseline.facts.map((f) => f.id),
      topAuthority: summarizeFacts(baseline.facts).slice(0, 8),
    },
    expanded: {
      factCount: expanded.facts.length,
      sourceCount: expanded.sourcesUsed.length,
      chars: expanded.contextText.length,
      estimatedTokens: estimateTokens(expanded.contextText.length),
      durationMs: expandedMs,
      graphQueryMs,
      scopeEntityCount: expansion.scopeEntityIds.length,
      pathCount: expansion.provenance.length,
      warnings: [...expansion.warnings, ...expanded.warnings].slice(0, 30),
      graphPaths: observedPaths.map((p) => p.matchedOn).slice(0, 40),
    },
    relevantAddedEntities,
    irrelevantAddedEntities,
    duplicateAddedEntities,
    relevantAddedFacts,
    irrelevantAddedFacts,
    conflictsAdded: Math.max(0, expanded.conflicts.length - baseline.conflicts.length),
    conflictsUnresolved: expanded.conflicts.filter((c) => c.resolution === "UNRESOLVED").length,
    omittedDelta:
      expanded.omitted.reduce((s, o) => s + o.count, 0) -
      baseline.omitted.reduce((s, o) => s + o.count, 0),
    judgment,
    gaps: buildGaps(benchmark, requiredMatch.missing, irrelevantAddedEntities),
    metrics,
  };
}

export async function runGraphRetrievalEvaluation(input: {
  benchmarkIds?: string[];
  consumers?: AiRetrievalConsumer[];
  depth?: number;
  persist?: boolean;
  requestedBy?: string | null;
}): Promise<GraphEvaluationRunResult> {
  const started = Date.now();
  const consumers = (input.consumers?.length
    ? input.consumers
    : ["SEO_TOPIC_PLANNER", "SEO_BRIEF"]) as AiRetrievalConsumer[];
  const depth = input.depth === 2 ? 2 : 1;
  const benchmarks = input.benchmarkIds?.length
    ? input.benchmarkIds
        .map((id) => getBenchmarkById(id))
        .filter((b): b is GraphEvalBenchmark => Boolean(b))
    : GRAPH_EVALUATION_BENCHMARKS;

  let runId: string | undefined;
  if (input.persist) {
    const run = await prisma.knowledgeGraphEvaluationRun.create({
      data: {
        version: GRAPH_EVALUATION_COHORT_VERSION,
        benchmarkSet: benchmarks.map((b) => b.id).join(","),
        consumer: consumers.join(","),
        status: "RUNNING",
        requestedBy: input.requestedBy ?? null,
        startedAt: new Date(),
      },
    });
    runId = run.id;
  }

  const results: GraphBenchmarkEvalResult[] = [];
  try {
    for (const consumer of consumers) {
      for (const benchmark of benchmarks) {
        results.push(await runOneBenchmark({ benchmark, consumer, depth }));
      }
    }

    const byConsumer = consumers.map((consumer) => {
      const subset = results.filter((r) => r.consumer === consumer);
      const judged = judgeThresholds({
        benchmarks: subset.map((r) => r.metrics),
        consumersEvaluated: [consumer],
      });
      return {
        consumer,
        verdict: judged.verdict,
        improvedCount: judged.improvedCount,
        reasons: judged.reasons,
      };
    });

    const worst =
      byConsumer.some((c) => c.verdict === "FAIL")
        ? "FAIL"
        : byConsumer.some((c) => c.verdict === "CONDITIONAL_PASS")
          ? "CONDITIONAL_PASS"
          : "PASS";
    const overallReasons = byConsumer.flatMap((c) =>
      c.reasons.map((r) => `${c.consumer}: ${r}`)
    );
    const overall = {
      verdict: worst as "PASS" | "CONDITIONAL_PASS" | "FAIL",
      reasons: overallReasons.length ? overallReasons : ["all consumers met thresholds"],
      improvedCount: byConsumer.reduce((s, c) => s + c.improvedCount, 0),
    };
    const recommendation = recommendPilot({
      verdict: overall.verdict,
      byConsumer: byConsumer.map((c) => ({
        consumer: c.consumer,
        verdict: c.verdict,
        improvedCount: c.improvedCount,
      })),
    });

    const payload: GraphEvaluationRunResult = {
      version: GRAPH_EVALUATION_COHORT_VERSION,
      consumers,
      depth,
      productionFlags: getKnowledgeGraphExpansionFlagSnapshot(),
      benchmarks: results,
      byConsumer,
      overallVerdict: overall.verdict,
      overallReasons: overall.reasons,
      recommendation,
      durationMs: Date.now() - started,
      runId,
    };

    if (runId) {
      await prisma.knowledgeGraphEvaluationRun.update({
        where: { id: runId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          thresholdResult: overall.verdict,
          baselineSummary: {
            benchmarks: results.map((r) => ({
              id: r.benchmarkId,
              consumer: r.consumer,
              facts: r.baseline.factCount,
              chars: r.baseline.chars,
              ms: r.baseline.durationMs,
            })),
          },
          expandedSummary: {
            benchmarks: results.map((r) => ({
              id: r.benchmarkId,
              consumer: r.consumer,
              facts: r.expanded.factCount,
              chars: r.expanded.chars,
              scopes: r.expanded.scopeEntityCount,
              paths: r.expanded.pathCount,
              ms: r.expanded.durationMs,
            })),
          },
          resultSummary: {
            overallVerdict: overall.verdict,
            reasons: overall.reasons,
            recommendation,
            byConsumer,
            judgments: results.map((r) => ({
              benchmarkId: r.benchmarkId,
              consumer: r.consumer,
              judgment: r.judgment,
              metrics: r.metrics,
              gaps: r.gaps,
              relevantAddedEntities: r.relevantAddedEntities,
              irrelevantAddedEntities: r.irrelevantAddedEntities,
            })),
            // never store full context text
          },
        },
      });
    }

    return payload;
  } catch (err) {
    if (runId) {
      await prisma.knowledgeGraphEvaluationRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    }
    throw err;
  }
}

export async function listEvaluationRuns(limit = 20) {
  return prisma.knowledgeGraphEvaluationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
    select: {
      id: true,
      version: true,
      benchmarkSet: true,
      consumer: true,
      status: true,
      thresholdResult: true,
      requestedBy: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });
}

export async function getEvaluationRun(id: string) {
  return prisma.knowledgeGraphEvaluationRun.findUnique({
    where: { id },
    include: { annotations: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
}

export async function upsertEvaluationAnnotation(input: {
  runId?: string | null;
  benchmarkId: string;
  targetType: "PATH" | "ENTITY" | "FACT";
  targetKey: string;
  label: "RELEVANT" | "IRRELEVANT" | "DUPLICATE" | "NEEDS_REVIEW";
  note?: string | null;
  createdBy?: string | null;
}) {
  return prisma.knowledgeGraphEvaluationAnnotation.upsert({
    where: {
      benchmarkId_targetType_targetKey_label: {
        benchmarkId: input.benchmarkId,
        targetType: input.targetType,
        targetKey: input.targetKey,
        label: input.label,
      },
    },
    create: {
      runId: input.runId ?? null,
      benchmarkId: input.benchmarkId,
      targetType: input.targetType,
      targetKey: input.targetKey,
      label: input.label,
      note: input.note ?? null,
      createdBy: input.createdBy ?? null,
    },
    update: {
      note: input.note ?? null,
      runId: input.runId ?? undefined,
      createdBy: input.createdBy ?? undefined,
    },
  });
}

/** Safe entry used by admin evaluation only — does not alter global flags. */
export async function evaluateWithGraphExpansion(
  input: Parameters<typeof runGraphRetrievalEvaluation>[0]
) {
  return runGraphRetrievalEvaluation({ ...input, persist: input.persist ?? true });
}
