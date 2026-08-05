import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getOperationsReviewInbox } from "@/features/content/services/content-operations.service";

/**
 * Sprint 17.1 — Review Inbox. GET-only, read-only. Wraps/extends
 * `listContentReviews` with topic priority/owner/campaign/cluster and
 * queue-health grouping — never mutates a review session.
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take");
  const take = takeParam ? Number.parseInt(takeParam, 10) : undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const assignedReviewerId = url.searchParams.get("assignedReviewerId") ?? undefined;

  try {
    const inbox = await getOperationsReviewInbox({
      take: Number.isFinite(take) && take ? take : undefined,
      status,
      assignedReviewerId,
    });
    return NextResponse.json({ inbox });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tải được hàng đợi kiểm duyệt.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
