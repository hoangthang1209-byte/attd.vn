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

  const started = Date.now();
  try {
    const [ready, scheduled, failed, recent, modified] = await Promise.all([
      listPublishingQueue({ kind: "ready", take: 20 }),
      listPublishingQueue({ kind: "scheduled", take: 20 }),
      listPublishingQueue({ kind: "failed", take: 20 }),
      listPublishingQueue({ kind: "recent", take: 20 }),
      listPublishingQueue({ kind: "modified", take: 20 }),
    ]);

    console.info(
      JSON.stringify({
        op: "content.publishing.queues",
        ok: true,
        durationMs: Date.now() - started,
        counts: {
          ready: ready.length,
          scheduled: scheduled.length,
          failed: failed.length,
          recent: recent.length,
          modified: modified.length,
        },
      }),
    );

    return NextResponse.json({
      kind,
      queues: { ready, scheduled, failed, recent, modified },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        op: "content.publishing.queues",
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải hàng đợi xuất bản" },
      { status: 500 },
    );
  }
}
