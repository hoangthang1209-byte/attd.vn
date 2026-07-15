import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentPublishError,
  scheduleBlogPublish,
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
  const scheduledFor = typeof raw.scheduledFor === "string" ? new Date(raw.scheduledFor) : null;
  if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ message: "scheduledFor ISO datetime bắt buộc" }, { status: 400 });
  }
  try {
    const result = await scheduleBlogPublish({
      blogPostId: id,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      scheduledFor,
      confirmChecked: raw.confirmChecked === true,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ContentPublishError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Schedule failed" },
      { status: 500 }
    );
  }
}
