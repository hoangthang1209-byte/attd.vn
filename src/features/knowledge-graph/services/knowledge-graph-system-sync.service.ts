import type {
  KnowledgeBaseVisibility,
  KnowledgeGraphEntity,
  KnowledgeGraphRelationshipOrigin,
  KnowledgeGraphRelationshipType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateGraphEntity } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import {
  relationshipOriginPrecedence,
  resolveRelationshipVisibility,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import type { KnowledgeGraphRelationSyncReport } from "@/features/knowledge-graph/knowledge-graph-types";

type DesiredEdge = {
  fromSourceType: string;
  fromSourceId: string;
  toSourceType: string;
  toSourceId: string;
  relationshipType: KnowledgeGraphRelationshipType;
  origin: KnowledgeGraphRelationshipOrigin;
  sourceEntryId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
};

function emptyRelationReport(dryRun: boolean): KnowledgeGraphRelationSyncReport {
  return {
    dryRun,
    scanned: 0,
    created: 0,
    updated: 0,
    existing: 0,
    archived: 0,
    missingTargets: 0,
    invalidPairs: 0,
    errors: [],
  };
}

async function ensureEntity(
  sourceType: string,
  sourceId: string,
  dryRun: boolean
): Promise<KnowledgeGraphEntity | null> {
  return resolveOrCreateGraphEntity(sourceType, sourceId, { dryRun });
}

async function archiveMissingSystemEdges(
  key: string,
  stillDesired: Set<string>,
  dryRun: boolean,
  report: KnowledgeGraphRelationSyncReport
) {
  const edges = await prisma.knowledgeGraphRelationship.findMany({
    where: {
      origin: "SYSTEM_DERIVED",
      status: "ACTIVE",
      metadata: { path: ["syncKey"], equals: key },
    },
    select: { id: true, fromEntityId: true, toEntityId: true, relationshipType: true },
  });

  for (const edge of edges) {
    const token = `${edge.fromEntityId}|${edge.toEntityId}|${edge.relationshipType}`;
    if (stillDesired.has(token)) continue;
    report.archived += 1;
    if (!dryRun) {
      await prisma.knowledgeGraphRelationship.update({
        where: { id: edge.id },
        data: { status: "ARCHIVED" },
      });
    }
  }
}

async function applyDesiredEdges(
  desired: DesiredEdge[],
  syncKey: string,
  dryRun: boolean,
  report: KnowledgeGraphRelationSyncReport
) {
  const stillDesired = new Set<string>();

  for (const edge of desired) {
    report.scanned += 1;
    const from = await ensureEntity(edge.fromSourceType, edge.fromSourceId, dryRun);
    const to = await ensureEntity(edge.toSourceType, edge.toSourceId, dryRun);
    if (!from || !to) {
      report.missingTargets += 1;
      continue;
    }

    // Attach syncKey via update after create — store in metadata on write
    const pair = validateRelationshipPair({
      relationshipType: edge.relationshipType,
      fromEntityType: from.entityType,
      toEntityType: to.entityType,
      origin: edge.origin,
      fromEntityId: from.id,
      toEntityId: to.id,
    });
    if (!pair.ok) {
      report.invalidPairs += 1;
      continue;
    }

    stillDesired.add(`${from.id}|${to.id}|${edge.relationshipType}`);

    const visibility = resolveRelationshipVisibility({
      policy: pair.policy,
      fromVisibility: from.visibility as KnowledgeBaseVisibility,
      toVisibility: to.visibility as KnowledgeBaseVisibility,
    });

    const existing = await prisma.knowledgeGraphRelationship.findUnique({
      where: {
        fromEntityId_toEntityId_relationshipType: {
          fromEntityId: from.id,
          toEntityId: to.id,
          relationshipType: edge.relationshipType,
        },
      },
    });

    if (existing) {
      const existingScore = relationshipOriginPrecedence(
        existing.origin,
        Boolean(existing.evidenceUrl)
      );
      const nextScore = relationshipOriginPrecedence(edge.origin, false);
      if (existingScore > nextScore && existing.status === "ACTIVE") {
        report.existing += 1;
        continue;
      }
      if (
        existing.status === "ACTIVE" &&
        existing.origin === edge.origin &&
        existing.visibility === visibility
      ) {
        report.existing += 1;
        if (!dryRun) {
          await prisma.knowledgeGraphRelationship.update({
            where: { id: existing.id },
            data: { metadata: { syncKey } },
          });
        }
        continue;
      }
      report.updated += 1;
      if (!dryRun) {
        await prisma.knowledgeGraphRelationship.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            origin: edge.origin,
            visibility,
            authorityRank: pair.policy.defaultAuthorityRank,
            sourceEntryId: edge.sourceEntryId ?? undefined,
            sourceType: edge.sourceType ?? undefined,
            sourceId: edge.sourceId ?? undefined,
            approvedBy: "system",
            approvedAt: new Date(),
            metadata: { syncKey },
          },
        });
      }
      continue;
    }

    report.created += 1;
    if (!dryRun) {
      await prisma.knowledgeGraphRelationship.create({
        data: {
          fromEntityId: from.id,
          toEntityId: to.id,
          relationshipType: edge.relationshipType,
          status: "ACTIVE",
          origin: edge.origin,
          visibility,
          authorityRank: pair.policy.defaultAuthorityRank,
          sourceEntryId: edge.sourceEntryId ?? undefined,
          sourceType: edge.sourceType ?? undefined,
          sourceId: edge.sourceId ?? undefined,
          approvedBy: "system",
          approvedAt: new Date(),
          metadata: { syncKey },
        },
      });
    }
  }

  await archiveMissingSystemEdges(syncKey, stillDesired, dryRun, report);
}

