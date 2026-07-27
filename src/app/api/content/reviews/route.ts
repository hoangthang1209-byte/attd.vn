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
  const takeRaw = Number(searchParams.get("take") ?? 50);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(1, Math.trunc(takeRaw)), 50) : 50;

  const started = Date.now();
  try {
    const reviews = await listContentReviews({
      status,
      assignedReviewerId: assigned,
      take,
    });
    console.info(
      JSON.stringify({
        op: "content.reviews.list",
        ok: true,
        durationMs: Date.now() - started,
        itemCount: reviews.length,
        take,
      }),
    );
    return NextResponse.json({ reviews });
  } catch (err) {
    console.error(
      JSON.stringify({
        op: "content.reviews.list",
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải kiểm duyệt" },
      { status: 500 },
    );
  }
}
