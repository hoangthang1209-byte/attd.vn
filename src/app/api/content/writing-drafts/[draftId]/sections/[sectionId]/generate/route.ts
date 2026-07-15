import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { getWritingGenerationSafeStatus } from "@/features/writing-engine/writing-generation-config";
import {
  startGenerationRun,
  WritingGenerationError,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";
import { WritingProviderRouterError } from "@/features/writing-engine/services/writing-provider-router.service";

type RouteContext = { params: Promise<{ draftId: string; sectionId: string }> };

async function runSection(
  req: NextRequest,
  context: RouteContext,
  opts: { regenerate?: boolean; trigger?: "RETRY" | "REGENERATE" | "INITIAL" }
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { draftId, sectionId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  const store = createPrismaGenerationOrchestratorStore();
  const draft = await store.findDraft(draftId);
  if (!draft) {
    return NextResponse.json({ message: "Draft not found" }, { status: 404 });
  }

  try {
    const result = await startGenerationRun(
      {
        writingPlanId: draft.writingPlanId,
        draftId,
        mode: "SELECTED",
        sectionIds: [sectionId],
        regenerate: opts.regenerate === true || raw.regenerate === true,
        confirmLockedOverwrite: raw.confirmLockedOverwrite === true,
        requestedBy: permission.user.userId ?? permission.user.username ?? null,
        trigger: opts.trigger,
      },
      store
    );
    return NextResponse.json({
      run: result.run,
      draft: result.draft,
      events: result.events,
      providerStatus: getWritingGenerationSafeStatus(),
    });
  } catch (err) {
    if (err instanceof WritingGenerationError || err instanceof WritingProviderRouterError) {
      return NextResponse.json(
        { message: err.message, code: err.code, providerStatus: getWritingGenerationSafeStatus() },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  return runSection(req, context, { regenerate: false, trigger: "INITIAL" });
}
