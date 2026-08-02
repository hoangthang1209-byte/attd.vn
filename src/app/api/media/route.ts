import { NextResponse } from "next/server";
import type {
  MediaAiProcessingStatus,
  MediaAssetType,
  MediaCollectionType,
  MediaContentSuitability,
  MediaFolder,
  MediaSeoReadinessStatus,
  MediaUsageType,
} from "@prisma/client";
import {
  listMediaAssets,
  listMediaAssetsPage,
  MEDIA_LIBRARY_PAGE_SIZE,
  MediaDuplicateUploadError,
  uploadMediaAsset,
  uploadProductionFileAsset,
} from "@/features/media/services/media.service";
import { CLOUDINARY_CONFIG_ERROR } from "@/lib/storage";
import { STORAGE_FOLDER_TO_MEDIA, type StorageFolderKey } from "@/lib/storage/types";
import {
  validateMediaOrientation,
  validateMediaVisibility,
} from "@/features/media/media-classification";
import { validateMediaCollectionType } from "@/features/media/media-collection.types";
import {
  validateMediaAiProcessingStatus,
  validateMediaAssetType,
  validateMediaSeoReadinessStatus,
} from "@/features/media/services/media-intelligence.service";
import { validateMediaContentSuitability } from "@/features/media/media-bundle-presets";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const VALID_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];
const VALID_USAGE_TYPES: MediaUsageType[] = ["PRODUCT", "BLOG", "KNOWLEDGE_BASE", "GENERAL"];
const isDev = process.env.NODE_ENV === "development";

function parseBoolParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseJsonStringArray(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed.map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // fall through
  }
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const folderParam = searchParams.get("folder");
  const usageParam = searchParams.get("usageType");
  const libraryId = searchParams.get("libraryId") ?? undefined;
  const libraryCode = searchParams.get("libraryCode") ?? undefined;
  const roleId = searchParams.get("roleId") ?? undefined;
  const roleCode = searchParams.get("roleCode") ?? undefined;
  const collectionId = searchParams.get("collectionId") ?? undefined;
  const collectionCode = searchParams.get("collectionCode") ?? undefined;
  const collectionTypeParam = searchParams.get("collectionType");
  const visibilityParam = searchParams.get("visibility");
  const orientationParam = searchParams.get("orientation");
  const assetTypeParam = searchParams.get("assetType");
  const seoReadinessParam = searchParams.get("seoReadinessStatus");
  const aiStatusParam = searchParams.get("aiProcessingStatus");
  const minimumSeoScoreParam = searchParams.get("minimumSeoScore");
  const cursor = searchParams.get("cursor") ?? undefined;
  const paginated =
    searchParams.get("paginated") === "1" || searchParams.has("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  let folder: MediaFolder | undefined;
  if (folderParam && VALID_FOLDERS.includes(folderParam as StorageFolderKey)) {
    folder = STORAGE_FOLDER_TO_MEDIA[folderParam as StorageFolderKey];
  }

  let usageType: MediaUsageType | undefined;
  if (usageParam && VALID_USAGE_TYPES.includes(usageParam as MediaUsageType)) {
    usageType = usageParam as MediaUsageType;
  }

  const visibility = visibilityParam
    ? validateMediaVisibility(visibilityParam) ?? undefined
    : undefined;
  const orientation = orientationParam
    ? validateMediaOrientation(orientationParam) ?? undefined
    : undefined;
  const collectionType = collectionTypeParam
    ? validateMediaCollectionType(collectionTypeParam) ?? undefined
    : undefined;
  const assetType = assetTypeParam
    ? (validateMediaAssetType(assetTypeParam) as MediaAssetType | null) ?? undefined
    : undefined;
  const seoReadinessStatus = seoReadinessParam
    ? (validateMediaSeoReadinessStatus(seoReadinessParam) as MediaSeoReadinessStatus | null) ??
      undefined
    : undefined;
  const aiProcessingStatus = aiStatusParam
    ? (validateMediaAiProcessingStatus(aiStatusParam) as MediaAiProcessingStatus | null) ??
      undefined
    : undefined;
  const minimumSeoScore = minimumSeoScoreParam
    ? Number.parseInt(minimumSeoScoreParam, 10)
    : undefined;
  const contentSuitabilityParam = searchParams.get("contentSuitability");
  const contentSuitability = contentSuitabilityParam
    ? validateMediaContentSuitability(contentSuitabilityParam) ?? undefined
    : undefined;

  const filters = {
    folder,
    usageType,
    libraryId,
    libraryCode,
    roleId,
    roleCode,
    collectionId,
    collectionCode,
    collectionType: collectionType as MediaCollectionType | undefined,
    visibility,
    orientation,
    hasAltText: parseBoolParam(searchParams.get("hasAltText")),
    hasTitle: parseBoolParam(searchParams.get("hasTitle")),
    hasKeywords: parseBoolParam(searchParams.get("hasKeywords")),
    hasSubject: parseBoolParam(searchParams.get("hasSubject")),
    assetType,
    seoReadinessStatus,
    minimumSeoScore: Number.isFinite(minimumSeoScore) ? minimumSeoScore : undefined,
    aiProcessingStatus,
    subject: searchParams.get("subject") ?? undefined,
    material: searchParams.get("material") ?? undefined,
    color: searchParams.get("color") ?? undefined,
    technique: searchParams.get("technique") ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
    audience: searchParams.get("audience") ?? undefined,
    useCase: searchParams.get("useCase") ?? undefined,
    duplicateStatus: searchParams.get("duplicateStatus") ?? undefined,
    contentSuitability,
    search,
    unusedOnly: parseBoolParam(searchParams.get("unusedOnly")) === true ? true : undefined,
    recentlyUploadedDays: (() => {
      const raw = searchParams.get("recentlyUploadedDays");
      if (!raw) return undefined;
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
    maximumSeoScore: (() => {
      const raw = searchParams.get("maximumSeoScore");
      if (!raw) return undefined;
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) ? n : undefined;
    })(),
    mediaBundleId: searchParams.get("mediaBundleId") ?? undefined,
    workflowLane: (() => {
      const raw = searchParams.get("workflowLane");
      const allowed = new Set([
        "incoming",
        "waiting_review",
        "needs_metadata",
        "ready",
        "published",
      ]);
      return raw && allowed.has(raw)
        ? (raw as
            | "incoming"
            | "waiting_review"
            | "needs_metadata"
            | "ready"
            | "published")
        : undefined;
    })(),
    lifecycleStatus: (() => {
      const raw = searchParams.get("lifecycleStatus");
      const allowed = new Set([
        "ACTIVE",
        "REVIEW_REQUIRED",
        "DEPRECATED",
        "ARCHIVED",
        "RETIRED",
      ]);
      return raw && allowed.has(raw)
        ? (raw as
            | "ACTIVE"
            | "REVIEW_REQUIRED"
            | "DEPRECATED"
            | "ARCHIVED"
            | "RETIRED")
        : undefined;
    })(),
    rightsStatus: (() => {
      const raw = searchParams.get("rightsStatus");
      const allowed = new Set([
        "OWNED",
        "LICENSED",
        "CUSTOMER_PROVIDED",
        "PARTNER_PROVIDED",
        "UNKNOWN",
      ]);
      return raw && allowed.has(raw)
        ? (raw as
            | "OWNED"
            | "LICENSED"
            | "CUSTOMER_PROVIDED"
            | "PARTNER_PROVIDED"
            | "UNKNOWN")
        : undefined;
    })(),
    hasReplacement: parseBoolParam(searchParams.get("hasReplacement")),
    rightsExpiringSoon:
      parseBoolParam(searchParams.get("rightsExpiringSoon")) === true ? true : undefined,
    rightsExpired:
      parseBoolParam(searchParams.get("rightsExpired")) === true ? true : undefined,
    needsLifecycleReview:
      parseBoolParam(searchParams.get("needsLifecycleReview")) === true ? true : undefined,
  };

  if (paginated) {
    const page = await listMediaAssetsPage({
      ...filters,
      cursor,
      limit: Number.isFinite(limit) && limit! > 0 ? limit : MEDIA_LIBRARY_PAGE_SIZE,
    });
    return NextResponse.json(page);
  }

  const assets = await listMediaAssets({
    ...filters,
    limit,
  });
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "create",
    request,
  });
  if (!permission.ok) return permission.response;

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error("[api/media] FormData parse failed:", err);
      return NextResponse.json(
        {
          message: isDev
            ? `Không thể đọc form: ${err instanceof Error ? err.message : String(err)}`
            : "Không thể đọc dữ liệu upload",
        },
        { status: 400 },
      );
    }

    const fileEntry = formData.get("file");
    const folder = formData.get("folder") ?? "general";
    const productionFile = formData.get("productionFile");
    const altText = formData.get("altText");
    const title = formData.get("title");
    const caption = formData.get("caption");
    const description = formData.get("description");
    const usageParam = formData.get("usageType");
    const tagsRaw = formData.get("tags");
    const keywordsRaw = formData.get("keywords");
    const libraryId = formData.get("libraryId");
    const roleId = formData.get("roleId");
    const visibilityRaw = formData.get("visibility");
    const contentLanguage = formData.get("contentLanguage");
    const collectionIdsRaw = formData.get("collectionIds");
    const forceDuplicateUpload = formData.get("forceDuplicateUpload") === "true";
    const mergeSemanticIntoExisting = formData.get("mergeSemanticIntoExisting") === "true";
    const assetTypeRaw = formData.get("assetType");

    const folderKey =
      typeof folder === "string" && VALID_FOLDERS.includes(folder as StorageFolderKey)
        ? (folder as StorageFolderKey)
        : "general";

    const tags =
      typeof tagsRaw === "string"
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    const keywords =
      typeof keywordsRaw === "string"
        ? keywordsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

    let collectionIds: string[] = [];
    if (typeof collectionIdsRaw === "string" && collectionIdsRaw.trim()) {
      try {
        const parsed = JSON.parse(collectionIdsRaw) as unknown;
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
          collectionIds = parsed;
        } else {
          collectionIds = collectionIdsRaw.split(",").map((t) => t.trim()).filter(Boolean);
        }
      } catch {
        collectionIds = collectionIdsRaw.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json({ message: "File là bắt buộc" }, { status: 400 });
    }

    const productionFileType = formData.get("productionFileType");

    if (productionFile === "true") {
      const type =
        typeof productionFileType === "string" && productionFileType.trim()
          ? (productionFileType.trim() as import("@prisma/client").ProductionFileType)
          : undefined;
      const { asset } = await uploadProductionFileAsset({
        file: fileEntry as File,
        title: typeof title === "string" ? title : undefined,
        tags,
        productionFileType: type,
      });
      return NextResponse.json({ ...asset }, { status: 201 });
    }

    const usageType =
      typeof usageParam === "string" && VALID_USAGE_TYPES.includes(usageParam as MediaUsageType)
        ? (usageParam as MediaUsageType)
        : undefined;

    const visibility =
      typeof visibilityRaw === "string"
        ? validateMediaVisibility(visibilityRaw) ?? undefined
        : undefined;

    const assetType =
      typeof assetTypeRaw === "string" ? validateMediaAssetType(assetTypeRaw) ?? undefined : undefined;

    const { asset, warning, duplicateOfId, reused } = await uploadMediaAsset({
      folder: folderKey,
      file: fileEntry as File,
      altText: typeof altText === "string" ? altText : undefined,
      title: typeof title === "string" ? title : undefined,
      caption: typeof caption === "string" ? caption : undefined,
      description: typeof description === "string" ? description : undefined,
      usageType,
      tags,
      keywords,
      libraryId: typeof libraryId === "string" && libraryId ? libraryId : undefined,
      roleId: typeof roleId === "string" && roleId ? roleId : undefined,
      visibility,
      contentLanguage: typeof contentLanguage === "string" ? contentLanguage : undefined,
      collectionIds,
      forceDuplicateUpload,
      mergeSemanticIntoExisting,
      assetType,
      subjectTerms: parseJsonStringArray(formData.get("subjectTerms")),
      materialTerms: parseJsonStringArray(formData.get("materialTerms")),
      colorTerms: parseJsonStringArray(formData.get("colorTerms")),
      techniqueTerms: parseJsonStringArray(formData.get("techniqueTerms")),
      industryTerms: parseJsonStringArray(formData.get("industryTerms")),
      audienceTerms: parseJsonStringArray(formData.get("audienceTerms")),
      useCaseTerms: parseJsonStringArray(formData.get("useCaseTerms")),
      contentSuitabilities: parseJsonStringArray(
        formData.get("contentSuitabilities"),
      ) as MediaContentSuitability[],
    });

    return NextResponse.json({ ...asset, warning, duplicateOfId, reused }, { status: 201 });
  } catch (err) {
    if (err instanceof MediaDuplicateUploadError) {
      return NextResponse.json(
        {
          message: err.message,
          code: "EXACT_DUPLICATE",
          contentHash: err.contentHash,
          exactDuplicate: err.exactDuplicate,
        },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : "Upload thất bại";
    console.error("[api/media] POST failed:", err);
    const status =
      message === CLOUDINARY_CONFIG_ERROR ||
      message.includes("configured") ||
      message.includes("TOKEN")
        ? 500
        : 400;
    return NextResponse.json({ message }, { status });
  }
}
