import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentReviewError,
  approveWritingDraftReview,
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
  const startedAt = Date.now();
  try {
    const result = await approveWritingDraftReview({
      reviewId,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      note: typeof raw.note === "string" ? raw.note : null,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.alreadyApproved
        ? "Review đã được phê duyệt trước đó — không tạo quyết định trùng."
        : "Draft APPROVED — chưa tạo Blog. Dùng Handoff riêng.",
    });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code, ...(err.details ?? {}) },
        { status: err.status },
      );
    }
    // The service logs and wraps everything it can reach, so this is a failure
    // outside it (auth/session plumbing). Keep the client message actionable
    // without leaking the underlying error text.
    const errorName = err instanceof Error ? err.name : "Error";
    console.error(
      JSON.stringify({
        op: "content.reviews.approve",
        ok: false,
        reviewId,
        stage: "route",
        durationMs: Date.now() - startedAt,
        errorName,
        errorMessage: (err instanceof Error ? err.message : "unknown").slice(0, 300),
      }),
    );
    return NextResponse.json(
      {
        ok: false,
        code: "APPROVE_ROUTE_FAILED",
        message: `Phê duyệt thất bại ở tầng API (${errorName}). Không có thay đổi nào được lưu — thử lại, nếu vẫn lỗi hãy gửi mã này cho kỹ thuật.`,
        stage: "route",
      },
      { status: 500 },
    );
  }
}
