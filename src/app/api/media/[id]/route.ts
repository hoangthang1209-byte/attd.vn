import { NextResponse } from "next/server";
import { deleteMediaAsset } from "@/features/media/services/media.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const deleted = await deleteMediaAsset(id);
    if (!deleted) {
      return NextResponse.json({ message: "Không tìm thấy file" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/media/[id]] DELETE failed:", err);
    return NextResponse.json({ message: "Xóa file thất bại" }, { status: 500 });
  }
}
