import type {
  MediaBundleContentType,
  MediaBundleSlotType,
  MediaBundleStatus,
  MediaContentSuitability,
  MediaDuplicateStatus,
  MediaOrientation,
  MediaSeoReadinessStatus,
  MediaVisibility,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emptyToNull, normalizeMasterDataCode } from "@/features/media/media-classification";
import {
  createBundleSlotsFromPreset,
  evaluateBundleAgainstPreset,
  SLOT_DISCOVERY_PROFILES,
  validateMediaBundleContentType,
  validateMediaBundleSlotType,
  type MediaBundlePresetSlot,
} from "@/features/media/media-bundle-presets";
import { resolveVocabularyTerms } from "@/features/media/services/media-intelligence.service";
import { calculateSuitabilityScore } from "@/features/media/services/media-content-intelligence.service";
import {
  discoverMediaAssets,
  type MediaDiscoveryResult,
} from "@/features/media/services/media-discovery.service";

/* -------------------------------------------------------------------------- */
/* Local enum validation                                                      */
/* -------------------------------------------------------------------------- */

const MEDIA_BUNDLE_STATUSES: MediaBundleStatus[] = ["DRAFT", "READY", "ARCHIVED"];

function validateMediaBundleStatusValue(value: unknown): MediaBundleStatus | null {
  if (typeof value !== "string") return null;
  return MEDIA_BUNDLE_STATUSES.includes(value as MediaBundleStatus)
    ? (value as MediaBundleStatus)
    : null;
}

/** Content types that represent public/site-facing content; required assets must be PUBLIC to go READY. */
function requiresPublicRequiredAssets(contentType: MediaBundleContentType): boolean {
  return contentType !== "GENERAL";
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type MediaBundleHealthStatus = "INCOMPLETE" | "BASIC" | "READY" | "EXCELLENT";

export type MediaBundleSlotHealthFlag = {
  slotId: string;
  slotType: MediaBundleSlotType;
  label: string;
};

export type MediaBundleHealth = {
  score: number;
  status: MediaBundleHealthStatus;
  totalSlots: number;
  requiredSlots: number;
  completeRequiredSlots: number;
  missingRequiredSlots: MediaBundleSlotHealthFlag[];
  underfilledSlots: MediaBundleSlotHealthFlag[];
  overfilledSlots: MediaBundleSlotHealthFlag[];
  seoReadyAssets: number;
  duplicateAssetWarnings: number;
  privateAssetWarnings: number;
};

export type MediaBundleHealthAssetInput = {
  seoReadinessStatus: MediaSeoReadinessStatus;
  visibility: MediaVisibility;
  duplicateStatus: MediaDuplicateStatus;
};

export type MediaBundleHealthSlotInput = {
  id: string;
  slotType: MediaBundleSlotType;
  label: string;
  required: boolean;
  minAssets: number;
  maxAssets: number | null;
  assets: MediaBundleHealthAssetInput[];
};

export type MediaBundleHealthInput = {
  slots: MediaBundleHealthSlotInput[];
};

export type MediaBundleSlotAssetLite = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  altText: string | null;
  seoScore: number;
  seoReadinessStatus: MediaSeoReadinessStatus;
  visibility: MediaVisibility;
  duplicateStatus: MediaDuplicateStatus;
  contentSuitabilities: MediaContentSuitability[];
  library: string | null;
  role: string | null;
  orientation: MediaOrientation;
  sortOrder: number;
  note: string | null;
};

export type MediaBundleSlotDetail = {
  id: string;
  slotType: MediaBundleSlotType;
  label: string;
  description: string | null;
  required: boolean;
  minAssets: number;
  maxAssets: number | null;
  sortOrder: number;
  assets: MediaBundleSlotAssetLite[];
};

export type MediaBundleListItem = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: MediaBundleStatus;
  contentType: MediaBundleContentType;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  slotCount: number;
  assetCount: number;
  health: MediaBundleHealth;
  createdAt: string;
  updatedAt: string;
};

export type MediaBundleDetail = MediaBundleListItem & {
  query: string | null;
  subjectTerms: string[];
  industryTerms: string[];
  useCaseTerms: string[];
  techniqueTerms: string[];
  slots: MediaBundleSlotDetail[];
};

export type ListMediaBundlesInput = {
  search?: string;
  contentType?: MediaBundleContentType;
  status?: MediaBundleStatus;
  isActive?: boolean;
  healthStatus?: MediaBundleHealthStatus;
  limit?: number;
};

