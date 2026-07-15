import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  getContentHandoff,
} from "@/features/content/services/writing-blog-handoff.service";
import { ContentReviewError } from "@/features/content/services/content-review.service";

type RouteContext = { params: Promise<{ handoffId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { handoffId } = await context.params;
  try {
    const handoff = await getContentHandoff(handoffId);
    return NextResponse.json({ handoff });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}
