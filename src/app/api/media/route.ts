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

const VALID_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];
const VALID_USAGE_TYPES: MediaUsageType[] = ["PRODUCT", "BLOG", "KNOWLEDGE_BASE", "GENERAL"];
const isDev = process.env.NODE_ENV === "development";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const folderParam = searchParams.get("folder");
  const usageParam = searchParams.get("usageType");
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

  if (paginated) {
    const page = await listMediaAssetsPage({
      folder,
      usageType,
      search,
      cursor,
      limit: Number.isFinite(limit) && limit! > 0 ? limit : MEDIA_LIBRARY_PAGE_SIZE,
    });
    return NextResponse.json(page);
  }

  const assets = await listMediaAssets({ folder, usageType, search, limit });
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
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
        { status: 400 }
      );
    }

    const fileEntry = formData.get("file");
    const folder = formData.get("folder") ?? "general";
    const productionFile = formData.get("productionFile");
    const altText = formData.get("altText");
    const title = formData.get("title");
    const usageParam = formData.get("usageType");
    const tagsRaw = formData.get("tags");

    const folderKey = (typeof folder === "string" && VALID_FOLDERS.includes(folder as StorageFolderKey))
      ? folder as StorageFolderKey
      : "general";

    const tags = typeof tagsRaw === "string"
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
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

    const usageType = (typeof usageParam === "string" && VALID_USAGE_TYPES.includes(usageParam as MediaUsageType))
      ? usageParam as MediaUsageType
      : undefined;

    const { asset, warning } = await uploadMediaAsset({
      folder: folderKey,
      file: fileEntry as File,
      altText: typeof altText === "string" ? altText : undefined,
      title: typeof title === "string" ? title : undefined,
      usageType,
      tags,
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
