import { NextRequest, NextResponse } from "next/server";
import {
  CostingBatchValidationError,
  getCostingBatchDetail,
  updateCostingBatch,
} from "@/features/pricing/services/costing-batch.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const batch = await getCostingBatchDetail(id);
    if (!batch) {
      return NextResponse.json({ message: "Không tìm thấy batch costing" }, { status: 404 });
    }
    return NextResponse.json({ batch });
  } catch (err) {
    console.error("[GET /api/pricing/costing-batches/[id]]", err);
    return NextResponse.json({ message: "Không thể tải batch costing" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  try {
    const batch = await updateCostingBatch(id, {
      title: typeof raw.title === "string" ? raw.title : undefined,
      leadId: raw.leadId === null ? null : typeof raw.leadId === "string" ? raw.leadId : undefined,
      customerId:
        raw.customerId === null ? null : typeof raw.customerId === "string" ? raw.customerId : undefined,
      contactId:
        raw.contactId === null ? null : typeof raw.contactId === "string" ? raw.contactId : undefined,
      internalNote:
        raw.internalNote === null ? null : typeof raw.internalNote === "string" ? raw.internalNote : undefined,
    });
    return NextResponse.json({ batch });
  } catch (err) {
    if (err instanceof CostingBatchValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/pricing/costing-batches/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật batch costing" }, { status: 500 });
  }
}
