import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  buildGenerationStatus,
  deriveTimeline,
  WritingGenerationError,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { runId } = await context.params;
  const store = createPrismaGenerationOrchestratorStore();
  const run = await store.getRun(runId);
  if (!run) {
    return NextResponse.json({ message: "Run not found", code: "RUN_NOT_FOUND" }, { status: 404 });
  }
  const sections = await store.listSectionsForRun(runId);
  return NextResponse.json({
    run,
    sections: sections.map((s) => ({
      id: s.id,
      sectionId: s.sectionId,
      sectionKey: s.sectionKey,
      status: s.status,
      attempt: s.attempt,
      latencyMs: s.latencyMs,
      totalTokens: s.totalTokens,
      estimatedCostUsd: s.estimatedCostUsd,
      errorMessage: s.errorMessage,
      validationIssues: s.validationIssues,
      qaIssues: s.qaIssues,
    })),
    status: buildGenerationStatus(run, sections),
    timeline: deriveTimeline(run, sections),
  });
}
