import { prisma } from "@/lib/prisma";
import type {
  MediaFolder,
  MediaOrientation,
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
        select: { id: true, code: true, name: true, isActive: true, color: true },
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
  visibility?: MediaVisibility;
  orientation?: MediaOrientation;
  hasAltText?: boolean;
  search?: string;
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
    ...(filters.visibility ? { visibility: filters.visibility } : {}),
    ...(filters.orientation ? { orientation: filters.orientation } : {}),
  };

  if (filters.hasAltText === true) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { altText: { not: null } },
      { NOT: { altText: "" } },
    ];
  } else if (filters.hasAltText === false) {
    where.OR = [{ altText: null }, { altText: "" }];
  }

  if (filters.search) {
    const searchOr: Prisma.MediaAssetWhereInput[] = [
      { filename: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
      { originalName: { contains: filters.search, mode: "insensitive" } },
      { altText: { contains: filters.search, mode: "insensitive" } },
      { caption: { contains: filters.search, mode: "insensitive" } },
    ];
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { OR: searchOr },
    ];
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
      return created;
    });
    return {
      asset,
      warning,
      duplicateOfId: exactDuplicate?.id ?? null,
    };
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
  options?: { requireActiveClassification?: boolean },
): Promise<Prisma.MediaAssetUncheckedUpdateManyInput> {
  const requireActive = options?.requireActiveClassification ?? true;
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

  if ("orientation" in raw) {
    const orientation = validateMediaOrientation(raw.orientation);
    if (!orientation) return { ok: false, message: "Hướng ảnh không hợp lệ" };
  }

  return { ok: true, data, hasUpdates };
}

export async function updateMediaAsset(id: string, data: MediaMetadataUpdateInput) {
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) return null;

  const { collectionIds, ...metadata } = data;
  const updateData = await buildMetadataUpdateData(metadata);

  if (Object.keys(updateData).length) {
    await prisma.mediaAsset.update({
      where: { id },
      data: updateData,
    });
  }

  if (collectionIds !== undefined) {
    await setMediaAssetCollections(id, collectionIds);
  }

  return prisma.mediaAsset.findUnique({
    where: { id },
    include: mediaClassificationInclude,
  });
}

export async function bulkUpdateMediaAssets(ids: string[], data: MediaMetadataUpdateInput) {
  const uniqueIds = [...new Set(ids)];
  const { collectionIds: _collectionIds, ...metadata } = data;
  void _collectionIds;
  const updateData = await buildMetadataUpdateData(metadata);
  if (!Object.keys(updateData).length) return 0;
  const result = await prisma.mediaAsset.updateMany({
    where: { id: { in: uniqueIds } },
    data: updateData,
  });
  return result.count;
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
