/**
 * Deterministic relevance judgment for graph expansion evaluation.
 */

import type { GraphEvalBenchmark, GraphEvalPathSpec } from "@/features/knowledge-graph/evaluation/graph-evaluation-benchmarks";

export type GraphEvaluationJudgment = {
  expectedPathsFound: number;
  expectedPathsTotal: number;
  optionalPathsFound: number;
  relevantAddedEntities: number;
  irrelevantAddedEntities: number;
  duplicateAddedEntities: number;
  relevantAddedFacts: number;
  irrelevantAddedFacts: number;
  precision: number;
  recall: number;
  contextGrowthPercent: number;
  directAuthorityPreserved: boolean;
  visibilitySafe: boolean;
  conflictSafe: boolean;
  limitations: string[];
};

export type PathObservation = {
  fromEntityType: string;
  relationshipType: string;
  toEntityType: string;
  depth: number;
  visibility?: string;
  matchedOn: string;
};

function pathMatches(spec: GraphEvalPathSpec, obs: PathObservation): boolean {
  return (
    obs.fromEntityType === spec.fromEntityType &&
    obs.relationshipType === spec.relationshipType &&
    obs.toEntityType === spec.toEntityType &&
    obs.depth <= (spec.maxDepth ?? 2)
  );
}

export function matchExpectedPaths(
  expected: GraphEvalPathSpec[],
  observed: PathObservation[]
): { found: number; total: number; missing: GraphEvalPathSpec[] } {
  const missing: GraphEvalPathSpec[] = [];
  let found = 0;
  for (const spec of expected) {
    if (observed.some((o) => pathMatches(spec, o))) found += 1;
    else missing.push(spec);
  }
  return { found, total: expected.length, missing };
}

export function classifyAddedEntity(input: {
  entityType: string;
  sourceType: string;
  sourceId: string;
  benchmark: GraphEvalBenchmark;
  observedPaths: PathObservation[];
  alreadyInBaselineScope: boolean;
}): "RELEVANT" | "IRRELEVANT" | "DUPLICATE" {
  if (input.alreadyInBaselineScope) return "DUPLICATE";

  const onExpectedOrOptional = [...input.benchmark.requiredPaths, ...input.benchmark.optionalPaths].some(
    (spec) =>
      input.observedPaths.some(
        (o) =>
          pathMatches(spec, o) &&
          (o.toEntityType === input.entityType || o.fromEntityType === input.entityType)
      )
  );
  if (onExpectedOrOptional) return "RELEVANT";

  for (const hint of input.benchmark.prohibitedPathHints) {
    if (
      input.entityType.toLowerCase().includes(hint.toLowerCase()) ||
      input.sourceType.toLowerCase().includes(hint.toLowerCase())
    ) {
      return "IRRELEVANT";
    }
  }

  // Overly generic expansion without matching expected path family
  if (["POLICY", "FAQ"].includes(input.entityType)) return "IRRELEVANT";
  return "IRRELEVANT";
}

export function buildJudgment(input: {
  benchmark: GraphEvalBenchmark;
  observedPaths: PathObservation[];
  relevantAddedEntities: number;
  irrelevantAddedEntities: number;
  duplicateAddedEntities: number;
  relevantAddedFacts: number;
  irrelevantAddedFacts: number;
  baselineChars: number;
  expandedChars: number;
  directAuthorityPreserved: boolean;
  visibilitySafe: boolean;
  conflictSafe: boolean;
}): GraphEvaluationJudgment {
  const required = matchExpectedPaths(input.benchmark.requiredPaths, input.observedPaths);
  const optional = matchExpectedPaths(input.benchmark.optionalPaths, input.observedPaths);
  const precisionDenom =
    input.relevantAddedEntities + input.irrelevantAddedEntities + input.duplicateAddedEntities;
  const precision =
    precisionDenom === 0
      ? required.found > 0
        ? 1
        : 0
      : input.relevantAddedEntities / Math.max(1, input.relevantAddedEntities + input.irrelevantAddedEntities);
  const recall = required.total === 0 ? 1 : required.found / required.total;
  const contextGrowthPercent =
    input.baselineChars === 0
      ? input.expandedChars > 0
        ? 100
        : 0
      : ((input.expandedChars - input.baselineChars) / input.baselineChars) * 100;

  return {
    expectedPathsFound: required.found,
    expectedPathsTotal: required.total,
    optionalPathsFound: optional.found,
    relevantAddedEntities: input.relevantAddedEntities,
    irrelevantAddedEntities: input.irrelevantAddedEntities,
    duplicateAddedEntities: input.duplicateAddedEntities,
    relevantAddedFacts: input.relevantAddedFacts,
    irrelevantAddedFacts: input.irrelevantAddedFacts,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    contextGrowthPercent: Number(contextGrowthPercent.toFixed(2)),
    directAuthorityPreserved: input.directAuthorityPreserved,
    visibilitySafe: input.visibilitySafe,
    conflictSafe: input.conflictSafe,
    limitations: [
      "Deterministic expected-path matching is not a complete semantic relevance judge.",
      ...input.benchmark.dataGaps,
    ],
  };
}

export function pathKey(obs: PathObservation): string {
  return `${obs.fromEntityType}→${obs.relationshipType}→${obs.toEntityType}`;
}
