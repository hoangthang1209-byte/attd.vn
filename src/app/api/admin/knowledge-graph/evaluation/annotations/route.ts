import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { upsertEvaluationAnnotation } from "@/features/knowledge-graph/evaluation/graph-retrieval-evaluator.service";

/**
 * Evaluation-only annotations. Never mutates graph relationships.
 */
export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: {
    runId?: string;
    benchmarkId?: string;
    targetType?: "PATH" | "ENTITY" | "FACT";
    targetKey?: string;
    label?: "RELEVANT" | "IRRELEVANT" | "DUPLICATE" | "NEEDS_REVIEW";
    note?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.benchmarkId || !body.targetType || !body.targetKey || !body.label) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const row = await upsertEvaluationAnnotation({
    runId: body.runId ?? null,
    benchmarkId: body.benchmarkId,
    targetType: body.targetType,
    targetKey: body.targetKey,
    label: body.label,
    note: body.note ?? null,
    createdBy: permission.user.userId ?? null,
  });

  return NextResponse.json({ annotation: row, mutatesGraphRelation: false });
}
