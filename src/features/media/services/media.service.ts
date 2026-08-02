import { prisma } from "@/lib/prisma";
import type {
  MediaAiProcessingStatus,
  MediaAssetType,
  MediaCollectionType,
  MediaContentSuitability,
  MediaFolder,
  MediaOrientation,
  MediaSeoReadinessStatus,
  MediaUsageType,
  MediaVisibility,
  ProductionFileType,
  Prisma,
} from "@prisma/client";
import {
  deleteStoredMediaObject,
  requireCloudinaryStorageAdapter,
} from "@/lib/storage";
import { classifyProductionFile } from "@/features/storage/file-classification";
import {
  MAX_IMAGE_SIZE,
  LARGE_IMAGE_WARNING_SIZE,
  MEDIA_TO_STORAGE_FOLDER,
  STORAGE_FOLDER_TO_MEDIA,
  validateImageUpload,
  type StorageFolderKey,
} from "@/lib/storage/types";
import {
  validateProductionFileUpload,
  ERROR_REQUIRES_PRODUCTION_UPLOAD,
} from "@/lib/productionFileValidation";
import { deleteR2Object } from "@/features/storage/r2/r2-production-file.service";
import { MEDIA_LIBRARY_PAGE_SIZE } from "@/components/admin/media/media-library-api";
import {
  deriveMediaOrientation,
  emptyToNull,
  normalizeMediaKeywords,
  normalizeMediaTags,
  resolveDefaultLibraryIdFromLegacyFolder,
  resolveDefaultRoleIdFromLegacyUsage,
  resolveLegacyFolderFromLibraryCode,
  resolveLegacyUsageTypeFromRoleCode,
  validateMediaOrientation,
  validateMediaVisibility,
} from "@/features/media/media-classification";
import {
  calculateMediaContentHash,
  findExactDuplicateByHash,
  clearDuplicateLinksReferencing,
} from "@/features/media/services/media-duplicate.service";
import {
  assertCollectionsForAssignment,
  setMediaAssetCollections,
} from "@/features/media/services/media-collection.service";
import {
  resolveMediaReferences,
  type MediaReference,
} from "@/features/media/services/media-reference.service";
import {
  assertAiStatusTransition,
  intelligenceInputFromAsset,
  mergeSemanticTerms,
  metricsToPrismaUpdate,
  recalculateMediaIntelligence,
  recalculateMediaIntelligenceForIds,
  resolveVocabularyTerms,
  validateMediaAiProcessingStatus,
  validateMediaAssetType,
  validateMediaSeoReadinessStatus,
  type SemanticTermField,
} from "@/features/media/services/media-intelligence.service";
import {
  mergeContentSuitabilities,
  normalizeContentSuitabilities,
  parseContentSuitabilitiesOrThrow,
} from "@/features/media/services/media-content-intelligence.service";
import { validateMediaContentSuitability } from "@/features/media/media-bundle-presets";

export { LARGE_IMAGE_WARNING_SIZE };
export { MEDIA_LIBRARY_PAGE_SIZE };
export { normalizeMediaTags, normalizeMediaKeywords };

export const VALID_MEDIA_STORAGE_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];
export const VALID_MEDIA_USAGE_TYPES: MediaUsageType[] = [
  "PRODUCT",
  "BLOG",
  "KNOWLEDGE_BASE",
  "GENERAL",
];
export const MEDIA_BULK_UPDATE_MAX = 100;

const mediaClassificationInclude = {
  library: { select: { id: true, code: true, name: true, isActive: true } },
  role: { select: { id: true, code: true, name: true, isActive: true } },
  collections: {
    include: {
      mediaCollection: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          color: true,
          collectionType: true,
        },
      },
    },
  },
} satisfies Prisma.MediaAssetInclude;

export type MediaAssetWithClassification = Prisma.MediaAssetGetPayload<{
  include: typeof mediaClassificationInclude;
}>;

export type MediaAssetListFilters = {
  folder?: MediaFolder;
  usageType?: MediaUsageType;
  libraryId?: string;
  libraryCode?: string;
  roleId?: string;
  roleCode?: string;
  collectionId?: string;
  collectionCode?: string;
  collectionType?: MediaCollectionType;
  visibility?: MediaVisibility;
  orientation?: MediaOrientation;
  hasAltText?: boolean;
  hasTitle?: boolean;
  hasKeywords?: boolean;
  hasSubject?: boolean;
  assetType?: MediaAssetType;
  seoReadinessStatus?: MediaSeoReadinessStatus;
  minimumSeoScore?: number;
  aiProcessingStatus?: MediaAiProcessingStatus;
  subject?: string;
  material?: string;
  color?: string;
  technique?: string;
  industry?: string;
  audience?: string;
  useCase?: string;
  duplicateStatus?: string;
  contentSuitability?: MediaContentSuitability;
  search?: string;
  /** Search 2.0 / workflow helpers */
  unusedOnly?: boolean;
  recentlyUploadedDays?: number;
  maximumSeoScore?: number;
  mediaBundleId?: string;
  workflowLane?:
    | "incoming"
    | "waiting_review"
    | "needs_metadata"
    | "ready"
    | "published";
};

