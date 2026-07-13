import { NextResponse } from "next/server";
import type { MediaFolder, MediaUsageType } from "@prisma/client";
import {
  listMediaAssets,
  listMediaAssetsPage,
  MEDIA_LIBRARY_PAGE_SIZE,
  uploadMediaAsset,
  uploadProductionFileAsset,
} from "@/features/media/services/media.service";
import { CLOUDINARY_CONFIG_ERROR } from "@/lib/storage";
import { STORAGE_FOLDER_TO_MEDIA, type StorageFolderKey } from "@/lib/storage/types";
import {
  validateMediaOrientation,
  validateMediaVisibility,
} from "@/features/media/media-classification";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const VALID_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];
const VALID_USAGE_TYPES: MediaUsageType[] = ["PRODUCT", "BLOG", "KNOWLEDGE_BASE", "GENERAL"];
const isDev = process.env.NODE_ENV === "development";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const folderParam = searchParams.get("folder");
  const usageParam = searchParams.get("usageType");
  const libraryId = searchParams.get("libraryId") ?? undefined;
  const libraryCode = searchParams.get("libraryCode") ?? undefined;
  const roleId = searchParams.get("roleId") ?? undefined;
  const roleCode = searchParams.get("roleCode") ?? undefined;
  const visibilityParam = searchParams.get("visibility");
  const orientationParam = searchParams.get("orientation");
  const hasAltTextParam = searchParams.get("hasAltText");
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

  let hasAltText: boolean | undefined;
  if (hasAltTextParam === "true") hasAltText = true;
  else if (hasAltTextParam === "false") hasAltText = false;

  const filters = {
    folder,
    usageType,
    libraryId,
    libraryCode,
    roleId,
    roleCode,
    visibility,
    orientation,
    hasAltText,
    search,
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

    const { asset, warning } = await uploadMediaAsset({
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
    });

    return NextResponse.json({ ...asset, warning }, { status: 201 });
  } catch (err) {
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
