import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  ContentReviewError,
  refreshReviewIssuesFromQa,
} from "@/features/content/services/content-review.service";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { reviewId } = await context.params;
  try {
    const result = await refreshReviewIssuesFromQa(
      reviewId,
      permission.user.userId ?? permission.user.username ?? "unknown"
    );
    return NextResponse.json({ ...result, message: "Đã refresh QA issues" });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "QA refresh failed" }, { status: 500 });
  }
}
