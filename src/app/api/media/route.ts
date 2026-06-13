import { NextResponse } from "next/server";
import type { MediaFolder } from "@prisma/client";
import {
  listMediaAssets,
  uploadMediaAsset,
} from "@/features/media/services/media.service";
import { STORAGE_FOLDER_TO_MEDIA, type StorageFolderKey } from "@/lib/storage";

const VALID_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const folderParam = searchParams.get("folder");

  let folder: MediaFolder | undefined;
  if (folderParam && VALID_FOLDERS.includes(folderParam as StorageFolderKey)) {
    folder = STORAGE_FOLDER_TO_MEDIA[folderParam as StorageFolderKey];
  }

  const assets = await listMediaAssets({ folder, search });
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");
    const altText = formData.get("altText");

    if (!folder || typeof folder !== "string" || !VALID_FOLDERS.includes(folder as StorageFolderKey)) {
      return NextResponse.json(
        { message: "folder không hợp lệ" },
        { status: 400 }
      );
    }

    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "File ảnh là bắt buộc" }, { status: 400 });
    }

    const asset = await uploadMediaAsset({
      folder: folder as StorageFolderKey,
      file,
      altText: typeof altText === "string" ? altText : undefined,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload thất bại";
    return NextResponse.json({ message }, { status: 400 });
  }
}
