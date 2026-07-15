import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  createEmptyDraftFromPlan,
  WritingEngineError,
} from "@/features/writing-engine/services/writing-engine.service";
import { toSafeWritingDraftSummary } from "@/features/writing-engine/services/writing-engine.wiring";

type RouteContext = { params: Promise<{ planId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { planId } = await context.params;
  try {
    const result = await createEmptyDraftFromPlan(
      planId,
      permission.user.userId ?? permission.user.username ?? null
    );
    return NextResponse.json({
      draft: result.draft,
      summary: toSafeWritingDraftSummary(result.record),
      message: "Đã tạo draft shell trống — không có nội dung văn bản.",
    });
  } catch (err) {
    if (err instanceof WritingEngineError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Không thể tạo draft" }, { status: 500 });
  }
}
