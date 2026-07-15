import type {
  KnowledgeBaseVisibility,
  KnowledgeGraphEntity,
  KnowledgeGraphEntityStatus,
  KnowledgeGraphEntityType,
  KnowledgeGraphRelationship,
  KnowledgeGraphRelationshipStatus,
  KnowledgeGraphRelationshipType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGraphEntityRoutes } from "@/features/knowledge-graph/knowledge-graph-entity-registry";
import {
  GRAPH_TRAVERSAL_LIMITS,
  type KnowledgeGraphEdgeResult,
  type KnowledgeGraphNeighbourResult,
  type KnowledgeGraphNodeResult,
} from "@/features/knowledge-graph/knowledge-graph-types";
import { isVisibilityAtMost } from "@/features/knowledge-graph/knowledge-graph-visibility";
import { getRelationshipPolicy } from "@/features/knowledge-graph/knowledge-graph-relationship-policy";

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function mapEntityToNodeResult(
  entity: KnowledgeGraphEntity
): KnowledgeGraphNodeResult {
  const routes = getGraphEntityRoutes({
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    entityType: entity.entityType,
    canonicalKey: entity.canonicalKey,
    displayName: entity.displayName,
    visibility: entity.visibility,
    metadata: (entity.metadata as Record<string, unknown> | null) ?? null,
    exists: true,
  });
  const meta = (entity.metadata as Record<string, unknown> | null) ?? null;
  return {
    id: entity.id,
    entityType: entity.entityType,
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    canonicalKey: entity.canonicalKey,
    displayName: entity.displayName,
    visibility: entity.visibility,
    status: entity.status,
    adminRoute:
      routes.adminRoute ??
      (typeof meta?.adminRoute === "string" ? meta.adminRoute : null),
    publicRoute:
      routes.publicRoute ??
      (typeof meta?.publicRoute === "string" ? meta.publicRoute : null),
  };
}

export function mapRelationshipToEdgeResult(
  rel: KnowledgeGraphRelationship
): KnowledgeGraphEdgeResult {
  return {
    id: rel.id,
    relationshipType: rel.relationshipType,
    fromEntityId: rel.fromEntityId,
    toEntityId: rel.toEntityId,
    status: rel.status,
    origin: rel.origin,
    visibility: rel.visibility,
    authorityRank: rel.authorityRank,
    confidence: rel.confidence,
    evidenceUrl: rel.evidenceUrl,
    validFrom: toIso(rel.validFrom),
    validUntil: toIso(rel.validUntil),
    lastVerifiedAt: toIso(rel.lastVerifiedAt),
  };
}

function isEdgeCurrentlyValid(rel: KnowledgeGraphRelationship, now = new Date()): boolean {
  if (rel.status !== "ACTIVE") return false;
  if (rel.validFrom && rel.validFrom > now) return false;
  if (rel.validUntil && rel.validUntil < now) return false;
  if (rel.origin === "CURATED" && !rel.approvedAt) return false;
  return true;
}

