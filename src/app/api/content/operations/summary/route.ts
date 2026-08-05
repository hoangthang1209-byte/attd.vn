import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getContentOperationsCommandCenter } from "@/features/content/services/content-operations.service";

/**
 * Sprint 17.0 — Content Operations Command Center.
 * GET-only, read-only aggregate. No workflow mutation endpoints exist on this
 * route on purpose — the command center never writes Topic/Brief/Writing/
 * Review/Publish/Media/Knowledge state.
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const summary = await getContentOperationsCommandCenter({
      limit: Number.isFinite(limit) && limit ? limit : undefined,
    });
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tải được trung tâm vận hành nội dung.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
