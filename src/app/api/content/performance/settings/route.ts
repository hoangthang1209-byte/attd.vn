import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getPerformanceSourceReports } from "@/features/content/services/content-performance.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const sources = getPerformanceSourceReports();
  console.info(
    JSON.stringify({
      op: "content.performance.settings",
      ok: true,
      durationMs: 0,
      rowCount: sources.length,
    }),
  );
  return NextResponse.json({ sources });
}