export type MediaAssetListPage = {
  items: MediaAssetWithClassification[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
};

export type MediaMetadataUpdateInput = {
  folder?: MediaFolder;
  usageType?: MediaUsageType;
  libraryId?: string | null;
  roleId?: string | null;
  visibility?: MediaVisibility;
  altText?: string | null;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  tags?: string[];
  keywords?: string[];
  aiTags?: string[];
  contentLanguage?: string | null;
  collectionIds?: string[];
  assetType?: MediaAssetType;
  subjectTerms?: string[];
  materialTerms?: string[];
  colorTerms?: string[];
  techniqueTerms?: string[];
  industryTerms?: string[];
  audienceTerms?: string[];
  useCaseTerms?: string[];
  addSubjectTerms?: string[];
  removeSubjectTerms?: string[];
  addMaterialTerms?: string[];
  removeMaterialTerms?: string[];
  addColorTerms?: string[];
  removeColorTerms?: string[];
  addTechniqueTerms?: string[];
  removeTechniqueTerms?: string[];
  addIndustryTerms?: string[];
  removeIndustryTerms?: string[];
  addAudienceTerms?: string[];
  removeAudienceTerms?: string[];
  addUseCaseTerms?: string[];
  removeUseCaseTerms?: string[];
  contentSuitabilities?: MediaContentSuitability[];
  addContentSuitabilities?: MediaContentSuitability[];
  removeContentSuitabilities?: MediaContentSuitability[];
  aiProcessingStatus?: MediaAiProcessingStatus;
  mergeSemanticIntoExisting?: boolean;
};

function buildMediaAssetWhere(filters: MediaAssetListFilters): Prisma.MediaAssetWhereInput {
  const where: Prisma.MediaAssetWhereInput = {
    ...(filters.folder ? { folder: filters.folder } : {}),
    ...(filters.usageType ? { usageType: filters.usageType } : {}),
    ...(filters.libraryId ? { libraryId: filters.libraryId } : {}),
    ...(filters.libraryCode
      ? { library: { code: filters.libraryCode.toUpperCase() } }
      : {}),
    ...(filters.roleId ? { roleId: filters.roleId } : {}),
    ...(filters.roleCode ? { role: { code: filters.roleCode.toUpperCase() } } : {}),
    ...(filters.collectionId
      ? { collections: { some: { mediaCollectionId: filters.collectionId } } }
      : {}),
    ...(filters.collectionCode
      ? {
          collections: {
            some: { mediaCollection: { code: filters.collectionCode.toUpperCase() } },
          },
        }
      : {}),
    ...(filters.collectionType
      ? {
          collections: {
            some: { mediaCollection: { collectionType: filters.collectionType } },
          },
        }
      : {}),
    ...(filters.visibility ? { visibility: filters.visibility } : {}),
    ...(filters.orientation ? { orientation: filters.orientation } : {}),
    ...(filters.assetType ? { assetType: filters.assetType } : {}),
    ...(filters.seoReadinessStatus ? { seoReadinessStatus: filters.seoReadinessStatus } : {}),
    ...(typeof filters.minimumSeoScore === "number"
      ? { seoScore: { gte: filters.minimumSeoScore } }
      : {}),
    ...(filters.aiProcessingStatus ? { aiProcessingStatus: filters.aiProcessingStatus } : {}),
    ...(filters.subject ? { subjectTerms: { has: filters.subject } } : {}),
    ...(filters.material ? { materialTerms: { has: filters.material } } : {}),
    ...(filters.color ? { colorTerms: { has: filters.color } } : {}),
    ...(filters.technique ? { techniqueTerms: { has: filters.technique } } : {}),
    ...(filters.industry ? { industryTerms: { has: filters.industry } } : {}),
    ...(filters.audience ? { audienceTerms: { has: filters.audience } } : {}),
    ...(filters.useCase ? { useCaseTerms: { has: filters.useCase } } : {}),
    ...(filters.contentSuitability
      ? { contentSuitabilities: { has: filters.contentSuitability } }
      : {}),
    ...(filters.duplicateStatus
      ? { duplicateStatus: filters.duplicateStatus as Prisma.EnumMediaDuplicateStatusFilter["equals"] }
      : {}),
  };

  const andClauses: Prisma.MediaAssetWhereInput[] = [];

  if (filters.hasAltText === true) {
    andClauses.push({ altText: { not: null } }, { NOT: { altText: "" } });
  } else if (filters.hasAltText === false) {
    andClauses.push({ OR: [{ altText: null }, { altText: "" }] });
  }

  if (filters.hasTitle === true) {
    andClauses.push({ title: { not: null } }, { NOT: { title: "" } });
  } else if (filters.hasTitle === false) {
    andClauses.push({ OR: [{ title: null }, { title: "" }] });
  }

  if (filters.hasKeywords === true) {
    andClauses.push({ NOT: { keywords: { equals: [] } } });
  } else if (filters.hasKeywords === false) {
    andClauses.push({ keywords: { equals: [] } });
  }

  if (filters.hasSubject === true) {
    andClauses.push({ NOT: { subjectTerms: { equals: [] } } });
  } else if (filters.hasSubject === false) {
    andClauses.push({ subjectTerms: { equals: [] } });
  }

  if (filters.unusedOnly) {
    andClauses.push({
      contentMediaAssignments: { none: {} },
      bundleSlotAssets: { none: {} },
    });
  }

  if (typeof filters.maximumSeoScore === "number") {
    andClauses.push({ seoScore: { lte: filters.maximumSeoScore } });
  }

  if (typeof filters.recentlyUploadedDays === "number" && filters.recentlyUploadedDays > 0) {
    andClauses.push({
      createdAt: {
        gte: new Date(Date.now() - filters.recentlyUploadedDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  if (filters.mediaBundleId) {
    andClauses.push({
      bundleSlotAssets: {
        some: { mediaBundleSlot: { mediaBundleId: filters.mediaBundleId } },
      },
    });
  }

  if (filters.workflowLane) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    switch (filters.workflowLane) {
      case "incoming":
        andClauses.push({
          createdAt: { gte: sevenDaysAgo },
          aiProcessingStatus: { in: ["QUEUED", "PROCESSING", "NOT_PROCESSED"] },
        });
        break;
      case "waiting_review":
        andClauses.push({
          aiProcessingStatus: "COMPLETED",
          seoReadinessStatus: { in: ["INCOMPLETE", "BASIC"] },
        });
        break;
      case "needs_metadata":
        andClauses.push({
          OR: [{ altText: null }, { altText: "" }, { title: null }, { title: "" }],
        });
        break;
      case "ready":
        andClauses.push({
          visibility: { in: ["PUBLIC", "INTERNAL"] },
          seoReadinessStatus: { in: ["READY", "EXCELLENT"] },
          aiProcessingStatus: { notIn: ["QUEUED", "PROCESSING"] },
        });
        break;
      case "published":
        andClauses.push({
          visibility: "PUBLIC",
          seoReadinessStatus: { in: ["READY", "EXCELLENT"] },
        });
        break;
    }
  }

  if (filters.search) {
    andClauses.push({
      OR: [
        { filename: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
        { originalName: { contains: filters.search, mode: "insensitive" } },
        { altText: { contains: filters.search, mode: "insensitive" } },
        { caption: { contains: filters.search, mode: "insensitive" } },
        { subjectTerms: { has: filters.search } },
        { keywords: { has: filters.search } },
        { tags: { has: filters.search } },
      ],
    });
  }

  if (andClauses.length) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), ...andClauses];
  }

  return where;
}

export async function listMediaAssets(
  options?: MediaAssetListFilters & { limit?: number },
): Promise<MediaAssetWithClassification[]> {
  try {
    return await prisma.mediaAsset.findMany({
      where: buildMediaAssetWhere(options ?? {}),
      include: mediaClassificationInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options?.limit ?? 200,
    });
  } catch (err) {
    console.error("[media.service] listMediaAssets failed:", err);
    return [];
  }
}

export async function listMediaAssetsPage(
  options?: MediaAssetListFilters & {
    limit?: number;
    cursor?: string;
  },
): Promise<MediaAssetListPage> {
  const limit = options?.limit ?? MEDIA_LIBRARY_PAGE_SIZE;
  const where = buildMediaAssetWhere(options ?? {});

  try {
    const [total, rows] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        include: mediaClassificationInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(options?.cursor
          ? {
              cursor: { id: options.cursor },
              skip: 1,
            }
          : {}),
      }),
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return { items, nextCursor, hasMore, total };
  } catch (err) {
    console.error("[media.service] listMediaAssetsPage failed:", err);
    return { items: [], nextCursor: null, hasMore: false, total: 0 };
  }
}

export async function getMediaAssetById(id: string) {
  return prisma.mediaAsset.findUnique({
    where: { id },
    include: mediaClassificationInclude,
  });
}

export type UploadMediaInput = {
  folder: StorageFolderKey;
  file: File;
  altText?: string;
  title?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  keywords?: string[];
  usageType?: MediaUsageType;
  libraryId?: string;
  roleId?: string;
  visibility?: MediaVisibility;
  contentLanguage?: string;
  collectionIds?: string[];
  forceDuplicateUpload?: boolean;
  mergeSemanticIntoExisting?: boolean;
  assetType?: MediaAssetType;
  subjectTerms?: string[];
  materialTerms?: string[];
  colorTerms?: string[];
  techniqueTerms?: string[];
  industryTerms?: string[];
  audienceTerms?: string[];
  useCaseTerms?: string[];
  contentSuitabilities?: MediaContentSuitability[];
};

export type UploadMediaResult = {
  asset: MediaAssetWithClassification;
  warning?: string;
  reused?: boolean;
  duplicateOfId?: string | null;
};

export class MediaDuplicateUploadError extends Error {
  readonly exactDuplicate: Awaited<ReturnType<typeof findExactDuplicateByHash>>;
  readonly contentHash: string;

  constructor(
    exactDuplicate: NonNullable<Awaited<ReturnType<typeof findExactDuplicateByHash>>>,
    contentHash: string,
  ) {
    super("Ảnh trùng nội dung đã tồn tại trong thư viện");
    this.name = "MediaDuplicateUploadError";
    this.exactDuplicate = exactDuplicate;
    this.contentHash = contentHash;
  }
}

function assertNotR2SourceFile(filename: string, mimeType: string, sizeBytes: number): void {
  const classification = classifyProductionFile({
    filename,
    mimeType,
    fileSizeBytes: sizeBytes,
  });
  if (classification.storageProvider === "CLOUDFLARE_R2") {
    throw new Error(ERROR_REQUIRES_PRODUCTION_UPLOAD);
  }
}

async function resolveLibraryForWrite(
  libraryId: string | null | undefined,
  requireActive: boolean,
): Promise<{ id: string; code: string } | null> {
  if (!libraryId) return null;
  const library = await prisma.mediaLibrary.findUnique({ where: { id: libraryId } });
  if (!library) throw new Error("Thư viện ảnh không tồn tại");
  if (requireActive && !library.isActive) throw new Error("Thư viện ảnh đã bị vô hiệu hóa");
  return { id: library.id, code: library.code };
}

async function resolveRoleForWrite(
  roleId: string | null | undefined,
  requireActive: boolean,
): Promise<{ id: string; code: string } | null> {
  if (!roleId) return null;
  const role = await prisma.mediaRole.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Vai trò hiển thị không tồn tại");
  if (requireActive && !role.isActive) throw new Error("Vai trò hiển thị đã bị vô hiệu hóa");
  return { id: role.id, code: role.code };
}

export async function uploadMediaAsset(input: UploadMediaInput): Promise<UploadMediaResult> {
  const {
    folder,
    file,
    altText,
    title,
    caption,
    description,
    tags,
    keywords,
    usageType,
    libraryId,
    roleId,
    visibility,
    contentLanguage,
    collectionIds,
    forceDuplicateUpload,
    mergeSemanticIntoExisting,
    assetType,
    subjectTerms,
    materialTerms,
    colorTerms,
    techniqueTerms,
    industryTerms,
    audienceTerms,
    useCaseTerms,
    contentSuitabilities,
  } = input;

  assertNotR2SourceFile(file.name, file.type, file.size);

  const validation = validateImageUpload({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    maxSizeBytes: MAX_IMAGE_SIZE,
  });

  if ("error" in validation) {
    throw new Error(validation.error);
  }

  const mimeType = validation.mimeType;
  const warning =
    file.size > LARGE_IMAGE_WARNING_SIZE
      ? `Ảnh này lớn hơn 500KB (${(file.size / 1024).toFixed(0)}KB), nên tối ưu trước khi upload để website tải nhanh hơn.`
      : undefined;

  const mediaFolder = STORAGE_FOLDER_TO_MEDIA[folder];
  const mediaUsage = usageType ?? "GENERAL";

  const library =
    (await resolveLibraryForWrite(libraryId, true)) ??
    { id: resolveDefaultLibraryIdFromLegacyFolder(mediaFolder), code: "PRODUCT" };
  const role =
    (await resolveRoleForWrite(roleId, true)) ??
    { id: resolveDefaultRoleIdFromLegacyUsage(mediaUsage), code: "GENERAL" };

  const libraryRow = await prisma.mediaLibrary.findUnique({ where: { id: library.id } });
  const roleRow = await prisma.mediaRole.findUnique({ where: { id: role.id } });
  const libraryCode = libraryRow?.code ?? "GENERAL";
  const roleCode = roleRow?.code ?? "GENERAL";

  const validatedCollectionIds = collectionIds?.length
    ? await assertCollectionsForAssignment(collectionIds, { requireActive: true })
    : [];

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = calculateMediaContentHash(buffer);
  const exactDuplicate = await findExactDuplicateByHash(contentHash);

  if (exactDuplicate && !forceDuplicateUpload) {
    throw new MediaDuplicateUploadError(exactDuplicate, contentHash);
  }

  if (exactDuplicate && forceDuplicateUpload && mergeSemanticIntoExisting) {
    const existing = await prisma.mediaAsset.findUnique({
      where: { id: exactDuplicate.id },
      include: mediaClassificationInclude,
    });
    if (existing) {
      await updateMediaAsset(existing.id, {
        addSubjectTerms: subjectTerms,
        addMaterialTerms: materialTerms,
        addColorTerms: colorTerms,
        addTechniqueTerms: techniqueTerms,
        addIndustryTerms: industryTerms,
        addAudienceTerms: audienceTerms,
        addUseCaseTerms: useCaseTerms,
        collectionIds: collectionIds?.length
          ? [
              ...existing.collections.map((c) => c.mediaCollection.id),
              ...collectionIds,
            ]
          : undefined,
        altText: altText || undefined,
        title: title || undefined,
        tags: tags?.length ? [...existing.tags, ...tags] : undefined,
        keywords: keywords?.length ? [...existing.keywords, ...keywords] : undefined,
      });
      const refreshed = await prisma.mediaAsset.findUnique({
        where: { id: existing.id },
        include: mediaClassificationInclude,
      });
      return {
        asset: refreshed!,
        warning,
        reused: true,
        duplicateOfId: existing.id,
      };
    }
  }

  const resolvedAssetType = validateMediaAssetType(assetType) ?? "PHOTO";
  const resolvedSubjects = subjectTerms?.length
    ? await resolveVocabularyTerms("SUBJECT", subjectTerms)
    : [];
  const resolvedMaterials = materialTerms?.length
    ? await resolveVocabularyTerms("MATERIAL", materialTerms)
    : [];
  const resolvedColors = colorTerms?.length
    ? await resolveVocabularyTerms("COLOR", colorTerms)
    : [];
  const resolvedTechniques = techniqueTerms?.length
    ? await resolveVocabularyTerms("TECHNIQUE", techniqueTerms)
    : [];
  const resolvedIndustries = industryTerms?.length
    ? await resolveVocabularyTerms("INDUSTRY", industryTerms)
    : [];
  const resolvedAudiences = audienceTerms?.length
    ? await resolveVocabularyTerms("AUDIENCE", audienceTerms)
    : [];
  const resolvedUseCases = useCaseTerms?.length
    ? await resolveVocabularyTerms("USE_CASE", useCaseTerms)
    : [];
  const resolvedSuitabilities = normalizeContentSuitabilities(contentSuitabilities);

  const storage = requireCloudinaryStorageAdapter();
  const result = await storage.upload(folder, file.name, buffer, mimeType);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const width = result.width ?? null;
  const height = result.height ?? null;

  try {
    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          filename: file.name,
          originalName: file.name,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl ?? null,
          storageKey: result.storageKey,
          storageProvider: "CLOUDINARY",
          publicId: result.publicId ?? null,
          mimeType,
          format: ext || null,
          sizeBytes: file.size,
          width,
          height,
          folder: libraryId ? resolveLegacyFolderFromLibraryCode(libraryCode) : mediaFolder,
          usageType: roleId ? resolveLegacyUsageTypeFromRoleCode(roleCode) : mediaUsage,
          libraryId: library.id,
          roleId: role.id,
          visibility: visibility ?? "PUBLIC",
          altText: emptyToNull(altText),
          title: emptyToNull(title),
          caption: emptyToNull(caption),
          description: emptyToNull(description),
          tags: normalizeMediaTags(tags ?? []),
          keywords: normalizeMediaKeywords(keywords ?? []),
          orientation: deriveMediaOrientation(width, height),
          contentLanguage: emptyToNull(contentLanguage),
          contentHash,
          duplicateStatus: exactDuplicate ? "CONFIRMED_DUPLICATE" : "UNIQUE",
          duplicateOfId: exactDuplicate?.id ?? null,
          assetType: resolvedAssetType,
          subjectTerms: resolvedSubjects,
          materialTerms: resolvedMaterials,
          colorTerms: resolvedColors,
          techniqueTerms: resolvedTechniques,
          industryTerms: resolvedIndustries,
          audienceTerms: resolvedAudiences,
          useCaseTerms: resolvedUseCases,
          contentSuitabilities: resolvedSuitabilities,
          ...(validatedCollectionIds.length
            ? {
                collections: {
                  create: validatedCollectionIds.map((mediaCollectionId) => ({
                    mediaCollectionId,
                  })),
                },
              }
            : {}),
        },
        include: mediaClassificationInclude,
      });
      const metrics = recalculateMediaIntelligence(
        intelligenceInputFromAsset({
          ...created,
          _count: { collections: validatedCollectionIds.length },
        }),
      );
      return tx.mediaAsset.update({
        where: { id: created.id },
        data: metricsToPrismaUpdate(metrics),
        include: mediaClassificationInclude,
      });
    });
    // Fire ingest pipeline after commit. Failures leave FAILED status — never fail the upload.
    try {
      const { runMediaIngestPipeline } = await import(
        "@/features/media/intelligence/ingest-pipeline.service"
      );
      await runMediaIngestPipeline(asset.id);
      const refreshed = await prisma.mediaAsset.findUnique({
        where: { id: asset.id },
        include: mediaClassificationInclude,
      });
      return {
        asset: refreshed ?? asset,
        warning,
        duplicateOfId: exactDuplicate?.id ?? null,
      };
    } catch (ingestError) {
      console.error("[media] ingest pipeline failed:", ingestError);
      return {
        asset,
        warning,
        duplicateOfId: exactDuplicate?.id ?? null,
      };
    }
  } catch (err) {
    await storage.delete(result.url, result.storageKey);
    const detail = err instanceof Error ? err.message : String(err);
    if (detail.includes("MediaAsset") || detail.includes("does not exist") || detail.includes("P2021")) {
      throw new Error("CMS tables chưa sẵn sàng — xem bảng chẩn đoán trên trang Media Library");
    }
    throw err;
  }
}

