import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { GRAPH_EVALUATION_BENCHMARKS } from "@/features/knowledge-graph/evaluation/graph-evaluation-benchmarks";
import { GRAPH_EVALUATION_COHORT } from "@/features/knowledge-graph/evaluation/graph-evaluation-cohort";
import { GRAPH_CURATION_MANIFEST_META } from "@/features/knowledge-graph/evaluation/graph-curation-manifest";
import { GRAPH_EVALUATION_THRESHOLDS } from "@/features/knowledge-graph/evaluation/graph-evaluation-thresholds";
import { getKnowledgeGraphExpansionFlagSnapshot } from "@/features/knowledge-graph/evaluation/graph-expansion-flags";
import { isKnowledgeGraphExpansionEnabled } from "@/features/ai-retrieval/sources/knowledge-graph-source";

/** Evaluation metadata — no run execution. */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  return NextResponse.json({
    benchmarks: GRAPH_EVALUATION_BENCHMARKS,
    cohort: {
      version: GRAPH_EVALUATION_COHORT.version,
      productCount: GRAPH_EVALUATION_COHORT.products.length,
      capabilityCount: GRAPH_EVALUATION_COHORT.capabilities.length,
      dataGaps: GRAPH_EVALUATION_COHORT.dataGaps,
    },
    curation: GRAPH_CURATION_MANIFEST_META,
    thresholds: GRAPH_EVALUATION_THRESHOLDS,
    productionExpansionFlag: isKnowledgeGraphExpansionEnabled(),
    consumerFlags: getKnowledgeGraphExpansionFlagSnapshot(),
  });
}
