import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  buildGenerationStatus,
  deriveTimeline,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { draftId } = await context.params;
  const store = createPrismaGenerationOrchestratorStore();
  const runs = await store.listRunsForDraft(draftId);
  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      provider: r.provider,
      model: r.model,
      completedSectionIds: r.completedSectionIds,
      failedSectionIds: r.failedSectionIds,
      totalTokens: r.totalTokens,
      estimatedCostUsd: r.estimatedCostUsd,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    })),
  });
}
