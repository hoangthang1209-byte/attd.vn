import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  applyMediaAssetReplacement,
  planMediaAssetReplacement,
} from "@/features/media/lifecycle/media-replacement.service";
import { selectReplacementAsset } from "@/features/media/lifecycle/lifecycle-transition.service";
import { MediaLifecycleError } from "@/features/media/lifecycle/lifecycle.types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "plan";
  const replacementAssetId =
    typeof body.replacementAssetId === "string" ? body.replacementAssetId : null;
  const actorId = permission.user.userId ?? permission.user.username ?? null;

  try {
    if (action === "select") {
      const updated = await selectReplacementAsset({
        mediaAssetId: id,
        replacementAssetId,
        actorId,
        reason: typeof body.reason === "string" ? body.reason : null,
      });
      return NextResponse.json({ ok: true, replacementAssetId: updated.replacementAssetId });
    }

    if (!replacementAssetId) {
      return NextResponse.json(
        { code: "REPLACEMENT_INVALID", message: "Thiếu replacementAssetId" },
        { status: 400 },
      );
    }

    if (action === "apply") {
      const mode =
        body.mode === "APPLY_SELECTED"
          ? "APPLY_SELECTED"
          : body.mode === "PREVIEW"
            ? "PREVIEW"
            : "APPLY_SUPPORTED";
      const result = await applyMediaAssetReplacement({
        sourceAssetId: id,
        replacementAssetId,
        mode,
        selectedKeys: Array.isArray(body.selectedKeys)
          ? body.selectedKeys.filter((k): k is string => typeof k === "string")
          : undefined,
        actorId,
        reason: typeof body.reason === "string" ? body.reason : null,
        inheritBundleJoins: body.inheritBundleJoins === true,
        inheritCollectionJoins: body.inheritCollectionJoins === true,
      });
      return NextResponse.json(result);
    }

    const plan = await planMediaAssetReplacement({
      sourceAssetId: id,
      replacementAssetId,
    });
    return NextResponse.json(plan);
  } catch (err) {
    if (err instanceof MediaLifecycleError) {
      return NextResponse.json(
        { code: err.code, message: err.message, details: err.details },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Replacement failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
