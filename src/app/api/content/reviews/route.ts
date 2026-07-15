import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { listContentReviews } from "@/features/content/services/content-review.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const assigned = searchParams.get("assigned") === "me"
    ? permission.user.userId ?? permission.user.username ?? undefined
    : searchParams.get("assignedReviewerId") ?? undefined;

  const reviews = await listContentReviews({
    status,
    assignedReviewerId: assigned,
  });

  return NextResponse.json({ reviews });
}