export async function uploadProductionFileAsset(input: {
  file: File;
  title?: string;
  tags?: string[];
  productionFileType?: ProductionFileType;
}): Promise<UploadMediaResult> {
  const { file, title, tags, productionFileType } = input;
  const validation = validateProductionFileUpload({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    productionFileType,
  });
  if ("error" in validation) {
    throw new Error(validation.error);
  }
  if (validation.storageProvider === "CLOUDFLARE_R2") {
    throw new Error(ERROR_REQUIRES_PRODUCTION_UPLOAD);
  }

  const mimeType = validation.mimeType;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = requireCloudinaryStorageAdapter();
  const result = await storage.upload("general", file.name, buffer, mimeType);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const width = result.width ?? null;
  const height = result.height ?? null;

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: file.name,
        originalName: file.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl ?? null,
        storageKey: result.storageKey,
        storageProvider: "CLOUDINARY",
        publicId: result.publicId ?? null,
        mimeType,
        format: ext || null,
        sizeBytes: file.size,
        width,
        height,
        folder: "GENERAL",
        usageType: "GENERAL",
        libraryId: resolveDefaultLibraryIdFromLegacyFolder("GENERAL"),
        roleId: resolveDefaultRoleIdFromLegacyUsage("GENERAL"),
        visibility: "PUBLIC",
        title: emptyToNull(title),
        tags: normalizeMediaTags(tags ?? []),
        orientation: deriveMediaOrientation(width, height),
      },
      include: mediaClassificationInclude,
    });
    return { asset };
  } catch (err) {
    await storage.delete(result.url, result.storageKey);
    throw err;
  }
}

