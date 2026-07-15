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
    return prisma.knowledgeGraphRelationship.update({
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
  }

  return prisma.knowledgeGraphRelationship.create({
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
    (input.visibility !== undefined && input.visibility !== existing.visibility);

  const nextStatus: KnowledgeGraphRelationshipStatus =
    substantive && existing.status === "ACTIVE" ? "DRAFT" : existing.status;

  return prisma.knowledgeGraphRelationship.update({
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
      metadata: input.metadata === undefined ? undefined : asJson(input.metadata),
      status: nextStatus,
      approvedBy: nextStatus === "DRAFT" ? null : existing.approvedBy,
      approvedAt: nextStatus === "DRAFT" ? null : existing.approvedAt,
    },
  });
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

  return prisma.knowledgeGraphRelationship.update({
    where: { id },
    data: {
      status: "ACTIVE",
      approvedBy: actorId,
      approvedAt: new Date(),
      lastVerifiedAt: new Date(),
    },
  });
}

export async function rejectCuratedRelationship(
  id: string,
  actorId: string
): Promise<KnowledgeGraphRelationship> {
  const existing = await prisma.knowledgeGraphRelationship.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.origin !== "CURATED") throw new Error("ONLY_CURATED_REJECTABLE");

  return prisma.knowledgeGraphRelationship.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvedBy: actorId,
      approvedAt: new Date(),
    },
  });
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
  return prisma.knowledgeGraphRelationship.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
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
