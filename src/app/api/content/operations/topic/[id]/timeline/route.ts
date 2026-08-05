import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getTopicOperationsTimeline } from "@/features/content/services/content-operations.service";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Sprint 17.1 — Topic-scoped operations timeline. GET-only, read-only.
 * Chronological union of every governed audit source for one topic.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await params;

  try {
    const timeline = await getTopicOperationsTimeline(id);
    return NextResponse.json({ timeline });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tải được dòng thời gian chủ đề.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
