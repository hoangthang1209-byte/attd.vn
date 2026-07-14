import { NextRequest, NextResponse } from "next/server";
import { getMediaBundleForContent } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

/** Retrieval contract for content-authoring surfaces (blog/landing editors, etc.). */
export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const bundle = await getMediaBundleForContent(id);
  if (!bundle) {
    return NextResponse.json({ message: "Không tìm thấy bộ media" }, { status: 404 });
  }
  return NextResponse.json({ bundle });
}
