import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { removeInlineMediaPlacement } from "@/features/content/inline-media/inline-media-apply.service";

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
  if (!blogPostId || !blockId) {
    return NextResponse.json({ message: "Cần blogPostId và blockId." }, { status: 400 });
  }

  try {
    const result = await removeInlineMediaPlacement({ blogPostId, blockId });
    console.info("[inline-media:remove]", { blogPostId, blockId });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không xóa được placement.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
