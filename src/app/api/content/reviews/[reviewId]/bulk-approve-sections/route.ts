import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentReviewError,
  bulkApproveEligibleSections,
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
    const result = await bulkApproveEligibleSections({
      reviewId,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      confirmed: raw.confirmed === true,
      note: typeof raw.note === "string" ? raw.note : null,
    });
    return NextResponse.json({
      ...result,
      message: `Đã duyệt ${result.approvedSectionIds.length} đoạn đạt điều kiện.`,
    });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Duyệt hàng loạt thất bại" }, { status: 500 });
  }
}
