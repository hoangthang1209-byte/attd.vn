import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { replaceInlineMediaPlacement } from "@/features/content/inline-media/inline-media-apply.service";

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const blogPostId = typeof body.blogPostId === "string" ? body.blogPostId : "";
  const blockId = typeof body.blockId === "string" ? body.blockId : "";
  const mediaAssetId = typeof body.mediaAssetId === "string" ? body.mediaAssetId : "";
  if (!blogPostId || !blockId || !mediaAssetId) {
    return NextResponse.json(
      { message: "Cần blogPostId, blockId và mediaAssetId." },
      { status: 400 },
    );
  }

  try {
    const result = await replaceInlineMediaPlacement({
      blogPostId,
      blockId,
      mediaAssetId,
      selectedBy: body.selectedBy === "SYSTEM" ? "SYSTEM" : "EDITOR",
    });
    console.info("[inline-media:replace]", { blogPostId, blockId, mediaAssetId });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thay được ảnh.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
