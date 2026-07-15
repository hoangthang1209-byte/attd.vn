import { prisma } from "@/lib/prisma";
import {
  validateGraphEntitySource,
} from "@/features/knowledge-graph/knowledge-graph-entity-registry";
import { resolveOrCreateGraphEntity } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import {
  resolveRelationshipVisibility,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import type { KnowledgeGraphRelationshipType } from "@prisma/client";

export type KbRelationImportReport = {
  dryRun: boolean;
  scanned: number;
  valid: number;
  created: number;
  existing: number;
  missingTargets: number;
  invalidTypePairs: number;
  orphanIds: number;
  errors: string[];
};

const MAPPINGS: Array<{
  targetSourceType: string;
  relationshipType: KnowledgeGraphRelationshipType;
  getIds: (entry: {
    relatedProductIds: string[];
    relatedMediaBundleIds: string[];
    relatedSeoTopicIds: string[];
    relatedEntryIds: string[];
  }) => string[];
}> = [
  {
    targetSourceType: "Product",
    relationshipType: "RELATED_TO",
    getIds: (e) => e.relatedProductIds,
  },
  {
    targetSourceType: "MediaBundle",
    relationshipType: "HAS_MEDIA",
    getIds: (e) => e.relatedMediaBundleIds,
  },
  {
    targetSourceType: "SeoTopic",
    relationshipType: "HAS_SEO_TOPIC",
    getIds: (e) => e.relatedSeoTopicIds,
  },
  {
    targetSourceType: "KnowledgeBaseEntry",
    relationshipType: "RELATED_TO",
    getIds: (e) => e.relatedEntryIds,
  },
];

/**
 * Controlled importer for existing KB relation arrays.
 * Dry-run by default. Does not mutate source arrays.
 */
export async function importKnowledgeBaseArrayRelations(
  options: { dryRun?: boolean; batchSize?: number } = {}
): Promise<KbRelationImportReport> {
  const dryRun = options.dryRun ?? true;
  const batchSize = Math.min(Math.max(options.batchSize ?? 100, 1), 500);
  const report: KbRelationImportReport = {
    dryRun,
    scanned: 0,
    valid: 0,
    created: 0,
    existing: 0,
    missingTargets: 0,
    invalidTypePairs: 0,
    orphanIds: 0,
    errors: [],
  };

  let cursor: string | undefined;
  for (;;) {
    const entries = await prisma.knowledgeBaseEntry.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        relatedProductIds: true,
        relatedMediaBundleIds: true,
        relatedSeoTopicIds: true,
        relatedEntryIds: true,
      },
    });
    if (!entries.length) break;

    for (const entry of entries) {
      report.scanned += 1;

      const fromCheck = await validateGraphEntitySource("KnowledgeBaseEntry", entry.id);
      if (!fromCheck.ok) {
        report.errors.push(fromCheck.error);
        continue;
      }

      if (!dryRun) {
        await resolveOrCreateGraphEntity("KnowledgeBaseEntry", entry.id, { dryRun: false });
      }

      for (const mapping of MAPPINGS) {
        for (const targetId of mapping.getIds(entry)) {
          const toCheck = await validateGraphEntitySource(mapping.targetSourceType, targetId);
          if (!toCheck.ok) {
            report.missingTargets += 1;
            report.orphanIds += 1;
            continue;
          }

          const pair = validateRelationshipPair({
            relationshipType: mapping.relationshipType,
            fromEntityType: fromCheck.record.entityType,
            toEntityType: toCheck.record.entityType,
            origin: "IMPORTED",
          });
          if (!pair.ok) {
            report.invalidTypePairs += 1;
            continue;
          }

          report.valid += 1;

          if (dryRun) {
            const existingFrom = await prisma.knowledgeGraphEntity.findUnique({
              where: {
                sourceType_sourceId: {
                  sourceType: "KnowledgeBaseEntry",
                  sourceId: entry.id,
                },
              },
            });
            const existingTo = await prisma.knowledgeGraphEntity.findUnique({
              where: {
                sourceType_sourceId: {
                  sourceType: mapping.targetSourceType,
                  sourceId: targetId,
                },
              },
            });
            if (existingFrom && existingTo) {
              const existingRel = await prisma.knowledgeGraphRelationship.findUnique({
                where: {
                  fromEntityId_toEntityId_relationshipType: {
                    fromEntityId: existingFrom.id,
                    toEntityId: existingTo.id,
                    relationshipType: mapping.relationshipType,
                  },
                },
              });
              if (existingRel?.status === "ACTIVE") {
                report.existing += 1;
              } else {
                report.created += 1;
              }
            } else {
              report.created += 1;
            }
            continue;
          }

          const fromEntity = await resolveOrCreateGraphEntity("KnowledgeBaseEntry", entry.id, {
            dryRun: false,
          });
          const toEntity = await resolveOrCreateGraphEntity(mapping.targetSourceType, targetId, {
            dryRun: false,
          });
          if (!fromEntity || !toEntity) {
            report.missingTargets += 1;
            continue;
          }

          const visibility = resolveRelationshipVisibility({
            policy: pair.policy,
            fromVisibility: fromEntity.visibility,
            toVisibility: toEntity.visibility,
          });

          const existing = await prisma.knowledgeGraphRelationship.findUnique({
            where: {
              fromEntityId_toEntityId_relationshipType: {
                fromEntityId: fromEntity.id,
                toEntityId: toEntity.id,
                relationshipType: mapping.relationshipType,
              },
            },
          });

          if (existing?.status === "ACTIVE") {
            report.existing += 1;
            continue;
          }

          report.created += 1;
          if (existing) {
            await prisma.knowledgeGraphRelationship.update({
              where: { id: existing.id },
              data: {
                status: "ACTIVE",
                origin: existing.origin === "SYSTEM_DERIVED" ? "SYSTEM_DERIVED" : "IMPORTED",
                visibility,
                sourceEntryId: entry.id,
                metadata: { syncKey: "kb-array-import" },
              },
            });
          } else {
            await prisma.knowledgeGraphRelationship.create({
              data: {
                fromEntityId: fromEntity.id,
                toEntityId: toEntity.id,
                relationshipType: mapping.relationshipType,
                status: "ACTIVE",
                origin: "IMPORTED",
                visibility,
                authorityRank: pair.policy.defaultAuthorityRank,
                sourceEntryId: entry.id,
                metadata: { syncKey: "kb-array-import" },
              },
            });
          }
        }
      }
    }

    cursor = entries[entries.length - 1]?.id;
    if (entries.length < batchSize) break;
  }

  return report;
}
