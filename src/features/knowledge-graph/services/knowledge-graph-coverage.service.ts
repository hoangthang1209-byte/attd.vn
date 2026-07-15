import { prisma } from "@/lib/prisma";

export type ProductRelationCoverage = {
  totalProducts: number;
  withUseCase: number;
  withAudience: number;
  withIndustry: number;
  withCapability: number;
  withMaterial: number;
  withPrintMethod: number;
  withMediaBundle: number;
  productIdsMissingUseCase: string[];
  productIdsMissingAudience: string[];
  productIdsMissingCapability: number;
};

export type CapabilityCoverage = {
  total: number;
  withMedia: number;
  withCaseStudy: number;
};

export type SeoTopicCoverage = {
  total: number;
  withBundle: number;
  linkedToPublishedBlog: number;
};

export type GraphCoverageDashboard = {
  products: ProductRelationCoverage;
  capabilities: CapabilityCoverage;
  seoTopics: SeoTopicCoverage;
  curated: {
    total: number;
    active: number;
    draft: number;
    withEvidence: number;
    withConfidence: number;
    approvalRate: number | null;
  };
  systemCuratedDuplicates: number;
  computedAt: string;
};

async function productIdsWithActiveRel(
  relationshipTypes: string[],
  toEntityTypes: string[]
): Promise<Set<string>> {
  const rows = await prisma.knowledgeGraphRelationship.findMany({
    where: {
      status: "ACTIVE",
      relationshipType: { in: relationshipTypes as never[] },
      fromEntity: { entityType: "PRODUCT", status: "ACTIVE" },
      toEntity: { entityType: { in: toEntityTypes as never[] }, status: "ACTIVE" },
    },
    select: { fromEntityId: true },
  });
  return new Set(rows.map((r) => r.fromEntityId));
}

