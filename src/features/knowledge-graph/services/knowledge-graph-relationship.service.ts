import type {
  KnowledgeBaseVisibility,
  KnowledgeGraphRelationship,
  KnowledgeGraphRelationshipStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getRelationshipPolicy,
  resolveRelationshipVisibility,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import { strictestVisibility } from "@/features/knowledge-graph/knowledge-graph-visibility";
import { writeGraphAuditLog } from "@/features/knowledge-graph/services/knowledge-graph-audit.service";

function asJson(
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as Prisma.InputJsonValue;
}

function assertConfidence(confidence: number | null | undefined) {
  if (confidence == null) return;
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
    throw new Error("CONFIDENCE_OUT_OF_RANGE");
  }
}

function assertTemporal(validFrom?: Date | null, validUntil?: Date | null) {
  if (validFrom && validUntil && validFrom > validUntil) {
    throw new Error("INVALID_TEMPORAL_RANGE");
  }
}

export async function createCuratedRelationship(input: {
  fromEntityId: string;
  toEntityId: string;
  relationshipType: string;
  visibility?: KnowledgeBaseVisibility;
  confidence?: number | null;
  evidenceUrl?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  sourceEntryId?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<KnowledgeGraphRelationship> {
  const policy = getRelationshipPolicy(input.relationshipType);
  if (!policy) throw new Error("INVALID_RELATIONSHIP_TYPE");

  const [from, to] = await Promise.all([
    prisma.knowledgeGraphEntity.findUnique({ where: { id: input.fromEntityId } }),
    prisma.knowledgeGraphEntity.findUnique({ where: { id: input.toEntityId } }),
  ]);
  if (!from || !to) throw new Error("ENTITY_NOT_FOUND");

  const pair = validateRelationshipPair({
    relationshipType: input.relationshipType,
    fromEntityType: from.entityType,
    toEntityType: to.entityType,
    origin: "CURATED",
    fromEntityId: from.id,
    toEntityId: to.id,
  });
  if (!pair.ok) throw new Error(pair.error);

  assertConfidence(input.confidence);
  assertTemporal(input.validFrom, input.validUntil);
  if (policy.evidenceRequired && !input.evidenceUrl) {
    throw new Error("EVIDENCE_REQUIRED");
  }

  const visibility = resolveRelationshipVisibility({
    policy: pair.policy,
    fromVisibility: from.visibility,
    toVisibility: to.visibility,
    override: input.visibility,
  });

  // Public curated edges cannot connect through INTERNAL/CONFIDENTIAL targets
  if (
    visibility === "PUBLIC" &&
    (from.visibility !== "PUBLIC" || to.visibility !== "PUBLIC")
  ) {
    throw new Error("PUBLIC_EDGE_REQUIRES_PUBLIC_ENDPOINTS");
  }

  const duplicate = await prisma.knowledgeGraphRelationship.findUnique({
    where: {
      fromEntityId_toEntityId_relationshipType: {
        fromEntityId: from.id,
        toEntityId: to.id,
        relationshipType: pair.policy.relationshipType,
      },
    },
  });
  if (duplicate && duplicate.status === "ACTIVE") {
    throw new Error("DUPLICATE_ACTIVE_RELATIONSHIP");
  }

  if (duplicate) {
    const updated = await prisma.knowledgeGraphRelationship.update({
      where: { id: duplicate.id },
      data: {
        status: "DRAFT",
        origin: "CURATED",
        visibility,
        authorityRank: pair.policy.defaultAuthorityRank,
        confidence: input.confidence ?? null,
        evidenceUrl: input.evidenceUrl ?? null,
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        sourceEntryId: input.sourceEntryId ?? null,
        approvedBy: null,
        approvedAt: null,
        createdBy: input.createdBy ?? null,
        metadata: asJson(input.metadata),
      },
    });
    await writeGraphAuditLog({
      action: "CURATED_CREATED",
      actorId: input.createdBy,
      relationshipId: updated.id,
      entityId: from.id,
      summary: `${from.displayName} ${pair.policy.relationshipType} ${to.displayName}`,
    });
    return updated;
  }

  const created = await prisma.knowledgeGraphRelationship.create({
    data: {
      fromEntityId: from.id,
      toEntityId: to.id,
      relationshipType: pair.policy.relationshipType,
      status: "DRAFT",
      origin: "CURATED",
      visibility,
      authorityRank: pair.policy.defaultAuthorityRank,
      confidence: input.confidence ?? null,
      evidenceUrl: input.evidenceUrl ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      sourceEntryId: input.sourceEntryId ?? null,
      createdBy: input.createdBy ?? null,
      metadata: asJson(input.metadata),
    },
  });
  await writeGraphAuditLog({
    action: "CURATED_CREATED",
    actorId: input.createdBy,
    relationshipId: created.id,
    entityId: from.id,
    summary: `${from.displayName} ${pair.policy.relationshipType} ${to.displayName}`,
  });
  return created;
}

export async function updateCuratedRelationship(
  id: string,
  input: {
    visibility?: KnowledgeBaseVisibility;
    confidence?: number | null;
    evidenceUrl?: string | null;
    validFrom?: Date | null;
    validUntil?: Date | null;
    sourceEntryId?: string | null;
    metadata?: Record<string, unknown> | null;
    actorId?: string | null;
  }
): Promise<KnowledgeGraphRelationship> {
  const existing = await prisma.knowledgeGraphRelationship.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.origin === "SYSTEM_DERIVED") {
    throw new Error("SYSTEM_DERIVED_NOT_EDITABLE");
  }

  assertConfidence(input.confidence);
  assertTemporal(input.validFrom, input.validUntil);

  const substantive =
    (input.evidenceUrl !== undefined && input.evidenceUrl !== existing.evidenceUrl) ||
    (input.validFrom !== undefined &&
      (input.validFrom?.getTime() ?? null) !== (existing.validFrom?.getTime() ?? null)) ||
    (input.validUntil !== undefined &&
      (input.validUntil?.getTime() ?? null) !== (existing.validUntil?.getTime() ?? null)) ||
    (input.visibility !== undefined && input.visibility !== existing.visibility) ||
    (input.sourceEntryId !== undefined && input.sourceEntryId !== existing.sourceEntryId) ||
    (input.confidence !== undefined && input.confidence !== existing.confidence);

  const nextStatus: KnowledgeGraphRelationshipStatus =
    substantive && existing.status === "ACTIVE" ? "DRAFT" : existing.status;

  const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const snapshot =
    substantive && existing.status === "ACTIVE"
      ? {
          ...prevMeta,
          previousActiveSnapshot: {
            visibility: existing.visibility,
            confidence: existing.confidence,
            evidenceUrl: existing.evidenceUrl,
            validFrom: existing.validFrom?.toISOString() ?? null,
            validUntil: existing.validUntil?.toISOString() ?? null,
            sourceEntryId: existing.sourceEntryId,
            authorityRank: existing.authorityRank,
            approvedBy: existing.approvedBy,
            approvedAt: existing.approvedAt?.toISOString() ?? null,
            snapshotAt: new Date().toISOString(),
          },
        }
      : input.metadata === undefined
        ? undefined
        : { ...prevMeta, ...input.metadata };

  const updated = await prisma.knowledgeGraphRelationship.update({
    where: { id },
    data: {
      visibility: input.visibility
        ? strictestVisibility(existing.visibility, input.visibility)
        : existing.visibility,
      confidence: input.confidence === undefined ? existing.confidence : input.confidence,
      evidenceUrl: input.evidenceUrl === undefined ? existing.evidenceUrl : input.evidenceUrl,
      validFrom: input.validFrom === undefined ? existing.validFrom : input.validFrom,
      validUntil: input.validUntil === undefined ? existing.validUntil : input.validUntil,
      sourceEntryId:
        input.sourceEntryId === undefined ? existing.sourceEntryId : input.sourceEntryId,
      metadata: snapshot === undefined ? undefined : asJson(snapshot),
      status: nextStatus,
      approvedBy: nextStatus === "DRAFT" ? null : existing.approvedBy,
      approvedAt: nextStatus === "DRAFT" ? null : existing.approvedAt,
    },
  });

  await writeGraphAuditLog({
    action: "CURATED_EDITED",
    actorId: input.actorId,
    relationshipId: updated.id,
    entityId: existing.fromEntityId,
    summary: substantive ? "substantive edit → DRAFT" : "non-substantive edit",
  });

  return updated;
}

export async function approveCuratedRelationship(
  id: string,
  actorId: string
): Promise<KnowledgeGraphRelationship> {
  const existing = await prisma.knowledgeGraphRelationship.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.origin !== "CURATED") throw new Error("ONLY_CURATED_APPROVABLE");
  if (existing.status === "REJECTED" || existing.status === "ARCHIVED") {
    throw new Error("INVALID_STATUS");
  }

  const policy = getRelationshipPolicy(existing.relationshipType);
  if (policy?.evidenceRequired && !existing.evidenceUrl) {
    throw new Error("EVIDENCE_REQUIRED");
  }

  const updated = await prisma.knowledgeGraphRelationship.update({
    where: { id },
    data: {
      status: "ACTIVE",
      approvedBy: actorId,
      approvedAt: new Date(),
      lastVerifiedAt: new Date(),
    },
  });
  await writeGraphAuditLog({
    action: "CURATED_APPROVED",
    actorId,
    relationshipId: updated.id,
    entityId: existing.fromEntityId,
  });
  return updated;
}

