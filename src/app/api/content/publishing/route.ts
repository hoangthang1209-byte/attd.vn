import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { listPublishingQueue } from "@/features/content/services/content-publishing.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") ?? "ready") as
    | "ready"
    | "scheduled"
    | "failed"
    | "recent"
    | "modified"
    | "invalidated";

  const [ready, scheduled, failed, recent, modified] = await Promise.all([
    listPublishingQueue({ kind: "ready", take: 20 }),
    listPublishingQueue({ kind: "scheduled", take: 20 }),
    listPublishingQueue({ kind: "failed", take: 20 }),
    listPublishingQueue({ kind: "recent", take: 20 }),
    listPublishingQueue({ kind: "modified", take: 20 }),
  ]);

  return NextResponse.json({
    kind,
    queues: { ready, scheduled, failed, recent, modified },
  });
}
