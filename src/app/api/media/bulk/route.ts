import { NextResponse } from "next/server";
import {
  bulkUpdateMediaAssets,
  MEDIA_BULK_UPDATE_MAX,
  parseMediaMetadataPatchBody,
} from "@/features/media/services/media.service";
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

  const parsed = parseMediaMetadataPatchBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  if (!parsed.hasUpdates) {
    return NextResponse.json(
      { message: "Cần chọn ít nhất một trường metadata để cập nhật" },
      { status: 400 },
    );
  }

  try {
    const updatedCount = await bulkUpdateMediaAssets(ids, parsed.data);
    if (updatedCount === 0) {
      return NextResponse.json({ message: "Không tìm thấy ảnh nào" }, { status: 404 });
    }
    return NextResponse.json({ updatedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi cập nhật hàng loạt";
    const status =
      message.includes("không tồn tại") || message.includes("vô hiệu hóa") ? 400 : 500;
    console.error("[PATCH /api/media/bulk]", err);
    return NextResponse.json({ message }, { status });
  }
}
