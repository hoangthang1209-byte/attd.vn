import { prisma } from "@/lib/prisma";
import { GRAPH_ENTITY_REGISTRY } from "@/features/knowledge-graph/knowledge-graph-entity-registry";
import { validateRelationshipPair } from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import { resolveGraphEntitySource } from "@/features/knowledge-graph/knowledge-graph-entity-registry";

export type KnowledgeGraphHealthReport = {
  totalEntities: number;
  entitiesByType: Record<string, number>;
  totalRelationships: number;
  relationshipsByType: Record<string, number>;
  systemDerivedCount: number;
  curatedCount: number;
  importedCount: number;
  relationshipStatusCounts: Record<string, number>;
  entityCoverageBySource: Record<string, { sourceCount: number; graphCount: number }>;
  orphanEntities: number;
  brokenSourceReferences: number;
  brokenEdgeEndpoints: number;
  duplicateCanonicalCandidates: number;
  invalidRelationshipPairs: number;
  missingEvidenceCurated: number;
  expiredRelationships: number;
  reviewDueRelationships: number;
  visibilityMismatchCount: number;
  unapprovedCurated: number;
  arrayGraphDivergence: number;
  syncLagHoursMax: number | null;
  curatedActiveCount: number;
  curatedEvidenceCoverage: number | null;
  curatedConfidenceCoverage: number | null;
  curatedApprovalRate: number | null;
  productCoverage: {
    total: number;
    withUseCase: number;
    withAudience: number;
    withIndustry: number;
    withCapability: number;
    withMaterial: number;
    withPrintMethod: number;
    withMediaBundle: number;
  };
  systemCuratedDuplicates: number;
  computedAt: string;
};

async function countGroupBy<T extends string>(
  rows: Array<{ key: T; _count: { _all: number } }>
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.key] = row._count._all;
  }
  return out;
}

