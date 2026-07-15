import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  buildGenerationStatus,
  deriveTimeline,
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
    return NextResponse.json({ message: "Run not found" }, { status: 404 });
  }
  const sections = await store.listSectionsForRun(runId);
  return NextResponse.json({
    status: buildGenerationStatus(run, sections),
    timeline: deriveTimeline(run, sections).slice(-20),
  });
}
