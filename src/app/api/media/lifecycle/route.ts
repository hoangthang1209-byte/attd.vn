import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  bulkLifecycleUpdate,
  getLifecycleDashboardCounts,
  listLifecycleQueue,
  type BulkLifecycleAction,
} from "@/features/media/lifecycle/lifecycle-queue.service";
import { MediaLifecycleError, type LifecycleQueueView } from "@/features/media/lifecycle/lifecycle.types";

const VIEWS = new Set<LifecycleQueueView>([
  "needs_review",
  "deprecated",
  "archived",
  "retired",
  "replacement_pending",
  "rights_expiring",
  "rights_expired",
  "unknown_rights_public",
  "unsupported_legacy",
]);

export async function GET(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const url = new URL(request.url);
  if (url.searchParams.get("dashboard") === "1") {
    const counts = await getLifecycleDashboardCounts();
    return NextResponse.json({ counts });
  }

  const viewRaw = url.searchParams.get("view") ?? "needs_review";
  const view = (VIEWS.has(viewRaw as LifecycleQueueView)
    ? viewRaw
    : "needs_review") as LifecycleQueueView;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "40", 10);
  const queue = await listLifecycleQueue({
    view,
    cursor,
    limit: Number.isFinite(limit) ? limit : 40,
  });
  return NextResponse.json(queue);
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const ids = body.mediaAssetIds;
  const action = body.action;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ message: "mediaAssetIds không hợp lệ" }, { status: 400 });
  }
  if (typeof action !== "string") {
    return NextResponse.json({ message: "Thiếu action" }, { status: 400 });
  }

  try {
    const result = await bulkLifecycleUpdate({
      mediaAssetIds: ids as string[],
      action: action as BulkLifecycleAction,
      actorId: permission.user.userId ?? permission.user.username ?? null,
      reason: typeof body.reason === "string" ? body.reason : null,
      nextLifecycleReviewAt:
        typeof body.nextLifecycleReviewAt === "string"
          ? new Date(body.nextLifecycleReviewAt)
          : null,
      rightsStatus: typeof body.rightsStatus === "string" ? (body.rightsStatus as never) : undefined,
      rightsExpiresAt:
        typeof body.rightsExpiresAt === "string" ? new Date(body.rightsExpiresAt) : null,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MediaLifecycleError) {
      return NextResponse.json(
        { code: err.code, message: err.message, details: err.details },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Bulk lifecycle failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