export async function calculateKnowledgeGraphHealth(): Promise<KnowledgeGraphHealthReport> {
  const now = new Date();

  const [
    totalEntities,
    entityTypeGroups,
    totalRelationships,
    relTypeGroups,
    originGroups,
    statusGroups,
    orphanEntities,
    expiredRelationships,
    missingEvidenceCurated,
    unapprovedCurated,
  ] = await Promise.all([
    prisma.knowledgeGraphEntity.count(),
    prisma.knowledgeGraphEntity.groupBy({
      by: ["entityType"],
      _count: { _all: true },
    }),
    prisma.knowledgeGraphRelationship.count(),
    prisma.knowledgeGraphRelationship.groupBy({
      by: ["relationshipType"],
      _count: { _all: true },
    }),
    prisma.knowledgeGraphRelationship.groupBy({
      by: ["origin"],
      _count: { _all: true },
    }),
    prisma.knowledgeGraphRelationship.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.knowledgeGraphEntity.count({ where: { status: "ORPHANED" } }),
    prisma.knowledgeGraphRelationship.count({
      where: { status: "ACTIVE", validUntil: { lt: now } },
    }),
    prisma.knowledgeGraphRelationship.count({
      where: {
        origin: "CURATED",
        status: { in: ["DRAFT", "ACTIVE"] },
        OR: [{ evidenceUrl: null }, { evidenceUrl: "" }],
      },
    }),
    prisma.knowledgeGraphRelationship.count({
      where: { origin: "CURATED", status: "DRAFT" },
    }),
  ]);

  const entitiesByType = await countGroupBy(
    entityTypeGroups.map((g) => ({ key: g.entityType, _count: g._count }))
  );
  const relationshipsByType = await countGroupBy(
    relTypeGroups.map((g) => ({ key: g.relationshipType, _count: g._count }))
  );
  const origins = await countGroupBy(
    originGroups.map((g) => ({ key: g.origin, _count: g._count }))
  );
  const relationshipStatusCounts = await countGroupBy(
    statusGroups.map((g) => ({ key: g.status, _count: g._count }))
  );

  // Broken source references: ACTIVE entities whose source no longer resolves
  const activeEntities = await prisma.knowledgeGraphEntity.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, sourceType: true, sourceId: true },
    take: 5000,
  });
  let brokenSourceReferences = 0;
  for (const entity of activeEntities) {
    if (!GRAPH_ENTITY_REGISTRY[entity.sourceType]) {
      brokenSourceReferences += 1;
      continue;
    }
    const source = await resolveGraphEntitySource(entity.sourceType, entity.sourceId);
    if (!source?.exists) brokenSourceReferences += 1;
  }

  const allRels = await prisma.knowledgeGraphRelationship.findMany({
    select: {
      id: true,
      fromEntityId: true,
      toEntityId: true,
      relationshipType: true,
      origin: true,
      visibility: true,
      fromEntity: { select: { entityType: true, visibility: true, status: true } },
      toEntity: { select: { entityType: true, visibility: true, status: true } },
    },
    take: 10000,
  });

  let brokenEdgeEndpoints = 0;
  let invalidRelationshipPairs = 0;
  let visibilityMismatchCount = 0;
  for (const rel of allRels) {
    if (!rel.fromEntity || !rel.toEntity) {
      brokenEdgeEndpoints += 1;
      continue;
    }
    if (rel.fromEntity.status === "ORPHANED" || rel.toEntity.status === "ORPHANED") {
      brokenEdgeEndpoints += 1;
    }
    const pair = validateRelationshipPair({
      relationshipType: rel.relationshipType,
      fromEntityType: rel.fromEntity.entityType,
      toEntityType: rel.toEntity.entityType,
      origin: rel.origin,
    });
    if (!pair.ok) invalidRelationshipPairs += 1;

    // Edge visibility should be at least as strict as either endpoint
    const fromRank = rel.fromEntity.visibility;
    const toRank = rel.toEntity.visibility;
    if (
      (fromRank === "CONFIDENTIAL" || toRank === "CONFIDENTIAL") &&
      rel.visibility === "PUBLIC"
    ) {
      visibilityMismatchCount += 1;
    }
  }

  // Duplicate display-name candidates within same entityType (diagnostic only)
  const displayDupes = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM (
      SELECT "entityType", "displayName"
      FROM "KnowledgeGraphEntity"
      GROUP BY "entityType", "displayName"
      HAVING COUNT(*) > 1
    ) d
  `.catch(() => [{ c: BigInt(0) }]);
  const duplicateCanonicalCandidates = Number(displayDupes[0]?.c ?? 0);

  // Entity coverage by supported source (count-based; avoids full ID scans)
  const entityCoverageBySource: Record<string, { sourceCount: number; graphCount: number }> = {};
  const sourceCountResolvers: Record<string, () => Promise<number>> = {
    Product: () => prisma.product.count(),
    Category: () => prisma.category.count(),
    KnowledgeBaseEntry: () => prisma.knowledgeBaseEntry.count(),
    SeoTopic: () => prisma.seoTopic.count(),
    MediaBundle: () => prisma.mediaBundle.count(),
    BlogPost: () => prisma.blogPost.count(),
    ProductionMaterial: () => prisma.productionMaterial.count(),
    Material: () => prisma.material.count(),
    PrintMethod: () => prisma.printMethod.count(),
    ProductionTrim: () => prisma.productionTrim.count(),
    TechPack: () => prisma.techPack.count(),
    Pattern: () => prisma.pattern.count(),
    ManufacturingAsset: () => prisma.manufacturingAsset.count(),
    MediaVocabularyTerm: () =>
      prisma.mediaVocabularyTerm.count({
        where: { type: { in: ["INDUSTRY", "AUDIENCE", "USE_CASE", "TECHNIQUE"] } },
      }),
  };
  for (const [sourceType, entry] of Object.entries(GRAPH_ENTITY_REGISTRY)) {
    if (!entry.systemSyncSupported) continue;
    const resolver = sourceCountResolvers[sourceType];
    const sourceCount = resolver ? await resolver() : 0;
    const graphCount = await prisma.knowledgeGraphEntity.count({ where: { sourceType } });
    entityCoverageBySource[sourceType] = { sourceCount, graphCount };
  }

  // Array/graph divergence for KB product relations (sample bounded)
  const kbEntries = await prisma.knowledgeBaseEntry.findMany({
    select: {
      id: true,
      relatedProductIds: true,
      relatedMediaBundleIds: true,
      relatedSeoTopicIds: true,
      relatedEntryIds: true,
    },
    take: 2000,
  });
  let arrayGraphDivergence = 0;
  for (const entry of kbEntries) {
    const graphEntity = await prisma.knowledgeGraphEntity.findUnique({
      where: {
        sourceType_sourceId: { sourceType: "KnowledgeBaseEntry", sourceId: entry.id },
      },
      select: { id: true },
    });
    if (!graphEntity) {
      if (
        entry.relatedProductIds.length ||
        entry.relatedMediaBundleIds.length ||
        entry.relatedSeoTopicIds.length ||
        entry.relatedEntryIds.length
      ) {
        arrayGraphDivergence += 1;
      }
      continue;
    }
    const activeEdges = await prisma.knowledgeGraphRelationship.findMany({
      where: {
        fromEntityId: graphEntity.id,
        status: "ACTIVE",
        origin: { in: ["SYSTEM_DERIVED", "IMPORTED"] },
      },
      include: { toEntity: { select: { sourceType: true, sourceId: true } } },
    });
    const graphProductIds = new Set(
      activeEdges
        .filter((e) => e.toEntity.sourceType === "Product")
        .map((e) => e.toEntity.sourceId)
    );
    for (const id of entry.relatedProductIds) {
      if (!graphProductIds.has(id)) arrayGraphDivergence += 1;
    }
  }

  const oldestSync = await prisma.knowledgeGraphEntity.findFirst({
    where: { lastSyncedAt: { not: null } },
    orderBy: { lastSyncedAt: "asc" },
    select: { lastSyncedAt: true },
  });
  const syncLagHoursMax = oldestSync?.lastSyncedAt
    ? Math.round((now.getTime() - oldestSync.lastSyncedAt.getTime()) / 36e5)
    : null;

  const reviewDueRelationships = await prisma.knowledgeGraphRelationship.count({
    where: {
      status: "ACTIVE",
      origin: "CURATED",
      OR: [
        { lastVerifiedAt: null },
        { lastVerifiedAt: { lt: new Date(now.getTime() - 90 * 24 * 36e5) } },
      ],
    },
  });

  const { calculateGraphCoverageDashboard } = await import(
    "@/features/knowledge-graph/services/knowledge-graph-coverage.service"
  );
  const coverage = await calculateGraphCoverageDashboard();

  return {
    totalEntities,
    entitiesByType,
    totalRelationships,
    relationshipsByType,
    systemDerivedCount: origins.SYSTEM_DERIVED ?? 0,
    curatedCount: origins.CURATED ?? 0,
    importedCount: origins.IMPORTED ?? 0,
    relationshipStatusCounts,
    entityCoverageBySource,
    orphanEntities,
    brokenSourceReferences,
    brokenEdgeEndpoints,
    duplicateCanonicalCandidates,
    invalidRelationshipPairs,
    missingEvidenceCurated,
    expiredRelationships,
    reviewDueRelationships,
    visibilityMismatchCount,
    unapprovedCurated,
    arrayGraphDivergence,
    syncLagHoursMax,
    curatedActiveCount: coverage.curated.active,
    curatedEvidenceCoverage:
      coverage.curated.total > 0
        ? Math.round((coverage.curated.withEvidence / coverage.curated.total) * 1000) / 10
        : null,
    curatedConfidenceCoverage:
      coverage.curated.total > 0
        ? Math.round((coverage.curated.withConfidence / coverage.curated.total) * 1000) / 10
        : null,
    curatedApprovalRate: coverage.curated.approvalRate,
    productCoverage: {
      total: coverage.products.totalProducts,
      withUseCase: coverage.products.withUseCase,
      withAudience: coverage.products.withAudience,
      withIndustry: coverage.products.withIndustry,
      withCapability: coverage.products.withCapability,
      withMaterial: coverage.products.withMaterial,
      withPrintMethod: coverage.products.withPrintMethod,
      withMediaBundle: coverage.products.withMediaBundle,
    },
    systemCuratedDuplicates: coverage.systemCuratedDuplicates,
    computedAt: now.toISOString(),
  };
}
