import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  runWritingQaForDraft,
  WritingEngineError,
} from "@/features/writing-engine/services/writing-engine.service";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { draftId } = await context.params;
  try {
    const result = await runWritingQaForDraft(draftId);
    return NextResponse.json({
      qa: result.qa,
      draft: result.draft,
      message: result.qa.passed ? "QA passed" : "QA có vấn đề — xem báo cáo",
    });
  } catch (err) {
    if (err instanceof WritingEngineError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Không thể chạy QA" }, { status: 500 });
  }
}