export type CreateMediaBundleInput = {
  name: string;
  code?: string | null;
  description?: string | null;
  contentType: MediaBundleContentType | string;
  query?: string | null;
  subjectTerms?: string[];
  industryTerms?: string[];
  useCaseTerms?: string[];
  techniqueTerms?: string[];
  applyPreset?: boolean;
};

export type UpdateMediaBundleInput = {
  name?: string;
  code?: string | null;
  description?: string | null;
  contentType?: MediaBundleContentType | string;
  status?: MediaBundleStatus | string;
  isActive?: boolean;
  sortOrder?: number;
  query?: string | null;
  subjectTerms?: string[];
  industryTerms?: string[];
  useCaseTerms?: string[];
  techniqueTerms?: string[];
};

export type ApplyPresetToBundleMode = "replace-empty" | "add-missing";

export type CreateSlotInput = {
  slotType: MediaBundleSlotType | string;
  label: string;
  description?: string | null;
  required?: boolean;
  minAssets?: number;
  maxAssets?: number | null;
  sortOrder?: number;
};

export type UpdateSlotInput = Partial<CreateSlotInput>;

export type SuggestAssetsForSlotInput = {
  query?: string;
  limit?: number;
};

/* -------------------------------------------------------------------------- */
/* Prisma include shape (single source of truth — avoids N+1)                 */
/* -------------------------------------------------------------------------- */

