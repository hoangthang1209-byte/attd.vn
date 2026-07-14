import { NextRequest, NextResponse } from "next/server";
import { removeAssetFromSlot } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; slotId: string; mediaAssetId: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { slotId, mediaAssetId } = await context.params;
  try {
    const bundle = await removeAssetFromSlot(slotId, mediaAssetId);
    return NextResponse.json({ bundle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể gỡ ảnh khỏi vị trí";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
