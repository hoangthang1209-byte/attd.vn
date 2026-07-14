import type {
  MediaAiProcessingStatus,
  MediaAssetType,
  MediaDuplicateStatus,
  MediaOrientation,
  MediaSeoReadinessStatus,
  MediaVisibility,
  MediaVocabularyType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MediaIntelligenceInput = {
  libraryId?: string | null;
  roleId?: string | null;
  visibility?: MediaVisibility | null;
  assetType?: MediaAssetType | null;
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
  description?: string | null;
  tags?: string[] | null;
  keywords?: string[] | null;
  subjectTerms?: string[] | null;
  materialTerms?: string[] | null;
  colorTerms?: string[] | null;
  techniqueTerms?: string[] | null;
  industryTerms?: string[] | null;
  audienceTerms?: string[] | null;
  useCaseTerms?: string[] | null;
  orientation?: MediaOrientation | null;
  width?: number | null;
  height?: number | null;
  collectionCount?: number;
  contentLanguage?: string | null;
  duplicateStatus?: MediaDuplicateStatus | null;
  duplicateOfId?: string | null;
};

export type MediaIntelligenceMetrics = {
  seoScore: number;
  metadataCompleteness: number;
  seoReadinessStatus: MediaSeoReadinessStatus;
  missingFields: string[];
  strengths: string[];
};

export type SemanticTermField =
  | "subjectTerms"
  | "materialTerms"
  | "colorTerms"
  | "techniqueTerms"
  | "industryTerms"
  | "audienceTerms"
  | "useCaseTerms";

export const SEMANTIC_FIELD_TO_VOCAB_TYPE: Record<SemanticTermField, MediaVocabularyType> = {
  subjectTerms: "SUBJECT",
  materialTerms: "MATERIAL",
  colorTerms: "COLOR",
  techniqueTerms: "TECHNIQUE",
  industryTerms: "INDUSTRY",
  audienceTerms: "AUDIENCE",
  useCaseTerms: "USE_CASE",
};

const VALID_ASSET_TYPES: MediaAssetType[] = [
  "PHOTO",
  "ILLUSTRATION",
  "LOGO",
  "ICON",
  "MOCKUP",
  "SCREENSHOT",
  "DIAGRAM",
  "DOCUMENT_PREVIEW",
  "VIDEO_THUMBNAIL",
  "OTHER",
];

const VALID_AI_STATUSES: MediaAiProcessingStatus[] = [
  "NOT_PROCESSED",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
];

const VALID_SEO_READINESS: MediaSeoReadinessStatus[] = [
  "INCOMPLETE",
  "BASIC",
  "READY",
  "EXCELLENT",
];

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasList(value: string[] | null | undefined): boolean {
  return Boolean(value?.some((item) => item.trim()));
}

/** Normalize semantic term arrays: trim, drop empty, case-insensitive dedupe, preserve first order. */
export function normalizeSemanticTerms(values: string[] | null | undefined): string[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const term = raw.trim().replace(/\s+/g, " ");
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(term);
  }
  return result;
}

export function mergeSemanticTerms(
  existing: string[] | null | undefined,
  add: string[] | null | undefined,
  remove: string[] | null | undefined,
): string[] {
  const base = normalizeSemanticTerms(existing);
  const removeSet = new Set(normalizeSemanticTerms(remove).map((t) => t.toLowerCase()));
  const filtered = base.filter((t) => !removeSet.has(t.toLowerCase()));
  return normalizeSemanticTerms([...filtered, ...(add ?? [])]);
}

/**
 * Resolve free-form / alias inputs to canonical vocabulary term names.
 * Inactive terms remain readable when already assigned; new assignment requires active terms.
 */
