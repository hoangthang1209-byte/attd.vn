import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type KnowledgeEntrySnapshot = {
  title: string;
  summary: string | null;
  content: string | null;
  structuredData: Record<string, unknown> | null;
  type: string;
  status: string;
  visibility: string;
  claimStatus: string;
  confidence: string;
  tags: string[];
  aliases: string[];
  version: number;
  isVerified: boolean;
  evidenceUrl: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  capturedAt: string;
};

export function buildKnowledgeEntrySnapshot(
  entry: {
    title: string;
    summary: string | null;
    content: string | null;
    structuredData: unknown;
    type: string;
    status: string;
    visibility: string;
    claimStatus: string;
    confidence: string;
    tags: string[];
    aliases: string[];
    version: number;
    isVerified: boolean;
    evidenceUrl: string | null;
    approvedBy: string | null;
    approvedAt: Date | null;
  }
): KnowledgeEntrySnapshot {
  return {
    title: entry.title,
    summary: entry.summary,
    content: entry.content,
    structuredData: (entry.structuredData as Record<string, unknown> | null) ?? null,
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
    approvedAt: entry.approvedAt?.toISOString() ?? null,
    capturedAt: new Date().toISOString(),
  };
}

export async function createKnowledgeEntryVersion(input: {
  entryId: string;
  version: number;
  snapshot: KnowledgeEntrySnapshot;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  changeNote?: string | null;
}) {
  return prisma.knowledgeBaseEntryVersion.create({
    data: {
      entryId: input.entryId,
      version: input.version,
      snapshot: input.snapshot as Prisma.InputJsonValue,
      approvedBy: input.approvedBy ?? null,
      approvedAt: input.approvedAt ?? null,
      changeNote: input.changeNote ?? null,
    },
  });
}

export async function listKnowledgeEntryVersions(entryId: string) {
  const rows = await prisma.knowledgeBaseEntryVersion.findMany({
    where: { entryId },
    orderBy: { version: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    entryId: row.entryId,
    version: row.version,
    snapshot: row.snapshot as KnowledgeEntrySnapshot,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    changeNote: row.changeNote,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getLatestApprovedKnowledgeVersion(entryId: string) {
  const row = await prisma.knowledgeBaseEntryVersion.findFirst({
    where: { entryId, approvedAt: { not: null } },
    orderBy: { version: "desc" },
  });
  if (!row) return null;
  return {
    id: row.id,
    version: row.version,
    snapshot: row.snapshot as KnowledgeEntrySnapshot,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
  };
}
