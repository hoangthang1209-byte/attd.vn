import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { getWritingGenerationSafeStatus } from "@/features/writing-engine/writing-generation-config";
import {
  startGenerationRun,
  WritingGenerationError,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";
import type { WritingGenerationMode } from "@/features/writing-engine/writing-engine.types";
import { WritingProviderRouterError } from "@/features/writing-engine/services/writing-provider-router.service";

type RouteContext = { params: Promise<{ planId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { planId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  const draftId = typeof raw.draftId === "string" ? raw.draftId : "";
  if (!draftId) {
    return NextResponse.json({ message: "draftId bắt buộc" }, { status: 400 });
  }

  const mode = (typeof raw.mode === "string" ? raw.mode : "ALL") as WritingGenerationMode;

  try {
    const store = createPrismaGenerationOrchestratorStore();
    const result = await startGenerationRun(
      {
        writingPlanId: planId,
        draftId,
        mode,
        sectionIds: Array.isArray(raw.sectionIds) ? raw.sectionIds.map(String) : [],
        regenerate: raw.regenerate === true,
        confirmLockedOverwrite: raw.confirmLockedOverwrite === true,
        requestedBy: permission.user.userId ?? permission.user.username ?? null,
      },
      store
    );

    return NextResponse.json({
      run: result.run,
      draft: result.draft,
      cacheReused: result.cacheReused,
      skippedLocked: result.skippedLocked,
      events: result.events,
      providerStatus: getWritingGenerationSafeStatus(),
      message: "Generation hoàn tất (không tạo Blog, không publish).",
    });
  } catch (err) {
    if (err instanceof WritingGenerationError || err instanceof WritingProviderRouterError) {
      return NextResponse.json(
        { message: err.message, code: err.code, providerStatus: getWritingGenerationSafeStatus() },
        { status: err.status }
      );
    }
    console.error("[POST generate]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
