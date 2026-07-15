/**
 * Sprint 12.1/12.2 evaluation surface.
 * Prefer importing from evaluation/* modules for new code.
 */

export {
  GRAPH_EVALUATION_BENCHMARKS,
  KNOWLEDGE_GRAPH_EVALUATION_CASES,
  getBenchmarkById,
  type GraphEvalBenchmark,
  type GraphEvalPathSpec,
} from "@/features/knowledge-graph/evaluation/graph-evaluation-benchmarks";

export type GraphEvalExpectedPath = {
  fromEntityType: string;
  relationshipType: string;
  toEntityType: string;
  note?: string;
};

export type GraphEvalCase = {
  id: string;
  query: string;
  description: string;
  expectedPaths: GraphEvalExpectedPath[];
  irrelevantPathHints: string[];
};

export type GraphEvalComparison = {
  caseId: string;
  query: string;
  baselineFactCount: number;
  previewScopeEntityCount: number;
  relevantPathsFound: number;
  expectedPathCount: number;
  irrelevantPathHits: number;
  contextDeltaChars: number;
  warnings: string[];
};

/**
 * Deterministic evaluator contract — compares counts/path presence only.
 * No AI judge.
 */
export function evaluateGraphExpansionPreview(input: {
  caseId: string;
  query: string;
  baselineFactCount: number;
  previewMatchedOn: string[];
  previewScopeEntityCount: number;
  baselineContextChars: number;
  previewContextChars: number;
  expectedPaths: GraphEvalExpectedPath[];
  irrelevantPathHints: string[];
}): GraphEvalComparison {
  const matched = input.previewMatchedOn.join(" | ").toLowerCase();
  let relevantPathsFound = 0;
  for (const path of input.expectedPaths) {
    const token = `${path.relationshipType}`.toLowerCase();
    const from = path.fromEntityType.toLowerCase();
    const to = path.toEntityType.toLowerCase();
    if (matched.includes(token) && (matched.includes(from) || matched.includes(to))) {
      relevantPathsFound += 1;
    }
  }
  let irrelevantPathHits = 0;
  for (const hint of input.irrelevantPathHints) {
    if (matched.includes(hint.toLowerCase())) irrelevantPathHits += 1;
  }
  return {
    caseId: input.caseId,
    query: input.query,
    baselineFactCount: input.baselineFactCount,
    previewScopeEntityCount: input.previewScopeEntityCount,
    relevantPathsFound,
    expectedPathCount: input.expectedPaths.length,
    irrelevantPathHits,
    contextDeltaChars: input.previewContextChars - input.baselineContextChars,
    warnings: [],
  };
}
