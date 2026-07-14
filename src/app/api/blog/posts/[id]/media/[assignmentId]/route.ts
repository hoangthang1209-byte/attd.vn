import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  getBlogMediaWorkspace,
  removeContentMediaAssignment,
} from "@/features/content/services/content-media-assignment.service";

type RouteContext = { params: Promise<{ id: string; assignmentId: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, assignmentId } = await context.params;
  try {
    await removeContentMediaAssignment(assignmentId);
    const data = await getBlogMediaWorkspace(id);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xóa gán media";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
