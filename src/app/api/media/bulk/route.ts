import { NextResponse } from "next/server";
import {
  bulkUpdateMediaAssets,
  MEDIA_BULK_UPDATE_MAX,
  parseMediaMetadataPatchBody,
} from "@/features/media/services/media.service";
import { bulkAssignMediaCollections } from "@/features/media/services/media-collection.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function PATCH(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const idsRaw = raw.ids;

  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    return NextResponse.json({ message: "Danh sách ảnh không hợp lệ" }, { status: 400 });
  }

  if (!idsRaw.every((id) => typeof id === "string" && id.trim())) {
    return NextResponse.json({ message: "Danh sách ảnh không hợp lệ" }, { status: 400 });
  }

  const ids = [...new Set(idsRaw.map((id) => (id as string).trim()))];
  if (ids.length > MEDIA_BULK_UPDATE_MAX) {
    return NextResponse.json(
      { message: `Chỉ có thể cập nhật tối đa ${MEDIA_BULK_UPDATE_MAX} ảnh mỗi lần` },
      { status: 400 },
    );
  }

  const hasCollectionOps =
    ("addCollectionIds" in raw && Array.isArray(raw.addCollectionIds)) ||
    ("removeCollectionIds" in raw && Array.isArray(raw.removeCollectionIds));

  const parsed = parseMediaMetadataPatchBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  if (!parsed.hasUpdates && !hasCollectionOps) {
    return NextResponse.json(
      { message: "Cần chọn ít nhất một trường metadata để cập nhật" },
      { status: 400 },
    );
  }

  try {
    let updatedCount = 0;
    let addedCount = 0;
    let removedCount = 0;

    if (parsed.hasUpdates) {
      updatedCount = await bulkUpdateMediaAssets(ids, parsed.data);
      if (updatedCount === 0 && !hasCollectionOps) {
        return NextResponse.json({ message: "Không tìm thấy ảnh nào" }, { status: 404 });
      }
    }

    if (hasCollectionOps) {
      const addCollectionIds = Array.isArray(raw.addCollectionIds)
        ? raw.addCollectionIds.filter((id): id is string => typeof id === "string")
        : [];
      const removeCollectionIds = Array.isArray(raw.removeCollectionIds)
        ? raw.removeCollectionIds.filter((id): id is string => typeof id === "string")
        : [];

      const result = await bulkAssignMediaCollections({
        assetIds: ids,
        addCollectionIds,
        removeCollectionIds,
      });
      updatedCount = Math.max(updatedCount, result.updatedAssetCount);
      addedCount = result.addedCount;
      removedCount = result.removedCount;
    }

    return NextResponse.json({ updatedCount, addedCount, removedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi cập nhật hàng loạt";
    const status =
      message.includes("không tồn tại") ||
      message.includes("vô hiệu hóa") ||
      message.includes("Không tìm thấy") ||
      message.includes("Cần chọn")
        ? 400
        : 500;
    console.error("[PATCH /api/media/bulk]", err);
    return NextResponse.json({ message }, { status });
  }
}
