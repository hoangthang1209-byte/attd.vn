/**
 * Cohort product relation coverage report (read-only).
 */

import { prisma } from "@/lib/prisma";
import { GRAPH_EVALUATION_COHORT } from "@/features/knowledge-graph/evaluation/graph-evaluation-cohort";

const DIMENSIONS = [
  "PRODUCT_CATEGORY",
  "USE_CASE",
  "AUDIENCE",
  "INDUSTRY",
  "CAPABILITY",
  "MATERIAL",
  "PRINT_METHOD",
  "MEDIA_BUNDLE",
  "KNOWLEDGE_ENTRY",
  "BLOG_POST",
] as const;

export async function buildCohortCoverageReport() {
  const products = GRAPH_EVALUATION_COHORT.products;
  const rows = [];

  for (const product of products) {
    const entity = await prisma.knowledgeGraphEntity.findUnique({
      where: {
        sourceType_sourceId: { sourceType: "Product", sourceId: product.sourceId },
      },
    });
    if (!entity) {
      rows.push({
        productId: product.sourceId,
        label: product.label,
        found: false,
        dimensions: Object.fromEntries(DIMENSIONS.map((d) => [d, false])),
      });
      continue;
    }

    const edges = await prisma.knowledgeGraphRelationship.findMany({
      where: {
        status: { in: ["ACTIVE", "DRAFT"] },
        OR: [{ fromEntityId: entity.id }, { toEntityId: entity.id }],
      },
      include: {
        fromEntity: { select: { entityType: true } },
        toEntity: { select: { entityType: true } },
      },
    });

    const present = new Set<string>();
    for (const e of edges) {
      const other =
        e.fromEntityId === entity.id ? e.toEntity.entityType : e.fromEntity.entityType;
      present.add(other);
      if (e.relationshipType === "BELONGS_TO") present.add("PRODUCT_CATEGORY");
      if (e.relationshipType === "SUITABLE_FOR") present.add("USE_CASE");
      if (e.relationshipType === "TARGETS") {
        present.add(other);
      }
      if (e.relationshipType === "HAS_CAPABILITY") present.add("CAPABILITY");
      if (e.relationshipType === "HAS_MEDIA") present.add("MEDIA_BUNDLE");
      if (e.relationshipType === "DOCUMENTED_BY") present.add("KNOWLEDGE_ENTRY");
      if (e.relationshipType === "FEATURED_IN") present.add("BLOG_POST");
      if (e.relationshipType === "MADE_FROM") present.add("MATERIAL");
      if (e.relationshipType === "SUPPORTS") present.add("PRINT_METHOD");
    }

    rows.push({
      productId: product.sourceId,
      label: product.label,
      found: true,
      entityId: entity.id,
      dimensions: Object.fromEntries(DIMENSIONS.map((d) => [d, present.has(d)])),
      edgeCount: edges.length,
    });
  }

  return {
    version: GRAPH_EVALUATION_COHORT.version,
    productCount: products.length,
    rows,
    dataGaps: GRAPH_EVALUATION_COHORT.dataGaps,
  };
}
