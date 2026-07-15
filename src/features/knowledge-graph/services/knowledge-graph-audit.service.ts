import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type GraphAuditAction =
  | "ENTITY_SYNCED"
  | "CURATED_CREATED"
  | "CURATED_APPROVED"
  | "CURATED_REJECTED"
  | "CURATED_EDITED"
  | "RELATION_ARCHIVED"
  | "SYSTEM_RELATION_SYNCED"
  | "IMPORT_RUN"
  | "BROKEN_SOURCE_DETECTED"
  | "DUAL_WRITE_WARNING"
  | "SEMANTIC_IMPORT";

export async function writeGraphAuditLog(input: {
  action: GraphAuditAction | string;
  actorId?: string | null;
  entityId?: string | null;
  relationshipId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.knowledgeGraphAuditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? undefined,
        entityId: input.entityId ?? undefined,
        relationshipId: input.relationshipId ?? undefined,
        sourceType: input.sourceType ?? undefined,
        sourceId: input.sourceId ?? undefined,
        summary: input.summary ?? undefined,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.warn("[knowledge-graph audit]", err);
  }
}

export async function listGraphAuditLogs(input: {
  action?: string;
  entityId?: string;
  relationshipId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 200);
  const where = {
    ...(input.action ? { action: input.action } : {}),
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.relationshipId ? { relationshipId: input.relationshipId } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.knowledgeGraphAuditLog.count({ where }),
    prisma.knowledgeGraphAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, logs: rows };
}
