import { NextRequest, NextResponse } from "next/server";
import { getMediaAssetById } from "@/features/media/services/media.service";
import { resolveMediaReferences } from "@/features/media/services/media-reference.service";
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
  if (!asset) {
    return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  }

  const items = await resolveMediaReferences(id);
  return NextResponse.json({
    assetId: id,
    total: items.length,
    items,
  });
}