export async function resolveVocabularyTerms(
  type: MediaVocabularyType,
  values: string[] | null | undefined,
  options?: { allowInactiveExisting?: string[] },
): Promise<string[]> {
  const normalized = normalizeSemanticTerms(values);
  if (!normalized.length) return [];

  const terms = await prisma.mediaVocabularyTerm.findMany({
    where: { type },
    select: { name: true, aliases: true, isActive: true },
  });

  const byKey = new Map<string, { name: string; isActive: boolean }>();
  for (const term of terms) {
    byKey.set(term.name.toLowerCase(), { name: term.name, isActive: term.isActive });
    for (const alias of term.aliases) {
      byKey.set(alias.trim().toLowerCase(), { name: term.name, isActive: term.isActive });
    }
  }

  const allowInactive = new Set(
    (options?.allowInactiveExisting ?? []).map((t) => t.trim().toLowerCase()),
  );
  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const value of normalized) {
    const key = value.toLowerCase();
    const match = byKey.get(key);
    if (!match) {
      throw new Error(`Thuật ngữ không hợp lệ cho ${type}: ${value}`);
    }
    if (!match.isActive && !allowInactive.has(match.name.toLowerCase()) && !allowInactive.has(key)) {
      throw new Error(`Thuật ngữ đã bị vô hiệu hóa: ${match.name}`);
    }
    const canonKey = match.name.toLowerCase();
    if (seen.has(canonKey)) continue;
    seen.add(canonKey);
    resolved.push(match.name);
  }

  return resolved;
}

export function calculateMediaSeoScore(input: MediaIntelligenceInput): number {
  let score = 0;

  if (input.libraryId) score += 5;
  if (input.roleId) score += 5;
  if (input.visibility === "PUBLIC") score += 3;
  if (input.assetType) score += 2;
  if (hasText(input.title)) score += 10;
  if (hasText(input.altText)) score += 15;
  if (hasText(input.caption)) score += 8;
  if (hasText(input.description)) score += 8;
  if (hasList(input.tags)) score += 5;
  if (hasList(input.keywords)) score += 10;
  if (hasList(input.subjectTerms)) score += 8;
  if (hasList(input.useCaseTerms) || hasList(input.industryTerms)) score += 5;
  if (input.orientation && input.orientation !== "UNKNOWN") score += 2;
  if (input.width && input.height) score += 2;
  if ((input.collectionCount ?? 0) > 0) score += 4;
  if (hasText(input.contentLanguage)) score += 3;
  if (input.visibility === "PUBLIC") score += 2;

  const duplicateUnresolved =
    input.duplicateStatus === "POSSIBLE_DUPLICATE" ||
    (input.duplicateStatus === "CONFIRMED_DUPLICATE" && !input.duplicateOfId);
  if (!duplicateUnresolved) score += 3;

  return Math.min(100, Math.max(0, score));
}

const COMPLETENESS_FIELDS: Array<{
  key: string;
  check: (input: MediaIntelligenceInput) => boolean;
}> = [
  { key: "library", check: (i) => Boolean(i.libraryId) },
  { key: "role", check: (i) => Boolean(i.roleId) },
  { key: "altText", check: (i) => hasText(i.altText) },
  { key: "title", check: (i) => hasText(i.title) },
  { key: "caption", check: (i) => hasText(i.caption) },
  { key: "description", check: (i) => hasText(i.description) },
  { key: "keywords", check: (i) => hasList(i.keywords) },
  { key: "subject", check: (i) => hasList(i.subjectTerms) },
  {
    key: "industryOrUseCase",
    check: (i) => hasList(i.industryTerms) || hasList(i.useCaseTerms),
  },
  { key: "collection", check: (i) => (i.collectionCount ?? 0) > 0 },
  { key: "orientation", check: (i) => Boolean(i.orientation && i.orientation !== "UNKNOWN") },
  { key: "dimensions", check: (i) => Boolean(i.width && i.height) },
];