/**
 * Builds Prisma update data for metadata only.
 * Never includes url, storageKey, publicId, filename, dimensions, mimeType, or sizeBytes.
 */
export async function buildMetadataUpdateData(
  data: MediaMetadataUpdateInput,
  options?: {
    requireActiveClassification?: boolean;
    existing?: {
      subjectTerms?: string[];
      materialTerms?: string[];
      colorTerms?: string[];
      techniqueTerms?: string[];
      industryTerms?: string[];
      audienceTerms?: string[];
      useCaseTerms?: string[];
      contentSuitabilities?: MediaContentSuitability[];
      aiProcessingStatus?: MediaAiProcessingStatus;
    };
  },
): Promise<Prisma.MediaAssetUncheckedUpdateManyInput> {
  const requireActive = options?.requireActiveClassification ?? true;
  const existing = options?.existing;
  const updateData: Prisma.MediaAssetUncheckedUpdateManyInput = {};

  let folder = data.folder;
  let usageType = data.usageType;
  let libraryId = data.libraryId;
  let roleId = data.roleId;

  if (libraryId !== undefined && libraryId !== null) {
    const library = await resolveLibraryForWrite(libraryId, requireActive);
    if (!library) throw new Error("Thư viện ảnh không tồn tại");
    libraryId = library.id;
    folder = resolveLegacyFolderFromLibraryCode(library.code);
  } else if (libraryId === null) {
    // explicit clear not supported for required-ish taxonomy; ignore
  }

  if (roleId !== undefined && roleId !== null) {
    const role = await resolveRoleForWrite(roleId, requireActive);
    if (!role) throw new Error("Vai trò hiển thị không tồn tại");
    roleId = role.id;
    usageType = resolveLegacyUsageTypeFromRoleCode(role.code);
  }

  if (folder !== undefined && data.libraryId === undefined) {
    libraryId = resolveDefaultLibraryIdFromLegacyFolder(folder);
  }

  if (usageType !== undefined && data.roleId === undefined) {
    roleId = resolveDefaultRoleIdFromLegacyUsage(usageType);
  }

  if (folder !== undefined) updateData.folder = folder;
  if (usageType !== undefined) updateData.usageType = usageType;
  if (libraryId !== undefined && libraryId !== null) updateData.libraryId = libraryId;
  if (roleId !== undefined && roleId !== null) updateData.roleId = roleId;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;
  if (data.altText !== undefined) updateData.altText = emptyToNull(data.altText);
  if (data.title !== undefined) updateData.title = emptyToNull(data.title);
  if (data.caption !== undefined) updateData.caption = emptyToNull(data.caption);
  if (data.description !== undefined) updateData.description = emptyToNull(data.description);
  if (data.tags !== undefined) updateData.tags = normalizeMediaTags(data.tags);
  if (data.keywords !== undefined) updateData.keywords = normalizeMediaKeywords(data.keywords);
  if (data.aiTags !== undefined) updateData.aiTags = normalizeMediaTags(data.aiTags);
  if (data.contentLanguage !== undefined) {
    updateData.contentLanguage = emptyToNull(data.contentLanguage);
  }

  if (data.assetType !== undefined) {
    const assetType = validateMediaAssetType(data.assetType);
    if (!assetType) throw new Error("Loại tài sản không hợp lệ");
    updateData.assetType = assetType;
  }

  async function resolveReplaceOrMerge(
    field: SemanticTermField,
    vocabType: Parameters<typeof resolveVocabularyTerms>[0],
    replace?: string[],
    add?: string[],
    remove?: string[],
  ) {
    if (replace === undefined && add === undefined && remove === undefined) return;
    const current = existing?.[field] ?? [];
    const nextBase =
      replace !== undefined
        ? replace
        : mergeSemanticTerms(current, add, remove);
    const resolved = await resolveVocabularyTerms(vocabType, nextBase, {
      allowInactiveExisting: current,
    });
    updateData[field] = resolved;
  }

  await resolveReplaceOrMerge(
    "subjectTerms",
    "SUBJECT",
    data.subjectTerms,
    data.addSubjectTerms,
    data.removeSubjectTerms,
  );
  await resolveReplaceOrMerge(
    "materialTerms",
    "MATERIAL",
    data.materialTerms,
    data.addMaterialTerms,
    data.removeMaterialTerms,
  );
  await resolveReplaceOrMerge(
    "colorTerms",
    "COLOR",
    data.colorTerms,
    data.addColorTerms,
    data.removeColorTerms,
  );
  await resolveReplaceOrMerge(
    "techniqueTerms",
    "TECHNIQUE",
    data.techniqueTerms,
    data.addTechniqueTerms,
    data.removeTechniqueTerms,
  );
  await resolveReplaceOrMerge(
    "industryTerms",
    "INDUSTRY",
    data.industryTerms,
    data.addIndustryTerms,
    data.removeIndustryTerms,
  );
  await resolveReplaceOrMerge(
    "audienceTerms",
    "AUDIENCE",
    data.audienceTerms,
    data.addAudienceTerms,
    data.removeAudienceTerms,
  );
  await resolveReplaceOrMerge(
    "useCaseTerms",
    "USE_CASE",
    data.useCaseTerms,
    data.addUseCaseTerms,
    data.removeUseCaseTerms,
  );

  if (
    data.contentSuitabilities !== undefined ||
    data.addContentSuitabilities !== undefined ||
    data.removeContentSuitabilities !== undefined
  ) {
    const current = existing?.contentSuitabilities ?? [];
    const next =
      data.contentSuitabilities !== undefined
        ? normalizeContentSuitabilities(data.contentSuitabilities)
        : mergeContentSuitabilities(
            current,
            data.addContentSuitabilities,
            data.removeContentSuitabilities,
          );
    updateData.contentSuitabilities = next;
  }

  if (data.aiProcessingStatus !== undefined) {
    const status = validateMediaAiProcessingStatus(data.aiProcessingStatus);
    if (!status) throw new Error("Trạng thái xử lý AI không hợp lệ");
    if (existing?.aiProcessingStatus) {
      assertAiStatusTransition(existing.aiProcessingStatus, status);
    }
    updateData.aiProcessingStatus = status;
    if (status === "FAILED" || status === "COMPLETED") {
      updateData.aiProcessedAt = new Date();
    }
    if (status === "QUEUED" || status === "PROCESSING" || status === "COMPLETED") {
      updateData.aiProcessingError = null;
    }
  }

  return updateData;
}

