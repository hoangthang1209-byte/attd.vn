import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentReviewError,
  rejectReviewSection,
} from "@/features/content/services/content-review.service";

type RouteContext = { params: Promise<{ reviewId: string; sectionId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { reviewId, sectionId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  try {
    const result = await rejectReviewSection({
      reviewId,
      sectionId,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      note: typeof raw.note === "string" ? raw.note : "",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Reject section failed" }, { status: 500 });
  }
}
