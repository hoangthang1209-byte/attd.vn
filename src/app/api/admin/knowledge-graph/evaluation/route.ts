import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  evaluateGraphExpansionPreview,
  KNOWLEDGE_GRAPH_EVALUATION_CASES,
} from "@/features/knowledge-graph/knowledge-graph-evaluation";
import { isKnowledgeGraphExpansionEnabled } from "@/features/ai-retrieval/sources/knowledge-graph-source";
import { prisma } from "@/lib/prisma";
import { traverseKnowledgeGraph } from "@/features/knowledge-graph/services/knowledge-graph-query.service";
import { getAllowedGraphRelationshipsForConsumer } from "@/features/ai-retrieval/knowledge-graph-expansion-policy";

/**
 * Authorized admin preview only. Does not change production Retrieval output.
 * Always runs a local/scoped graph preview regardless of the global expansion flag,
 * but clearly reports that production Retrieval remains unchanged when the flag is off.
 */
export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: { caseId?: string; preview?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const evalCase = KNOWLEDGE_GRAPH_EVALUATION_CASES.find((c) => c.id === body.caseId);
  if (!evalCase) {
    return NextResponse.json({ message: "Unknown evaluation case" }, { status: 400 });
  }

  const productionFlagOn = isKnowledgeGraphExpansionEnabled();

  // Baseline: count KB/product mentions by cheap search (not full Retrieval pipeline rewrite)
  const productHits = await prisma.product.count({
    where: {
      OR: [
        { name: { contains: evalCase.query.split(" ")[0] ?? evalCase.query, mode: "insensitive" } },
        { tags: { hasSome: evalCase.query.split(/\s+/).slice(0, 3) } },
      ],
      status: "ACTIVE",
    },
  });

  const productNodes = await prisma.knowledgeGraphEntity.findMany({
    where: {
      entityType: "PRODUCT",
      status: "ACTIVE",
      displayName: {
        contains: evalCase.query.includes("polo")
          ? "polo"
          : evalCase.query.includes("thun")
            ? "thun"
            : evalCase.query.slice(0, 12),
        mode: "insensitive",
      },
    },
    take: 5,
  });

  const allowed = getAllowedGraphRelationshipsForConsumer("SEO_CONTENT");
  const matchedOn: string[] = [];
  let scopeEntityCount = 0;
  const paths: unknown[] = [];

  for (const node of productNodes.slice(0, 3)) {
    const neighbours = await traverseKnowledgeGraph({
      entityId: node.id,
      depth: 2,
      maxVisibility: "PUBLIC",
      relationshipTypes: allowed,
    });
    scopeEntityCount += neighbours.nodes.length;
    for (const edge of neighbours.edges) {
      matchedOn.push(
        `graph:${neighbours.nodes.find((n) => n.id === edge.fromEntityId)?.entityType}->${edge.relationshipType}->${neighbours.nodes.find((n) => n.id === edge.toEntityId)?.entityType}`
      );
    }
    paths.push({
      root: node.displayName,
      truncated: neighbours.truncated,
      edgeCount: neighbours.edges.length,
      pathSamples: (neighbours.paths ?? []).slice(0, 5),
    });
  }

  const comparison = evaluateGraphExpansionPreview({
    caseId: evalCase.id,
    query: evalCase.query,
    baselineFactCount: productHits,
    previewMatchedOn: matchedOn,
    previewScopeEntityCount: scopeEntityCount,
    baselineContextChars: productHits * 120,
    previewContextChars: productHits * 120 + matchedOn.join("").length,
    expectedPaths: evalCase.expectedPaths,
    irrelevantPathHints: evalCase.irrelevantPathHints,
  });

  return NextResponse.json({
    productionRetrievalUnchanged: !productionFlagOn,
    productionExpansionFlag: productionFlagOn,
    case: evalCase,
    baseline: {
      approximateProductHits: productHits,
      note: "Baseline uses catalog counts only; full Retrieval Inspector remains unchanged when flag off.",
    },
    graphPreview: {
      scopeEntityCount,
      matchedOn: matchedOn.slice(0, 40),
      paths,
    },
    comparison,
  });
}

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;
  return NextResponse.json({
    cases: KNOWLEDGE_GRAPH_EVALUATION_CASES,
    productionExpansionFlag: isKnowledgeGraphExpansionEnabled(),
  });
}
