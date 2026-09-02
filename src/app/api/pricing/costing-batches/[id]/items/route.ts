import { NextRequest, NextResponse } from "next/server";
import {
  CostingBatchValidationError,
  addCostingBatchItem,
} from "@/features/pricing/services/costing-batch.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body ok
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  try {
    const batch = await addCostingBatchItem(id, {
      label: typeof raw.label === "string" ? raw.label : undefined,
      groupLabel: typeof raw.groupLabel === "string" ? raw.groupLabel : undefined,
    });
    return NextResponse.json({ batch }, { status: 201 });
  } catch (err) {
    if (err instanceof CostingBatchValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/costing-batches/[id]/items]", err);
    return NextResponse.json({ message: "Không thể thêm dòng batch" }, { status: 500 });
  }
}
