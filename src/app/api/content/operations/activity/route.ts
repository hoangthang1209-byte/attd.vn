import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getOperationsActivityFeed } from "@/features/content/services/content-operations.service";

/**
 * Sprint 17.1 — Activity feed. GET-only, read-only. Derived audit trail
 * merged from ContentReviewDecision / ContentPublishEvent /
 * ContentHandoffRecord / AiGenerationRun / WritingGenerationRun /
 * WritingDraftVersion — there is no new event-log table.
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take");
  const take = takeParam ? Number.parseInt(takeParam, 10) : undefined;

  try {
    const activity = await getOperationsActivityFeed({ take: Number.isFinite(take) && take ? take : undefined });
    return NextResponse.json({ activity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tải được hoạt động vận hành.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
