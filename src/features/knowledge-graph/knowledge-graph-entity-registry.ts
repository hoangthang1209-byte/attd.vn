import type {
  KnowledgeBaseVisibility,
  KnowledgeGraphEntityType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPublicCatalogProductStatus } from "@/features/products/product-foundation-validation";

export type GraphEntitySourceRecord = {
  sourceType: string;
  sourceId: string;
  entityType: KnowledgeGraphEntityType;
  canonicalKey: string;
  displayName: string;
  visibility: KnowledgeBaseVisibility;
  /** Safe non-business hints only (subtype, routes). Never MOQ/price/lead-time. */
  metadata?: Record<string, unknown> | null;
  exists: boolean;
};

export type GraphEntityRegistryEntry = {
  entityType: KnowledgeGraphEntityType;
  sourceType: string;
  systemSyncSupported: boolean;
  manualCreationAllowed: false;
  resolve: (sourceId: string) => Promise<GraphEntitySourceRecord | null>;
  listIds: (take: number, cursor?: string) => Promise<string[]>;
};

const FORBIDDEN_METADATA_KEYS = new Set([
  "moq",
  "defaultMoq",
  "moqValue",
  "price",
  "cost",
  "leadTime",
  "lead_time",
  "description",
  "content",
  "composition",
  "consumptionPerUnit",
]);

export function sanitizeGraphMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : null;
}

function kbVisibilityForType(
  type: string,
  visibility: KnowledgeBaseVisibility,
  status: string
): KnowledgeBaseVisibility {
  if (status === "ARCHIVED") return "INTERNAL";
  return visibility;
}

function mapKbTypeToEntityType(type: string): KnowledgeGraphEntityType {
  if (type === "CASE_STUDY") return "CASE_STUDY";
  if (type === "POLICY") return "POLICY";
  if (type === "FAQ") return "FAQ";
  return "KNOWLEDGE_ENTRY";
}