export function parseStorageFolderKey(value: unknown): StorageFolderKey | null {
  if (typeof value !== "string") return null;
  return VALID_MEDIA_STORAGE_FOLDERS.includes(value as StorageFolderKey)
    ? (value as StorageFolderKey)
    : null;
}

export function parseMediaUsageType(value: unknown): MediaUsageType | null {
  if (typeof value !== "string") return null;
  return VALID_MEDIA_USAGE_TYPES.includes(value as MediaUsageType)
    ? (value as MediaUsageType)
    : null;
}

export function parseMediaMetadataPatchBody(
  raw: Record<string, unknown>,
): { ok: true; data: MediaMetadataUpdateInput; hasUpdates: boolean } | { ok: false; message: string } {
  const data: MediaMetadataUpdateInput = {};
  let hasUpdates = false;

  if ("folder" in raw) {
    hasUpdates = true;
    const folderKey = parseStorageFolderKey(raw.folder);
    if (!folderKey) return { ok: false, message: "Phân loại thư mục không hợp lệ" };
    data.folder = STORAGE_FOLDER_TO_MEDIA[folderKey];
  }

  if ("usageType" in raw) {
    hasUpdates = true;
    const usage = parseMediaUsageType(raw.usageType);
    if (!usage) return { ok: false, message: "Loại sử dụng ảnh không hợp lệ" };
    data.usageType = usage;
  }

  if ("libraryId" in raw) {
    hasUpdates = true;
    if (raw.libraryId !== null && typeof raw.libraryId !== "string") {
      return { ok: false, message: "Thư viện ảnh không hợp lệ" };
    }
    data.libraryId = raw.libraryId as string | null;
  }

  if ("roleId" in raw) {
    hasUpdates = true;
    if (raw.roleId !== null && typeof raw.roleId !== "string") {
      return { ok: false, message: "Vai trò hiển thị không hợp lệ" };
    }
    data.roleId = raw.roleId as string | null;
  }

  if ("visibility" in raw) {
    hasUpdates = true;
    const visibility = validateMediaVisibility(raw.visibility);
    if (!visibility) return { ok: false, message: "Mức độ hiển thị không hợp lệ" };
    data.visibility = visibility;
  }

  if ("altText" in raw) {
    hasUpdates = true;
    if (raw.altText !== null && typeof raw.altText !== "string") {
      return { ok: false, message: "Alt text không hợp lệ" };
    }
    data.altText = raw.altText as string | null;
  }

  if ("title" in raw) {
    hasUpdates = true;
    if (raw.title !== null && typeof raw.title !== "string") {
      return { ok: false, message: "Tiêu đề ảnh không hợp lệ" };
    }
    data.title = raw.title as string | null;
  }

  if ("caption" in raw) {
    hasUpdates = true;
    if (raw.caption !== null && typeof raw.caption !== "string") {
      return { ok: false, message: "Chú thích không hợp lệ" };
    }
    data.caption = raw.caption as string | null;
  }

  if ("description" in raw) {
    hasUpdates = true;
    if (raw.description !== null && typeof raw.description !== "string") {
      return { ok: false, message: "Mô tả không hợp lệ" };
    }
    data.description = raw.description as string | null;
  }

  if ("tags" in raw) {
    hasUpdates = true;
    if (!Array.isArray(raw.tags) || !raw.tags.every((tag) => typeof tag === "string")) {
      return { ok: false, message: "Tags không hợp lệ" };
    }
    data.tags = raw.tags;
  }

  if ("keywords" in raw) {
    hasUpdates = true;
    if (!Array.isArray(raw.keywords) || !raw.keywords.every((k) => typeof k === "string")) {
      return { ok: false, message: "Từ khóa SEO không hợp lệ" };
    }
    data.keywords = raw.keywords;
  }

  if ("aiTags" in raw) {
    hasUpdates = true;
    if (!Array.isArray(raw.aiTags) || !raw.aiTags.every((t) => typeof t === "string")) {
      return { ok: false, message: "AI tags không hợp lệ" };
    }
    data.aiTags = raw.aiTags;
  }

  if ("contentLanguage" in raw) {
    hasUpdates = true;
    if (raw.contentLanguage !== null && typeof raw.contentLanguage !== "string") {
      return { ok: false, message: "Ngôn ngữ nội dung không hợp lệ" };
    }
    data.contentLanguage = raw.contentLanguage as string | null;
  }

  if ("collectionIds" in raw) {
    hasUpdates = true;
    if (
      !Array.isArray(raw.collectionIds) ||
      !raw.collectionIds.every((id) => typeof id === "string")
    ) {
      return { ok: false, message: "Danh sách bộ sưu tập không hợp lệ" };
    }
    data.collectionIds = raw.collectionIds;
  }

  if ("assetType" in raw) {
    hasUpdates = true;
    const assetType = validateMediaAssetType(raw.assetType);
    if (!assetType) return { ok: false, message: "Loại tài sản không hợp lệ" };
    data.assetType = assetType;
  }

  const parseStringArray = (
    key: string,
    target: keyof MediaMetadataUpdateInput,
    message: string,
  ): { ok: false; message: string } | null => {
    if (!(key in raw)) return null;
    hasUpdates = true;
    const value = raw[key];
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
      return { ok: false, message };
    }
    (data as Record<string, unknown>)[target] = value;
    return null;
  };

  for (const [key, message] of [
    ["subjectTerms", "Chủ thể không hợp lệ"],
    ["materialTerms", "Chất liệu không hợp lệ"],
    ["colorTerms", "Màu sắc không hợp lệ"],
    ["techniqueTerms", "Kỹ thuật không hợp lệ"],
    ["industryTerms", "Ngành nghề không hợp lệ"],
    ["audienceTerms", "Đối tượng không hợp lệ"],
    ["useCaseTerms", "Mục đích sử dụng không hợp lệ"],
    ["addSubjectTerms", "Chủ thể thêm không hợp lệ"],
    ["removeSubjectTerms", "Chủ thể gỡ không hợp lệ"],
    ["addMaterialTerms", "Chất liệu thêm không hợp lệ"],
    ["removeMaterialTerms", "Chất liệu gỡ không hợp lệ"],
    ["addColorTerms", "Màu sắc thêm không hợp lệ"],
    ["removeColorTerms", "Màu sắc gỡ không hợp lệ"],
    ["addTechniqueTerms", "Kỹ thuật thêm không hợp lệ"],
    ["removeTechniqueTerms", "Kỹ thuật gỡ không hợp lệ"],
    ["addIndustryTerms", "Ngành nghề thêm không hợp lệ"],
    ["removeIndustryTerms", "Ngành nghề gỡ không hợp lệ"],
    ["addAudienceTerms", "Đối tượng thêm không hợp lệ"],
    ["removeAudienceTerms", "Đối tượng gỡ không hợp lệ"],
    ["addUseCaseTerms", "Mục đích thêm không hợp lệ"],
    ["removeUseCaseTerms", "Mục đích gỡ không hợp lệ"],
  ] as const) {
    const err = parseStringArray(key, key, message);
    if (err) return err;
  }

  if ("contentSuitabilities" in raw) {
    hasUpdates = true;
    try {
      data.contentSuitabilities = parseContentSuitabilitiesOrThrow(raw.contentSuitabilities);
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Phù hợp nội dung không hợp lệ",
      };
    }
  }

  if ("addContentSuitabilities" in raw) {
    hasUpdates = true;
    try {
      data.addContentSuitabilities = parseContentSuitabilitiesOrThrow(
        raw.addContentSuitabilities,
      );
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Phù hợp nội dung thêm không hợp lệ",
      };
    }
  }

  if ("removeContentSuitabilities" in raw) {
    hasUpdates = true;
    try {
      data.removeContentSuitabilities = parseContentSuitabilitiesOrThrow(
        raw.removeContentSuitabilities,
      );
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Phù hợp nội dung gỡ không hợp lệ",
      };
    }
  }

  if ("aiProcessingStatus" in raw) {
    hasUpdates = true;
    const status = validateMediaAiProcessingStatus(raw.aiProcessingStatus);
    if (!status) return { ok: false, message: "Trạng thái xử lý AI không hợp lệ" };
    data.aiProcessingStatus = status;
  }

  if ("orientation" in raw) {
    const orientation = validateMediaOrientation(raw.orientation);
    if (!orientation) return { ok: false, message: "Hướng ảnh không hợp lệ" };
  }

  return { ok: true, data, hasUpdates };
}

