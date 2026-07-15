import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  renderWritingDraft,
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
    const result = await renderWritingDraft(draftId);
    return NextResponse.json({
      rendered: result.rendered,
      draft: result.draft,
    });
  } catch (err) {
    if (err instanceof WritingEngineError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Không thể render draft" }, { status: 500 });
  }
}
