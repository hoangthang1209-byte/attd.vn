import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  ContentPublishError,
  getPublishEvent,
} from "@/features/content/services/content-publishing.service";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { eventId } = await context.params;
  try {
    const event = await getPublishEvent(eventId);
    return NextResponse.json({ event });
  } catch (err) {
    if (err instanceof ContentPublishError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}