export async function findGraphEntities(input: {
  search?: string;
  entityType?: KnowledgeGraphEntityType;
  status?: KnowledgeGraphEntityStatus;
  visibility?: KnowledgeBaseVisibility;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 200);
  const where = {
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.visibility ? { visibility: input.visibility } : {}),
    ...(input.search
      ? {
          OR: [
            { displayName: { contains: input.search, mode: "insensitive" as const } },
            { canonicalKey: { contains: input.search, mode: "insensitive" as const } },
            { sourceId: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.knowledgeGraphEntity.count({ where }),
    prisma.knowledgeGraphEntity.findMany({
      where,
      orderBy: [{ lastSyncedAt: "desc" }, { displayName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    entities: rows.map(mapEntityToNodeResult),
  };
}

export async function getGraphEntity(id: string): Promise<KnowledgeGraphNodeResult | null> {
  const row = await prisma.knowledgeGraphEntity.findUnique({ where: { id } });
  return row ? mapEntityToNodeResult(row) : null;
}

export async function getGraphRelationships(input: {
  fromEntityId?: string;
  toEntityId?: string;
  relationshipType?: KnowledgeGraphRelationshipType;
  status?: KnowledgeGraphRelationshipStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 200);
  const where = {
    ...(input.fromEntityId ? { fromEntityId: input.fromEntityId } : {}),
    ...(input.toEntityId ? { toEntityId: input.toEntityId } : {}),
    ...(input.relationshipType ? { relationshipType: input.relationshipType } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.knowledgeGraphRelationship.count({ where }),
    prisma.knowledgeGraphRelationship.findMany({
      where,
      orderBy: [{ authorityRank: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    relationships: rows.map(mapRelationshipToEdgeResult),
  };
}

export async function getGraphNeighbours(input: {
  entityId: string;
  depth?: number;
  maxVisibility?: KnowledgeBaseVisibility;
  relationshipTypes?: KnowledgeGraphRelationshipType[];
}): Promise<KnowledgeGraphNeighbourResult> {
  return traverseKnowledgeGraph(input);
}

export async function traverseKnowledgeGraph(input: {
  entityId: string;
  depth?: number;
  maxVisibility?: KnowledgeBaseVisibility;
  relationshipTypes?: KnowledgeGraphRelationshipType[];
}): Promise<KnowledgeGraphNeighbourResult> {
  const warnings: string[] = [];
  const depth = Math.min(
    Math.max(input.depth ?? GRAPH_TRAVERSAL_LIMITS.defaultDepth, 1),
    GRAPH_TRAVERSAL_LIMITS.maxDepth
  );
  const maxVisibility = input.maxVisibility ?? "CONFIDENTIAL";

  const root = await prisma.knowledgeGraphEntity.findUnique({ where: { id: input.entityId } });
  if (!root) {
    throw new Error("ENTITY_NOT_FOUND");
  }

  const allowedTypes = input.relationshipTypes?.length
    ? input.relationshipTypes.filter((t) => Boolean(getRelationshipPolicy(t)))
    : undefined;

  const nodeMap = new Map<string, KnowledgeGraphEntity>();
  const edgeMap = new Map<string, KnowledgeGraphRelationship>();
  const paths: { entityIds: string[]; relationshipIds: string[] }[] = [];
  let truncated = false;

  nodeMap.set(root.id, root);

  let frontier = [root.id];
  for (let hop = 0; hop < depth; hop += 1) {
    if (!frontier.length) break;
    const nextFrontier: string[] = [];

    for (const nodeId of frontier) {
      if (nodeMap.size >= GRAPH_TRAVERSAL_LIMITS.maxTotalEntities) {
        truncated = true;
        warnings.push("max_total_entities");
        break;
      }

      const rels = await prisma.knowledgeGraphRelationship.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ fromEntityId: nodeId }, { toEntityId: nodeId }],
          ...(allowedTypes?.length ? { relationshipType: { in: allowedTypes } } : {}),
        },
        orderBy: [{ authorityRank: "desc" }, { id: "asc" }],
        take: GRAPH_TRAVERSAL_LIMITS.maxNeighboursPerNode + 1,
      });

      if (rels.length > GRAPH_TRAVERSAL_LIMITS.maxNeighboursPerNode) {
        truncated = true;
        warnings.push("max_neighbours_per_node");
      }

      for (const rel of rels.slice(0, GRAPH_TRAVERSAL_LIMITS.maxNeighboursPerNode)) {
        if (!isEdgeCurrentlyValid(rel)) continue;
        if (!isVisibilityAtMost(rel.visibility, maxVisibility)) continue;

        if (edgeMap.size >= GRAPH_TRAVERSAL_LIMITS.maxTotalEdges) {
          truncated = true;
          warnings.push("max_total_edges");
          break;
        }

        const neighbourId = rel.fromEntityId === nodeId ? rel.toEntityId : rel.fromEntityId;
        const neighbour =
          nodeMap.get(neighbourId) ??
          (await prisma.knowledgeGraphEntity.findUnique({ where: { id: neighbourId } }));
        if (!neighbour || neighbour.status !== "ACTIVE") continue;
        if (!isVisibilityAtMost(neighbour.visibility, maxVisibility)) continue;

        edgeMap.set(rel.id, rel);
        if (!nodeMap.has(neighbour.id)) {
          if (nodeMap.size >= GRAPH_TRAVERSAL_LIMITS.maxTotalEntities) {
            truncated = true;
            warnings.push("max_total_entities");
            break;
          }
          nodeMap.set(neighbour.id, neighbour);
          nextFrontier.push(neighbour.id);
        }

        paths.push({
          entityIds: [nodeId, neighbour.id],
          relationshipIds: [rel.id],
        });
      }
    }

    frontier = nextFrontier;
  }

  const nodes = [...nodeMap.values()]
    .map(mapEntityToNodeResult)
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));

  const edges = [...edgeMap.values()]
    .map(mapRelationshipToEdgeResult)
    .sort(
      (a, b) =>
        b.authorityRank - a.authorityRank ||
        a.relationshipType.localeCompare(b.relationshipType) ||
        a.id.localeCompare(b.id)
    );

  return {
    root: mapEntityToNodeResult(root),
    nodes,
    edges,
    paths,
    truncated,
    warnings: [...new Set(warnings)],
  };
}
