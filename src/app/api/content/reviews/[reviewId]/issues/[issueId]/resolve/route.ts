import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  ContentReviewError,
  resolveReviewIssue,
} from "@/features/content/services/content-review.service";

type RouteContext = { params: Promise<{ reviewId: string; issueId: string }> };

async function handle(
  req: NextRequest,
  context: RouteContext,
  action: "resolve" | "dismiss" | "reopen"
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: action === "dismiss" ? "delete" : "update",
    request: req,
  });
  // If dismiss needs delete permission and user lacks it, fall back to update with canDismissBlocking=false for warnings only
  if (!permission.ok && action === "dismiss") {
    const fallback = await requireAdminPermission({
      platform: "content",
      action: "update",
      request: req,
    });
    if (!fallback.ok) return fallback.response;
    const { reviewId, issueId } = await context.params;
    const raw = (await parseJsonBody(req)) ?? {};
    try {
      const result = await resolveReviewIssue({
        reviewId,
        issueId,
        actorId: fallback.user.userId ?? fallback.user.username ?? "unknown",
        action,
        note: typeof raw.note === "string" ? raw.note : null,
        canDismissBlocking: false,
      });
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof ContentReviewError) {
        return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
      }
      return NextResponse.json({ message: "Issue action failed" }, { status: 500 });
    }
  }
  if (!permission.ok) return permission.response;

  const { reviewId, issueId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  try {
    const result = await resolveReviewIssue({
      reviewId,
      issueId,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      action,
      note: typeof raw.note === "string" ? raw.note : null,
      canDismissBlocking: action === "dismiss" && permission.ok,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Issue action failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  // path ends with resolve|dismiss|reopen — this file is for resolve; siblings for others
  return handle(req, context, "resolve");
}