async function resolveProduct(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.product.findUnique({
    where: { id: sourceId },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!row) return null;
  const isPublic = isPublicCatalogProductStatus(row.status);
  return {
    sourceType: "Product",
    sourceId: row.id,
    entityType: "PRODUCT",
    canonicalKey: row.slug || `product:${row.id}`,
    displayName: row.name,
    visibility: isPublic ? "PUBLIC" : "INTERNAL",
    metadata: sanitizeGraphMetadata({ status: row.status, slug: row.slug }),
    exists: true,
  };
}

async function resolveCategory(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.category.findUnique({
    where: { id: sourceId },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!row) return null;
  return {
    sourceType: "Category",
    sourceId: row.id,
    entityType: "PRODUCT_CATEGORY",
    canonicalKey: row.slug || `category:${row.id}`,
    displayName: row.name,
    visibility: row.isActive ? "PUBLIC" : "INTERNAL",
    metadata: sanitizeGraphMetadata({ slug: row.slug, isActive: row.isActive }),
    exists: true,
  };
}

async function resolveKnowledgeEntry(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.knowledgeBaseEntry.findUnique({
    where: { id: sourceId },
    select: { id: true, title: true, slug: true, type: true, visibility: true, status: true },
  });
  if (!row) return null;
  const entityType = mapKbTypeToEntityType(row.type);
  return {
    sourceType: "KnowledgeBaseEntry",
    sourceId: row.id,
    entityType,
    canonicalKey: row.slug || `kb:${row.id}`,
    displayName: row.title,
    visibility: kbVisibilityForType(row.type, row.visibility, row.status),
    metadata: sanitizeGraphMetadata({ kbType: row.type, status: row.status, slug: row.slug }),
    exists: true,
  };
}

async function resolveSeoTopic(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.seoTopic.findUnique({
    where: { id: sourceId },
    select: { id: true, title: true, slug: true, status: true, primaryKeyword: true },
  });
  if (!row) return null;
  return {
    sourceType: "SeoTopic",
    sourceId: row.id,
    entityType: "SEO_TOPIC",
    canonicalKey: row.slug || `seo-topic:${row.id}`,
    displayName: row.title,
    visibility: "INTERNAL",
    metadata: sanitizeGraphMetadata({ status: row.status, slug: row.slug }),
    exists: true,
  };
}

async function resolveMediaBundle(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.mediaBundle.findUnique({
    where: { id: sourceId },
    select: { id: true, name: true, code: true, status: true, isActive: true },
  });
  if (!row) return null;
  const published = row.isActive && row.status === "READY";
  return {
    sourceType: "MediaBundle",
    sourceId: row.id,
    entityType: "MEDIA_BUNDLE",
    canonicalKey: row.code || `media-bundle:${row.id}`,
    displayName: row.name,
    visibility: published ? "INTERNAL" : "INTERNAL",
    metadata: sanitizeGraphMetadata({ status: row.status, code: row.code }),
    exists: true,
  };
}

async function resolveBlogPost(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.blogPost.findUnique({
    where: { id: sourceId },
    select: { id: true, title: true, slug: true, status: true },
  });
  if (!row) return null;
  return {
    sourceType: "BlogPost",
    sourceId: row.id,
    entityType: "BLOG_POST",
    canonicalKey: row.slug || `blog:${row.id}`,
    displayName: row.title,
    visibility: row.status === "PUBLISHED" ? "PUBLIC" : "INTERNAL",
    metadata: sanitizeGraphMetadata({ status: row.status, slug: row.slug }),
    exists: true,
  };
}

async function resolveProductionMaterial(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.productionMaterial.findUnique({
    where: { id: sourceId },
    select: { id: true, name: true, code: true, isActive: true },
  });
  if (!row) return null;
  return {
    sourceType: "ProductionMaterial",
    sourceId: row.id,
    entityType: "MATERIAL",
    canonicalKey: row.code || `production-material:${row.id}`,
    displayName: row.name,
    visibility: "INTERNAL",
    metadata: sanitizeGraphMetadata({ code: row.code, isActive: row.isActive }),
    exists: true,
  };
}

async function resolveOpsMaterial(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.material.findUnique({
    where: { id: sourceId },
    select: { id: true, name: true, materialCode: true, isActive: true },
  });
  if (!row) return null;
  return {
    sourceType: "Material",
    sourceId: row.id,
    entityType: "MATERIAL",
    canonicalKey: row.materialCode || `material:${row.id}`,
    displayName: row.name,
    visibility: "INTERNAL",
    metadata: sanitizeGraphMetadata({ materialCode: row.materialCode, isActive: row.isActive }),
    exists: true,
  };
}

async function resolvePrintMethod(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.printMethod.findUnique({
    where: { id: sourceId },
    select: { id: true, name: true, code: true, isActive: true },
  });
  if (!row) return null;
  return {
    sourceType: "PrintMethod",
    sourceId: row.id,
    entityType: "PRINT_METHOD",
    canonicalKey: row.code || `print-method:${row.id}`,
    displayName: row.name,
    visibility: row.isActive ? "PUBLIC" : "INTERNAL",
    metadata: sanitizeGraphMetadata({ code: row.code, isActive: row.isActive }),
    exists: true,
  };
}

async function resolveTrim(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.productionTrim.findUnique({
    where: { id: sourceId },
    select: { id: true, name: true, code: true, isActive: true },
  });
  if (!row) return null;
  return {
    sourceType: "ProductionTrim",
    sourceId: row.id,
    entityType: "TRIM",
    canonicalKey: row.code || `trim:${row.id}`,
    displayName: row.name,
    visibility: "INTERNAL",
    metadata: sanitizeGraphMetadata({ code: row.code, isActive: row.isActive }),
    exists: true,
  };
}

async function resolveTechPack(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.techPack.findUnique({
    where: { id: sourceId },
    select: { id: true, code: true, title: true, status: true },
  });
  if (!row) return null;
  return {
    sourceType: "TechPack",
    sourceId: row.id,
    entityType: "TECH_PACK",
    canonicalKey: row.code || `tech-pack:${row.id}`,
    displayName: row.title || row.code,
    visibility: "INTERNAL",
    metadata: sanitizeGraphMetadata({ code: row.code, status: row.status }),
    exists: true,
  };
}

async function resolvePattern(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.pattern.findUnique({
    where: { id: sourceId },
    select: { id: true, code: true, name: true, status: true },
  });
  if (!row) return null;
  return {
    sourceType: "Pattern",
    sourceId: row.id,
    entityType: "PATTERN",
    canonicalKey: row.code || `pattern:${row.id}`,
    displayName: row.name,
    visibility: "INTERNAL",
    metadata: sanitizeGraphMetadata({ code: row.code, status: row.status }),
    exists: true,
  };
}

async function resolveManufacturingAsset(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.manufacturingAsset.findUnique({
    where: { id: sourceId },
    select: { id: true, title: true, slug: true, status: true, visibility: true },
  });
  if (!row) return null;
  const visibility: KnowledgeBaseVisibility =
    row.visibility === "PUBLIC" && row.status === "PUBLISHED"
      ? "PUBLIC"
      : row.visibility === "INTERNAL"
        ? "INTERNAL"
        : "INTERNAL";
  return {
    sourceType: "ManufacturingAsset",
    sourceId: row.id,
    entityType: "CAPABILITY",
    canonicalKey: row.slug || `capability:${row.id}`,
    displayName: row.title,
    visibility,
    metadata: sanitizeGraphMetadata({ slug: row.slug, status: row.status }),
    exists: true,
  };
}

function vocabEntityType(
  type: string
): KnowledgeGraphEntityType | null {
  if (type === "INDUSTRY") return "INDUSTRY";
  if (type === "AUDIENCE") return "AUDIENCE";
  if (type === "USE_CASE") return "USE_CASE";
  if (type === "TECHNIQUE") return "TECHNIQUE";
  return null;
}

async function resolveVocabularyTerm(sourceId: string): Promise<GraphEntitySourceRecord | null> {
  const row = await prisma.mediaVocabularyTerm.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isActive: true,
      visibility: true,
    },
  });
  if (!row) return null;
  const entityType = vocabEntityType(row.type);
  if (!entityType) return null;
  return {
    sourceType: "MediaVocabularyTerm",
    sourceId: row.id,
    entityType,
    canonicalKey: row.code || `${row.type.toLowerCase()}:${row.id}`,
    displayName: row.name,
    visibility:
      row.visibility === "PUBLIC"
        ? "PUBLIC"
        : row.visibility === "CONFIDENTIAL"
          ? "CONFIDENTIAL"
          : "INTERNAL",
    metadata: sanitizeGraphMetadata({ vocabType: row.type, code: row.code, isActive: row.isActive }),
    exists: true,
  };
}

