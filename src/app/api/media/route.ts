import { NextResponse } from "next/server";
import type { MediaFolder } from "@prisma/client";
import {
  listMediaAssets,
  uploadMediaAsset,
} from "@/features/media/services/media.service";
import { STORAGE_FOLDER_TO_MEDIA, type StorageFolderKey } from "@/lib/storage/types";

const VALID_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];
const isDev = process.env.NODE_ENV === "development";

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
    const folder = formData.get("folder");
    const altText = formData.get("altText");

    if (!folder || typeof folder !== "string" || !VALID_FOLDERS.includes(folder as StorageFolderKey)) {
      return NextResponse.json(
        { message: "folder không hợp lệ" },
        { status: 400 }
      );
    }

    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json({ message: "File ảnh là bắt buộc" }, { status: 400 });
    }

    const file = fileEntry;
    console.log(
      `[api/media] upload folder="${folder}" name="${file.name}" type="${file.type}" size=${file.size}`
    );

    const asset = await uploadMediaAsset({
      folder: folder as StorageFolderKey,
      file,
      altText: typeof altText === "string" ? altText : undefined,
    });

    console.log(`[api/media] ✓ created MediaAsset id=${asset.id} url=${asset.url}`);
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload thất bại";
    console.error("[api/media] POST failed:", err);
    const status = message.includes("BLOB_READ_WRITE_TOKEN") ? 500 : 400;
    return NextResponse.json({ message }, { status });
  }
}
