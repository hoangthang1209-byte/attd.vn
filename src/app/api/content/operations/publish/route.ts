import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getOperationsPublishInbox } from "@/features/content/services/content-operations.service";

/**
 * Sprint 17.1 — Publish Inbox. GET-only, read-only. Merges every useful
 * publishing-queue kind (ready / scheduled / failed / recent / modified) —
 * never publishes, schedules, or cancels anything.
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  try {
    const inbox = await getOperationsPublishInbox();
    return NextResponse.json({ inbox });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tải được hàng đợi xuất bản.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
