import { NextRequest, NextResponse } from "next/server";
import {
  deleteMediaAsset,
  getMediaAssetById,
  MediaAssetInUseError,
  parseMediaMetadataPatchBody,
  updateMediaAsset,
} from "@/features/media/services/media.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  const asset = await getMediaAssetById(id);
  if (!asset) return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const parsed = parseMediaMetadataPatchBody(body as Record<string, unknown>);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  if (!parsed.hasUpdates) {
    return NextResponse.json({ message: "Không có trường metadata để cập nhật" }, { status: 400 });
  }

  try {
    const updated = await updateMediaAsset(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi cập nhật";
    const status =
      message.includes("không tồn tại") || message.includes("vô hiệu hóa") ? 400 : 500;
    console.error("[PATCH /api/media/[id]]", err);
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "delete",
    request,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  try {
    const deleted = await deleteMediaAsset(id);
    if (!deleted) return NextResponse.json({ message: "Không tìm thấy file" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof MediaAssetInUseError) {
      return NextResponse.json(
        {
          message: err.message,
          referenceCount: err.references.length,
          references: err.references,
        },
        { status: 409 },
      );
    }
    console.error("[api/media/[id]] DELETE failed:", err);
    return NextResponse.json({ message: "Xóa file thất bại" }, { status: 500 });
  }
}
