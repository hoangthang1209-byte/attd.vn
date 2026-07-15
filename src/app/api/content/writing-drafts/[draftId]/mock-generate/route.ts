import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  isWritingMockEnabled,
  mockGenerateDraftSections,
  WritingEngineError,
} from "@/features/writing-engine/services/writing-engine.service";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  if (!isWritingMockEnabled()) {
    return NextResponse.json({ message: "Mock generation disabled", code: "MOCK_DISABLED" }, { status: 404 });
  }

  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { draftId } = await context.params;
  try {
    const result = await mockGenerateDraftSections(draftId);
    return NextResponse.json({
      draft: result.draft,
      message: "MOCK — không phải nội dung production",
    });
  } catch (err) {
    if (err instanceof WritingEngineError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Mock generation failed" }, { status: 500 });
  }
}
