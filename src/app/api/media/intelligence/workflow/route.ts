import { NextResponse } from "next/server";
import { countPhotographerWorkflowLanes } from "@/features/media/intelligence/dashboard.service";
import { runMediaIngestPipeline } from "@/features/media/intelligence/ingest-pipeline.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const lanes = await countPhotographerWorkflowLanes();
  return NextResponse.json({ lanes });
}

/** Re-run ingest for an asset (resumable). */
export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const id = (body as { mediaAssetId?: unknown })?.mediaAssetId;
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ message: "Thiếu mediaAssetId" }, { status: 400 });
  }

  try {
    const result = await runMediaIngestPipeline(id.trim());
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest thất bại";
    return NextResponse.json({ message }, { status: 400 });
  }
}
