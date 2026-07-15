import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentReviewError,
  resolveReviewIssue,
} from "@/features/content/services/content-review.service";

type RouteContext = { params: Promise<{ reviewId: string; issueId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const elevated = await requireAdminPermission({
    platform: "content",
    action: "delete",
    request: req,
  });
  const update = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!update.ok) return update.response;

  const { reviewId, issueId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  try {
    const result = await resolveReviewIssue({
      reviewId,
      issueId,
      actorId: update.user.userId ?? update.user.username ?? "unknown",
      action: "dismiss",
      note: typeof raw.note === "string" ? raw.note : null,
      canDismissBlocking: elevated.ok,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Dismiss failed" }, { status: 500 });
  }
}
