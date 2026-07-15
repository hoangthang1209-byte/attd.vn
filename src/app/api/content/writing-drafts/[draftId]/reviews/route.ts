import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  ContentReviewError,
  startContentReview,
} from "@/features/content/services/content-review.service";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { draftId } = await context.params;
  const actorId = permission.user.userId ?? permission.user.username ?? "unknown";

  try {
    const result = await startContentReview({ writingDraftId: draftId, actorId });
    return NextResponse.json({
      review: result.session,
      readiness: result.readiness,
      message: "Đã bắt đầu review — chưa approve.",
    });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST reviews]", err);
    return NextResponse.json({ message: "Không thể start review" }, { status: 500 });
  }
}
