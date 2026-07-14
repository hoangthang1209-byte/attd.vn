import { NextRequest, NextResponse } from "next/server";
import { reorderSlotAssets } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; slotId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { slotId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  if (
    !Array.isArray(raw.orderedMediaAssetIds) ||
    !raw.orderedMediaAssetIds.every((v) => typeof v === "string")
  ) {
    return NextResponse.json({ message: "Danh sách sắp xếp không hợp lệ" }, { status: 400 });
  }

  try {
    const bundle = await reorderSlotAssets(slotId, raw.orderedMediaAssetIds as string[]);
    return NextResponse.json({ bundle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể sắp xếp lại ảnh";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
