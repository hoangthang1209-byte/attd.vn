import { NextRequest, NextResponse } from "next/server";
import { getSeoDashboardSummary } from "@/features/content/services/seo-dashboard.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const started = Date.now();
  try {
    const dashboard = await getSeoDashboardSummary();
    const durationMs = Date.now() - started;
    console.info(
      JSON.stringify({
        op: "content.seo.dashboard",
        ok: true,
        durationMs,
        topicCount: dashboard.counts.totalTopics,
        priorityCount: dashboard.priorityTopics.length,
        clusterCount: dashboard.clusterCoverage.length,
      }),
    );
    return NextResponse.json({ dashboard });
  } catch (err) {
    const durationMs = Date.now() - started;
    console.error(
      JSON.stringify({
        op: "content.seo.dashboard",
        ok: false,
        durationMs,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải dashboard SEO" },
      { status: 500 },
    );
  }
}
