import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  cancelGenerationRun,
  WritingGenerationError,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { runId } = await context.params;
  try {
    const run = await cancelGenerationRun(runId, createPrismaGenerationOrchestratorStore());
    return NextResponse.json({ run, message: "Đã hủy generation run." });
  } catch (err) {
    if (err instanceof WritingGenerationError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Cancel failed" }, { status: 500 });
  }
}
