/**
 * Pilot readiness — never mutates flags (Sprint 12.4 rules).
 */

import type { ThresholdVerdict } from "@/features/knowledge-graph/evaluation/graph-evaluation-thresholds";
import { getKnowledgeGraphExpansionFlagSnapshot } from "@/features/knowledge-graph/evaluation/graph-expansion-flags";
import { GRAPH_CONTEXT_GROWTH } from "@/features/knowledge-graph/evaluation/graph-expansion-budgets";
import { GRAPH_PATH_POLICY_VERSION } from "@/features/knowledge-graph/evaluation/graph-expansion-path-policy";
import { prisma } from "@/lib/prisma";

export type PilotReadiness =
  | "NOT_READY"
  | "ADMIN_ONLY"
  | "READY_FOR_LIMITED_PILOT"
  | "READY_FOR_ENABLEMENT";

export async function evaluateKnowledgeGraphPilotReadiness(input?: {
  latestRunId?: string;
}): Promise<{
  readiness: PilotReadiness;
  reasons: string[];
  flags: ReturnType<typeof getKnowledgeGraphExpansionFlagSnapshot>;
  policyVersion: string;
  contextGrowthCap: typeof GRAPH_CONTEXT_GROWTH;
  coverage: {
    printMethods: number;
    seoTopics: number;
    mediaBundles: number;
    publicVocabulary: number;
    topicBlogLinks: number;
  };
  latestVerdict: string | null;
  byConsumer: Array<{ consumer: string; verdict: string }> | null;
}> {
  const flags = getKnowledgeGraphExpansionFlagSnapshot();
  const run = input?.latestRunId
    ? await prisma.knowledgeGraphEvaluationRun.findUnique({ where: { id: input.latestRunId } })
    : await prisma.knowledgeGraphEvaluationRun.findFirst({ orderBy: { createdAt: "desc" } });

  const [printMethods, seoTopics, mediaBundles, publicVocabulary, topicBlogLinks] =
    await Promise.all([
      prisma.printMethod.count({ where: { isActive: true } }),
      prisma.seoTopic.count(),
      prisma.mediaBundle.count(),
      prisma.mediaVocabularyTerm.count({ where: { visibility: "PUBLIC" } }),
      prisma.knowledgeGraphRelationship.count({
        where: {
          relationshipType: "LINKS_TO",
          status: "ACTIVE",
          fromEntity: { entityType: "SEO_TOPIC" },
          toEntity: { entityType: "BLOG_POST" },
        },
      }),
    ]);

  const reasons: string[] = [];
  const verdict = (run?.thresholdResult as ThresholdVerdict | null) ?? null;
  const summary = (run?.resultSummary ?? null) as {
    byConsumer?: Array<{ consumer: string; verdict: string; improvedCount?: number }>;
    overallVerdict?: string;
  } | null;
  const byConsumer = summary?.byConsumer ?? null;

  if (flags.global || flags.SEO_TOPIC_PLANNER || flags.SEO_BRIEF || flags.SEO_CONTENT) {
    reasons.push("Unexpected production expansion flag enabled — treat as misconfiguration");
  }
  if (!verdict || verdict === "FAIL") {
    reasons.push("Latest evaluation FAIL or missing → NOT_READY");
  }
  if (verdict === "CONDITIONAL_PASS") {
    reasons.push("CONDITIONAL_PASS — relevance improved but quality/growth thresholds incomplete");
  }
  if (printMethods === 0) reasons.push("PrintMethod catalog empty");
  if (seoTopics === 0) reasons.push("No SeoTopic planning rows");
  if (mediaBundles === 0) reasons.push("No MediaBundle rows (media value reported separately)");
  if (publicVocabulary === 0) reasons.push("No PUBLIC vocabulary terms");

  const improvedEnough = byConsumer?.every((c) => (c as { improvedCount?: number }).improvedCount == null || ((c as { improvedCount?: number }).improvedCount ?? 0) >= 5);

  let readiness: PilotReadiness = "NOT_READY";
  if (verdict === "FAIL" || !verdict) {
    readiness = "NOT_READY";
  } else if (
    verdict === "PASS" &&
    printMethods > 0 &&
    publicVocabulary > 0 &&
    byConsumer?.some((c) => c.verdict === "PASS")
  ) {
    readiness = "READY_FOR_LIMITED_PILOT";
    reasons.push(
      "PASS for at least one consumer — limited pilot possible only after explicit user enablement"
    );
  } else if (verdict === "CONDITIONAL_PASS" || verdict === "PASS") {
    readiness = "ADMIN_ONLY";
    reasons.push("Keep consumer flags false; use admin inspector pilot only");
  } else {
    readiness = "NOT_READY";
  }

  if (improvedEnough === false && readiness !== "NOT_READY") {
    reasons.push("Fewer than 5/6 improved on a consumer — treat cautiously");
  }

  // READY_FOR_ENABLEMENT intentionally not granted in this sprint
  void ("READY_FOR_ENABLEMENT" satisfies PilotReadiness);

  return {
    readiness,
    reasons,
    flags,
    policyVersion: GRAPH_PATH_POLICY_VERSION,
    contextGrowthCap: GRAPH_CONTEXT_GROWTH,
    coverage: {
      printMethods,
      seoTopics,
      mediaBundles,
      publicVocabulary,
      topicBlogLinks,
    },
    latestVerdict: verdict,
    byConsumer,
  };
}
