import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { listEvaluationRuns } from "@/features/knowledge-graph/evaluation/graph-retrieval-evaluator.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const runs = await listEvaluationRuns(Number.isFinite(limit) ? limit : 20);
  return NextResponse.json({ runs });
}
