/**
 * Benchmark-relevant public vocabulary review (Sprint 12.3).
 * Source of truth remains MediaVocabularyTerm.visibility.
 */

import type { KnowledgeBaseVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeGraphAuditLog } from "@/features/knowledge-graph/services/knowledge-graph-audit.service";

export const PUBLIC_VOCABULARY_REVIEW_MANIFEST = [
  {
    id: "mvt_use_case_dong_phuc_cong_ty",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic corporate uniform use case used in public SEO planning benchmarks",
  },
  {
    id: "mvt_audience_doanh_nghiep",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic enterprise audience; non-sensitive business vocabulary",
  },
  {
    id: "mvt_industry_ngan_hang",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic banking industry label for uniform planning",
  },
  {
    id: "mvt_use_case_qua_tang_khach_hang",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic customer-gift use case",
  },
  {
    id: "mvt_use_case_qua_tang_nhan_vien",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic employee-gift use case",
  },
  {
    id: "mvt_use_case_merchandise",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic merchandise use case",
  },
  {
    id: "mvt_technique_in_lua",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic screen-print technique vocabulary for public planning",
  },
  {
    id: "mvt_industry_doanh_nghiep",
    proposedVisibility: "PUBLIC" as KnowledgeBaseVisibility,
    reason: "Generic enterprise industry label",
  },
] as const;

export async function reviewPublicVocabulary(opts: {
  dryRun?: boolean;
  actorId?: string | null;
  applyIds?: string[];
}) {
  const dryRun = opts.dryRun !== false;
  const items = opts.applyIds?.length
    ? PUBLIC_VOCABULARY_REVIEW_MANIFEST.filter((i) => opts.applyIds!.includes(i.id))
    : [...PUBLIC_VOCABULARY_REVIEW_MANIFEST];

  const report = {
    dryRun,
    reviewed: 0,
    applied: 0,
    missing: [] as string[],
    skippedUnchanged: 0,
    rows: [] as Array<{
      id: string;
      name: string;
      from: string;
      to: string;
      applied: boolean;
    }>,
  };

  for (const item of items) {
    const term = await prisma.mediaVocabularyTerm.findUnique({ where: { id: item.id } });
    if (!term) {
      report.missing.push(item.id);
      continue;
    }
    report.reviewed += 1;
    if (term.visibility === item.proposedVisibility) {
      report.skippedUnchanged += 1;
      report.rows.push({
        id: term.id,
        name: term.name,
        from: term.visibility,
        to: item.proposedVisibility,
        applied: false,
      });
      continue;
    }
    report.rows.push({
      id: term.id,
      name: term.name,
      from: term.visibility,
      to: item.proposedVisibility,
      applied: !dryRun,
    });
    if (dryRun) continue;

    await prisma.mediaVocabularyTerm.update({
      where: { id: term.id },
      data: {
        visibility: item.proposedVisibility,
        publicSafeReviewedAt: new Date(),
        publicSafeReviewedBy: opts.actorId ?? "sprint-12.3-vocab-review",
        publicSafeReason: item.reason,
      },
    });
    report.applied += 1;

    // Resync graph projection visibility
    const entity = await prisma.knowledgeGraphEntity.findUnique({
      where: {
        sourceType_sourceId: { sourceType: "MediaVocabularyTerm", sourceId: term.id },
      },
    });
    if (entity) {
      await prisma.knowledgeGraphEntity.update({
        where: { id: entity.id },
        data: { visibility: item.proposedVisibility },
      });
      await writeGraphAuditLog({
        action: "ENTITY_VISIBILITY_UPDATED",
        actorId: opts.actorId,
        entityId: entity.id,
        summary: `visibility ${term.visibility}→${item.proposedVisibility}: ${item.reason}`,
      });
    }

    // Upgrade STRICTEST curated edges to PUBLIC when both endpoints are now PUBLIC.
    if (item.proposedVisibility === "PUBLIC") {
      const edges = await prisma.knowledgeGraphRelationship.findMany({
        where: {
          status: "ACTIVE",
          visibility: { not: "PUBLIC" },
          OR: [{ fromEntityId: entity?.id }, { toEntityId: entity?.id }],
        },
        include: { fromEntity: true, toEntity: true },
      });
      for (const edge of edges) {
        if (
          edge.fromEntity.visibility === "PUBLIC" &&
          edge.toEntity.visibility === "PUBLIC"
        ) {
          await prisma.knowledgeGraphRelationship.update({
            where: { id: edge.id },
            data: { visibility: "PUBLIC" },
          });
        }
      }
    }
  }

  return report;
}
