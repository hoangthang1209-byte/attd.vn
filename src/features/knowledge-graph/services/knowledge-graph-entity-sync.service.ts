import type { KnowledgeGraphEntity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  GRAPH_ENTITY_REGISTRY,
  V1_SYNC_SOURCE_PRIORITY,
  getGraphEntityRoutes,
  resolveGraphEntitySource,
  sanitizeGraphMetadata,
  validateGraphEntitySource,
  type GraphEntitySourceRecord,
} from "@/features/knowledge-graph/knowledge-graph-entity-registry";
import type {
  KnowledgeGraphSyncOptions,
  KnowledgeGraphSyncReport,
} from "@/features/knowledge-graph/knowledge-graph-types";

function emptyReport(dryRun: boolean): KnowledgeGraphSyncReport {
  return {
    dryRun,
    scanned: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    orphaned: 0,
    skipped: 0,
    errors: [],
  };
}

function projectionEquals(
  existing: KnowledgeGraphEntity,
  next: {
    entityType: GraphEntitySourceRecord["entityType"];
    canonicalKey: string;
    displayName: string;
    visibility: GraphEntitySourceRecord["visibility"];
    metadata: Record<string, unknown> | null;
  }
): boolean {
  if (existing.entityType !== next.entityType) return false;
  if (existing.canonicalKey !== next.canonicalKey) return false;
  if (existing.displayName !== next.displayName) return false;
  if (existing.visibility !== next.visibility) return false;
  if (existing.status !== "ACTIVE") return false;
  const metaA = sanitizeGraphMetadata(
    (existing.metadata as Record<string, unknown> | null) ?? null
  );
  const metaB = sanitizeGraphMetadata(next.metadata);
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}

export async function refreshGraphEntityProjection(
  record: GraphEntitySourceRecord,
  options: { dryRun?: boolean } = {}
): Promise<"created" | "updated" | "unchanged"> {
  const dryRun = options.dryRun ?? false;
  const routes = getGraphEntityRoutes(record);
  const metadata = sanitizeGraphMetadata({
    ...(record.metadata ?? {}),
    adminRoute: routes.adminRoute,
    publicRoute: routes.publicRoute,
  });

  const existing = await prisma.knowledgeGraphEntity.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: record.sourceType,
        sourceId: record.sourceId,
      },
    },
  });

  if (
    existing &&
    projectionEquals(existing, {
      entityType: record.entityType,
      canonicalKey: record.canonicalKey,
      displayName: record.displayName,
      visibility: record.visibility,
      metadata,
    })
  ) {
    if (!dryRun) {
      await prisma.knowledgeGraphEntity.update({
        where: { id: existing.id },
        data: { lastSyncedAt: new Date() },
      });
    }
    return "unchanged";
  }

  const data = {
    entityType: record.entityType,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    canonicalKey: record.canonicalKey,
    displayName: record.displayName,
    visibility: record.visibility,
    status: "ACTIVE" as const,
    metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    lastSyncedAt: new Date(),
  };

  if (dryRun) {
    return existing ? "updated" : "created";
  }

  if (existing) {
    await prisma.knowledgeGraphEntity.update({
      where: { id: existing.id },
      data: {
        entityType: data.entityType,
        canonicalKey: data.canonicalKey,
        displayName: data.displayName,
        visibility: data.visibility,
        status: "ACTIVE",
        metadata: data.metadata,
        lastSyncedAt: data.lastSyncedAt,
      },
    });
    return "updated";
  }

  await prisma.knowledgeGraphEntity.create({ data });
  return "created";
}

export async function resolveOrCreateGraphEntity(
  sourceType: string,
  sourceId: string,
  options: { dryRun?: boolean } = {}
): Promise<KnowledgeGraphEntity | null> {
  const validated = await validateGraphEntitySource(sourceType, sourceId);
  if (!validated.ok) return null;

  await refreshGraphEntityProjection(validated.record, { dryRun: options.dryRun });

  if (options.dryRun) {
    return prisma.knowledgeGraphEntity.findUnique({
      where: {
        sourceType_sourceId: { sourceType, sourceId },
      },
    });
  }

  return prisma.knowledgeGraphEntity.findUnique({
    where: {
      sourceType_sourceId: { sourceType, sourceId },
    },
  });
}

