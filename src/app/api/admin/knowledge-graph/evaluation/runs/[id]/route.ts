import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getEvaluationRun } from "@/features/knowledge-graph/evaluation/graph-retrieval-evaluator.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await ctx.params;
  const run = await getEvaluationRun(id);
  if (!run) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ run });
}