export async function calculateGraphCoverageDashboard(): Promise<GraphCoverageDashboard> {
  const productEntities = await prisma.knowledgeGraphEntity.findMany({
    where: { entityType: "PRODUCT", status: "ACTIVE" },
    select: { id: true, sourceId: true, displayName: true },
  });
  const totalProducts = productEntities.length;
  const productEntityIds = productEntities.map((p) => p.id);

  const [
    useCaseSet,
    audienceSet,
    industrySet,
    capabilitySet,
    materialSet,
    printSet,
    mediaSet,
  ] = await Promise.all([
    productIdsWithActiveRel(["SUITABLE_FOR"], ["USE_CASE"]),
    productIdsWithActiveRel(["TARGETS"], ["AUDIENCE"]),
    productIdsWithActiveRel(["TARGETS"], ["INDUSTRY"]),
    productIdsWithActiveRel(["HAS_CAPABILITY"], ["CAPABILITY"]),
    productIdsWithActiveRel(["MADE_FROM", "USES"], ["MATERIAL"]),
    productIdsWithActiveRel(["SUPPORTS", "COMPATIBLE_WITH"], ["PRINT_METHOD"]),
    productIdsWithActiveRel(["HAS_MEDIA", "FEATURED_IN"], ["MEDIA_BUNDLE"]),
  ]);

  const missingUseCase = productEntities
    .filter((p) => !useCaseSet.has(p.id))
    .slice(0, 40)
    .map((p) => `${p.displayName} (${p.sourceId})`);
  const missingAudience = productEntities
    .filter((p) => !audienceSet.has(p.id))
    .slice(0, 40)
    .map((p) => `${p.displayName} (${p.sourceId})`);

  const capabilityEntities = await prisma.knowledgeGraphEntity.count({
    where: { entityType: "CAPABILITY", status: "ACTIVE" },
  });
  const capWithMedia = await prisma.knowledgeGraphRelationship.count({
    where: {
      status: "ACTIVE",
      relationshipType: "HAS_MEDIA",
      fromEntity: { entityType: "CAPABILITY" },
      toEntity: { entityType: "MEDIA_BUNDLE" },
    },
  });
  const capWithCase = await prisma.knowledgeGraphRelationship.count({
    where: {
      status: "ACTIVE",
      relationshipType: "EVIDENCED_BY",
      fromEntity: { entityType: "CAPABILITY" },
      toEntity: { entityType: "CASE_STUDY" },
    },
  });

  const seoTotal = await prisma.knowledgeGraphEntity.count({
    where: { entityType: "SEO_TOPIC", status: "ACTIVE" },
  });
  const seoWithBundle = await prisma.knowledgeGraphRelationship.count({
    where: {
      status: "ACTIVE",
      relationshipType: "HAS_MEDIA",
      fromEntity: { entityType: "SEO_TOPIC" },
      toEntity: { entityType: "MEDIA_BUNDLE" },
    },
  });
  const seoLinkedBlog = await prisma.knowledgeGraphRelationship.count({
    where: {
      status: "ACTIVE",
      relationshipType: "LINKS_TO",
      fromEntity: { entityType: "SEO_TOPIC" },
      toEntity: { entityType: "BLOG_POST", visibility: "PUBLIC" },
    },
  });

  const [curatedTotal, curatedActive, curatedDraft, curatedEvidence, curatedConfidence] =
    await Promise.all([
      prisma.knowledgeGraphRelationship.count({ where: { origin: "CURATED" } }),
      prisma.knowledgeGraphRelationship.count({
        where: { origin: "CURATED", status: "ACTIVE" },
      }),
      prisma.knowledgeGraphRelationship.count({
        where: { origin: "CURATED", status: "DRAFT" },
      }),
      prisma.knowledgeGraphRelationship.count({
        where: {
          origin: "CURATED",
          evidenceUrl: { not: null },
          NOT: { evidenceUrl: "" },
        },
      }),
      prisma.knowledgeGraphRelationship.count({
        where: { origin: "CURATED", confidence: { not: null } },
      }),
    ]);

  const decided = curatedActive + curatedDraft;
  const approvalRate =
    decided > 0 ? Math.round((curatedActive / (curatedActive + curatedDraft)) * 1000) / 10 : null;

  // System vs curated active duplicates (same endpoints+type)
  const systemActive = await prisma.knowledgeGraphRelationship.findMany({
    where: { origin: "SYSTEM_DERIVED", status: "ACTIVE" },
    select: { fromEntityId: true, toEntityId: true, relationshipType: true },
    take: 5000,
  });
  let systemCuratedDuplicates = 0;
  for (const edge of systemActive) {
    const curated = await prisma.knowledgeGraphRelationship.findFirst({
      where: {
        fromEntityId: edge.fromEntityId,
        toEntityId: edge.toEntityId,
        relationshipType: edge.relationshipType,
        origin: "CURATED",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (curated) systemCuratedDuplicates += 1;
  }

  void productEntityIds;

  return {
    products: {
      totalProducts,
      withUseCase: [...useCaseSet].filter((id) => productEntities.some((p) => p.id === id)).length,
      withAudience: [...audienceSet].filter((id) => productEntities.some((p) => p.id === id))
        .length,
      withIndustry: [...industrySet].filter((id) => productEntities.some((p) => p.id === id))
        .length,
      withCapability: [...capabilitySet].filter((id) => productEntities.some((p) => p.id === id))
        .length,
      withMaterial: [...materialSet].filter((id) => productEntities.some((p) => p.id === id))
        .length,
      withPrintMethod: [...printSet].filter((id) => productEntities.some((p) => p.id === id))
        .length,
      withMediaBundle: [...mediaSet].filter((id) => productEntities.some((p) => p.id === id))
        .length,
      productIdsMissingUseCase: missingUseCase,
      productIdsMissingAudience: missingAudience,
      productIdsMissingCapability: Math.max(0, totalProducts - capabilitySet.size),
    },
    capabilities: {
      total: capabilityEntities,
      withMedia: capWithMedia,
      withCaseStudy: capWithCase,
    },
    seoTopics: {
      total: seoTotal,
      withBundle: seoWithBundle,
      linkedToPublishedBlog: seoLinkedBlog,
    },
    curated: {
      total: curatedTotal,
      active: curatedActive,
      draft: curatedDraft,
      withEvidence: curatedEvidence,
      withConfidence: curatedConfidence,
      approvalRate,
    },
    systemCuratedDuplicates,
    computedAt: new Date().toISOString(),
  };
}
