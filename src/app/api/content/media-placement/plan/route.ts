import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { planInlineMediaPlacement } from "@/features/content/inline-media/inline-media-planner.service";
import { serializeInlineMediaPlan } from "@/features/content/inline-media/serialize-inline-media-plan";

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const blogPostId = typeof body.blogPostId === "string" ? body.blogPostId : null;
  const writingDraftId = typeof body.writingDraftId === "string" ? body.writingDraftId : null;
  const topicId = typeof body.topicId === "string" ? body.topicId : null;
  const mediaBundleId = typeof body.mediaBundleId === "string" ? body.mediaBundleId : null;
  const contentHtml = typeof body.contentHtml === "string" ? body.contentHtml : null;

  if (!blogPostId && !writingDraftId && !contentHtml) {
    return NextResponse.json(
      { message: "Cần blogPostId, writingDraftId hoặc contentHtml." },
      { status: 400 },
    );
  }

  try {
    const started = Date.now();
    const plan = await planInlineMediaPlacement({
      blogPostId,
      writingDraftId,
      topicId,
      mediaBundleId,
      contentHtml,
      mode: "SUGGEST_ONLY",
      excludedMediaIds: Array.isArray(body.excludedMediaIds)
        ? body.excludedMediaIds.filter((item): item is string => typeof item === "string")
        : undefined,
      rejectedMediaIds: Array.isArray(body.rejectedMediaIds)
        ? body.rejectedMediaIds.filter((item): item is string => typeof item === "string")
        : undefined,
    });

    console.info("[inline-media:plan]", {
      blogPostId,
      writingDraftId,
      proposed: plan.proposedCount,
      target: plan.targetCount,
      candidates: plan.diagnostics.candidateCount,
      bundleHits: plan.diagnostics.bundleHitCount,
      discoveryHits: plan.diagnostics.discoveryHitCount,
      durationMs: Date.now() - started,
    });

    return NextResponse.json({ plan: serializeInlineMediaPlan(plan) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lập được kế hoạch ảnh.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
