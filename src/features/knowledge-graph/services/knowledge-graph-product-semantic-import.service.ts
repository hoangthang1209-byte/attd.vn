import type {
  KnowledgeGraphEntityType,
  KnowledgeGraphRelationshipType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateGraphEntity } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import {
  resolveRelationshipVisibility,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import { writeGraphAuditLog } from "@/features/knowledge-graph/services/knowledge-graph-audit.service";

export type SemanticMatchStatus = "matched" | "ambiguous" | "missing" | "invalid_pair";

export type SemanticImportProposedEdge = {
  fromSourceType: string;
  fromSourceId: string;
  toSourceType: string;
  toSourceId: string;
  relationshipType: KnowledgeGraphRelationshipType;
  toEntityType: KnowledgeGraphEntityType;
  matchValue: string;
  matchStatus: SemanticMatchStatus;
  reason: string;
};

export type ProductSemanticImportReport = {
  dryRun: boolean;
  scannedProducts: number;
  matched: number;
  ambiguous: number;
  missingVocabulary: number;
  proposedEdges: number;
  invalidPairs: number;
  conflicts: number;
  created: number;
  existing: number;
  proposals: SemanticImportProposedEdge[];
  errors: string[];
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

type VocabIndex = {
  byExact: Map<string, { id: string; name: string }[]>;
};

function buildVocabIndex(
  rows: Array<{ id: string; name: string; code: string | null; aliases: string[] }>
): VocabIndex {
  const byExact = new Map<string, { id: string; name: string }[]>();
  const add = (key: string, row: { id: string; name: string }) => {
    const k = normalizeToken(key);
    if (!k) return;
    const list = byExact.get(k) ?? [];
    if (!list.some((x) => x.id === row.id)) list.push(row);
    byExact.set(k, list);
  };
  for (const row of rows) {
    add(row.name, row);
    if (row.code) add(row.code, row);
    for (const alias of row.aliases) add(alias, row);
  }
  return { byExact };
}

function resolveExact(
  index: VocabIndex,
  value: string
): { status: SemanticMatchStatus; hits: { id: string; name: string }[] } {
  const hits = index.byExact.get(normalizeToken(value)) ?? [];
  if (hits.length === 1) return { status: "matched", hits };
  if (hits.length > 1) return { status: "ambiguous", hits };
  return { status: "missing", hits: [] };
}

/**
 * Exact/alias-only product semantic importer.
 * No fuzzy matching. Dry-run by default.
 */
export async function importProductSemanticRelations(
  options: { dryRun?: boolean; batchSize?: number } = {}
): Promise<ProductSemanticImportReport> {
  const dryRun = options.dryRun ?? true;
  const batchSize = Math.min(Math.max(options.batchSize ?? 100, 1), 500);
  const report: ProductSemanticImportReport = {
    dryRun,
    scannedProducts: 0,
    matched: 0,
    ambiguous: 0,
    missingVocabulary: 0,
    proposedEdges: 0,
    invalidPairs: 0,
    conflicts: 0,
    created: 0,
    existing: 0,
    proposals: [],
    errors: [],
  };

  const [useCases, audiences, industries, materials, productionMaterials] = await Promise.all([
    prisma.mediaVocabularyTerm.findMany({
      where: { type: "USE_CASE", isActive: true },
      select: { id: true, name: true, code: true, aliases: true },
    }),
    prisma.mediaVocabularyTerm.findMany({
      where: { type: "AUDIENCE", isActive: true },
      select: { id: true, name: true, code: true, aliases: true },
    }),
    prisma.mediaVocabularyTerm.findMany({
      where: { type: "INDUSTRY", isActive: true },
      select: { id: true, name: true, code: true, aliases: true },
    }),
    prisma.material.findMany({
      where: { isActive: true },
      select: { id: true, name: true, materialCode: true },
    }),
    prisma.productionMaterial.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
    }),
  ]);

  const useCaseIndex = buildVocabIndex(useCases);
  const audienceIndex = buildVocabIndex(audiences);
  const industryIndex = buildVocabIndex(industries);

  const materialIndex: VocabIndex = { byExact: new Map() };
  for (const m of materials) {
    const row = { id: m.id, name: m.name };
    const add = (key: string) => {
      const k = normalizeToken(key);
      const list = materialIndex.byExact.get(k) ?? [];
      if (!list.some((x) => x.id === row.id)) list.push({ ...row, id: `Material:${m.id}` });
      materialIndex.byExact.set(k, list);
    };
    add(m.name);
    add(m.materialCode);
  }
  for (const m of productionMaterials) {
    const row = { id: `ProductionMaterial:${m.id}`, name: m.name };
    const add = (key: string) => {
      const k = normalizeToken(key);
      const list = materialIndex.byExact.get(k) ?? [];
      if (!list.some((x) => x.id === row.id)) list.push(row);
      materialIndex.byExact.set(k, list);
    };
    add(m.name);
    add(m.code);
  }

  let cursor: string | undefined;
  const proposals: SemanticImportProposedEdge[] = [];

  for (;;) {
    const products = await prisma.product.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        useCases: true,
        targetCustomers: true,
        material: true,
        tags: true,
      },
    });
    if (!products.length) break;

    for (const product of products) {
      report.scannedProducts += 1;

      const consider = (
        values: string[],
        index: VocabIndex,
        relationshipType: KnowledgeGraphRelationshipType,
        toEntityType: KnowledgeGraphEntityType,
        toSourceType: string
      ) => {
        for (const raw of values) {
          const value = raw.trim();
          if (!value) continue;
          const resolved = resolveExact(index, value);
          if (resolved.status === "missing") {
            report.missingVocabulary += 1;
            proposals.push({
              fromSourceType: "Product",
              fromSourceId: product.id,
              toSourceType,
              toSourceId: "",
              relationshipType,
              toEntityType,
              matchValue: value,
              matchStatus: "missing",
              reason: "No exact/alias vocabulary match",
            });
            continue;
          }
          if (resolved.status === "ambiguous") {
            report.ambiguous += 1;
            proposals.push({
              fromSourceType: "Product",
              fromSourceId: product.id,
              toSourceType,
              toSourceId: resolved.hits.map((h) => h.id).join(","),
              relationshipType,
              toEntityType,
              matchValue: value,
              matchStatus: "ambiguous",
              reason: `Ambiguous matches: ${resolved.hits.map((h) => h.name).join(" | ")}`,
            });
            continue;
          }

          const hit = resolved.hits[0]!;
          let sourceType = toSourceType;
          let sourceId = hit.id;
          if (hit.id.startsWith("Material:")) {
            sourceType = "Material";
            sourceId = hit.id.replace("Material:", "");
          } else if (hit.id.startsWith("ProductionMaterial:")) {
            sourceType = "ProductionMaterial";
            sourceId = hit.id.replace("ProductionMaterial:", "");
          }

          const pair = validateRelationshipPair({
            relationshipType,
            fromEntityType: "PRODUCT",
            toEntityType,
            origin: "IMPORTED",
          });
          if (!pair.ok) {
            report.invalidPairs += 1;
            proposals.push({
              fromSourceType: "Product",
              fromSourceId: product.id,
              toSourceType: sourceType,
              toSourceId: sourceId,
              relationshipType,
              toEntityType,
              matchValue: value,
              matchStatus: "invalid_pair",
              reason: pair.error,
            });
            continue;
          }

          report.matched += 1;
          report.proposedEdges += 1;
          proposals.push({
            fromSourceType: "Product",
            fromSourceId: product.id,
            toSourceType: sourceType,
            toSourceId: sourceId,
            relationshipType,
            toEntityType,
            matchValue: value,
            matchStatus: "matched",
            reason: `Exact/alias match → ${hit.name}`,
          });
        }
      };

      consider(product.useCases, useCaseIndex, "SUITABLE_FOR", "USE_CASE", "MediaVocabularyTerm");
      consider(product.targetCustomers, audienceIndex, "TARGETS", "AUDIENCE", "MediaVocabularyTerm");
      // Industry only from exact tag tokens prefixed industry:
      const industryTokens = product.tags
        .filter((t) => /^industry:/i.test(t))
        .map((t) => t.replace(/^industry:/i, "").trim())
        .filter(Boolean);
      consider(industryTokens, industryIndex, "TARGETS", "INDUSTRY", "MediaVocabularyTerm");

      if (product.material?.trim()) {
        consider([product.material], materialIndex, "MADE_FROM", "MATERIAL", "Material");
      }
    }

    cursor = products[products.length - 1]?.id;
    if (products.length < batchSize) break;
  }

  report.proposals = proposals.slice(0, 500);

  if (dryRun) {
    await writeGraphAuditLog({
      action: "SEMANTIC_IMPORT",
      summary: `dry-run matched=${report.matched} ambiguous=${report.ambiguous} missing=${report.missingVocabulary}`,
      metadata: {
        dryRun: true,
        matched: report.matched,
        ambiguous: report.ambiguous,
        missing: report.missingVocabulary,
        proposed: report.proposedEdges,
      },
    });
    return report;
  }

  for (const edge of proposals.filter((p) => p.matchStatus === "matched")) {
    const from = await resolveOrCreateGraphEntity(edge.fromSourceType, edge.fromSourceId, {
      dryRun: false,
    });
    const to = await resolveOrCreateGraphEntity(edge.toSourceType, edge.toSourceId, {
      dryRun: false,
    });
    if (!from || !to) {
      report.errors.push(`Missing entity for ${edge.matchValue}`);
      continue;
    }
    const pair = validateRelationshipPair({
      relationshipType: edge.relationshipType,
      fromEntityType: from.entityType,
      toEntityType: to.entityType,
      origin: "IMPORTED",
      fromEntityId: from.id,
      toEntityId: to.id,
    });
    if (!pair.ok) {
      report.invalidPairs += 1;
      continue;
    }

    const existing = await prisma.knowledgeGraphRelationship.findUnique({
      where: {
        fromEntityId_toEntityId_relationshipType: {
          fromEntityId: from.id,
          toEntityId: to.id,
          relationshipType: edge.relationshipType,
        },
      },
    });

    if (existing?.status === "ACTIVE") {
      if (existing.origin === "SYSTEM_DERIVED") {
        report.conflicts += 1;
        report.existing += 1;
        continue;
      }
      report.existing += 1;
      continue;
    }

    const visibility = resolveRelationshipVisibility({
      policy: pair.policy,
      fromVisibility: from.visibility,
      toVisibility: to.visibility,
    });

    if (existing) {
      await prisma.knowledgeGraphRelationship.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          origin: "IMPORTED",
          visibility,
          metadata: { syncKey: "product-semantic-import", matchValue: edge.matchValue },
        },
      });
    } else {
      await prisma.knowledgeGraphRelationship.create({
        data: {
          fromEntityId: from.id,
          toEntityId: to.id,
          relationshipType: edge.relationshipType,
          status: "ACTIVE",
          origin: "IMPORTED",
          visibility,
          authorityRank: pair.policy.defaultAuthorityRank,
          metadata: { syncKey: "product-semantic-import", matchValue: edge.matchValue },
        },
      });
    }
    report.created += 1;
  }

  await writeGraphAuditLog({
    action: "SEMANTIC_IMPORT",
    summary: `apply created=${report.created} existing=${report.existing}`,
    metadata: {
      dryRun: false,
      created: report.created,
      existing: report.existing,
      matched: report.matched,
      ambiguous: report.ambiguous,
    },
  });

  return report;
}
