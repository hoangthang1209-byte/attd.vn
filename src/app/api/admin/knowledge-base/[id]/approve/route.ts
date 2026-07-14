import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { approveKnowledgeBaseEntry } from "@/features/knowledge-base/knowledge-base-governance.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const entry = await approveKnowledgeBaseEntry(id, {
      username: permission.user.username,
      userId: permission.user.userId,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof Error && err.message === "ENTRY_NOT_FOUND") {
      return NextResponse.json({ message: "Không tìm thấy entry" }, { status: 404 });
    }
    console.error("[POST knowledge-base approve]", err);
    return NextResponse.json({ message: "Không thể phê duyệt" }, { status: 500 });
  }
}