export async function rejectCuratedRelationship(
  id: string,
  actorId: string
): Promise<KnowledgeGraphRelationship> {
  const existing = await prisma.knowledgeGraphRelationship.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.origin !== "CURATED") throw new Error("ONLY_CURATED_REJECTABLE");

  const updated = await prisma.knowledgeGraphRelationship.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvedBy: actorId,
      approvedAt: new Date(),
    },
  });
  await writeGraphAuditLog({
    action: "CURATED_REJECTED",
    actorId,
    relationshipId: updated.id,
    entityId: existing.fromEntityId,
  });
  return updated;
}

export async function archiveRelationship(
  id: string,
  options: { allowSystemDerived?: boolean } = {}
): Promise<KnowledgeGraphRelationship> {
  const existing = await prisma.knowledgeGraphRelationship.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.origin === "SYSTEM_DERIVED" && !options.allowSystemDerived) {
    throw new Error("SYSTEM_DERIVED_ARCHIVE_REQUIRES_EXPLICIT");
  }
  const updated = await prisma.knowledgeGraphRelationship.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  await writeGraphAuditLog({
    action: "RELATION_ARCHIVED",
    relationshipId: updated.id,
    entityId: existing.fromEntityId,
  });
  return updated;
}

export async function searchGraphRelationships(input: {
  search?: string;
  relationshipType?: string;
  status?: string;
  origin?: string;
  visibility?: string;
  fromEntityType?: string;
  toEntityType?: string;
  sourceEntryId?: string;
  page?: number;
  pageSize?: number;
  view?:
    | "draft"
    | "awaiting_approval"
    | "active"
    | "missing_evidence"
    | "expired"
    | "rejected"
    | "archived"
    | "system"
    | "imported"
    | "all";
}) {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 200);
  const now = new Date();

  const viewWhere: Prisma.KnowledgeGraphRelationshipWhereInput = (() => {
    switch (input.view) {
      case "draft":
      case "awaiting_approval":
        return { status: "DRAFT", origin: "CURATED" };
      case "active":
        return { status: "ACTIVE" };
      case "missing_evidence":
        return {
          origin: "CURATED",
          status: { in: ["DRAFT", "ACTIVE"] },
          OR: [{ evidenceUrl: null }, { evidenceUrl: "" }],
        };
      case "expired":
        return { status: "ACTIVE", validUntil: { lt: now } };
      case "rejected":
        return { status: "REJECTED" };
      case "archived":
        return { status: "ARCHIVED" };
      case "system":
        return { origin: "SYSTEM_DERIVED" };
      case "imported":
        return { origin: "IMPORTED" };
      default:
        return {};
    }
  })();

  const where: Prisma.KnowledgeGraphRelationshipWhereInput = {
    ...viewWhere,
    ...(input.relationshipType
      ? { relationshipType: input.relationshipType as never }
      : {}),
    ...(input.status ? { status: input.status as never } : {}),
    ...(input.origin ? { origin: input.origin as never } : {}),
    ...(input.visibility ? { visibility: input.visibility as never } : {}),
    ...(input.sourceEntryId ? { sourceEntryId: input.sourceEntryId } : {}),
    ...(input.fromEntityType
      ? { fromEntity: { entityType: input.fromEntityType as never } }
      : {}),
    ...(input.toEntityType ? { toEntity: { entityType: input.toEntityType as never } } : {}),
    ...(input.search
      ? {
          OR: [
            { fromEntity: { displayName: { contains: input.search, mode: "insensitive" } } },
            { toEntity: { displayName: { contains: input.search, mode: "insensitive" } } },
            { evidenceUrl: { contains: input.search, mode: "insensitive" } },
            { sourceEntryId: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.knowledgeGraphRelationship.count({ where }),
    prisma.knowledgeGraphRelationship.findMany({
      where,
      include: { fromEntity: true, toEntity: true },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    relationships: rows.map((r) => ({
      id: r.id,
      relationshipType: r.relationshipType,
      status: r.status,
      origin: r.origin,
      visibility: r.visibility,
      confidence: r.confidence,
      evidenceUrl: r.evidenceUrl,
      sourceEntryId: r.sourceEntryId,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      from: {
        id: r.fromEntity.id,
        displayName: r.fromEntity.displayName,
        entityType: r.fromEntity.entityType,
      },
      to: {
        id: r.toEntity.id,
        displayName: r.toEntity.displayName,
        entityType: r.toEntity.entityType,
      },
    })),
  };
}

export async function batchArchiveRejectedRelationships(
  ids: string[],
  actorId?: string | null
): Promise<number> {
  let archived = 0;
  for (const id of ids.slice(0, 100)) {
    const row = await prisma.knowledgeGraphRelationship.findUnique({ where: { id } });
    if (!row || row.status !== "REJECTED") continue;
    await archiveRelationship(id);
    archived += 1;
  }
  await writeGraphAuditLog({
    action: "RELATION_ARCHIVED",
    actorId,
    summary: `batch archive rejected count=${archived}`,
  });
  return archived;
}

export async function listRelationshipsForEntity(
  entityId: string,
  direction: "incoming" | "outgoing" | "both" = "both"
) {
  const where =
    direction === "incoming"
      ? { toEntityId: entityId }
      : direction === "outgoing"
        ? { fromEntityId: entityId }
        : { OR: [{ fromEntityId: entityId }, { toEntityId: entityId }] };

  return prisma.knowledgeGraphRelationship.findMany({
    where,
    orderBy: [{ authorityRank: "desc" }, { updatedAt: "desc" }],
    include: {
      fromEntity: true,
      toEntity: true,
    },
  });
}
