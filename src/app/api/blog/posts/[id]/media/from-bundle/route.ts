import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  getBlogMediaWorkspace,
  importBundleAssetsToContent,
} from "@/features/content/services/content-media-assignment.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
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
  const mediaBundleId = typeof raw.mediaBundleId === "string" ? raw.mediaBundleId : "";
  if (!mediaBundleId) {
    return NextResponse.json({ message: "Thiếu mediaBundleId" }, { status: 400 });
  }

  try {
    const result = await importBundleAssetsToContent({
      entityType: "BLOG_POST",
      entityId: id,
      mediaBundleId,
      keepBundleLink: raw.keepBundleLink !== false,
      replaceExisting: raw.replaceExisting === true,
      slotIds: Array.isArray(raw.slotIds)
        ? raw.slotIds.filter((v): v is string => typeof v === "string")
        : undefined,
      mediaAssetIds: Array.isArray(raw.mediaAssetIds)
        ? raw.mediaAssetIds.filter((v): v is string => typeof v === "string")
        : undefined,
    });
    const workspace = await getBlogMediaWorkspace(id);
    return NextResponse.json({ ...result, ...workspace });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể nhập từ Bundle";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
