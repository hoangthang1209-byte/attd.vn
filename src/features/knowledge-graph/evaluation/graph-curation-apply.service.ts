/**
 * Apply evaluation curation manifest as DRAFT curated relationships.
 * Dry-run by default. Approval only with explicit approve + actor.
 */

import type { KnowledgeGraphRelationship } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  GRAPH_CURATION_MANIFEST,
  GRAPH_CURATION_MANIFEST_META,
  type CurationManifestItem,
} from "@/features/knowledge-graph/evaluation/graph-curation-manifest";
import {
  approveCuratedRelationship,
  createCuratedRelationship,
} from "@/features/knowledge-graph/services/knowledge-graph-relationship.service";
import {
  getRelationshipPolicy,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";

export type CurationApplyReport = {
  version: string;
  dryRun: boolean;
  approve: boolean;
  manifestRows: number;
  resolved: number;
  missingEntities: Array<{ itemId: string; side: "from" | "to"; sourceType: string; sourceId: string }>;
  created: number;
  existing: number;
  invalid: Array<{ itemId: string; reason: string }>;
  visibilityBlocked: Array<{ itemId: string; reason: string }>;
  evidenceMissing: Array<{ itemId: string }>;
  draft: number;
  approved: number;
  createdIds: string[];
  existingIds: string[];
  skippedSourceGaps: string[];
};

async function resolveEntity(sourceType: string, sourceId: string) {
  return prisma.knowledgeGraphEntity.findUnique({
    where: { sourceType_sourceId: { sourceType, sourceId } },
  });
}

export async function applyEvaluationCuration(opts: {
  dryRun?: boolean;
  approve?: boolean;
  actorId?: string | null;
  itemIds?: string[];
}): Promise<CurationApplyReport> {
  const dryRun = opts.dryRun !== false;
  const approve = Boolean(opts.approve) && !dryRun;
  const items: CurationManifestItem[] = opts.itemIds?.length
    ? GRAPH_CURATION_MANIFEST.filter((i) => opts.itemIds!.includes(i.id))
    : GRAPH_CURATION_MANIFEST;

  const report: CurationApplyReport = {
    version: GRAPH_CURATION_MANIFEST_META.version,
    dryRun,
    approve,
    manifestRows: items.length,
    resolved: 0,
    missingEntities: [],
    created: 0,
    existing: 0,
    invalid: [],
    visibilityBlocked: [],
    evidenceMissing: [],
    draft: 0,
    approved: 0,
    createdIds: [],
    existingIds: [],
    skippedSourceGaps: [...GRAPH_CURATION_MANIFEST_META.skippedDueToMissingSource],
  };

  for (const item of items) {
    const from = await resolveEntity(item.from.sourceType, item.from.sourceId);
    const to = await resolveEntity(item.to.sourceType, item.to.sourceId);
    if (!from) {
      report.missingEntities.push({
        itemId: item.id,
        side: "from",
        sourceType: item.from.sourceType,
        sourceId: item.from.sourceId,
      });
      continue;
    }
    if (!to) {
      report.missingEntities.push({
        itemId: item.id,
        side: "to",
        sourceType: item.to.sourceType,
        sourceId: item.to.sourceId,
      });
      continue;
    }

    const pair = validateRelationshipPair({
      relationshipType: item.relationshipType,
      fromEntityType: from.entityType,
      toEntityType: to.entityType,
      origin: "CURATED",
      fromEntityId: from.id,
      toEntityId: to.id,
    });
    if (!pair.ok) {
      report.invalid.push({ itemId: item.id, reason: pair.error });
      continue;
    }

    const policy = getRelationshipPolicy(item.relationshipType);
    if (policy?.evidenceRequired && !item.evidenceUrl && !item.sourceEntryId) {
      report.evidenceMissing.push({ itemId: item.id });
      continue;
    }

    let visibility = item.visibility;
    if (
      visibility === "PUBLIC" &&
      (from.visibility !== "PUBLIC" || to.visibility !== "PUBLIC")
    ) {
      // Do not fabricate public facts from internal sources — store INTERNAL edge instead.
      visibility = "INTERNAL";
      report.visibilityBlocked.push({
        itemId: item.id,
        reason: `downgraded PUBLIC→INTERNAL (from=${from.visibility} to=${to.visibility})`,
      });
    }

    if (
      visibility === "PUBLIC" &&
      (from.visibility !== "PUBLIC" || to.visibility !== "PUBLIC")
    ) {
      report.visibilityBlocked.push({
        itemId: item.id,
        reason: `PUBLIC edge blocked: from=${from.visibility} to=${to.visibility}`,
      });
      continue;
    }

    report.resolved += 1;

    const existing = await prisma.knowledgeGraphRelationship.findUnique({
      where: {
        fromEntityId_toEntityId_relationshipType: {
          fromEntityId: from.id,
          toEntityId: to.id,
          relationshipType: item.relationshipType,
        },
      },
    });

    if (existing && (existing.status === "ACTIVE" || existing.status === "DRAFT")) {
      report.existing += 1;
      report.existingIds.push(existing.id);
      if (existing.status === "DRAFT") report.draft += 1;
      if (
        approve &&
        existing.origin === "CURATED" &&
        existing.status === "DRAFT" &&
        opts.actorId
      ) {
        await approveCuratedRelationship(existing.id, opts.actorId);
        report.approved += 1;
      }
      continue;
    }

    if (dryRun) {
      report.created += 1;
      report.draft += 1;
      continue;
    }

    let created: KnowledgeGraphRelationship;
    try {
      created = await createCuratedRelationship({
        fromEntityId: from.id,
        toEntityId: to.id,
        relationshipType: item.relationshipType,
        visibility,
        confidence: item.confidence,
        evidenceUrl: item.evidenceUrl ?? null,
        sourceEntryId: item.sourceEntryId ?? null,
        createdBy: opts.actorId ?? "evaluation-curation",
        metadata: {
          evaluationManifestId: item.id,
          benchmarkTags: item.benchmarkTags,
          reason: item.reason,
          expectedRelevance: item.expectedRelevance,
          evaluationFixture: item.evaluationFixture ?? null,
          manifestVersion: GRAPH_CURATION_MANIFEST_META.version,
          visibilityDowngraded: visibility !== item.visibility,
        },
      });
    } catch (err) {
      report.invalid.push({
        itemId: item.id,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    report.created += 1;
    report.draft += 1;
    report.createdIds.push(created.id);

    if (approve && opts.actorId) {
      await approveCuratedRelationship(created.id, opts.actorId);
      report.approved += 1;
      report.draft -= 1;
    }
  }

  return report;
}
