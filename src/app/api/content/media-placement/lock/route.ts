import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { lockInlineMediaPlacement } from "@/features/content/inline-media/inline-media-apply.service";

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
  if (!blogPostId || !blockId || typeof body.locked !== "boolean") {
    return NextResponse.json(
      { message: "Cần blogPostId, blockId và locked (boolean)." },
      { status: 400 },
    );
  }

  try {
    const block = await lockInlineMediaPlacement({
      blogPostId,
      blockId,
      locked: body.locked,
    });
    console.info("[inline-media:lock]", { blogPostId, blockId, locked: body.locked });
    return NextResponse.json({ block });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không khóa được placement.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