export async function updateMediaAsset(id: string, data: MediaMetadataUpdateInput) {
  const existing = await prisma.mediaAsset.findUnique({
    where: { id },
    include: { _count: { select: { collections: true } } },
  });
  if (!existing) return null;

  const { collectionIds, mergeSemanticIntoExisting: _merge, ...metadata } = data;
  void _merge;
  const updateData = await buildMetadataUpdateData(metadata, {
    existing: {
      subjectTerms: existing.subjectTerms,
      materialTerms: existing.materialTerms,
      colorTerms: existing.colorTerms,
      techniqueTerms: existing.techniqueTerms,
      industryTerms: existing.industryTerms,
      audienceTerms: existing.audienceTerms,
      useCaseTerms: existing.useCaseTerms,
      contentSuitabilities: existing.contentSuitabilities,
      aiProcessingStatus: existing.aiProcessingStatus,
    },
  });

  if (Object.keys(updateData).length) {
    await prisma.mediaAsset.update({
      where: { id },
      data: updateData,
    });
  }

  if (collectionIds !== undefined) {
    await setMediaAssetCollections(id, collectionIds);
  }

  await recalculateMediaIntelligenceForIds([id]);

  return prisma.mediaAsset.findUnique({
    where: { id },
    include: mediaClassificationInclude,
  });
}

