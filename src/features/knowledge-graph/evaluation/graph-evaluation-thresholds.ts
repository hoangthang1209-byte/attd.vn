/**
 * Acceptance thresholds for governed graph retrieval evaluation.
 */

export type ThresholdVerdict = "PASS" | "CONDITIONAL_PASS" | "FAIL";

export const GRAPH_EVALUATION_THRESHOLDS = {
  minImprovedBenchmarks: 5,
  minBenchmarksTotal: 6,
  minExpectedPathPrecision: 0.8,
  maxIrrelevantAdditionRatio: 0.2,
  maxContextGrowthPercent: 30,
  requireNoVisibilityLeaks: true,
  requireDirectAuthorityPreserved: true,
  requireConflictSafe: true,
  requireGraphNodesNotCountedAsFacts: true,
  requireUsefulAdditionOnImproved: true,
} as const;

export type BenchmarkEvalMetrics = {
  benchmarkId: string;
  improved: boolean;
  precision: number;
  irrelevantAdditionRatio: number;
  contextGrowthPercent: number;
  visibilitySafe: boolean;
  directAuthorityPreserved: boolean;
  conflictSafe: boolean;
  graphNodesCountedAsFacts: boolean;
  usefulNewSourceOrContent: boolean;
  /** 1.0 required — missing mandatory baseline facts → FAIL */
  baselineParity?: number;
  /** Reported separately; absence does not auto-fail Retrieval PASS */
  mediaBundleUseful?: boolean;
};

export type ThresholdAggregateInput = {
  benchmarks: BenchmarkEvalMetrics[];
  consumersEvaluated: string[];
};

export function judgeThresholds(input: ThresholdAggregateInput): {
  verdict: ThresholdVerdict;
  reasons: string[];
  improvedCount: number;
} {
  const reasons: string[] = [];
  const rows = input.benchmarks;
  const improvedCount = rows.filter((r) => r.improved).length;

  let hardFail = false;
  let softFail = false;

  if (improvedCount < GRAPH_EVALUATION_THRESHOLDS.minImprovedBenchmarks) {
    reasons.push(
      `improved benchmarks ${improvedCount}/${GRAPH_EVALUATION_THRESHOLDS.minBenchmarksTotal} (need ≥${GRAPH_EVALUATION_THRESHOLDS.minImprovedBenchmarks})`
    );
    hardFail = true;
  }

  for (const row of rows) {
    if (row.precision < GRAPH_EVALUATION_THRESHOLDS.minExpectedPathPrecision) {
      reasons.push(`${row.benchmarkId}: precision ${row.precision.toFixed(2)} < 0.80`);
      softFail = true;
    }
    if (row.irrelevantAdditionRatio > GRAPH_EVALUATION_THRESHOLDS.maxIrrelevantAdditionRatio) {
      reasons.push(
        `${row.benchmarkId}: irrelevant ratio ${row.irrelevantAdditionRatio.toFixed(2)} > 0.20`
      );
      softFail = true;
    }
    if (row.contextGrowthPercent > GRAPH_EVALUATION_THRESHOLDS.maxContextGrowthPercent) {
      reasons.push(
        `${row.benchmarkId}: context growth ${row.contextGrowthPercent.toFixed(1)}% > 30%`
      );
      softFail = true;
    }
    if (!row.visibilitySafe) {
      reasons.push(`${row.benchmarkId}: visibility leak`);
      hardFail = true;
    }
    if (!row.directAuthorityPreserved) {
      reasons.push(`${row.benchmarkId}: direct authority demotion`);
      hardFail = true;
    }
    if (!row.conflictSafe) {
      reasons.push(`${row.benchmarkId}: unresolved conflict presented as fact`);
      hardFail = true;
    }
    if (row.graphNodesCountedAsFacts) {
      reasons.push(`${row.benchmarkId}: graph node treated as fact`);
      hardFail = true;
    }
    if ((row.baselineParity ?? 1) < 1) {
      reasons.push(`${row.benchmarkId}: baseline parity ${(row.baselineParity ?? 0).toFixed(2)} < 1.00`);
      hardFail = true;
    }
    if (row.improved && !row.usefulNewSourceOrContent) {
      reasons.push(`${row.benchmarkId}: improved without useful new source/content`);
      softFail = true;
    }
  }

  if (hardFail) return { verdict: "FAIL", reasons, improvedCount };
  if (softFail || improvedCount < GRAPH_EVALUATION_THRESHOLDS.minBenchmarksTotal) {
    return { verdict: "CONDITIONAL_PASS", reasons, improvedCount };
  }
  return { verdict: "PASS", reasons: ["all acceptance thresholds met"], improvedCount };
}

export type PilotRecommendation =
  | "NO_PILOT"
  | "ADMIN_ONLY_PILOT"
  | "SEO_TOPIC_PLANNER_PILOT"
  | "SEO_BRIEF_PILOT";

export function recommendPilot(input: {
  verdict: ThresholdVerdict;
  byConsumer: Array<{ consumer: string; verdict: ThresholdVerdict; improvedCount: number }>;
}): { recommendation: PilotRecommendation; rationale: string } {
  if (input.verdict === "FAIL") {
    return {
      recommendation: "NO_PILOT",
      rationale: "Hard safety or improvement thresholds not met; keep expansion disabled.",
    };
  }
  const planner = input.byConsumer.find((c) => c.consumer === "SEO_TOPIC_PLANNER");
  const brief = input.byConsumer.find((c) => c.consumer === "SEO_BRIEF");
  if (input.verdict === "PASS" && brief?.verdict === "PASS") {
    return {
      recommendation: "SEO_BRIEF_PILOT",
      rationale: "Measured PASS including SEO_BRIEF; candidate for limited brief pilot after explicit enable.",
    };
  }
  if (input.verdict === "PASS" && planner?.verdict === "PASS") {
    return {
      recommendation: "SEO_TOPIC_PLANNER_PILOT",
      rationale: "Measured PASS for planner; limited topic-planner pilot possible after explicit enable.",
    };
  }
  if (input.verdict === "CONDITIONAL_PASS") {
    return {
      recommendation: "ADMIN_ONLY_PILOT",
      rationale: "Conditional pass — admin evaluation-only / guarded pilot, not consumer production enablement.",
    };
  }
  return {
    recommendation: "NO_PILOT",
    rationale: "Insufficient evidence for consumer pilot.",
  };
}