export async function syncGraphEntityForSource(
  sourceType: string,
  sourceId: string,
  options: { dryRun?: boolean } = {}
): Promise<{ action: "created" | "updated" | "unchanged" | "skipped"; error?: string }> {
  const validated = await validateGraphEntitySource(sourceType, sourceId);
  if (!validated.ok) {
    return { action: "skipped", error: validated.error };
  }
  const action = await refreshGraphEntityProjection(validated.record, options);
  return { action };
}

export async function syncGraphEntitiesForSourceType(
  sourceType: string,
  options: KnowledgeGraphSyncOptions = {}
): Promise<KnowledgeGraphSyncReport> {
  const dryRun = options.dryRun ?? true;
  const batchSize = Math.min(Math.max(options.batchSize ?? 100, 1), 500);
  const report = emptyReport(dryRun);
  const registry = GRAPH_ENTITY_REGISTRY[sourceType];
  if (!registry) {
    report.errors.push(`Unsupported source type: ${sourceType}`);
    return report;
  }
  if (!registry.systemSyncSupported) {
    report.errors.push(`System sync not supported for ${sourceType}`);
    return report;
  }

  let cursor: string | undefined;
  for (;;) {
    const ids = await registry.listIds(batchSize, cursor);
    if (!ids.length) break;
    for (const id of ids) {
      report.scanned += 1;
      const result = await syncGraphEntityForSource(sourceType, id, { dryRun });
      if (result.action === "created") report.created += 1;
      else if (result.action === "updated") report.updated += 1;
      else if (result.action === "unchanged") report.unchanged += 1;
      else {
        report.skipped += 1;
        if (result.error) report.errors.push(result.error);
      }
    }
    cursor = ids[ids.length - 1];
    if (ids.length < batchSize) break;
  }

  return report;
}

export async function markMissingSourceEntitiesOrphaned(
  sourceType: string,
  options: { dryRun?: boolean } = {}
): Promise<number> {
  const dryRun = options.dryRun ?? true;
  const registry = GRAPH_ENTITY_REGISTRY[sourceType];
  if (!registry) return 0;

  const entities = await prisma.knowledgeGraphEntity.findMany({
    where: { sourceType, status: { not: "ORPHANED" } },
    select: { id: true, sourceId: true },
  });

  let orphaned = 0;
  for (const entity of entities) {
    const source = await resolveGraphEntitySource(sourceType, entity.sourceId);
    if (source?.exists) continue;
    orphaned += 1;
    if (!dryRun) {
      await prisma.knowledgeGraphEntity.update({
        where: { id: entity.id },
        data: { status: "ORPHANED", lastSyncedAt: new Date() },
      });
    }
  }
  return orphaned;
}

export async function syncSupportedGraphEntities(
  options: KnowledgeGraphSyncOptions = {}
): Promise<Record<string, KnowledgeGraphSyncReport>> {
  const dryRun = options.dryRun ?? true;
  const sourceTypes =
    options.sourceTypes?.length
      ? options.sourceTypes
      : [...V1_SYNC_SOURCE_PRIORITY];

  const out: Record<string, KnowledgeGraphSyncReport> = {};
  for (const sourceType of sourceTypes) {
    if (!GRAPH_ENTITY_REGISTRY[sourceType]) {
      out[sourceType] = {
        ...emptyReport(dryRun),
        errors: [`Unknown source type: ${sourceType}`],
      };
      continue;
    }
    const report = await syncGraphEntitiesForSourceType(sourceType, {
      ...options,
      dryRun,
    });
    report.orphaned = await markMissingSourceEntitiesOrphaned(sourceType, { dryRun });
    out[sourceType] = report;
  }
  return out;
}