export function calculateMetadataCompleteness(input: MediaIntelligenceInput): number {
  const filled = COMPLETENESS_FIELDS.filter((f) => f.check(input)).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

export function determineMediaSeoReadiness(seoScore: number): MediaSeoReadinessStatus {
  if (seoScore >= 85) return "EXCELLENT";
  if (seoScore >= 65) return "READY";
  if (seoScore >= 40) return "BASIC";
  return "INCOMPLETE";
}

export function getMissingMediaMetadata(input: MediaIntelligenceInput): string[] {
  return COMPLETENESS_FIELDS.filter((f) => !f.check(input)).map((f) => f.key);
}

export function getMediaIntelligenceStrengths(input: MediaIntelligenceInput): string[] {
  return COMPLETENESS_FIELDS.filter((f) => f.check(input)).map((f) => f.key);
}

export function recalculateMediaIntelligence(input: MediaIntelligenceInput): MediaIntelligenceMetrics {
  const seoScore = calculateMediaSeoScore(input);
  const metadataCompleteness = calculateMetadataCompleteness(input);
  const seoReadinessStatus = determineMediaSeoReadiness(seoScore);
  return {
    seoScore,
    metadataCompleteness,
    seoReadinessStatus,
    missingFields: getMissingMediaMetadata(input),
    strengths: getMediaIntelligenceStrengths(input),
  };
}

export function buildMediaSearchTokens(input: {
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
  description?: string | null;
  tags?: string[];
  keywords?: string[];
  subjectTerms?: string[];
  materialTerms?: string[];
  colorTerms?: string[];
  techniqueTerms?: string[];
  industryTerms?: string[];
  audienceTerms?: string[];
  useCaseTerms?: string[];
}): string[] {
  const buckets = [
    input.title,
    input.altText,
    input.caption,
    input.description,
    ...(input.tags ?? []),
    ...(input.keywords ?? []),
    ...(input.subjectTerms ?? []),
    ...(input.materialTerms ?? []),
    ...(input.colorTerms ?? []),
    ...(input.techniqueTerms ?? []),
    ...(input.industryTerms ?? []),
    ...(input.audienceTerms ?? []),
    ...(input.useCaseTerms ?? []),
  ];
  return normalizeSemanticTerms(
    buckets.flatMap((value) =>
      typeof value === "string"
        ? value
            .toLowerCase()
            .split(/[\s,;/|]+/)
            .filter((t) => t.length >= 2)
        : [],
    ),
  );
}

export function intelligenceInputFromAsset(
  asset: {
    libraryId?: string | null;
    roleId?: string | null;
    visibility?: MediaVisibility | null;
    assetType?: MediaAssetType | null;
    title?: string | null;
    altText?: string | null;
    caption?: string | null;
    description?: string | null;
    tags?: string[] | null;
    keywords?: string[] | null;
    subjectTerms?: string[] | null;
    materialTerms?: string[] | null;
    colorTerms?: string[] | null;
    techniqueTerms?: string[] | null;
    industryTerms?: string[] | null;
    audienceTerms?: string[] | null;
    useCaseTerms?: string[] | null;
    orientation?: MediaOrientation | null;
    width?: number | null;
    height?: number | null;
    contentLanguage?: string | null;
    duplicateStatus?: MediaDuplicateStatus | null;
    duplicateOfId?: string | null;
    _count?: { collections?: number };
    collections?: unknown[];
  },
): MediaIntelligenceInput {
  return {
    libraryId: asset.libraryId,
    roleId: asset.roleId,
    visibility: asset.visibility,
    assetType: asset.assetType,
    title: asset.title,
    altText: asset.altText,
    caption: asset.caption,
    description: asset.description,
    tags: asset.tags ?? [],
    keywords: asset.keywords ?? [],
    subjectTerms: asset.subjectTerms ?? [],
    materialTerms: asset.materialTerms ?? [],
    colorTerms: asset.colorTerms ?? [],
    techniqueTerms: asset.techniqueTerms ?? [],
    industryTerms: asset.industryTerms ?? [],
    audienceTerms: asset.audienceTerms ?? [],
    useCaseTerms: asset.useCaseTerms ?? [],
    orientation: asset.orientation,
    width: asset.width,
    height: asset.height,
    contentLanguage: asset.contentLanguage,
    duplicateStatus: asset.duplicateStatus,
    duplicateOfId: asset.duplicateOfId,
    collectionCount: asset._count?.collections ?? asset.collections?.length ?? 0,
  };
}

export function metricsToPrismaUpdate(
  metrics: MediaIntelligenceMetrics,
): Pick<Prisma.MediaAssetUncheckedUpdateInput, "seoScore" | "metadataCompleteness" | "seoReadinessStatus"> {
  return {
    seoScore: metrics.seoScore,
    metadataCompleteness: metrics.metadataCompleteness,
    seoReadinessStatus: metrics.seoReadinessStatus,
  };
}

export async function recalculateAndPersistMediaIntelligence(assetId: string) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: { _count: { select: { collections: true } } },
  });
  if (!asset) return null;
  const metrics = recalculateMediaIntelligence(intelligenceInputFromAsset(asset));
  return prisma.mediaAsset.update({
    where: { id: assetId },
    data: metricsToPrismaUpdate(metrics),
  });
}

export async function recalculateMediaIntelligenceForIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  let updated = 0;
  for (const id of uniqueIds) {
    const result = await recalculateAndPersistMediaIntelligence(id);
    if (result) updated += 1;
  }
  return updated;
}

export function validateMediaAssetType(value: unknown): MediaAssetType | null {
  if (typeof value !== "string") return null;
  return VALID_ASSET_TYPES.includes(value as MediaAssetType) ? (value as MediaAssetType) : null;
}

export function validateMediaAiProcessingStatus(value: unknown): MediaAiProcessingStatus | null {
  if (typeof value !== "string") return null;
  return VALID_AI_STATUSES.includes(value as MediaAiProcessingStatus)
    ? (value as MediaAiProcessingStatus)
    : null;
}

export function validateMediaSeoReadinessStatus(value: unknown): MediaSeoReadinessStatus | null {
  if (typeof value !== "string") return null;
  return VALID_SEO_READINESS.includes(value as MediaSeoReadinessStatus)
    ? (value as MediaSeoReadinessStatus)
    : null;
}

/** Manual AI status transitions for admin / future worker. No external AI calls. */
export function assertAiStatusTransition(
  from: MediaAiProcessingStatus,
  to: MediaAiProcessingStatus,
): void {
  if (from === to) return;
  const allowed: Record<MediaAiProcessingStatus, MediaAiProcessingStatus[]> = {
    NOT_PROCESSED: ["QUEUED", "SKIPPED"],
    QUEUED: ["PROCESSING", "SKIPPED", "NOT_PROCESSED"],
    PROCESSING: ["COMPLETED", "FAILED", "SKIPPED"],
    COMPLETED: ["QUEUED", "SKIPPED"],
    FAILED: ["QUEUED", "SKIPPED"],
    SKIPPED: ["QUEUED", "NOT_PROCESSED"],
  };
  if (!allowed[from].includes(to)) {
    throw new Error(`Không thể chuyển trạng thái AI từ ${from} sang ${to}`);
  }
}

export async function updateMediaAiProcessingStatus(
  assetId: string,
  status: MediaAiProcessingStatus,
  options?: { error?: string | null; version?: string | null },
) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Không tìm thấy ảnh");
  assertAiStatusTransition(asset.aiProcessingStatus, status);

  const data: Prisma.MediaAssetUpdateInput = {
    aiProcessingStatus: status,
  };
  if (status === "COMPLETED" || status === "FAILED") {
    data.aiProcessedAt = new Date();
  }
  if (status === "FAILED") {
    data.aiProcessingError = options?.error?.trim() || "Xử lý AI thất bại";
  } else if (status === "QUEUED" || status === "PROCESSING" || status === "COMPLETED") {
    data.aiProcessingError = null;
  }
  if (options?.version !== undefined) {
    data.aiMetadataVersion = options.version;
  }

  return prisma.mediaAsset.update({ where: { id: assetId }, data });
}
