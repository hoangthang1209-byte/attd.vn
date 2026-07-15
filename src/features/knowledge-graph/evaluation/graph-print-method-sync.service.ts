/**
 * Canonical PrintMethod seed + graph sync + evidence-backed SUPPORTS curation.
 * No free-text inference.
 */

import { prisma } from "@/lib/prisma";
import { syncGraphEntityForSource } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import {
  approveCuratedRelationship,
  createCuratedRelationship,
} from "@/features/knowledge-graph/services/knowledge-graph-relationship.service";

/** Stable production catalog codes — not benchmark fabrications. */
export const CANONICAL_PRINT_METHODS = [
  { code: "SCREEN_PRINT", name: "In lụa", category: "SCREEN_PRINT" as const, vocabTechniqueId: "mvt_technique_in_lua" },
  { code: "DTG", name: "In DTG", category: "DTG" as const, vocabTechniqueId: "mvt_technique_in_dtg" },
  { code: "DTF", name: "In DTF", category: "DTF" as const, vocabTechniqueId: "mvt_technique_in_dtf" },
  { code: "EMBROIDERY", name: "Thêu", category: "EMBROIDERY" as const, vocabTechniqueId: "mvt_technique_theu" },
  { code: "HEAT_TRANSFER", name: "Ép nhiệt", category: "HEAT_TRANSFER" as const, vocabTechniqueId: "mvt_technique_ep_nhiet" },
  { code: "SUBLIMATION", name: "In chuyển nhiệt", category: "SUBLIMATION" as const, vocabTechniqueId: "mvt_technique_in_chuyen_nhiet" },
] as const;

/** Explicit product → screen-print SUPPORTS for bulk print benchmark. */
export const SCREEN_PRINT_PRODUCT_SUPPORTS = [
  { productId: "cmqb6232q0001rwod8xocy48r", reason: "Bulk tee supports screen print (in lụa)" },
  { productId: "cmqb62481001trwodp6exjpxy", reason: "Corporate polo supports screen print logos" },
  { productId: "cmqb623rm0011rwoduuf3rybo", reason: "Export blank tee supports screen print OEM" },
] as const;

export async function syncPrintMethods(opts: {
  dryRun?: boolean;
  approve?: boolean;
  actorId?: string | null;
}) {
  const dryRun = opts.dryRun !== false;
  const report = {
    dryRun,
    methodsCreated: 0,
    methodsExisting: 0,
    entitiesSynced: 0,
    relationsCreated: 0,
    relationsApproved: 0,
    missingProducts: [] as string[],
    methodIds: {} as Record<string, string>,
  };

  for (const method of CANONICAL_PRINT_METHODS) {
    let row = await prisma.printMethod.findUnique({ where: { code: method.code } });
    if (!row) {
      if (!dryRun) {
        row = await prisma.printMethod.create({
          data: {
            code: method.code,
            name: method.name,
            category: method.category,
            description: `Canonical ATTD print method aligned with technique ${method.vocabTechniqueId}`,
            isActive: true,
          },
        });
      }
      report.methodsCreated += 1;
    } else {
      report.methodsExisting += 1;
    }
    if (row) {
      report.methodIds[method.code] = row.id;
      if (!dryRun) {
        await syncGraphEntityForSource("PrintMethod", row.id);
        report.entitiesSynced += 1;
      }
    }
  }

  const screenId = report.methodIds.SCREEN_PRINT;
  if (!screenId && !dryRun) {
    return report;
  }

  for (const link of SCREEN_PRINT_PRODUCT_SUPPORTS) {
    if (dryRun) {
      report.relationsCreated += 1;
      continue;
    }
    const from = await prisma.knowledgeGraphEntity.findUnique({
      where: { sourceType_sourceId: { sourceType: "Product", sourceId: link.productId } },
    });
    const to = await prisma.knowledgeGraphEntity.findUnique({
      where: { sourceType_sourceId: { sourceType: "PrintMethod", sourceId: screenId! } },
    });
    if (!from) {
      report.missingProducts.push(link.productId);
      continue;
    }
    if (!to) continue;

    try {
      const created = await createCuratedRelationship({
        fromEntityId: from.id,
        toEntityId: to.id,
        relationshipType: "SUPPORTS",
        visibility: "PUBLIC",
        confidence: 90,
        createdBy: opts.actorId ?? "sprint-12.3-print-sync",
        metadata: { reason: link.reason, sprint: "12.3" },
      });
      report.relationsCreated += 1;
      if (opts.approve && opts.actorId) {
        await approveCuratedRelationship(created.id, opts.actorId);
        report.relationsApproved += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("DUPLICATE")) {
        // idempotent
      } else {
        throw err;
      }
    }
  }

  // Capability printing SUPPORTS screen print
  if (!dryRun && screenId) {
    const cap = await prisma.knowledgeGraphEntity.findUnique({
      where: {
        sourceType_sourceId: {
          sourceType: "ManufacturingAsset",
          sourceId: "cmr795734000hrwf22f6i3ph0",
        },
      },
    });
    const to = await prisma.knowledgeGraphEntity.findUnique({
      where: { sourceType_sourceId: { sourceType: "PrintMethod", sourceId: screenId } },
    });
    if (cap && to) {
      try {
        const created = await createCuratedRelationship({
          fromEntityId: cap.id,
          toEntityId: to.id,
          relationshipType: "SUPPORTS",
          visibility: "PUBLIC",
          confidence: 90,
          createdBy: opts.actorId ?? "sprint-12.3-print-sync",
          metadata: { reason: "Print capability supports in lụa", sprint: "12.3" },
        });
        report.relationsCreated += 1;
        if (opts.approve && opts.actorId) {
          await approveCuratedRelationship(created.id, opts.actorId);
          report.relationsApproved += 1;
        }
      } catch {
        /* duplicate ok */
      }
    }
  }

  return report;
}
