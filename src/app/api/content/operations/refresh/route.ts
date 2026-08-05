import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getOperationsRefreshInbox } from "@/features/content/services/content-operations.service";

/**
 * Sprint 17.1 — Refresh Inbox. GET-only, read-only. Published topics with
 * refresh signals (`reasons: string[]`) — never edits a topic.
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take");
  const take = takeParam ? Number.parseInt(takeParam, 10) : undefined;

  try {
    const inbox = await getOperationsRefreshInbox({ take: Number.isFinite(take) && take ? take : undefined });
    return NextResponse.json({ inbox });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tải được hàng đợi làm mới.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
