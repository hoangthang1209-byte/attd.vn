import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentPublishError,
  publishBlogNow,
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
  const raw = (await parseJsonBody(req)) ?? {};
  try {
    const result = await publishBlogNow({
      blogPostId: id,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      confirmChecked: raw.confirmChecked === true,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ContentPublishError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    console.error("[publish]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