export const GRAPH_ENTITY_REGISTRY: Record<string, GraphEntityRegistryEntry> = {
  Product: {
    entityType: "PRODUCT",
    sourceType: "Product",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveProduct,
    listIds: async (take, cursor) => {
      const rows = await prisma.product.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  Category: {
    entityType: "PRODUCT_CATEGORY",
    sourceType: "Category",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveCategory,
    listIds: async (take, cursor) => {
      const rows = await prisma.category.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  KnowledgeBaseEntry: {
    entityType: "KNOWLEDGE_ENTRY",
    sourceType: "KnowledgeBaseEntry",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveKnowledgeEntry,
    listIds: async (take, cursor) => {
      const rows = await prisma.knowledgeBaseEntry.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  SeoTopic: {
    entityType: "SEO_TOPIC",
    sourceType: "SeoTopic",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveSeoTopic,
    listIds: async (take, cursor) => {
      const rows = await prisma.seoTopic.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  MediaBundle: {
    entityType: "MEDIA_BUNDLE",
    sourceType: "MediaBundle",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveMediaBundle,
    listIds: async (take, cursor) => {
      const rows = await prisma.mediaBundle.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  BlogPost: {
    entityType: "BLOG_POST",
    sourceType: "BlogPost",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveBlogPost,
    listIds: async (take, cursor) => {
      const rows = await prisma.blogPost.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  ProductionMaterial: {
    entityType: "MATERIAL",
    sourceType: "ProductionMaterial",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveProductionMaterial,
    listIds: async (take, cursor) => {
      const rows = await prisma.productionMaterial.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  Material: {
    entityType: "MATERIAL",
    sourceType: "Material",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveOpsMaterial,
    listIds: async (take, cursor) => {
      const rows = await prisma.material.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  PrintMethod: {
    entityType: "PRINT_METHOD",
    sourceType: "PrintMethod",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolvePrintMethod,
    listIds: async (take, cursor) => {
      const rows = await prisma.printMethod.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  ProductionTrim: {
    entityType: "TRIM",
    sourceType: "ProductionTrim",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveTrim,
    listIds: async (take, cursor) => {
      const rows = await prisma.productionTrim.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  TechPack: {
    entityType: "TECH_PACK",
    sourceType: "TechPack",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveTechPack,
    listIds: async (take, cursor) => {
      const rows = await prisma.techPack.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  Pattern: {
    entityType: "PATTERN",
    sourceType: "Pattern",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolvePattern,
    listIds: async (take, cursor) => {
      const rows = await prisma.pattern.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  ManufacturingAsset: {
    entityType: "CAPABILITY",
    sourceType: "ManufacturingAsset",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveManufacturingAsset,
    listIds: async (take, cursor) => {
      const rows = await prisma.manufacturingAsset.findMany({
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  MediaVocabularyTerm: {
    entityType: "USE_CASE",
    sourceType: "MediaVocabularyTerm",
    systemSyncSupported: true,
    manualCreationAllowed: false,
    resolve: resolveVocabularyTerm,
    listIds: async (take, cursor) => {
      const rows = await prisma.mediaVocabularyTerm.findMany({
        where: { type: { in: ["INDUSTRY", "AUDIENCE", "USE_CASE", "TECHNIQUE"] } },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
};

export const V1_SYNC_SOURCE_PRIORITY = [
  "Product",
  "Category",
  "KnowledgeBaseEntry",
  "SeoTopic",
  "MediaBundle",
  "BlogPost",
  "ProductionMaterial",
  "PrintMethod",
  "TechPack",
  "Pattern",
  "MediaVocabularyTerm",
  "Material",
  "ManufacturingAsset",
  "ProductionTrim",
] as const;

export function resolveGraphEntitySource(
  sourceType: string,
  sourceId: string
): Promise<GraphEntitySourceRecord | null> {
  const entry = GRAPH_ENTITY_REGISTRY[sourceType];
  if (!entry) return Promise.resolve(null);
  return entry.resolve(sourceId);
}

export function buildCanonicalGraphKey(
  entityType: KnowledgeGraphEntityType,
  canonicalKey: string
): string {
  return `${entityType}:${canonicalKey}`.toLowerCase();
}

export async function validateGraphEntitySource(
  sourceType: string,
  sourceId: string
): Promise<{ ok: true; record: GraphEntitySourceRecord } | { ok: false; error: string }> {
  if (!GRAPH_ENTITY_REGISTRY[sourceType]) {
    return { ok: false, error: `Unknown source type: ${sourceType}` };
  }
  if (!sourceId || typeof sourceId !== "string") {
    return { ok: false, error: "Invalid source ID" };
  }
  const record = await resolveGraphEntitySource(sourceType, sourceId);
  if (!record || !record.exists) {
    return { ok: false, error: `Source not found: ${sourceType}/${sourceId}` };
  }
  return { ok: true, record };
}

export function getGraphEntityDisplayName(record: GraphEntitySourceRecord): string {
  return record.displayName;
}

export function getGraphEntityRoutes(record: GraphEntitySourceRecord): {
  adminRoute: string | null;
  publicRoute: string | null;
} {
  switch (record.sourceType) {
    case "Product":
      return {
        adminRoute: `/admin/products/${record.sourceId}`,
        publicRoute:
          record.visibility === "PUBLIC" && typeof record.metadata?.slug === "string"
            ? `/products/${record.metadata.slug}`
            : null,
      };
    case "Category":
      return {
        adminRoute: `/admin/categories/${record.sourceId}`,
        publicRoute:
          typeof record.metadata?.slug === "string" ? `/danh-muc/${record.metadata.slug}` : null,
      };
    case "KnowledgeBaseEntry":
      return {
        adminRoute: `/admin/knowledge-base/${record.sourceId}`,
        publicRoute: null,
      };
    case "SeoTopic":
      return { adminRoute: `/admin/content/seo/topics/${record.sourceId}`, publicRoute: null };
    case "MediaBundle":
      return { adminRoute: `/admin/content/media-bundles/${record.sourceId}`, publicRoute: null };
    case "BlogPost":
      return {
        adminRoute: `/admin/blog/${record.sourceId}`,
        publicRoute:
          record.visibility === "PUBLIC" && typeof record.metadata?.slug === "string"
            ? `/blog/${record.metadata.slug}`
            : null,
      };
    case "ProductionMaterial":
      return { adminRoute: `/admin/production-materials/${record.sourceId}`, publicRoute: null };
    case "Material":
      return { adminRoute: `/admin/materials/${record.sourceId}`, publicRoute: null };
    case "PrintMethod":
      return { adminRoute: `/admin/print-methods/${record.sourceId}`, publicRoute: null };
    case "TechPack":
      return { adminRoute: `/admin/tech-packs/${record.sourceId}`, publicRoute: null };
    case "Pattern":
      return { adminRoute: `/admin/patterns/${record.sourceId}`, publicRoute: null };
    case "ManufacturingAsset":
      return {
        adminRoute: `/admin/manufacturing-library/${record.sourceId}`,
        publicRoute: null,
      };
    case "MediaVocabularyTerm":
      return { adminRoute: `/admin/content/media-vocabulary`, publicRoute: null };
    default:
      return { adminRoute: null, publicRoute: null };
  }
}
