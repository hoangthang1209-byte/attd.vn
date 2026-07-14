import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildKnowledgeEntrySnapshot,
  createKnowledgeEntryVersion,
} from "@/features/knowledge-base/knowledge-base-version.service";
import { getKnowledgeBaseEntryById } from "@/features/knowledge-base/knowledge-base-seed";

function actorLabel(actor: { username?: string | null; userId?: string | null }): string {
  return actor.username?.trim() || actor.userId?.trim() || "admin";
}

async function snapshotCurrent(entryId: string, approvedBy: string | null, changeNote: string) {
  const entry = await prisma.knowledgeBaseEntry.findUnique({ where: { id: entryId } });
  if (!entry) return;
  const snapshot = buildKnowledgeEntrySnapshot({
    title: entry.title,
    summary: entry.summary,
    content: entry.content,
    structuredData: entry.structuredData,
    type: entry.type,
    status: entry.status,
    visibility: entry.visibility,
    claimStatus: entry.claimStatus,
    confidence: entry.confidence,
    tags: entry.tags,
    aliases: entry.aliases,
    version: entry.version,
    isVerified: entry.isVerified,
    evidenceUrl: entry.evidenceUrl,
    approvedBy: entry.approvedBy,
    approvedAt: entry.approvedAt,
  });
  await createKnowledgeEntryVersion({
    entryId,
    version: entry.version,
    snapshot,
    approvedBy,
    approvedAt: entry.approvedAt,
    changeNote,
  });
}

export async function approveKnowledgeBaseEntry(
  id: string,
  actor: { username?: string | null; userId?: string | null }
) {
  const approvedBy = actorLabel(actor);
  const now = new Date();
  const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { id } });
  if (!existing) throw new Error("ENTRY_NOT_FOUND");

  const nextVersion = existing.approvedAt ? existing.version : existing.version + 1;

  const entry = await prisma.knowledgeBaseEntry.update({
    where: { id },
    data: {
      approvedBy,
      approvedAt: now,
      isVerified: true,
      verifiedAt: existing.verifiedAt ?? now,
      lastVerifiedAt: now,
      version: nextVersion,
      claimStatus:
        existing.claimStatus === "NEEDS_EVIDENCE" && existing.evidenceUrl
          ? "VERIFIED_CLAIM"
          : existing.claimStatus === "FACT" && existing.evidenceUrl
            ? "VERIFIED_CLAIM"
            : existing.claimStatus,
    },
  });

  await snapshotCurrent(id, approvedBy, "Approved for AI retrieval");
  return getKnowledgeBaseEntryById(id);
}

export async function revokeKnowledgeBaseApproval(id: string) {
  const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { id } });
  if (!existing) throw new Error("ENTRY_NOT_FOUND");

  await prisma.knowledgeBaseEntry.update({
    where: { id },
    data: {
      approvedBy: null,
      approvedAt: null,
    },
  });
  return getKnowledgeBaseEntryById(id);
}

export async function reverifyKnowledgeBaseEntry(
  id: string,
  actor: { username?: string | null; userId?: string | null }
) {
  const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { id } });
  if (!existing) throw new Error("ENTRY_NOT_FOUND");
  const now = new Date();
  const nextVersion = existing.version + 1;

  await prisma.knowledgeBaseEntry.update({
    where: { id },
    data: {
      isVerified: true,
      verifiedAt: existing.verifiedAt ?? now,
      lastVerifiedAt: now,
      version: nextVersion,
      ...(existing.reviewIntervalDays
        ? {
            nextReviewAt: new Date(
              now.getTime() + existing.reviewIntervalDays * 24 * 60 * 60 * 1000
            ),
          }
        : {}),
    },
  });

  await snapshotCurrent(id, actorLabel(actor), "Reverified");
  return getKnowledgeBaseEntryById(id);
}

export async function markKnowledgeNeedsEvidence(id: string) {
  const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { id } });
  if (!existing) throw new Error("ENTRY_NOT_FOUND");

  await prisma.knowledgeBaseEntry.update({
    where: { id },
    data: {
      claimStatus: "NEEDS_EVIDENCE",
      approvedAt: null,
      approvedBy: null,
    },
  });
  return getKnowledgeBaseEntryById(id);
}

export async function bulkUpdateKnowledgeGovernance(
  entryIds: string[],
  patch: {
    visibility?: string;
    domain?: string | null;
    reviewIntervalDays?: number | null;
    ownerId?: string | null;
    relatedSeoTopicIdsAppend?: string[];
    relatedMediaBundleIdsAppend?: string[];
  }
) {
  if (entryIds.length === 0) return { updated: 0 };

  let updated = 0;
  for (const id of entryIds) {
    const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { id } });
    if (!existing) continue;

    const data: Prisma.KnowledgeBaseEntryUncheckedUpdateInput = {};
    if (patch.visibility) data.visibility = patch.visibility as never;
    if (patch.domain !== undefined) data.domain = patch.domain;
    if (patch.reviewIntervalDays !== undefined) {
      data.reviewIntervalDays = patch.reviewIntervalDays;
      if (patch.reviewIntervalDays && existing.lastVerifiedAt) {
        data.nextReviewAt = new Date(
          existing.lastVerifiedAt.getTime() + patch.reviewIntervalDays * 24 * 60 * 60 * 1000
        );
      }
    }
    if (patch.ownerId !== undefined) data.ownerId = patch.ownerId;
    if (patch.relatedSeoTopicIdsAppend?.length) {
      data.relatedSeoTopicIds = [
        ...new Set([...existing.relatedSeoTopicIds, ...patch.relatedSeoTopicIdsAppend]),
      ];
    }
    if (patch.relatedMediaBundleIdsAppend?.length) {
      data.relatedMediaBundleIds = [
        ...new Set([...existing.relatedMediaBundleIds, ...patch.relatedMediaBundleIdsAppend]),
      ];
    }

    await prisma.knowledgeBaseEntry.update({ where: { id }, data });
    updated += 1;
  }
  return { updated };
}