export async function bulkUpdateMediaAssets(ids: string[], data: MediaMetadataUpdateInput) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length > MEDIA_BULK_UPDATE_MAX) {
    throw new Error(`Chỉ có thể cập nhật tối đa ${MEDIA_BULK_UPDATE_MAX} ảnh mỗi lần`);
  }

  const { collectionIds: _collectionIds, ...metadata } = data;
  void _collectionIds;

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      subjectTerms: true,
      materialTerms: true,
      colorTerms: true,
      techniqueTerms: true,
      industryTerms: true,
      audienceTerms: true,
      useCaseTerms: true,
      contentSuitabilities: true,
      aiProcessingStatus: true,
    },
  });

  let updated = 0;
  for (const asset of assets) {
    const updateData = await buildMetadataUpdateData(metadata, {
      existing: asset,
    });
    if (!Object.keys(updateData).length) continue;
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: updateData,
    });
    updated += 1;
  }

  if (updated) {
    await recalculateMediaIntelligenceForIds(assets.map((a) => a.id));
  }

  return updated;
}

export class MediaAssetInUseError extends Error {
  readonly references: MediaReference[];
  constructor(references: MediaReference[]) {
    super("Ảnh đang được sử dụng và không thể xóa");
    this.name = "MediaAssetInUseError";
    this.references = references;
  }
}

export async function deleteMediaAsset(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return null;

  const references = await resolveMediaReferences(id);
  if (references.length) {
    throw new MediaAssetInUseError(references);
  }

  await clearDuplicateLinksReferencing(id);

  if (asset.storageProvider === "CLOUDFLARE_R2") {
    await deleteR2Object(asset.storageKey);
  } else {
    await deleteStoredMediaObject(asset.url, asset.storageKey, asset.storageProvider);
  }

  await prisma.mediaAsset.delete({ where: { id } });
  return asset;
}

export function mediaFolderToStorageKey(folder: MediaFolder): StorageFolderKey {
  return MEDIA_TO_STORAGE_FOLDER[folder];
}

export async function countMediaAssets() {
  try {
    return await prisma.mediaAsset.count();
  } catch {
    return 0;
  }
}
