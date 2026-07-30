import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentReviewError,
  restartContentReview,
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
  const raw = (await parseJsonBody(req)) ?? {};
  try {
    const result = await restartContentReview({
      reviewId,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      note: typeof raw.note === "string" ? raw.note : null,
    });
    return NextResponse.json({
      ...result,
      reviewId: result.session.id,
      adminRoute: `/admin/content/reviews/${result.session.id}`,
      message: result.recovered
        ? "Đã khôi phục: tạo phiên kiểm duyệt kế nhiệm từ bản nháp mới nhất."
        : "Đã tạo phiên kiểm duyệt mới từ bản nháp mới nhất.",
    });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      // SUCCESSOR_EXISTS carries the successor route so the client can navigate
      // instead of dead-ending on an error.
      return NextResponse.json(
        { message: err.message, code: err.code, ...(err.details ?? {}) },
        { status: err.status },
      );
    }
    return NextResponse.json({ message: "Không tạo được phiên kiểm duyệt mới" }, { status: 500 });
  }
}
