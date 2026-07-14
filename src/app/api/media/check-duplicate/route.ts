import { NextResponse } from "next/server";
import {
  calculateMediaContentHash,
  findExactDuplicateByHash,
  findPossibleDuplicates,
} from "@/features/media/services/media-duplicate.service";
import { validateImageUpload, MAX_IMAGE_SIZE } from "@/lib/storage/types";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "create",
    request,
  });
  if (!permission.ok) return permission.response;

  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json({ message: "File là bắt buộc" }, { status: 400 });
    }

    const file = fileEntry as File;
    const validation = validateImageUpload({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      maxSizeBytes: MAX_IMAGE_SIZE,
    });
    if ("error" in validation) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = calculateMediaContentHash(buffer);
    const exactDuplicate = await findExactDuplicateByHash(contentHash);
    const possibleDuplicates = await findPossibleDuplicates({
      excludeId: exactDuplicate?.id,
      limit: 5,
    });

    return NextResponse.json({
      contentHash,
      exactDuplicate,
      possibleDuplicates,
    });
  } catch (err) {
    console.error("[POST /api/media/check-duplicate]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể kiểm tra trùng ảnh" },
      { status: 500 },
    );
  }
}
