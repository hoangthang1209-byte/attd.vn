import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  ContentPublishError,
  cancelScheduledPublish,
} from "@/features/content/services/content-publishing.service";

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
    const result = await cancelScheduledPublish({
      blogPostId: id,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ContentPublishError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Cancel failed" }, { status: 500 });
  }
}
