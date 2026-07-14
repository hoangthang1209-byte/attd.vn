import { NextRequest, NextResponse } from "next/server";
import { exportSeoTopicsCsv } from "@/features/content/services/seo-topic.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  const csv = await exportSeoTopicsCsv({
    strategyId: searchParams.get("strategyId") ?? undefined,
    clusterId: searchParams.get("clusterId") ?? undefined,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="seo-topics-export.csv"',
    },
  });
}
