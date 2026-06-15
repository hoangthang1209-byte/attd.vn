import { NextRequest, NextResponse } from "next/server";
import {
  deleteMediaAsset,
  getMediaAssetById,
  updateMediaAsset,
} from "@/features/media/services/media.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await getMediaAssetById(id);
  if (!asset) return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;
  try {
    const updated = await updateMediaAsset(id, {
      altText: typeof raw.altText === "string" ? raw.altText : undefined,
      title: typeof raw.title === "string" ? raw.title : undefined,
      tags: Array.isArray(raw.tags) ? raw.tags as string[] : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Lỗi cập nhật" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = await deleteMediaAsset(id);
    if (!deleted) return NextResponse.json({ message: "Không tìm thấy file" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/media/[id]] DELETE failed:", err);
    return NextResponse.json({ message: "Xóa file thất bại" }, { status: 500 });
  }
}
