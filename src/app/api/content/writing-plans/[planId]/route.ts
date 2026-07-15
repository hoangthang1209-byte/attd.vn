import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getWritingPlan, WritingEngineError } from "@/features/writing-engine/services/writing-engine.service";
import { toSafeWritingPlanSummary } from "@/features/writing-engine/services/writing-engine.wiring";

type RouteContext = { params: Promise<{ planId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { planId } = await context.params;
  try {
    const { plan, record } = await getWritingPlan(planId);
    return NextResponse.json({
      summary: toSafeWritingPlanSummary(record),
      plan,
    });
  } catch (err) {
    if (err instanceof WritingEngineError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Không thể tải plan" }, { status: 500 });
  }
}