export async function syncSystemDerivedRelationships(
  options: { dryRun?: boolean } = {}
): Promise<KnowledgeGraphRelationSyncReport> {
  const dryRun = options.dryRun ?? true;
  const report = emptyRelationReport(dryRun);
  const desired: DesiredEdge[] = [];

  // Product BELONGS_TO Category
  const products = await prisma.product.findMany({
    select: { id: true, categoryId: true },
  });
  for (const product of products) {
    if (!product.categoryId) continue;
    desired.push({
      fromSourceType: "Product",
      fromSourceId: product.id,
      toSourceType: "Category",
      toSourceId: product.categoryId,
      relationshipType: "BELONGS_TO",
      origin: "SYSTEM_DERIVED",
      sourceType: "Product",
      sourceId: product.id,
    });
  }

  // Product MADE_FROM Material (ops Material via requirement IDs only)
  const requirements = await prisma.productMaterialRequirement.findMany({
    where: { isActive: true, materialId: { not: null } },
    select: { productId: true, materialId: true },
  });
  for (const req of requirements) {
    if (!req.materialId) continue;
    desired.push({
      fromSourceType: "Product",
      fromSourceId: req.productId,
      toSourceType: "Material",
      toSourceId: req.materialId,
      relationshipType: "MADE_FROM",
      origin: "SYSTEM_DERIVED",
      sourceType: "ProductMaterialRequirement",
      sourceId: req.productId,
    });
  }

  // SeoTopic HAS_MEDIA MediaBundle
  const topics = await prisma.seoTopic.findMany({
    select: {
      id: true,
      mediaBundleId: true,
      targetEntityType: true,
      targetEntityId: true,
    },
  });
  for (const topic of topics) {
    if (topic.mediaBundleId) {
      desired.push({
        fromSourceType: "SeoTopic",
        fromSourceId: topic.id,
        toSourceType: "MediaBundle",
        toSourceId: topic.mediaBundleId,
        relationshipType: "HAS_MEDIA",
        origin: "SYSTEM_DERIVED",
        sourceType: "SeoTopic",
        sourceId: topic.id,
      });
    }
    if (topic.targetEntityType === "BLOG_POST" && topic.targetEntityId) {
      desired.push({
        fromSourceType: "SeoTopic",
        fromSourceId: topic.id,
        toSourceType: "BlogPost",
        toSourceId: topic.targetEntityId,
        relationshipType: "LINKS_TO",
        origin: "SYSTEM_DERIVED",
        sourceType: "SeoTopic",
        sourceId: topic.id,
      });
    }
  }

  // BlogPost HAS_MEDIA MediaBundle
  const posts = await prisma.blogPost.findMany({
    where: { mediaBundleId: { not: null } },
    select: { id: true, mediaBundleId: true },
  });
  for (const post of posts) {
    if (!post.mediaBundleId) continue;
    desired.push({
      fromSourceType: "BlogPost",
      fromSourceId: post.id,
      toSourceType: "MediaBundle",
      toSourceId: post.mediaBundleId,
      relationshipType: "HAS_MEDIA",
      origin: "SYSTEM_DERIVED",
      sourceType: "BlogPost",
      sourceId: post.id,
    });
  }

  // KnowledgeEntry array-derived SYSTEM relations
  const entries = await prisma.knowledgeBaseEntry.findMany({
    select: {
      id: true,
      relatedProductIds: true,
      relatedMediaBundleIds: true,
      relatedSeoTopicIds: true,
      relatedEntryIds: true,
    },
  });
  for (const entry of entries) {
    for (const productId of entry.relatedProductIds) {
      desired.push({
        fromSourceType: "KnowledgeBaseEntry",
        fromSourceId: entry.id,
        toSourceType: "Product",
        toSourceId: productId,
        relationshipType: "RELATED_TO",
        origin: "SYSTEM_DERIVED",
        sourceEntryId: entry.id,
        sourceType: "KnowledgeBaseEntry",
        sourceId: entry.id,
      });
    }
    for (const bundleId of entry.relatedMediaBundleIds) {
      desired.push({
        fromSourceType: "KnowledgeBaseEntry",
        fromSourceId: entry.id,
        toSourceType: "MediaBundle",
        toSourceId: bundleId,
        relationshipType: "HAS_MEDIA",
        origin: "SYSTEM_DERIVED",
        sourceEntryId: entry.id,
        sourceType: "KnowledgeBaseEntry",
        sourceId: entry.id,
      });
    }
    for (const topicId of entry.relatedSeoTopicIds) {
      desired.push({
        fromSourceType: "KnowledgeBaseEntry",
        fromSourceId: entry.id,
        toSourceType: "SeoTopic",
        toSourceId: topicId,
        relationshipType: "HAS_SEO_TOPIC",
        origin: "SYSTEM_DERIVED",
        sourceEntryId: entry.id,
        sourceType: "KnowledgeBaseEntry",
        sourceId: entry.id,
      });
    }
    for (const relatedId of entry.relatedEntryIds) {
      desired.push({
        fromSourceType: "KnowledgeBaseEntry",
        fromSourceId: entry.id,
        toSourceType: "KnowledgeBaseEntry",
        toSourceId: relatedId,
        relationshipType: "RELATED_TO",
        origin: "SYSTEM_DERIVED",
        sourceEntryId: entry.id,
        sourceType: "KnowledgeBaseEntry",
        sourceId: entry.id,
      });
    }
  }

  await applyDesiredEdges(desired, "system-derived-v1", dryRun, report);
  return report;
}
