import { prisma } from "@/lib/prisma";
import { resolveOrCreateGraphEntity } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import {
  resolveRelationshipVisibility,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import type { KnowledgeGraphRelationshipType } from "@prisma/client";

type DualWriteArrayField =
  | "relatedProductIds"
  | "relatedMediaBundleIds"
  | "relatedSeoTopicIds"
  | "relatedEntryIds";

const FIELD_CONFIG: Record<
  DualWriteArrayField,
  { targetSourceType: string; relationshipType: KnowledgeGraphRelationshipType }
> = {
  relatedProductIds: { targetSourceType: "Product", relationshipType: "RELATED_TO" },
  relatedMediaBundleIds: { targetSourceType: "MediaBundle", relationshipType: "HAS_MEDIA" },
  relatedSeoTopicIds: { targetSourceType: "SeoTopic", relationshipType: "HAS_SEO_TOPIC" },
  relatedEntryIds: { targetSourceType: "KnowledgeBaseEntry", relationshipType: "RELATED_TO" },
};

/**
 * After a successful KB entry save, sync graph edges for relation arrays.
 * Failures are logged and never thrown — KB remains source of truth / rebuildable.
 */
export async function dualWriteKnowledgeBaseGraphRelations(input: {
  entryId: string;
  relatedProductIds?: string[];
  relatedMediaBundleIds?: string[];
  relatedSeoTopicIds?: string[];
  relatedEntryIds?: string[];
}): Promise<{ ok: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    const entry = await prisma.knowledgeBaseEntry.findUnique({
      where: { id: input.entryId },
      select: {
        id: true,
        relatedProductIds: true,
        relatedMediaBundleIds: true,
        relatedSeoTopicIds: true,
        relatedEntryIds: true,
      },
    });
    if (!entry) {
      warnings.push("KB entry missing for dual-write");
      return { ok: false, warnings };
    }

    const from = await resolveOrCreateGraphEntity("KnowledgeBaseEntry", entry.id, {
      dryRun: false,
    });
    if (!from) {
      warnings.push("Could not project KnowledgeBaseEntry graph entity");
      return { ok: false, warnings };
    }

    const desiredByField: Array<{
      field: DualWriteArrayField;
      ids: string[];
    }> = [
      {
        field: "relatedProductIds",
        ids: input.relatedProductIds ?? entry.relatedProductIds,
      },
      {
        field: "relatedMediaBundleIds",
        ids: input.relatedMediaBundleIds ?? entry.relatedMediaBundleIds,
      },
      {
        field: "relatedSeoTopicIds",
        ids: input.relatedSeoTopicIds ?? entry.relatedSeoTopicIds,
      },
      {
        field: "relatedEntryIds",
        ids: input.relatedEntryIds ?? entry.relatedEntryIds,
      },
    ];

    const desiredTokens = new Set<string>();

    for (const { field, ids } of desiredByField) {
      const cfg = FIELD_CONFIG[field];
      for (const targetId of ids) {
        const to = await resolveOrCreateGraphEntity(cfg.targetSourceType, targetId, {
          dryRun: false,
        });
        if (!to) {
          warnings.push(`Missing target ${cfg.targetSourceType}/${targetId}`);
          continue;
        }

        const pair = validateRelationshipPair({
          relationshipType: cfg.relationshipType,
          fromEntityType: from.entityType,
          toEntityType: to.entityType,
          origin: "SYSTEM_DERIVED",
          fromEntityId: from.id,
          toEntityId: to.id,
        });
        if (!pair.ok) {
          warnings.push(pair.error);
          continue;
        }

        const visibility = resolveRelationshipVisibility({
          policy: pair.policy,
          fromVisibility: from.visibility,
          toVisibility: to.visibility,
        });

        desiredTokens.add(`${to.id}|${cfg.relationshipType}`);

        const existing = await prisma.knowledgeGraphRelationship.findUnique({
          where: {
            fromEntityId_toEntityId_relationshipType: {
              fromEntityId: from.id,
              toEntityId: to.id,
              relationshipType: cfg.relationshipType,
            },
          },
        });

        if (existing) {
          if (existing.origin === "SYSTEM_DERIVED" || existing.origin === "IMPORTED") {
            await prisma.knowledgeGraphRelationship.update({
              where: { id: existing.id },
              data: {
                status: "ACTIVE",
                visibility,
                origin: "SYSTEM_DERIVED",
                sourceEntryId: entry.id,
                approvedBy: "system",
                approvedAt: new Date(),
                metadata: { syncKey: "kb-dual-write" },
              },
            });
          }
          continue;
        }

        await prisma.knowledgeGraphRelationship.create({
          data: {
            fromEntityId: from.id,
            toEntityId: to.id,
            relationshipType: cfg.relationshipType,
            status: "ACTIVE",
            origin: "SYSTEM_DERIVED",
            visibility,
            authorityRank: pair.policy.defaultAuthorityRank,
            sourceEntryId: entry.id,
            approvedBy: "system",
            approvedAt: new Date(),
            metadata: { syncKey: "kb-dual-write" },
          },
        });
      }
    }

    // Archive system/imported KB dual-write edges removed from arrays
    const existingEdges = await prisma.knowledgeGraphRelationship.findMany({
      where: {
        fromEntityId: from.id,
        origin: { in: ["SYSTEM_DERIVED", "IMPORTED"] },
        status: "ACTIVE",
        relationshipType: {
          in: ["RELATED_TO", "HAS_MEDIA", "HAS_SEO_TOPIC"],
        },
      },
    });

    for (const edge of existingEdges) {
      const token = `${edge.toEntityId}|${edge.relationshipType}`;
      if (desiredTokens.has(token)) continue;
      // Only archive edges that look like KB-array derived
      const meta = edge.metadata as { syncKey?: string } | null;
      if (
        edge.sourceEntryId === entry.id ||
        meta?.syncKey === "kb-dual-write" ||
        meta?.syncKey === "system-derived-v1"
      ) {
        await prisma.knowledgeGraphRelationship.update({
          where: { id: edge.id },
          data: { status: "ARCHIVED" },
        });
      }
    }

    return { ok: warnings.length === 0, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "dual-write failed";
    console.warn("[knowledge-graph dual-write]", message);
    warnings.push(message);
    return { ok: false, warnings };
  }
}