const BUNDLE_DETAIL_INCLUDE = {
  slots: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      assets: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          mediaAsset: {
            include: {
              library: { select: { id: true, code: true, name: true } },
              role: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MediaBundleInclude;

type MediaBundleWithSlots = Prisma.MediaBundleGetPayload<{ include: typeof BUNDLE_DETAIL_INCLUDE }>;
type MediaBundleSlotWithAssets = MediaBundleWithSlots["slots"][number];
type MediaBundleSlotAssetJoin = MediaBundleSlotWithAssets["assets"][number];

/* -------------------------------------------------------------------------- */
/* Mapping helpers                                                            */
/* -------------------------------------------------------------------------- */

function toHealthSlotInput(slot: MediaBundleSlotWithAssets): MediaBundleHealthSlotInput {
  return {
    id: slot.id,
    slotType: slot.slotType,
    label: slot.label,
    required: slot.required,
    minAssets: slot.minAssets,
    maxAssets: slot.maxAssets,
    assets: slot.assets.map((join) => ({
      seoReadinessStatus: join.mediaAsset.seoReadinessStatus,
      visibility: join.mediaAsset.visibility,
      duplicateStatus: join.mediaAsset.duplicateStatus,
    })),
  };
}

function mapSlotAssetLite(join: MediaBundleSlotAssetJoin): MediaBundleSlotAssetLite {
  const asset = join.mediaAsset;
  return {
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    title: asset.title,
    altText: asset.altText,
    seoScore: asset.seoScore,
    seoReadinessStatus: asset.seoReadinessStatus,
    visibility: asset.visibility,
    duplicateStatus: asset.duplicateStatus,
    contentSuitabilities: asset.contentSuitabilities,
    library: asset.library?.code ?? null,
    role: asset.role?.code ?? null,
    orientation: asset.orientation,
    sortOrder: join.sortOrder,
    note: join.note,
  };
}

function mapSlotDetail(slot: MediaBundleSlotWithAssets): MediaBundleSlotDetail {
  return {
    id: slot.id,
    slotType: slot.slotType,
    label: slot.label,
    description: slot.description,
    required: slot.required,
    minAssets: slot.minAssets,
    maxAssets: slot.maxAssets,
    sortOrder: slot.sortOrder,
    assets: slot.assets.map(mapSlotAssetLite),
  };
}

function mapBundleDetail(bundle: MediaBundleWithSlots): MediaBundleDetail {
  const healthSlots = bundle.slots.map(toHealthSlotInput);
  const health = calculateMediaBundleHealth({ slots: healthSlots });
  const assetCount = healthSlots.reduce((sum, slot) => sum + slot.assets.length, 0);

  return {
    id: bundle.id,
    code: bundle.code,
    name: bundle.name,
    description: bundle.description,
    status: bundle.status,
    contentType: bundle.contentType,
    sortOrder: bundle.sortOrder,
    isSystem: bundle.isSystem,
    isActive: bundle.isActive,
    slotCount: bundle.slots.length,
    assetCount,
    health,
    createdAt: bundle.createdAt.toISOString(),
    updatedAt: bundle.updatedAt.toISOString(),
    query: bundle.query,
    subjectTerms: bundle.subjectTerms,
    industryTerms: bundle.industryTerms,
    useCaseTerms: bundle.useCaseTerms,
    techniqueTerms: bundle.techniqueTerms,
    slots: bundle.slots.map(mapSlotDetail),
  };
}

function mapBundleListItem(bundle: MediaBundleWithSlots): MediaBundleListItem {
  const detail = mapBundleDetail(bundle);
  return {
    id: detail.id,
    code: detail.code,
    name: detail.name,
    description: detail.description,
    status: detail.status,
    contentType: detail.contentType,
    sortOrder: detail.sortOrder,
    isSystem: detail.isSystem,
    isActive: detail.isActive,
    slotCount: detail.slotCount,
    assetCount: detail.assetCount,
    health: detail.health,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Health calculation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Health formula (0-100):
 * - Required slot completion: 50%
 * - Recommended/minimum fill (per-slot min(1, count/minAssets), averaged): 25%
 * - Asset SEO readiness (share READY|EXCELLENT among assigned assets): 15%
 * - Public visibility (share PUBLIC among assigned assets): 5%
 * - Duplicate quality (1 - unresolvedDuplicates/totalAssets): 5%
 */
export function calculateMediaBundleHealth(bundle: MediaBundleHealthInput): MediaBundleHealth {
  const slots = bundle.slots;
  const totalSlots = slots.length;

  const toFlag = (slot: MediaBundleHealthSlotInput): MediaBundleSlotHealthFlag => ({
    slotId: slot.id,
    slotType: slot.slotType,
    label: slot.label,
  });

  const requiredSlotList = slots.filter((slot) => slot.required);
  const requiredSlots = requiredSlotList.length;
  const completeRequiredSlots = requiredSlotList.filter(
    (slot) => slot.assets.length >= Math.max(1, slot.minAssets),
  ).length;
  const missingRequiredSlots = requiredSlotList
    .filter((slot) => slot.assets.length === 0)
    .map(toFlag);

  const underfilledSlots = slots
    .filter((slot) => slot.assets.length > 0 && slot.assets.length < Math.max(1, slot.minAssets))
    .map(toFlag);
  const overfilledSlots = slots
    .filter((slot) => slot.maxAssets != null && slot.assets.length > slot.maxAssets)
    .map(toFlag);

  const requiredCompletionRatio = requiredSlots > 0 ? completeRequiredSlots / requiredSlots : 1;

  const fillRatios = slots.map((slot) => Math.min(1, slot.assets.length / Math.max(1, slot.minAssets)));
  const fillRatio = totalSlots > 0 ? fillRatios.reduce((sum, r) => sum + r, 0) / totalSlots : 1;

  const allAssets = slots.flatMap((slot) => slot.assets);
  const totalAssets = allAssets.length;

  const seoReadyAssets = allAssets.filter(
    (asset) => asset.seoReadinessStatus === "READY" || asset.seoReadinessStatus === "EXCELLENT",
  ).length;
  const seoReadyRatio = totalAssets > 0 ? seoReadyAssets / totalAssets : 0;

  const publicAssets = allAssets.filter((asset) => asset.visibility === "PUBLIC").length;
  const publicRatio = totalAssets > 0 ? publicAssets / totalAssets : 0;
  const privateAssetWarnings = allAssets.filter((asset) => asset.visibility === "PRIVATE").length;

  const duplicateAssetWarnings = allAssets.filter(
    (asset) =>
      asset.duplicateStatus === "POSSIBLE_DUPLICATE" || asset.duplicateStatus === "CONFIRMED_DUPLICATE",
  ).length;
  const duplicateQualityRatio = totalAssets > 0 ? 1 - duplicateAssetWarnings / totalAssets : 1;

  const rawScore =
    requiredCompletionRatio * 50 +
    fillRatio * 25 +
    seoReadyRatio * 15 +
    publicRatio * 5 +
    duplicateQualityRatio * 5;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let status: MediaBundleHealthStatus;
  if (score >= 85) status = "EXCELLENT";
  else if (score >= 65) status = "READY";
  else if (score >= 40) status = "BASIC";
  else status = "INCOMPLETE";

  return {
    score,
    status,
    totalSlots,
    requiredSlots,
    completeRequiredSlots,
    missingRequiredSlots,
    underfilledSlots,
    overfilledSlots,
    seoReadyAssets,
    duplicateAssetWarnings,
    privateAssetWarnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Read                                                                       */
/* -------------------------------------------------------------------------- */

export async function listMediaBundles(
  input: ListMediaBundlesInput = {},
): Promise<MediaBundleListItem[]> {
  const search = input.search?.trim();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  // Health status is computed (not stored) so we may need to overfetch before filtering.
  const take = input.healthStatus ? Math.min(500, Math.max(limit * 5, 100)) : limit;

  const rows = await prisma.mediaBundle.findMany({
    where: {
      ...(input.contentType ? { contentType: input.contentType } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: BUNDLE_DETAIL_INCLUDE,
    take,
  });

  let items = rows.map(mapBundleListItem);
  if (input.healthStatus) {
    items = items.filter((item) => item.health.status === input.healthStatus);
  }
  return items.slice(0, limit);
}

export async function getMediaBundleById(id: string): Promise<MediaBundleDetail | null> {
  const bundle = await prisma.mediaBundle.findUnique({
    where: { id },
    include: BUNDLE_DETAIL_INCLUDE,
  });
  return bundle ? mapBundleDetail(bundle) : null;
}

/**
 * Retrieval contract for content-authoring surfaces (blog/landing editors, etc.):
 * metadata + computed health + slots + ordered lightweight assets.
 */
export async function getMediaBundleForContent(bundleId: string): Promise<MediaBundleDetail | null> {
  return getMediaBundleById(bundleId);
}

/* -------------------------------------------------------------------------- */
/* Create / Update / Archive / Delete                                        */
/* -------------------------------------------------------------------------- */

async function assertUniqueCode(code: string, excludeId?: string): Promise<void> {
  const duplicate = await prisma.mediaBundle.findUnique({ where: { code } });
  if (duplicate && duplicate.id !== excludeId) {
    throw new Error("Mã bộ media đã tồn tại.");
  }
}

export async function createMediaBundle(input: CreateMediaBundleInput): Promise<MediaBundleDetail> {
  const name = input.name?.trim();
  if (!name) throw new Error("Tên bộ media là bắt buộc.");

  const contentType = validateMediaBundleContentType(input.contentType);
  if (!contentType) throw new Error("Loại nội dung không hợp lệ.");

  let code: string | null = null;
  if (input.code != null && String(input.code).trim()) {
    code = normalizeMasterDataCode(String(input.code));
    if (!code) throw new Error("Mã bộ media không hợp lệ.");
    await assertUniqueCode(code);
  }

  const [subjectTerms, industryTerms, useCaseTerms, techniqueTerms] = await Promise.all([
    resolveVocabularyTerms("SUBJECT", input.subjectTerms),
    resolveVocabularyTerms("INDUSTRY", input.industryTerms),
    resolveVocabularyTerms("USE_CASE", input.useCaseTerms),
    resolveVocabularyTerms("TECHNIQUE", input.techniqueTerms),
  ]);

  const applyPreset = input.applyPreset ?? true;
  const presetSlots = applyPreset ? createBundleSlotsFromPreset(contentType) : [];

  const created = await prisma.mediaBundle.create({
    data: {
      name,
      code,
      description: emptyToNull(input.description),
      contentType,
      query: emptyToNull(input.query),
      subjectTerms,
      industryTerms,
      useCaseTerms,
      techniqueTerms,
      ...(presetSlots.length
        ? { slots: { create: presetSlots.map(presetSlotToCreateInput) } }
        : {}),
    },
    include: BUNDLE_DETAIL_INCLUDE,
  });

  return mapBundleDetail(created);
}

function presetSlotToCreateInput(slot: MediaBundlePresetSlot) {
  return {
    slotType: slot.slotType,
    label: slot.label,
    description: slot.description ?? null,
    required: slot.required,
    minAssets: slot.minAssets,
    maxAssets: slot.maxAssets ?? null,
    sortOrder: slot.sortOrder,
  };
}

export async function updateMediaBundle(
  id: string,
  patch: UpdateMediaBundleInput,
): Promise<MediaBundleDetail> {
  const existing = await prisma.mediaBundle.findUnique({
    where: { id },
    include: BUNDLE_DETAIL_INCLUDE,
  });
  if (!existing) throw new Error("Không tìm thấy bộ media.");

  const data: Prisma.MediaBundleUpdateInput = {};

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error("Tên bộ media là bắt buộc.");
    data.name = name;
  }

  if (patch.code !== undefined) {
    if (patch.code === null || !String(patch.code).trim()) {
      data.code = null;
    } else {
      const code = normalizeMasterDataCode(String(patch.code));
      if (!code) throw new Error("Mã bộ media không hợp lệ.");
      if (code !== existing.code) await assertUniqueCode(code, id);
      data.code = code;
    }
  }

  if (patch.description !== undefined) data.description = emptyToNull(patch.description);

  let contentType = existing.contentType;
  if (patch.contentType !== undefined) {
    const validated = validateMediaBundleContentType(patch.contentType);
    if (!validated) throw new Error("Loại nội dung không hợp lệ.");
    contentType = validated;
    data.contentType = validated;
  }

  if (patch.sortOrder !== undefined) {
    if (!Number.isFinite(patch.sortOrder)) throw new Error("Thứ tự sắp xếp không hợp lệ.");
    data.sortOrder = patch.sortOrder;
  }

  if (patch.isActive !== undefined) {
    if (typeof patch.isActive !== "boolean") throw new Error("Trạng thái kích hoạt không hợp lệ.");
    data.isActive = patch.isActive;
  }

  if (patch.query !== undefined) data.query = emptyToNull(patch.query);
  if (patch.subjectTerms !== undefined) {
    data.subjectTerms = await resolveVocabularyTerms("SUBJECT", patch.subjectTerms);
  }
  if (patch.industryTerms !== undefined) {
    data.industryTerms = await resolveVocabularyTerms("INDUSTRY", patch.industryTerms);
  }
  if (patch.useCaseTerms !== undefined) {
    data.useCaseTerms = await resolveVocabularyTerms("USE_CASE", patch.useCaseTerms);
  }
  if (patch.techniqueTerms !== undefined) {
    data.techniqueTerms = await resolveVocabularyTerms("TECHNIQUE", patch.techniqueTerms);
  }

  if (patch.status !== undefined) {
    const validatedStatus = validateMediaBundleStatusValue(patch.status);
    if (!validatedStatus) throw new Error("Trạng thái bộ media không hợp lệ.");

    if (validatedStatus === "READY") {
      const healthSlots = existing.slots.map(toHealthSlotInput);
      const health = calculateMediaBundleHealth({ slots: healthSlots });
      const allRequiredComplete =
        health.requiredSlots === 0 || health.completeRequiredSlots === health.requiredSlots;
      const noMissingCritical = health.missingRequiredSlots.length === 0;
      const scoreOk = health.score >= 65;

      let hasNonPublicRequiredAsset = false;
      if (requiresPublicRequiredAssets(contentType)) {
        outer: for (const slot of existing.slots) {
          if (!slot.required) continue;
          for (const join of slot.assets) {
            if (join.mediaAsset.visibility !== "PUBLIC") {
              hasNonPublicRequiredAsset = true;
              break outer;
            }
          }
        }
      }

      if (!allRequiredComplete || !noMissingCritical || !scoreOk || hasNonPublicRequiredAsset) {
        throw new Error(
          "Bộ media chưa đủ điều kiện chuyển sang trạng thái Sẵn sàng (READY): cần hoàn thành tất cả vị trí bắt buộc, đạt điểm sức khỏe tối thiểu 65, và ảnh trong vị trí bắt buộc phải ở chế độ công khai (PUBLIC).",
        );
      }
    }

    data.status = validatedStatus;
  }

  const updated = await prisma.mediaBundle.update({
    where: { id },
    data,
    include: BUNDLE_DETAIL_INCLUDE,
  });
  return mapBundleDetail(updated);
}

export async function archiveMediaBundle(id: string): Promise<MediaBundleDetail> {
  return updateMediaBundle(id, { status: "ARCHIVED" });
}

export async function setActive(id: string, isActive: boolean): Promise<MediaBundleDetail> {
  return updateMediaBundle(id, { isActive });
}

/** Cascades slots + slot-asset joins only (Prisma onDelete: Cascade). MediaAsset rows are never touched. */
export async function deleteMediaBundle(id: string): Promise<void> {
  const existing = await prisma.mediaBundle.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy bộ media.");
  if (existing.isSystem) throw new Error("Không thể xóa bộ media hệ thống.");

  const consumers = await prisma.blogPost.count({ where: { mediaBundleId: id } });
  if (consumers > 0) {
    throw new Error(
      `Không thể xóa Bundle đang được ${consumers} bài viết sử dụng. Hãy hủy liên kết trước hoặc lưu trữ Bundle.`,
    );
  }

  await prisma.mediaBundle.delete({ where: { id } });
}

/* -------------------------------------------------------------------------- */
/* Preset application                                                        */
/* -------------------------------------------------------------------------- */

export async function applyPresetToBundle(
  id: string,
  options: { mode: ApplyPresetToBundleMode },
): Promise<MediaBundleDetail> {
  const existing = await prisma.mediaBundle.findUnique({
    where: { id },
    include: BUNDLE_DETAIL_INCLUDE,
  });
  if (!existing) throw new Error("Không tìm thấy bộ media.");

  if (options.mode === "replace-empty") {
    if (existing.slots.length > 0) {
      throw new Error("Chỉ có thể áp dụng mẫu khi bộ media chưa có vị trí nào.");
    }
    const presetSlots = createBundleSlotsFromPreset(existing.contentType);
    await prisma.mediaBundleSlot.createMany({
      data: presetSlots.map((slot) => ({ mediaBundleId: id, ...presetSlotToCreateInput(slot) })),
    });
  } else {
    const { missingSlots } = evaluateBundleAgainstPreset({
      existingSlotTypes: existing.slots.map((slot) => slot.slotType),
      contentType: existing.contentType,
    });
    if (missingSlots.length) {
      await prisma.mediaBundleSlot.createMany({
        data: missingSlots.map((slot) => ({ mediaBundleId: id, ...presetSlotToCreateInput(slot) })),
      });
    }
  }

  const updated = await getMediaBundleById(id);
  if (!updated) throw new Error("Không tìm thấy bộ media.");
  return updated;
}

/* -------------------------------------------------------------------------- */
/* Slot CRUD                                                                  */
/* -------------------------------------------------------------------------- */

function assertSlotAssetLimits(minAssets: number, maxAssets: number | null | undefined): void {
  if (!Number.isFinite(minAssets) || minAssets < 0) {
    throw new Error("Số lượng ảnh tối thiểu không hợp lệ.");
  }
  if (maxAssets != null && (!Number.isFinite(maxAssets) || maxAssets < minAssets)) {
    throw new Error("Số lượng ảnh tối đa không hợp lệ.");
  }
}

export async function createSlot(
  bundleId: string,
  input: CreateSlotInput,
): Promise<MediaBundleDetail> {
  const bundle = await prisma.mediaBundle.findUnique({ where: { id: bundleId } });
  if (!bundle) throw new Error("Không tìm thấy bộ media.");

  const slotType = validateMediaBundleSlotType(input.slotType);
  if (!slotType) throw new Error("Loại vị trí không hợp lệ.");

  const label = input.label?.trim();
  if (!label) throw new Error("Nhãn vị trí là bắt buộc.");

  const minAssets = input.minAssets ?? 1;
  assertSlotAssetLimits(minAssets, input.maxAssets ?? null);

  await prisma.mediaBundleSlot.create({
    data: {
      mediaBundleId: bundleId,
      slotType,
      label,
      description: emptyToNull(input.description),
      required: input.required ?? false,
      minAssets,
      maxAssets: input.maxAssets ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  const updated = await getMediaBundleById(bundleId);
  if (!updated) throw new Error("Không tìm thấy bộ media.");
  return updated;
}

export async function updateSlot(slotId: string, patch: UpdateSlotInput): Promise<MediaBundleDetail> {
  const slot = await prisma.mediaBundleSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new Error("Không tìm thấy vị trí.");

  const data: Prisma.MediaBundleSlotUpdateInput = {};

  if (patch.slotType !== undefined) {
    const slotType = validateMediaBundleSlotType(patch.slotType);
    if (!slotType) throw new Error("Loại vị trí không hợp lệ.");
    data.slotType = slotType;
  }
  if (patch.label !== undefined) {
    const label = patch.label.trim();
    if (!label) throw new Error("Nhãn vị trí là bắt buộc.");
    data.label = label;
  }
  if (patch.description !== undefined) data.description = emptyToNull(patch.description);
  if (patch.required !== undefined) data.required = Boolean(patch.required);

  const nextMinAssets = patch.minAssets !== undefined ? patch.minAssets : slot.minAssets;
  const nextMaxAssets = patch.maxAssets !== undefined ? patch.maxAssets : slot.maxAssets;
  if (patch.minAssets !== undefined || patch.maxAssets !== undefined) {
    assertSlotAssetLimits(nextMinAssets, nextMaxAssets);
  }
  if (patch.minAssets !== undefined) data.minAssets = nextMinAssets;
  if (patch.maxAssets !== undefined) data.maxAssets = patch.maxAssets;

  if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;

  await prisma.mediaBundleSlot.update({ where: { id: slotId }, data });

  const updated = await getMediaBundleById(slot.mediaBundleId);
  if (!updated) throw new Error("Không tìm thấy bộ media.");
  return updated;
}

/** Deleting a slot cascades its MediaBundleSlotAsset joins only; MediaAsset rows are untouched. */
export async function deleteSlot(slotId: string): Promise<MediaBundleDetail> {
  const slot = await prisma.mediaBundleSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new Error("Không tìm thấy vị trí.");

  await prisma.mediaBundleSlot.delete({ where: { id: slotId } });

  const updated = await getMediaBundleById(slot.mediaBundleId);
  if (!updated) throw new Error("Không tìm thấy bộ media.");
  return updated;
}

/* -------------------------------------------------------------------------- */
/* Slot asset management                                                     */
/* -------------------------------------------------------------------------- */

export async function addAssetsToSlot(
  slotId: string,
  mediaAssetIds: string[],
): Promise<MediaBundleDetail> {
  const uniqueIds = [...new Set(mediaAssetIds.filter(Boolean))];
  if (!uniqueIds.length) throw new Error("Cần chọn ít nhất một ảnh.");

  const slot = await prisma.mediaBundleSlot.findUnique({
    where: { id: slotId },
    include: { assets: true },
  });
  if (!slot) throw new Error("Không tìm thấy vị trí.");

  const existingAssets = await prisma.mediaAsset.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (existingAssets.length !== uniqueIds.length) {
    throw new Error("Một hoặc nhiều ảnh không tồn tại.");
  }

  const existingIds = new Set(slot.assets.map((a) => a.mediaAssetId));
  const toAdd = uniqueIds.filter((assetId) => !existingIds.has(assetId));

  if (slot.maxAssets != null) {
    const capacity = slot.maxAssets - existingIds.size;
    if (toAdd.length > Math.max(0, capacity)) {
      throw new Error(
        `Vị trí "${slot.label}" chỉ còn có thể thêm tối đa ${Math.max(0, capacity)} ảnh (giới hạn ${slot.maxAssets}).`,
      );
    }
  }

  if (toAdd.length) {
    let nextSortOrder = slot.assets.length
      ? Math.max(...slot.assets.map((a) => a.sortOrder)) + 1
      : 0;
    await prisma.mediaBundleSlotAsset.createMany({
      data: toAdd.map((mediaAssetId) => ({
        mediaBundleSlotId: slotId,
        mediaAssetId,
        sortOrder: nextSortOrder++,
      })),
      skipDuplicates: true,
    });
  }

  const updated = await getMediaBundleById(slot.mediaBundleId);
  if (!updated) throw new Error("Không tìm thấy bộ media.");
  return updated;
}

export async function removeAssetFromSlot(
  slotId: string,
  mediaAssetId: string,
): Promise<MediaBundleDetail> {
  const slot = await prisma.mediaBundleSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new Error("Không tìm thấy vị trí.");

  await prisma.mediaBundleSlotAsset.deleteMany({
    where: { mediaBundleSlotId: slotId, mediaAssetId },
  });

  const updated = await getMediaBundleById(slot.mediaBundleId);
  if (!updated) throw new Error("Không tìm thấy bộ media.");
  return updated;
}

export async function reorderSlotAssets(
  slotId: string,
  orderedMediaAssetIds: string[],
): Promise<MediaBundleDetail> {
  const slot = await prisma.mediaBundleSlot.findUnique({
    where: { id: slotId },
    include: { assets: true },
  });
  if (!slot) throw new Error("Không tìm thấy vị trí.");

  const currentIds = new Set(slot.assets.map((a) => a.mediaAssetId));
  const orderedUnique = [...new Set(orderedMediaAssetIds.filter(Boolean))];
  if (
    orderedUnique.length !== currentIds.size ||
    orderedUnique.some((assetId) => !currentIds.has(assetId))
  ) {
    throw new Error("Danh sách sắp xếp không khớp với ảnh hiện có trong vị trí.");
  }

  await prisma.$transaction(
    orderedUnique.map((mediaAssetId, index) =>
      prisma.mediaBundleSlotAsset.update({
        where: { mediaBundleSlotId_mediaAssetId: { mediaBundleSlotId: slotId, mediaAssetId } },
        data: { sortOrder: index },
      }),
    ),
  );

  const updated = await getMediaBundleById(slot.mediaBundleId);
  if (!updated) throw new Error("Không tìm thấy bộ media.");
  return updated;
}

/* -------------------------------------------------------------------------- */
/* Duplicate                                                                  */
/* -------------------------------------------------------------------------- */

export async function duplicateMediaBundle(
  id: string,
  options?: { includeAssets?: boolean },
): Promise<MediaBundleDetail> {
  const source = await prisma.mediaBundle.findUnique({
    where: { id },
    include: BUNDLE_DETAIL_INCLUDE,
  });
  if (!source) throw new Error("Không tìm thấy bộ media.");

  const includeAssets = options?.includeAssets ?? false;

  let code: string | null = null;
  if (source.code) {
    let candidate = `${source.code}_COPY`;
    let suffix = 2;
    let existingWithCandidate = await prisma.mediaBundle.findUnique({ where: { code: candidate } });
    while (existingWithCandidate) {
      candidate = `${source.code}_COPY${suffix}`;
      suffix += 1;
      existingWithCandidate = await prisma.mediaBundle.findUnique({ where: { code: candidate } });
    }
    code = candidate;
  }

  const created = await prisma.mediaBundle.create({
    data: {
      code,
      name: `${source.name} (copy)`,
      description: source.description,
      status: "DRAFT",
      contentType: source.contentType,
      sortOrder: source.sortOrder,
      isActive: source.isActive,
      isSystem: false,
      query: source.query,
      subjectTerms: source.subjectTerms,
      industryTerms: source.industryTerms,
      useCaseTerms: source.useCaseTerms,
      techniqueTerms: source.techniqueTerms,
      slots: {
        create: source.slots.map((slot) => ({
          slotType: slot.slotType,
          label: slot.label,
          description: slot.description,
          required: slot.required,
          minAssets: slot.minAssets,
          maxAssets: slot.maxAssets,
          sortOrder: slot.sortOrder,
          ...(includeAssets && slot.assets.length
            ? {
                assets: {
                  create: slot.assets.map((asset) => ({
                    mediaAssetId: asset.mediaAssetId,
                    sortOrder: asset.sortOrder,
                    note: asset.note,
                  })),
                },
              }
            : {}),
        })),
      },
    },
    include: BUNDLE_DETAIL_INCLUDE,
  });

  return mapBundleDetail(created);
}

/* -------------------------------------------------------------------------- */
/* Suggestions                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Suggests candidate assets for a slot using SLOT_DISCOVERY_PROFILES combined with the
 * bundle's own query/semantic terms. Assets already assigned to this slot are excluded;
 * assets already used elsewhere in the same bundle are kept but soft-penalized so the
 * caller can still surface them (e.g. re-use across galleries) without hiding options.
 */
export async function suggestAssetsForSlot(
  bundleId: string,
  slotId: string,
  options: SuggestAssetsForSlotInput = {},
): Promise<MediaDiscoveryResult[]> {
  const bundle = await prisma.mediaBundle.findUnique({
    where: { id: bundleId },
    include: BUNDLE_DETAIL_INCLUDE,
  });
  if (!bundle) throw new Error("Không tìm thấy bộ media.");

  const slot = bundle.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error("Không tìm thấy vị trí trong bộ media.");

  const profile = SLOT_DISCOVERY_PROFILES[slot.slotType];
  const excludeIds = slot.assets.map((join) => join.mediaAssetId);
  const usedElsewhereInBundle = new Set(
    bundle.slots
      .filter((s) => s.id !== slotId)
      .flatMap((s) => s.assets.map((join) => join.mediaAssetId)),
  );

  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50);

  const discovered = await discoverMediaAssets({
    query: options.query ?? bundle.query ?? undefined,
    subjects: bundle.subjectTerms,
    industries: bundle.industryTerms,
    useCases: bundle.useCaseTerms,
    techniques: bundle.techniqueTerms,
    roles: profile.roles,
    libraries: profile.libraries,
    orientation: profile.orientation,
    minimumSeoScore: profile.minimumSeoScore,
    visibility: "PUBLIC",
    excludeIds,
    limit: limit * 2,
  });

  const rescored = discovered.map((result) => {
    const { score: suitabilityScore, matched } = calculateSuitabilityScore(
      result.asset.contentSuitabilities,
      profile.suitabilities,
    );
    const reusePenalty = usedElsewhereInBundle.has(result.asset.id) ? -3 : 0;
    const matchedOn = matched.length
      ? [...result.matchedOn, ...matched.map((s) => `suitability:${s}`)]
      : result.matchedOn;
    return {
      ...result,
      score: result.score + suitabilityScore + reusePenalty,
      matchedOn,
    };
  });

  return rescored.sort((a, b) => b.score - a.score).slice(0, limit);
}
