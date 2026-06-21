import { NextResponse } from "next/server";
import type { MediaFolder, MediaUsageType } from "@prisma/client";
import {
  listMediaAssets,
  uploadMediaAsset,
  uploadProductionFileAsset,
} from "@/features/media/services/media.service";
import { STORAGE_FOLDER_TO_MEDIA, type StorageFolderKey } from "@/lib/storage/types";

const VALID_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];
const VALID_USAGE_TYPES: MediaUsageType[] = ["PRODUCT", "BLOG", "KNOWLEDGE_BASE", "GENERAL"];
const isDev = process.env.NODE_ENV === "development";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const folderParam = searchParams.get("folder");
  const usageParam = searchParams.get("usageType");

  let folder: MediaFolder | undefined;
  if (folderParam && VALID_FOLDERS.includes(folderParam as StorageFolderKey)) {
    folder = STORAGE_FOLDER_TO_MEDIA[folderParam as StorageFolderKey];
  }

  let usageType: MediaUsageType | undefined;
  if (usageParam && VALID_USAGE_TYPES.includes(usageParam as MediaUsageType)) {
    usageType = usageParam as MediaUsageType;
  }

  const assets = await listMediaAssets({ folder, usageType, search });
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

    if (productionFile === "true") {
      const { asset } = await uploadProductionFileAsset({
        file: fileEntry as File,
        title: typeof title === "string" ? title : undefined,
        tags,
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
    const status = message.includes("configured") || message.includes("TOKEN") ? 500 : 400;
    return NextResponse.json({ message }, { status });
  }
}
