/**
 * Pilot readiness — never mutates flags.
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
  };
  latestVerdict: string | null;
}> {
  const flags = getKnowledgeGraphExpansionFlagSnapshot();
  const run = input?.latestRunId
    ? await prisma.knowledgeGraphEvaluationRun.findUnique({ where: { id: input.latestRunId } })
    : await prisma.knowledgeGraphEvaluationRun.findFirst({ orderBy: { createdAt: "desc" } });

  const [printMethods, seoTopics, mediaBundles, publicVocabulary] = await Promise.all([
    prisma.printMethod.count({ where: { isActive: true } }),
    prisma.seoTopic.count(),
    prisma.mediaBundle.count(),
    prisma.mediaVocabularyTerm.count({ where: { visibility: "PUBLIC" } }),
  ]);

  const reasons: string[] = [];
  const verdict = (run?.thresholdResult as ThresholdVerdict | null) ?? null;

  if (flags.global || flags.SEO_TOPIC_PLANNER || flags.SEO_BRIEF || flags.SEO_CONTENT) {
    reasons.push("Unexpected production expansion flag enabled — treat as misconfiguration");
  }
  if (!verdict || verdict === "FAIL") {
    reasons.push("Latest evaluation FAIL or missing");
  }
  if (verdict === "CONDITIONAL_PASS") {
    reasons.push("CONDITIONAL_PASS — admin-only pilot only");
  }
  if (printMethods === 0) reasons.push("PrintMethod catalog empty");
  if (seoTopics === 0) reasons.push("No SeoTopic planning rows");
  if (mediaBundles === 0) reasons.push("No MediaBundle rows (content value limited)");
  if (publicVocabulary === 0) reasons.push("No PUBLIC vocabulary terms");

  let readiness: PilotReadiness = "NOT_READY";
  if (verdict === "PASS" && printMethods > 0 && publicVocabulary > 0) {
    readiness = mediaBundles > 0 ? "READY_FOR_LIMITED_PILOT" : "ADMIN_ONLY";
    if (readiness === "READY_FOR_LIMITED_PILOT") {
      reasons.push("PASS with print methods + public vocab + bundles — limited pilot possible after explicit enable");
    }
  } else if (verdict === "CONDITIONAL_PASS" || verdict === "PASS") {
    readiness = "ADMIN_ONLY";
    reasons.push("Keep consumer flags false; use admin inspector pilot only");
  } else {
    readiness = "NOT_READY";
  }

  return {
    readiness,
    reasons,
    flags,
    policyVersion: GRAPH_PATH_POLICY_VERSION,
    contextGrowthCap: GRAPH_CONTEXT_GROWTH,
    coverage: { printMethods, seoTopics, mediaBundles, publicVocabulary },
    latestVerdict: verdict,
  };
}
